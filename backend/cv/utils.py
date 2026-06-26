# backend/cv/utils.py
import os
import cv2
import numpy as np
from pdf2image import convert_from_path


MAX_DIM = 6000


def pdf_to_png(pdf_path: str, output_path: str, dpi: int = 150) -> None:
    """Convert the first page of a PDF to PNG at the given DPI."""
    pages = convert_from_path(pdf_path, dpi=dpi, first_page=1, last_page=1)
    pages[0].save(output_path, "PNG")


def resize_for_cv(image: np.ndarray) -> tuple[np.ndarray, float]:
    """Return resized image and the scale factor applied.

    If the longest side exceeds MAX_DIM, downscale proportionally.
    Returns the original image unchanged (scale=1.0) if within limits.
    """
    h, w = image.shape[:2]
    scale = 1.0
    if max(h, w) > MAX_DIM:
        scale = MAX_DIM / max(h, w)
        new_w = int(w * scale)
        new_h = int(h * scale)
        image = cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_AREA)
    return image, scale


def get_image_dimensions(image_path: str) -> tuple[int, int]:
    """Return (width_px, height_px) for the image at image_path."""
    from PIL import Image

    with Image.open(image_path) as img:
        return img.size  # (width, height)
