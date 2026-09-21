#!/usr/bin/env python3
"""
Turn the PNG art in art-src/ into web-sized WebP in public/img/.

The source art is ~20MB of PNG, which is unusable on the phone this game is
built for. WebP with alpha gets that to roughly a tenth of the size with no
visible loss at the sizes we actually render.

Run after changing anything in art-src/:   python3 scripts/optimize-art.py
Outputs are committed, so CI never needs this.
"""
import json
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
    'plusPlains':         (1536, 74, False),
    'minusMarsh':         (1536, 74, False),
    'timesTundra':        (1536, 74, False),
    'dividedDesert':      (1536, 74, False),
    'positiveSprite':     (1150, 88, False),
    'incorrectSprite':    (1150, 88, False),
    'levelMarkers':       (1254, 88, False),
}


# Full-bleed world maps: saved without alpha, never de-checkered.
OPAQUE = {'plusPlains', 'minusMarsh', 'timesTundra', 'dividedDesert'}


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


# Sheets whose frames get measured rather than assumed. A nominal grid is not
# enough: the cells are not evenly spaced, and percentage positioning against an
# assumed grid pulls in slivers of the neighbouring frames.
GRIDS = {
    'gooberSprite': (5, 3),
    'splatSprite': (6, 4),
    'positiveSprite': (5, 4),
    'incorrectSprite': (5, 4),
    'itemsSprite': (5, 4),
}


# Sheets laid out loosely rather than on a grid: the frames are found by
# clustering the ink, and every frame gets the same box so they share a scale
# and a centre on screen. name -> (frame count, cluster gap in px)
BLOBS = {
    'levelMarkers': (5, 16),
}


def measure_blobs(path: Path, count: int, gap: int):
    """
    Frames from a loose sheet. Dilating the alpha by `gap` joins each marker to
    its own floating rocks and sparkles without bridging to its neighbours;
    the largest `count` clusters are the frames, read left to right, top to
    bottom. Boxes are the widest and tallest cluster, centred on each one.
    """
    alpha = np.array(Image.open(path).convert('RGBA').getchannel('A'))
    ink = (alpha > 12).astype(np.uint8)
    k = 2 * gap + 1
    joined = cv2.dilate(ink, np.ones((k, k), np.uint8))
    n, lbl, stats, _ = cv2.connectedComponentsWithStats(joined, 8)
    boxes = []
    for i in range(1, n):
        ys, xs = np.where((lbl == i) & (ink == 1))
        if len(xs) == 0:
            continue
        boxes.append((len(xs), int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1))
    boxes = sorted(boxes, reverse=True)[:count]
    if len(boxes) != count:
        raise SystemExit(f'{path.stem}: found {len(boxes)} clusters, expected {count}')
    w = max(x1 - x0 for _, x0, _, x1, _ in boxes)
    h = max(y1 - y0 for _, _, y0, _, y1 in boxes)
    sheet_h, sheet_w = alpha.shape
    frames = []
    for _, x0, y0, x1, y1 in boxes:
        cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
        fx = min(max(0, round(cx - w / 2)), sheet_w - w)
        fy = min(max(0, round(cy - h / 2)), sheet_h - h)
        frames.append([fx, fy, w, h])
    # Reading order: rows first (a row is anything within half a frame height).
    frames.sort(key=lambda f: (round(f[1] / (h / 2)), f[0]))
    return frames


def _row_bands(ink, rows: int):
    """Horizontal content bands. Rows separate cleanly on these sheets."""
    proj = ink.sum(axis=1)
    thresh = proj.max() * 0.005
    filled = proj > thresh
    runs, start = [], None
    for i, on in enumerate(filled):
        if on and start is None:
            start = i
        elif not on and start is not None:
            runs.append((start, i))
            start = None
    if start is not None:
        runs.append((start, len(filled)))
    while len(runs) > rows:                     # merge across the smallest gap
        gaps = [(runs[i + 1][0] - runs[i][1], i) for i in range(len(runs) - 1)]
        _, i = min(gaps)
        runs[i] = (runs[i][0], runs[i + 1][1])
        del runs[i + 1]
    if len(runs) != rows:
        # Rows that touch leave no gap to find. Fall back to an even split of
        # the inked area, which the per-cell blob trim then tightens anyway.
        top, bottom = runs[0][0], runs[-1][1]
        span = bottom - top
        runs = [(top + round(span * i / rows), top + round(span * (i + 1) / rows)) for i in range(rows)]
    return runs


