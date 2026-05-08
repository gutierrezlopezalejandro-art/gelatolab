// Entry point cuando se compila como app de escritorio. Registra los plugins
// necesarios (fs para leer/escribir archivos, dialog para pickers opcionales,
// os para detectar la plataforma, updater + process para auto-update) y
// arranca la ventana principal.

// Limpia el cache del Service Worker de WebView2 si la version instalada
// cambio respecto a la ultima vez que arranco la app. El SW cacheado de
// versiones previas (notablemente v1.0.6) intercepta el fetch del
// index.html nuevo y devuelve chunks stale, causando pantalla blanca al
// actualizar (reportado 2026-05-07).
//
// Solo borra el subdirectorio "Service Worker" — IndexedDB, localStorage,
// cookies y datos del usuario quedan intactos. Solo aplica a Windows
// (WebView2 con EBWebView); en macOS/Linux la WebView usa otra estructura
// y este bug especifico no se reporto ahi.
fn clear_stale_service_worker_cache() {
    use std::fs;
    use std::path::PathBuf;

    const CURRENT_VERSION: &str = env!("CARGO_PKG_VERSION");
    const APP_IDENTIFIER: &str = "com.gelatolab.app";

    #[cfg(target_os = "windows")]
    let app_local_data: Option<PathBuf> = std::env::var_os("LOCALAPPDATA")
        .map(|p| PathBuf::from(p).join(APP_IDENTIFIER));

    #[cfg(target_os = "macos")]
    let app_local_data: Option<PathBuf> = std::env::var_os("HOME")
        .map(|h| PathBuf::from(h).join("Library/Application Support").join(APP_IDENTIFIER));

    #[cfg(target_os = "linux")]
    let app_local_data: Option<PathBuf> = std::env::var_os("XDG_DATA_HOME")
        .map(PathBuf::from)
        .or_else(|| std::env::var_os("HOME").map(|h| PathBuf::from(h).join(".local/share")))
        .map(|p| p.join(APP_IDENTIFIER));

    let Some(base) = app_local_data else { return; };

    let version_file = base.join("last_version.txt");
    let last_version = fs::read_to_string(&version_file).unwrap_or_default();

    if last_version.trim() == CURRENT_VERSION {
        return;
    }

    #[cfg(target_os = "windows")]
    {
        let sw_dir = base.join("EBWebView/Default/Service Worker");
        if sw_dir.exists() {
            let _ = fs::remove_dir_all(&sw_dir);
        }
        // Refresca el icon cache de Windows. Sin esto, el escritorio /
        // menu inicio / explorer muestran el icono viejo de la version
        // anterior aun cuando gelatolab.exe tiene el icono nuevo embebido.
        // Apps grandes (Discord, Slack) usan el mismo truco.
        refresh_windows_icon_cache();
    }

    if let Some(parent) = version_file.parent() {
        let _ = fs::create_dir_all(parent);
    }
    let _ = fs::write(&version_file, CURRENT_VERSION);
}

// Notifica al shell de Windows que las associations de archivos cambiaron,
// lo cual fuerza refresh del icon cache global. Equivalente Rust del
// comando manual `taskkill /f /im explorer.exe + del IconCache + start
// explorer` pero sin matar explorer.
//
// Uso: solo en startup despues de detectar cambio de version. SHCNF_IDLIST
// con dwItem1/dwItem2 en NULL pide refresh global, que es lo que queremos.
#[cfg(target_os = "windows")]
fn refresh_windows_icon_cache() {
    use windows::Win32::UI::Shell::{SHChangeNotify, SHCNE_ASSOCCHANGED, SHCNF_IDLIST};
    // SAFETY: SHChangeNotify con punteros nulos y SHCNE_ASSOCCHANGED esta
    // documentado por Microsoft como seguro y es el patron canonico para
    // forzar refresh del icon cache global.
    unsafe {
        SHChangeNotify(SHCNE_ASSOCCHANGED, SHCNF_IDLIST, None, None);
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    clear_stale_service_worker_cache();
    tauri::Builder::default()
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_store::Builder::new().build())
        .invoke_handler(tauri::generate_handler![])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
