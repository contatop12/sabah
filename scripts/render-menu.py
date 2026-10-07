"""
Renderiza as páginas dos PDFs de cardápio como imagens otimizadas (AVIF + JPEG)
para a página /bio/cardapio.

Uso:
    python -P scripts/render-menu.py <salao.pdf> <delivery.pdf> [public/img/cardapio]

Gera <nome>-<página>-<largura>.{avif,jpg} para as larguras em WIDTHS.
Requer PyMuPDF (pip install pymupdf) e Pillow.
Se o número de páginas mudar, ajuste cardapio.html.
"""

import os
import sys

import fitz  # PyMuPDF
from PIL import Image

WIDTHS = [600, 1040]


def render(pdf_path: str, name: str, out: str) -> int:
    doc = fitz.open(pdf_path)
    for index, page in enumerate(doc, start=1):
        for width in WIDTHS:
            zoom = width / page.rect.width
            pix = page.get_pixmap(matrix=fitz.Matrix(zoom, zoom), alpha=False)
            img = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
            img.save(f"{out}/{name}-{index:02d}-{width}.jpg", quality=80, optimize=True, progressive=True)
            img.save(f"{out}/{name}-{index:02d}-{width}.avif", quality=58, speed=4)
        print(f"{name} página {index}: {pix.width}x{pix.height}")
    return len(doc)


def main() -> None:
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)
    out = sys.argv[3] if len(sys.argv) > 3 else "public/img/cardapio"
    os.makedirs(out, exist_ok=True)
    salao = render(sys.argv[1], "salao", out)
    delivery = render(sys.argv[2], "delivery", out)
    print(f"salão: {salao} páginas, delivery: {delivery} páginas")


if __name__ == "__main__":
    main()
