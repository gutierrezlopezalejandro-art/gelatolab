// Entry point cuando se compila como app de escritorio. Registra los plugins
// necesarios (fs para leer/escribir archivos, dialog para pickers opcionales,
// os para detectar la plataforma) y arranca la ventana principal.

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
