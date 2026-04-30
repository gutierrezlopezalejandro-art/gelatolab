# GelatoLab Desktop (Tauri)

Empaquetado de GelatoLab como aplicación de escritorio nativa (Windows / macOS / Linux) usando Tauri 2.x. Cuando corre como app instalada, GelatoLab tiene **acceso real al filesystem** y crea automáticamente `Documents/GelatoLab/` la primera vez para guardar todos los respaldos sin pedir permiso ni mostrar pickers.

## Prerequisitos (instalación una sola vez)

### Windows

1. **Visual Studio Build Tools 2022** (componente C++ build tools + Windows 10/11 SDK)
   Descarga: https://visualstudio.microsoft.com/visual-cpp-build-tools/

2. **Rust** (incluye `cargo`):
   ```powershell
   winget install Rustlang.Rustup
   ```
   o desde https://rustup.rs (durante el instalador acepta instalar VS Build Tools si no las tienes ya).

3. **WebView2** ya viene en Windows 10/11 (sino: https://developer.microsoft.com/microsoft-edge/webview2/).

### macOS

```bash
xcode-select --install
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

### Linux (Debian/Ubuntu)

```bash
sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file libssl-dev libayatana-appindicator3-dev librsvg2-dev
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

## Comandos

### Desarrollo (hot-reload)

```bash
npm run tauri:dev
```

Compila el wrapper Rust una vez, abre una ventana de escritorio con Vite dev server adentro. Cualquier cambio en el frontend se refleja al instante.

### Generar instalador (release)

```bash
npm run tauri:build
```

Produce el binario optimizado en `src-tauri/target/release/`:

- **Windows**: `bundle/nsis/GelatoLab_<version>_x64-setup.exe` (instalador NSIS) y `bundle/msi/GelatoLab_<version>_x64_en-US.msi`
- **macOS**: `bundle/dmg/GelatoLab_<version>_aarch64.dmg`
- **Linux**: `bundle/appimage/gelatolab_<version>_amd64.AppImage` y `bundle/deb/gelatolab_<version>_amd64.deb`

### Iconos

Antes de hacer un build de release, genera los iconos a partir de un PNG ≥ 1024×1024:

```bash
npm run tauri icon ruta/a/icono-fuente.png
```

## Cómo funciona el respaldo automático en la app nativa

Cuando GelatoLab detecta que corre dentro de Tauri (`window.__TAURI_INTERNALS__` está presente):

1. **Al primer arranque**: crea `~/Documents/GelatoLab/` (Windows: `C:\Users\<usuario>\Documents\GelatoLab`).
2. **Inmediatamente** escribe la primera versión de cada `.json` (recipes, productions, ingredients, plans, inventory, business, meta).
3. **A partir de ahí**: cualquier cambio en cualquier store dispara una escritura silenciosa al filesystem (debounce 2s).
4. **Sin permisos, sin prompts, sin pickers**. Funciona desde el segundo cero.

El usuario puede ver, copiar y mover esa carpeta como cualquier otra. Si la mueve dentro de OneDrive/Drive/Dropbox, queda con sync continuo a la nube y entre dispositivos.

## Distribuir el .exe

1. Genera el instalador con `npm run tauri:build`.
2. Sube `GelatoLab_<version>_x64-setup.exe` a tu hosting / GitHub Releases / Dropbox.
3. Tus usuarios lo bajan y hacen doble-click. El instalador NSIS los guía en español/inglés.

> ⚠ Sin firma de código (code-signing), Windows mostrará "publisher desconocido" la primera vez. Para evitar eso necesitas un certificado EV de Sectigo/DigiCert (~$300/año). Apple equivalente vía Apple Developer ($99/año). Esto es opcional pero recomendado para distribución comercial seria.

## Auto-update (futuro)

Tauri tiene un sistema built-in de auto-update vía firmas Ed25519. Si lo quieres habilitar, hay que:

1. Generar par de claves: `npm run tauri signer generate`
2. Configurar endpoint en `tauri.conf.json` (`plugins.updater.endpoints`)
3. Subir nuevas versiones firmadas a esa URL

Pendiente para una próxima iteración.
