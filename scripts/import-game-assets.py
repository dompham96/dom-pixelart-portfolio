#!/usr/bin/env python3
"""
Dom Pixel Art — Automated Photoshop (GIF/WebP & 5-Color Guide PNG) Asset Importer.

Usage:
  1. Convert Photoshop GIF/WebP animations into crisp 1x PNG sprite sheets + manifest.json:
     python3 scripts/import-game-assets.py sprites <input_folder> --out public/assets/game/sprites

  2. Parse a 5-color Photoshop guide.png (16x16 grid) into collision, indoorRects, lights, spawn & markers:
     python3 scripts/import-game-assets.py guide <guide.png> --tile-size 16 --out /tmp/guide-report.json

  3. Scan public/assets/audio/{bgm,ambient,sfx} and rebuild public/assets/audio/manifest.json:
     python3 scripts/import-game-assets.py audio --dir public/assets/audio
"""

from __future__ import annotations

import argparse
import json
import math
import re
from collections import defaultdict
from pathlib import Path
from typing import Any

from PIL import Image, ImageSequence

VALID_DIRS = {"down", "up", "left", "right"}
VALID_STATES = {"idle", "walk", "run", "sleep", "work", "gaming", "play", "default", "sway"}

GUIDE_COLORS = {
    "solid": (255, 0, 0),       # Red    #FF0000 -> walls / solid props
    "indoor": (0, 102, 255),    # Blue   #0066FF -> indoor zones
    "light": (255, 255, 0),     # Yellow #FFFF00 -> night light sources
    "spawn": (0, 255, 0),       # Green  #00FF00 -> player spawn
    "marker": (255, 0, 255),    # Purple #FF00FF -> props / NPCs / waypoints (paired with notes.txt)
}


def parse_sprite_filename(stem: str) -> tuple[str, str]:
    """
    Parse naming convention:
      player_idle_down -> ('player', 'idle_down')
      ink_cat_run_right -> ('ink_cat', 'run_right')
      dom_sleep -> ('dom', 'sleep')
      tree_sway -> ('tree_sway', 'default')
    """
    tokens = [t for t in re.split(r"[_\-\s]+", stem.lower()) if t]
    if len(tokens) >= 3 and tokens[-1] in VALID_DIRS and tokens[-2] in VALID_STATES:
        sprite_id = "_".join(tokens[:-2])
        clip_name = f"{tokens[-2]}_{tokens[-1]}"
        return sprite_id, clip_name
    if len(tokens) >= 2 and tokens[-1] in VALID_STATES and tokens[-1] != "sway":
        sprite_id = "_".join(tokens[:-1])
        clip_name = tokens[-1]
        return sprite_id, clip_name
    return "_".join(tokens), "default"


def extract_frames(path: Path) -> tuple[list[Image.Image], list[int]]:
    frames: list[Image.Image] = []
    durations: list[int] = []
    with Image.open(path) as img:
        for frame in ImageSequence.Iterator(img):
            rgba = frame.convert("RGBA")
            frames.append(rgba.copy())
            dur = int(frame.info.get("duration", 140) or 140)
            durations.append(max(30, dur))
    return frames, durations


