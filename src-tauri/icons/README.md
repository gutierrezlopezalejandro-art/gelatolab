# Iconos

Genera los iconos automáticamente desde una sola imagen PNG ≥1024×1024:

```bash
npm run tauri icon ruta/a/icono-fuente.png
```

Esto crea `32x32.png`, `128x128.png`, `128x128@2x.png`, `icon.icns` (macOS), `icon.ico` (Windows) y otros tamaños necesarios para los instaladores.

Si no tienes una fuente todavía, Tauri usa un icono default (no apto para producción pero suficiente para desarrollo). El primer `tauri:build` te lo dirá si faltan.
