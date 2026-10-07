"""
Gera as variantes otimizadas da foto principal (AVIF, WebP e JPEG em vários
tamanhos) e a imagem Open Graph (1200x630).

Uso:
    python -P scripts/optimize-images.py <foto-original.jpg> [public/img]

Requer Pillow (pip install pillow). O recorte é central, proporção 16:10.
"""

import os
import sys

from PIL import Image, ImageOps

WIDTHS = [480, 768, 1080, 1280]
RATIO = 16 / 10
NAME = "sabah-paulista"


def crop_to_ratio(im: Image.Image, ratio: float) -> Image.Image:
    w, h = im.size
    target_h = int(w / ratio)
    if target_h <= h:
        top = (h - target_h) // 2
        return im.crop((0, top, w, top + target_h))
    target_w = int(h * ratio)
    left = (w - target_w) // 2
    return im.crop((left, 0, left + target_w, h))


def main(src: str, out: str) -> None:
    os.makedirs(out, exist_ok=True)
    im = ImageOps.exif_transpose(Image.open(src)).convert("RGB")
    base = crop_to_ratio(im, RATIO)

    for wd in WIDTHS:
        r = base.resize((wd, int(wd / RATIO)), Image.LANCZOS)
        r.save(f"{out}/{NAME}-{wd}.jpg", quality=78, optimize=True, progressive=True)
        r.save(f"{out}/{NAME}-{wd}.webp", quality=74, method=6)
        r.save(f"{out}/{NAME}-{wd}.avif", quality=55, speed=4)
        print(f"{NAME}-{wd}: {r.size}")

    og = ImageOps.fit(im, (1200, 630), Image.LANCZOS, centering=(0.5, 0.5))
    og.save(f"{out}/og-image.jpg", quality=82, optimize=True, progressive=True)
    print("og-image: (1200, 630)")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    main(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else "public/img")