def import_sprites(input_dir: Path, out_dir: Path) -> dict[str, Any]:
    out_dir.mkdir(parents=True, exist_ok=True)
    grouped: dict[str, dict[str, tuple[list[Image.Image], list[int]]]] = defaultdict(dict)

    supported = {".gif", ".webp", ".png"}
    for file in sorted(input_dir.rglob("*")):
        if not file.is_file() or file.suffix.lower() not in supported:
            continue
        if file.name.lower() in {"ground.png", "foreground.png", "guide.png", "nightoverlay.png"}:
            continue
        sprite_id, clip_name = parse_sprite_filename(file.stem)
        frames, durations = extract_frames(file)
        if frames:
            grouped[sprite_id][clip_name] = (frames, durations)

    manifest_path = out_dir / "manifest.json"
    manifest: dict[str, Any] = {"version": 1, "sprites": {}}
    if manifest_path.exists():
        try:
            existing = json.loads(manifest_path.read_text(encoding="utf-8"))
            if isinstance(existing, dict) and isinstance(existing.get("sprites"), dict):
                manifest = existing
        except json.JSONDecodeError:
            pass

    for sprite_id, clips_map in sorted(grouped.items()):
        clip_names = sorted(clips_map.keys())
        frame_w = max(f.width for frames, _ in clips_map.values() for f in frames)
        frame_h = max(f.height for frames, _ in clips_map.values() for f in frames)
        max_cols = max(len(frames) for frames, _ in clips_map.values())
        rows = len(clip_names)

        sheet = Image.new("RGBA", (frame_w * max_cols, frame_h * rows), (0, 0, 0, 0))
        clips_meta: dict[str, Any] = {}

        for row_idx, clip_name in enumerate(clip_names):
            frames, durations = clips_map[clip_name]
            for col_idx, frame in enumerate(frames):
                # Anchor each frame bottom-center inside its cell
                paste_x = col_idx * frame_w + (frame_w - frame.width) // 2
                paste_y = row_idx * frame_h + (frame_h - frame.height)
                sheet.paste(frame, (paste_x, paste_y), frame)
            clips_meta[clip_name] = {
                "row": row_idx,
                "frames": len(frames),
                "frameDurationsMs": durations,
                "loop": True,
            }

        sheet_file = out_dir / f"{sprite_id}.png"
        sheet.save(sheet_file, format="PNG")

        # Store web-relative path from public/
        try:
            rel_path = sheet_file.resolve().relative_to(Path.cwd().resolve() / "public").as_posix()
        except ValueError:
            rel_path = f"assets/game/sprites/{sprite_id}.png"

        manifest["sprites"][sprite_id] = {
            "id": sprite_id,
            "imageSrc": rel_path,
            "frameWidth": frame_w,
            "frameHeight": frame_h,
            "anchorX": 0.5,
            "anchorY": 1.0,
            "mirrorRightToLeft": True,
            "clips": clips_meta,
        }

    manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return manifest


def classify_pixel(rgba: tuple[int, int, int, int]) -> str | None:
    r, g, b, a = rgba
    if a < 100:
        return None
    best_name = None
    best_dist = 110.0
    for name, (tr, tg, tb) in GUIDE_COLORS.items():
        dist = math.sqrt((r - tr) ** 2 + (g - tg) ** 2 + (b - tb) ** 2)
        if dist < best_dist:
            best_dist = dist
            best_name = name
    return best_name


def merge_cells_to_rects(cells: set[tuple[int, int]], width: int, height: int) -> list[dict[str, int]]:
    """Greedily merge contiguous boolean cells into minimal rectangles for indoorRects."""
    remaining = set(cells)
    rects: list[dict[str, int]] = []
    for y in range(height):
        for x in range(width):
            if (x, y) not in remaining:
                continue
            w = 1
            while (x + w, y) in remaining:
                w += 1
            h = 1
            while all((x + dx, y + h) in remaining for dx in range(w)):
                h += 1
            for dy in range(h):
                for dx in range(w):
                    remaining.remove((x + dx, y + dy))
            rects.append({"x": x, "y": y, "w": w, "h": h})
    return rects


