"""
Recorta el simbolo de IA (estrella ✨) que las herramientas tipo Sora /
Gemini / DALL-E ponen en la esquina inferior derecha de las imagenes
generadas. La marca suele ser un cuadradito de ~60-80 pixeles.

Uso:
    python scripts/crop-ai-watermark.py public/photos/gelato-flavors.jpg
    python scripts/crop-ai-watermark.py public/photos/*.jpg

Estrategia simple: recorta una franja del 4% del lado derecho. Asume que
el sujeto principal de la imagen no esta exactamente en ese borde (suele
estar centrado o sobre el tercio izquierdo). Si en alguna imagen el
recorte se ve mal, abrir manualmente con un editor.
"""
import os
import sys
from PIL import Image

CROP_RIGHT_PCT = 0.04   # % del ancho a recortar del lado derecho
CROP_BOTTOM_PCT = 0.05  # % del alto a recortar del lado inferior


def crop_one(path: str) -> bool:
    if not os.path.isfile(path):
        print(f"[skip] {path} — no es archivo")
        return False
    try:
        img = Image.open(path)
    except Exception as e:
        print(f"[error] {path}: {e}")
        return False

    w, h = img.size
    right_px = int(w * CROP_RIGHT_PCT)
    bottom_px = int(h * CROP_BOTTOM_PCT)
    new_w = w - right_px
    new_h = h - bottom_px

    cropped = img.crop((0, 0, new_w, new_h))
    # Convertir a RGB si era RGBA o paletted, para que el JPG salga bien.
    if cropped.mode != "RGB" and path.lower().endswith((".jpg", ".jpeg")):
        cropped = cropped.convert("RGB")

    # Guardar sobre el original con buena calidad.
    save_kwargs = {}
    if path.lower().endswith((".jpg", ".jpeg")):
        save_kwargs = {"quality": 88, "optimize": True, "progressive": True}
    elif path.lower().endswith(".png"):
        save_kwargs = {"optimize": True}

    cropped.save(path, **save_kwargs)
    print(f"[ok]   {path}: {w}x{h} -> {new_w}x{new_h}")
    return True


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    paths = sys.argv[1:]
    ok = 0
    for p in paths:
        if crop_one(p):
            ok += 1
    print(f"\n{ok}/{len(paths)} imagenes recortadas.")


if __name__ == "__main__":
    main()