def measure_frames(path: Path, cols: int, rows: int):
    """
    Exact [x, y, w, h] per frame from the alpha channel.

    Columns are split on the nominal grid rather than on gaps, because adjacent
    frames often touch. Within each cell the bounding box comes from the largest
    connected blob, so a sliver of the neighbour intruding into the cell does not
    stretch the frame — that intrusion is exactly what caused sprite bleed.
    """
    import numpy as np

    alpha = np.array(Image.open(path).convert('RGBA').getchannel('A'))
    ink = (alpha > 12)
    h, w = ink.shape
    frames = []
    for (y0, y1) in _row_bands(ink, rows):
        for c in range(cols):
            x0 = round(w * c / cols)
            x1 = round(w * (c + 1) / cols)
            cell = ink[y0:y1, x0:x1].astype(np.uint8)
            n, lbl, stats, _ = cv2.connectedComponentsWithStats(cell, 8)
            if n <= 1:
                frames.append([x0, y0, x1 - x0, y1 - y0])
                continue
            big = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
            bx, by = stats[big, cv2.CC_STAT_LEFT], stats[big, cv2.CC_STAT_TOP]
            bw, bh = stats[big, cv2.CC_STAT_WIDTH], stats[big, cv2.CC_STAT_HEIGHT]
            # Keep small detached bits that belong to this frame — sparkles,
            # drips — but not a neighbour leaning into the cell. Requiring the
            # centroid to sit inside the main blob's box is what separates them.
            main_area = stats[big, cv2.CC_STAT_AREA]
            pad_x, pad_y = bw * 0.12, bh * 0.12
            for i in range(1, n):
                if i == big or stats[i, cv2.CC_STAT_AREA] < 40:
                    continue
                if stats[i, cv2.CC_STAT_AREA] > main_area * 0.4:
                    continue
                cxi = stats[i, cv2.CC_STAT_LEFT] + stats[i, cv2.CC_STAT_WIDTH] / 2
                cyi = stats[i, cv2.CC_STAT_TOP] + stats[i, cv2.CC_STAT_HEIGHT] / 2
                inside = (bx - pad_x) <= cxi <= (bx + bw + pad_x) and (by - pad_y) <= cyi <= (by + bh + pad_y)
                if inside:
                    ix, iw = stats[i, cv2.CC_STAT_LEFT], stats[i, cv2.CC_STAT_WIDTH]
                    iy, ih = stats[i, cv2.CC_STAT_TOP], stats[i, cv2.CC_STAT_HEIGHT]
                    by, bh = min(by, iy), max(by + bh, iy + ih) - min(by, iy)
                    bx, bw = min(bx, ix), max(bx + bw, ix + iw) - min(bx, ix)
            frames.append([int(x0 + bx), int(y0 + by), int(bw), int(bh)])
    return frames


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    manifest: dict = {}
    total_before = total_after = 0
    for png in sorted(SRC.glob('*.png')):
        stem = png.stem
        max_w, quality, trim = PLAN.get(stem, (1200, 88, False))
        raw = Image.open(png)
        # Some sprite exports arrive without alpha, with the checkerboard baked
        # in. Full-bleed backgrounds have no alpha to recover, and the flood
        # would eat their fog and snow.
        if stem in OPAQUE:
            im = raw.convert('RGB')
        else:
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
        if stem in GRIDS or stem in BLOBS:
            if stem in GRIDS:
                cols, rows = GRIDS[stem]
                frames = measure_frames(dest, cols, rows)
            else:
                frames = measure_blobs(dest, *BLOBS[stem])
            manifest[stem] = {
                'sheet': f'{stem}.webp',
                'width': im.width,
                'height': im.height,
                'frames': frames,
            }
    frames_file = Path('src/ui/spriteFrames.json')
    frames_file.write_text(json.dumps(manifest, indent=2) + '\n')
    for name, data in manifest.items():
        print(f'  {name}: {len(data["frames"])} frames measured')
    print(f'{"TOTAL":20} {"":11} {total_before/1048576:8.1f} MB -> {total_after/1048576:7.2f} MB')


if __name__ == '__main__':
    main()