def parse_guide_png(guide_path: Path, tile_size: int) -> dict[str, Any]:
    with Image.open(guide_path) as img:
        rgba = img.convert("RGBA")
        px = rgba.load()
        width = rgba.width // tile_size
        height = rgba.height // tile_size

        solid_tiles: list[dict[str, int]] = []
        indoor_cells: set[tuple[int, int]] = set()
        lights: list[dict[str, Any]] = []
        spawns: list[dict[str, int]] = []
        markers: list[dict[str, int]] = []

        for ty in range(height):
            for tx in range(width):
                cx = tx * tile_size + tile_size // 2
                cy = ty * tile_size + tile_size // 2
                kind = classify_pixel(px[cx, cy])
                if kind == "solid":
                    solid_tiles.append({"x": tx, "y": ty})
                elif kind == "indoor":
                    indoor_cells.add((tx, ty))
                elif kind == "light":
                    lights.append({"x": tx + 0.5, "y": ty + 0.5, "radius": 34, "onlyAtNight": True})
                elif kind == "spawn":
                    spawns.append({"x": tx, "y": ty})
                elif kind == "marker":
                    markers.append({"index": len(markers) + 1, "x": tx, "y": ty})

        indoor_rects = merge_cells_to_rects(indoor_cells, width, height)
        return {
            "width": width,
            "height": height,
            "tileSize": tile_size,
            "spawn": spawns[0] if spawns else None,
            "solidCount": len(solid_tiles),
            "solidTiles": solid_tiles,
            "indoorRects": indoor_rects,
            "lights": lights,
            "markers": markers,
        }


def scan_audio(audio_dir: Path) -> dict[str, Any]:
    audio_dir.mkdir(parents=True, exist_ok=True)
    manifest: dict[str, dict[str, str]] = {"bgm": {}, "ambient": {}, "sfx": {}}
    supported = {".mp3", ".ogg", ".wav", ".m4a"}

    for category in ("bgm", "ambient", "sfx"):
        cat_dir = audio_dir / category
        if not cat_dir.exists():
            continue
        for file in sorted(cat_dir.iterdir()):
            if not file.is_file() or file.suffix.lower() not in supported:
                continue
            key = file.stem.lower()
            try:
                rel = file.resolve().relative_to(Path.cwd().resolve() / "public").as_posix()
            except ValueError:
                rel = f"assets/audio/{category}/{file.name}"
            manifest[category][key] = rel

    manifest_path = audio_dir / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return manifest


def main() -> None:
    parser = argparse.ArgumentParser(description="Dom Pixel Art Photoshop/Drive Asset Importer")
    sub = parser.add_subparsers(dest="cmd", required=True)

    sp_sprites = sub.add_parser("sprites", help="Convert GIF/WebP animations to PNG sprite sheets")
    sp_sprites.add_argument("input_dir", type=Path)
    sp_sprites.add_argument("--out", type=Path, default=Path("public/assets/game/sprites"))

    sp_guide = sub.add_parser("guide", help="Parse 5-color Photoshop guide.png into map JSON data")
    sp_guide.add_argument("guide_png", type=Path)
    sp_guide.add_argument("--tile-size", type=int, default=16)
    sp_guide.add_argument("--out", type=Path, default=None)

    sp_audio = sub.add_parser("audio", help="Rebuild public/assets/audio/manifest.json")
    sp_audio.add_argument("--dir", type=Path, default=Path("public/assets/audio"))

    args = parser.parse_args()
    if args.cmd == "sprites":
        result = import_sprites(args.input_dir, args.out)
        print(f"Imported {len(result['sprites'])} sprite sheets -> {args.out / 'manifest.json'}")
    elif args.cmd == "guide":
        report = parse_guide_png(args.guide_png, args.tile_size)
        text = json.dumps(report, indent=2, ensure_ascii=False) + "\n"
        if args.out:
            args.out.parent.mkdir(parents=True, exist_ok=True)
            args.out.write_text(text, encoding="utf-8")
            print(f"Parsed guide {report['width']}x{report['height']} -> {args.out}")
        else:
            print(text)
    elif args.cmd == "audio":
        result = scan_audio(args.dir)
        print(
            f"Scanned audio manifest: {len(result['bgm'])} BGM, "
            f"{len(result['ambient'])} ambient, {len(result['sfx'])} SFX"
        )


if __name__ == "__main__":
    main()
