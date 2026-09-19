#!/usr/bin/env python3
"""
Turn the PNG art in art-src/ into web-sized WebP in public/img/.

The source art is ~20MB of PNG, which is unusable on the phone this game is
built for. WebP with alpha gets that to roughly a tenth of the size with no
visible loss at the sizes we actually render.

Run after changing anything in art-src/:   python3 scripts/optimize-art.py
Outputs are committed, so CI never needs this.
"""
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

SRC = Path('art-src')
OUT = Path('public/img')

# name -> (max width, quality, trim transparent border?)
# Backgrounds can take more compression than sprites, whose edges are the point.
PLAN = {
    'logo':               (1000, 88, True),
    'goober':             (700, 90, True),
    'gooberSprite':       (1200, 90, False),
    'splatSprite':        (1152, 88, False),
    'itemsSprite':        (1150, 88, False),
    'questSprite':        (1150, 88, False),
    'accessoriesSprite':  (1150, 88, False),
    'world':              (1536, 74, False),
    'additionFields':     (1536, 74, False),
    'positiveSprite':     (1150, 88, False),
}


def dechecker(im: Image.Image, tol: int = 26) -> Image.Image:
    """
    Recover alpha from art exported with the transparency checkerboard baked in.

    The checker is not a crisp grid once the export has been resampled, so
    matching it by phase fails. Instead: flood inward from the border through
    any near-neutral light pixel. Every sticker has a solid dark outline, so the
    flood cannot reach the white fills inside the lettering.
    """
    rgb = np.array(im.convert('RGB'))
    h, w = rgb.shape[:2]
    mx = rgb.max(axis=2).astype(int)
    mn = rgb.min(axis=2).astype(int)
    neutral = (mx - mn) < 22          # grey-ish, so coloured art is never eaten
    light = mx > (255 - tol * 2)      # both checker tones are light
    candidate = (neutral & light).astype(np.uint8) * 255

    filled = np.zeros((h + 2, w + 2), np.uint8)
    flags = 4 | cv2.FLOODFILL_MASK_ONLY | (255 << 8)
    border = [(x, y) for x in range(0, w, 4) for y in (0, h - 1)]
    border += [(x, y) for y in range(0, h, 4) for x in (0, w - 1)]
    for x, y in border:
        if candidate[y, x] and not filled[y + 1, x + 1]:
            cv2.floodFill(candidate.copy(), filled, (x, y), 0, 0, 0, flags)

    bg = filled[1:-1, 1:-1]
    bg = cv2.morphologyEx(bg, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8))
    alpha = 255 - cv2.GaussianBlur(bg, (0, 0), 0.7)
    return Image.fromarray(np.dstack([rgb, alpha]).astype(np.uint8), 'RGBA')


def trim_alpha(im: Image.Image) -> Image.Image:
    box = im.getchannel('A').getbbox()
    return im.crop(box) if box else im


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    total_before = total_after = 0
    for png in sorted(SRC.glob('*.png')):
        stem = png.stem
        max_w, quality, trim = PLAN.get(stem, (1200, 88, False))
        raw = Image.open(png)
        # Some exports arrive without alpha, with the checkerboard baked in.
        im = dechecker(raw) if 'A' not in raw.getbands() else raw.convert('RGBA')
        if trim:
            im = trim_alpha(im)
        if im.width > max_w:
            im = im.resize((max_w, round(im.height * max_w / im.width)), Image.LANCZOS)
        dest = OUT / f'{stem}.webp'
        im.save(dest, 'WEBP', quality=quality, method=6)
        before, after = png.stat().st_size, dest.stat().st_size
        total_before += before
        total_after += after
        print(f'{stem:20} {im.width:5}x{im.height:<5} {before/1024:8.0f} KB -> {after/1024:7.0f} KB')
    print(f'{"TOTAL":20} {"":11} {total_before/1048576:8.1f} MB -> {total_after/1048576:7.2f} MB')


if __name__ == '__main__':
    main()
