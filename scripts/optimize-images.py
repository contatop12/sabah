"""
Gera as variantes otimizadas da foto de fundo (AVIF, WebP e JPEG, proporção
original, larguras BG_WIDTHS) e a imagem Open Graph (1200x630).

Uso:
    python -P scripts/optimize-images.py <foto-original.jpg> [public/img]

Requer Pillow (pip install pillow). A imagem OG usa recorte central.
"""

import os
import sys

from PIL import Image, ImageOps

BG_WIDTHS = [1280, 1920]
NAME = "bg"


def main(src: str, out: str) -> None:
    os.makedirs(out, exist_ok=True)
    im = ImageOps.exif_transpose(Image.open(src)).convert("RGB")

    for wd in BG_WIDTHS:
        r = im.resize((wd, round(wd * im.height / im.width)), Image.LANCZOS)
        r.save(f"{out}/{NAME}-{wd}.jpg", quality=76, optimize=True, progressive=True)
        r.save(f"{out}/{NAME}-{wd}.webp", quality=70, method=6)
        r.save(f"{out}/{NAME}-{wd}.avif", quality=50, speed=4)
        print(f"{NAME}-{wd}: {r.size}")

    og = ImageOps.fit(im, (1200, 630), Image.LANCZOS, centering=(0.5, 0.5))
    og.save(f"{out}/og-image.jpg", quality=82, optimize=True, progressive=True)
    print("og-image: (1200, 630)")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    main(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else "public/img")
