# backend/cv/utils.py
import os
from pdf2image import convert_from_path


def pdf_to_png(pdf_path: str, output_path: str, dpi: int = 150) -> None:
    """Convert the first page of a PDF to PNG at the given DPI."""
    pages = convert_from_path(pdf_path, dpi=dpi, first_page=1, last_page=1)
    pages[0].save(output_path, "PNG")


def get_image_dimensions(image_path: str) -> tuple[int, int]:
    """Return (width_px, height_px) for the image at image_path."""
    from PIL import Image

    with Image.open(image_path) as img:
        return img.size  # (width, height)
