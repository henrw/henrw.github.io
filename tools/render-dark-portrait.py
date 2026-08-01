#!/usr/bin/env python3
"""Replace edge-connected white background with black, preserving a white halo."""

import argparse
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter


def render(input_path: Path, output_path: Path, halo: int, threshold: int,
           background: tuple[int, int, int]) -> None:
    image = Image.open(input_path)
    rgba = image.convert("RGBA")
    pixels = np.asarray(rgba).copy()
    rgb = pixels[:, :, :3]

    # Only near-neutral, near-white pixels can belong to the background.
    light = rgb.min(axis=2) >= threshold
    neutral = rgb.max(axis=2) - rgb.min(axis=2) <= 18
    candidate = Image.fromarray(np.where(light & neutral, 255, 0).astype(np.uint8), "L")

    # Keep interior highlights intact by selecting only white connected to an edge.
    connected = Image.new("L", candidate.size, 0)
    for corner in ((0, 0), (candidate.width - 1, 0), (0, candidate.height - 1),
                   (candidate.width - 1, candidate.height - 1)):
        if candidate.getpixel(corner) != 255:
            continue
        region = candidate.copy()
        ImageDraw.floodfill(region, corner, 128, thresh=0)
        connected = Image.fromarray(
            np.maximum(np.asarray(connected), np.where(np.asarray(region) == 128, 255, 0)).astype(np.uint8),
            "L",
        )

    connected_background = np.asarray(connected) > 0
    foreground = Image.fromarray(np.where(~connected_background, 255, 0).astype(np.uint8), "L")
    near_person = np.asarray(foreground.filter(ImageFilter.MaxFilter(halo * 2 + 1))) > 0
    outer_background = connected_background & ~near_person

    pixels[outer_background, :3] = background
    pixels[outer_background, 3] = 255
    output_path.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(pixels, "RGBA").convert(image.mode).save(output_path)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--halo", type=int, default=8)
    parser.add_argument("--threshold", type=int, default=238)
    parser.add_argument("--background", default="111210")
    args = parser.parse_args()
    background = tuple(bytes.fromhex(args.background.removeprefix("#")))
    if len(background) != 3:
        parser.error("--background must be a six-digit RGB hex color")
    render(args.input, args.output, args.halo, args.threshold, background)


if __name__ == "__main__":
    main()
