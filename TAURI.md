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

## Auto-update (operativo)

GelatoLab usa el plugin oficial `tauri-plugin-updater` con firmas Ed25519. Cada vez que la app desktop arranca, consulta `https://github.com/gutierrezlopezalejandro-art/gelatolab/releases/latest/download/latest.json` y, si encuentra una versión más nueva, le ofrece al usuario un modal para descargar e instalar (la app se reinicia sola al terminar).

### Setup inicial — una sola vez

Esta secuencia se ejecuta UNA VEZ en la máquina de desarrollo. No se repite por release.

1. **Generar el par de claves Ed25519** (la privada NUNCA se commitea):

   ```bash
   npm run tauri signer generate -- -w ~/.tauri/gelatolab.key
   ```

   El comando pide una password (guardarla en un password manager — se necesita en cada build) e imprime la **clave pública** en stdout. La clave privada queda en `~/.tauri/gelatolab.key` (Windows: `%USERPROFILE%\.tauri\gelatolab.key`).

2. **Pegar la clave pública en `src-tauri/tauri.conf.json`** reemplazando el placeholder `REEMPLAZAR_CON_PUBKEY_GENERADA_POR_TAURI_SIGNER` en `plugins.updater.pubkey`.

3. **Subir la clave privada como secret de GitHub** (Settings → Secrets and variables → Actions):

   - `TAURI_SIGNING_PRIVATE_KEY` → contenido del archivo `~/.tauri/gelatolab.key` (base64, en una sola línea)
   - `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` → la password elegida en el paso 1

4. **Commitear** el cambio del `pubkey` en `tauri.conf.json` y pushear a `main`.

A partir de acá, cada `git tag vX.Y.Z && git push --tags` dispara el workflow `release-desktop.yml` que:

- Builda los instaladores (.msi, .exe, .dmg, .AppImage, .deb)
- Los firma con la privada (genera `.sig` por bundle)
- Genera `latest.json` con las URLs y firmas
- Publica todo como Release público de GitHub (no draft)

Los clientes que ya tengan la app instalada con la pubkey embebida verán el modal "Actualización disponible" la próxima vez que abran la app.

### Probar que funciona

1. Buildear localmente con la versión actual: `npm run tauri:build`
2. Instalar el bundle generado.
3. Bumpear `package.json`, `src-tauri/Cargo.toml` y `src-tauri/tauri.conf.json` a una versión mayor.
4. Crear un tag `vX.Y.Z+1` y pushearlo. Esperar a que el workflow termine.
5. Abrir la app instalada del paso 2 — debería aparecer el modal.

### Si la firma no valida

Síntoma: el plugin tira "signature mismatch" o "invalid signature".

Causa típica: el `pubkey` en `tauri.conf.json` no corresponde a la `TAURI_SIGNING_PRIVATE_KEY` con la que se firmó el release. Verificar que ambas vienen del mismo `signer generate`.

> ⚠ **No rotar la pubkey una vez que hay clientes instalados.** Si necesitás rotar, los clientes viejos quedan sin poder actualizar — habría que avisarles que reinstalen manualmente.
