#!/usr/bin/env python3
"""
Center content vertically in images by detecting background color and padding.
Finds the first and last non-background pixel rows, crops to content,
then re-centers with equal top/bottom padding using the background color.
"""

import sys
import os
from PIL import Image
import numpy as np


def get_bg_color(img_array):
    """Get background color from the top-left corner (5x5 average)."""
    sample = img_array[:5, :5]
    return np.mean(sample, axis=(0, 1)).astype(np.uint8)


def find_content_bounds(img_array, bg_color, tolerance=10):
    """Find first and last row where non-background pixels appear."""
    diff = np.abs(img_array.astype(int) - bg_color.astype(int))
    non_bg = np.any(diff > tolerance, axis=-1)  # per-pixel: is it not background?
    row_has_content = np.any(non_bg, axis=1)  # per-row: does it have content?

    rows = np.where(row_has_content)[0]
    if len(rows) == 0:
        return 0, img_array.shape[0]
    return rows[0], rows[-1] + 1


def center_pad_image(input_path, output_path=None, target_height=None):
    """Center content vertically with equal padding."""
    img = Image.open(input_path)
    img_array = np.array(img)
    w, h = img.size

    if target_height is None:
        target_height = h

    bg_color = get_bg_color(img_array)
    top, bottom = find_content_bounds(img_array, bg_color)
    content_height = bottom - top

    print(f"  Content rows: {top} ~ {bottom} (height: {content_height})")
    print(f"  Background color: rgb({bg_color[0]}, {bg_color[1]}, {bg_color[2]})")

    if content_height >= target_height:
        print(f"  Content taller than target, keeping as-is")
        cropped = img.crop((0, top, w, top + target_height))
    else:
        pad_total = target_height - content_height
        pad_top = pad_total // 2
        pad_bottom = pad_total - pad_top

        # Create new image with background color
        new_img = Image.new("RGB", (w, target_height), tuple(bg_color))
        content = img.crop((0, top, w, bottom))
        new_img.paste(content, (0, pad_top))
        cropped = new_img

    out = output_path or input_path
    cropped.save(out)
    print(f"  Saved: {out} ({w}x{target_height})")


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 center_pad.py <image_or_dir> [target_height]")
        print("\nProcesses a single image or all PNGs in a directory.")
        print("Default target_height: original image height")
        sys.exit(1)

    path = sys.argv[1]
    target_h = int(sys.argv[2]) if len(sys.argv) > 2 else None

    if os.path.isdir(path):
        pngs = sorted([f for f in os.listdir(path) if f.endswith('.png') and f[0].isdigit()])
        for f in pngs:
            fpath = os.path.join(path, f)
            print(f"Processing {f}:")
            center_pad_image(fpath, target_height=target_h)
    else:
        print(f"Processing {path}:")
        center_pad_image(path, target_height=target_h)

    print("\nDone!")


if __name__ == "__main__":
    main()
