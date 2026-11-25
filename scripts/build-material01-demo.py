#!/usr/bin/env python3
"""
Composes the Dom Pixel Art Demo Stage (44x30 tiles = 704x480 px) directly from
Dom's `Game material 01` tilesets & `Base character sprite` sheets.

Outputs:
  - public/assets/game/maps/dom-house/ground.png
  - public/assets/game/maps/dom-house/foreground.png
  - public/assets/game/sprites/player.png (+ tree/bush/plant sprites)
  - public/assets/game/sprites/manifest.json
"""

from __future__ import annotations

import json
import random
from pathlib import Path
from PIL import Image

SRC = Path("/tmp/dom-material-01")
PUBLIC = Path("public/assets/game")
MAP_OUT = PUBLIC / "maps/dom-house"
SPRITE_OUT = PUBLIC / "sprites"

TS = 16
W_TILES = 44
H_TILES = 30
WORLD_W = W_TILES * TS
WORLD_H = H_TILES * TS


def crop_tiles(sheet: Image.Image, col: int, row: int, w_tiles: int = 1, h_tiles: int = 1) -> Image.Image:
    return sheet.crop((col * TS, row * TS, (col + w_tiles) * TS, (row + h_tiles) * TS))


def paste_tile(dst: Image.Image, src: Image.Image, tx: int, ty: int, col: int, row: int, w: int = 1, h: int = 1) -> None:
    patch = crop_tiles(src, col, row, w, h)
    dst.alpha_composite(patch, (tx * TS, ty * TS))


def build_player_sprite() -> dict:
    """Pack Dom's real 32x32 Base character sprite sheets (Idle, Walk, Run) into player.png."""
    idle = Image.open(SRC / "char/Idle-Sheet.png").convert("RGBA")
    walk = Image.open(SRC / "char/Walk-Sheet.png").convert("RGBA")
    run = Image.open(SRC / "char/Run-Sheet.png").convert("RGBA")

    fw, fh = 32, 32
    rows_spec = [
        ("idle_down", idle, 0, 4, [210, 210, 210, 210]),
        ("idle_right", idle, 2, 4, [210, 210, 210, 210]),
        ("idle_up", idle, 4, 4, [210, 210, 210, 210]),
        ("walk_down", walk, 0, 4, [135, 135, 135, 135]),
        ("walk_right", walk, 2, 4, [135, 135, 135, 135]),
        ("walk_up", walk, 4, 4, [135, 135, 135, 135]),
        ("run_down", run, 0, 6, [85, 85, 85, 85, 85, 85]),
        ("run_right", run, 2, 6, [85, 85, 85, 85, 85, 85]),
        ("run_up", run, 4, 6, [85, 85, 85, 85, 85, 85]),
    ]

    max_cols = 6
    sheet = Image.new("RGBA", (fw * max_cols, fh * len(rows_spec)), (0, 0, 0, 0))
    clips = {}

    for row_idx, (clip_name, src_img, src_row, n_frames, durations) in enumerate(rows_spec):
        for col in range(n_frames):
            frame = src_img.crop((col * fw, src_row * fh, (col + 1) * fw, (src_row + 1) * fh))
            sheet.paste(frame, (col * fw, row_idx * fh), frame)
        clips[clip_name] = {
            "row": row_idx,
            "frames": n_frames,
            "frameDurationsMs": durations,
            "loop": True,
        }

    SPRITE_OUT.mkdir(parents=True, exist_ok=True)
    sheet.save(SPRITE_OUT / "player.png")

    return {
        "id": "player",
        "imageSrc": "assets/game/sprites/player.png",
        "frameWidth": fw,
        "frameHeight": fh,
        "anchorX": 0.5,
        "anchorY": 0.94,
        "mirrorRightToLeft": True,
        "clips": clips,
    }


def extract_tree_and_prop_sprites() -> dict[str, dict]:
    """Extract varied tree sizes/stages & bushes as Y-sortable animated sprites for SpriteManager."""
    m1_s2 = Image.open(SRC / "tree/Model_01_Size_02.png").convert("RGBA")
    m1_s3 = Image.open(SRC / "tree/Model_01_Size_03.png").convert("RGBA")
    m1_s4 = Image.open(SRC / "tree/Model_01_Size_04.png").convert("RGBA")
    m2_s2 = Image.open(SRC / "tree/Model_02_Size_02.png").convert("RGBA")
    m2_s3 = Image.open(SRC / "tree/Model_02_Size_03.png").convert("RGBA")
    m3_s3 = Image.open(SRC / "tree/Model_03_Size_03.png").convert("RGBA")
    veg = Image.open(SRC / "tree/Vegetation.png").convert("RGBA")
    int_props = Image.open(SRC / "props/Interior_Props_01.png").convert("RGBA")

    extractions = [
        # Broadleaf Oaks (Model 01 — Sizes 02, 03, 04 + Green / Olive-Gold / Autumn stages)
        ("tree_oak_lg", m1_s4, 0, 0, 5, 8, 0.5, 0.96),
        ("tree_oak_gold_lg", m1_s4, 5, 0, 5, 8, 0.5, 0.96),
        ("tree_oak_md", m1_s3, 0, 0, 3, 6, 0.5, 0.96),
        ("tree_oak_gold", m1_s3, 3, 0, 3, 6, 0.5, 0.96),
        ("tree_oak_autumn", m1_s3, 0, 6, 3, 6, 0.5, 0.96),
        ("tree_oak_sm", m1_s2, 0, 0, 4, 4, 0.5, 0.94),
        ("tree_oak_gold_sm", m1_s2, 4, 0, 4, 4, 0.5, 0.94),
        # Cypress / Pines (Model 02 — Sizes 02 & 03)
        ("tree_pine_md", m2_s3, 3, 0, 3, 5, 0.5, 0.96),
        ("tree_pine_teal", m2_s3, 0, 0, 3, 5, 0.5, 0.96),
        ("tree_pine_dark", m2_s3, 3, 5, 3, 5, 0.5, 0.96),
        ("tree_pine_sm", m2_s2, 0, 3, 2, 3, 0.5, 0.95),
        # Tall Majestic Spruces (Model 03 — Size 03)
        ("tree_spruce_tall", m3_s3, 0, 0, 4, 9, 0.45, 0.97),
        ("tree_spruce_gold", m3_s3, 4, 0, 4, 9, 0.45, 0.97),
        # Stump
        ("stump_oak", m1_s3, 12, 0, 1, 2, 0.5, 0.92),
        # Varied Bushes (Vegetation.png — green, olive, gold, autumn)
        ("bush_green_lg", veg, 0, 6, 3, 3, 0.5, 0.88),
        ("bush_olive_lg", veg, 3, 6, 3, 3, 0.5, 0.88),
        ("bush_gold_lg", veg, 6, 6, 3, 3, 0.5, 0.88),
        ("bush_green_md", veg, 0, 2, 3, 2, 0.5, 0.88),
        ("bush_olive_md", veg, 3, 2, 3, 2, 0.5, 0.88),
        ("bush_gold_md", veg, 6, 2, 3, 2, 0.5, 0.88),
        ("bush_autumn_md", veg, 9, 2, 3, 2, 0.5, 0.88),
        ("bush_sm", veg, 12, 3, 2, 2, 0.5, 0.85),
        # Potted indoor plants from Interior_Props_01.png
        ("plant_orchid", int_props, 1, 22, 1, 2, 0.5, 0.95),
        ("plant_fern", int_props, 2, 22, 1, 2, 0.5, 0.95),
        ("plant_leafy", int_props, 3, 22, 1, 2, 0.5, 0.95),
    ]

    entries: dict[str, dict] = {}
    for sid, src_img, col, row, wt, ht, ax, ay in extractions:
        crop = crop_tiles(src_img, col, row, wt, ht)
        is_foliage = sid.startswith("tree_") or sid.startswith("bush_")
        if is_foliage:
            # Add 2px transparent horizontal padding on BOTH sides so +1px/-1px wind sway NEVER clips edge pixels!
            pad_x = 2
            fw, fh = crop.width + pad_x * 2, crop.height
            base_frame = Image.new("RGBA", (fw, fh), (0, 0, 0, 0))
            base_frame.paste(crop, (pad_x, 0), crop)

            split_y = int(fh * 0.68)
            upper = crop.crop((0, 0, crop.width, split_y))
            lower = crop.crop((0, split_y, crop.width, fh))
            swayed = Image.new("RGBA", (fw, fh), (0, 0, 0, 0))
            swayed.paste(lower, (pad_x, split_y), lower)
            swayed.paste(upper, (pad_x + 1, 0), upper)

            sheet = Image.new("RGBA", (fw * 2, fh), (0, 0, 0, 0))
            sheet.paste(base_frame, (0, 0), base_frame)
            sheet.paste(swayed, (fw, 0), swayed)
            sheet.save(SPRITE_OUT / f"{sid}.png")
            clips = {
                "default": {
                    "row": 0,
                    "frames": 2,
                    "frameDurationsMs": [1100, 950],
                    "loop": True,
                }
            }
        else:
            fw, fh = crop.width, crop.height
            crop.save(SPRITE_OUT / f"{sid}.png")
            clips = {
                "default": {
                    "row": 0,
                    "frames": 1,
                    "frameDurationsMs": [1000],
                    "loop": True,
                }
            }

        entries[sid] = {
            "id": sid,
            "imageSrc": f"assets/game/sprites/{sid}.png",
            "frameWidth": fw,
            "frameHeight": fh,
            "anchorX": ax,
            "anchorY": ay,
            "mirrorRightToLeft": False,
            "clips": clips,
        }
    return entries


def build_winding_trail_tiles() -> set[tuple[int, int]]:
    """Organic winding dirt trail from the southern garden entrance through the tree avenue up to the porch."""
    dirt: set[tuple[int, int]] = set()
    center_by_y = {
        29: 11, 28: 11, 27: 11,
        26: 12, 25: 13, 24: 13, 23: 13,
        22: 12, 21: 11, 20: 10, 19: 10,
        18: 11, 17: 11,
    }
    for y, cx in center_by_y.items():
        for dx in (-1, 0, 1):
            dirt.add((cx + dx, y))

    # Scenic east garden dirt path branching toward the bench clearing & future Saigon Town gate
    for x in range(14, 41):
        cy = 23 if x < 24 else (24 if x < 33 else 23)
        dirt.add((x, cy))
        dirt.add((x, cy + 1))

    # Cozy sunlit clearing around the wooden garden bench
    for y in range(20, 23):
        for x in range(26, 31):
            dirt.add((x, y))

    return dirt


def build_maps() -> None:
    rng = random.Random(42)

    floors = Image.open(SRC / "tiles/Floors_Tiles.png").convert("RGBA")
    int_walls = Image.open(SRC / "tiles/Interior_Walls_01.png").convert("RGBA")
    ext_walls = Image.open(SRC / "tiles/Walls.png").convert("RGBA")
    roofs = Image.open(SRC / "tiles/Roofs.png").convert("RGBA")
    ext_props = Image.open(SRC / "props/Props.png").convert("RGBA")
    int_props = Image.open(SRC / "props/Interior_Props_01.png").convert("RGBA")
    workbench = Image.open(SRC / "props/Workbench.png").convert("RGBA")
    cooking = Image.open(SRC / "props/Cooking_Station.png").convert("RGBA")
    veg = Image.open(SRC / "tree/Vegetation.png").convert("RGBA")

    ground = Image.new("RGBA", (WORLD_W, WORLD_H), (36, 72, 22, 255))
    fg = Image.new("RGBA", (WORLD_W, WORLD_H), (0, 0, 0, 0))

    # 1. PURE SOLID LUSH GRASS BASE (zero black corner tiles!)
    grass_variants = [(2, 4), (1, 5), (2, 5), (3, 5), (1, 10), (2, 10), (3, 10), (1, 11), (2, 11), (3, 11)]
    dirt_variants = [(2, 4)]  # overridden below
    dirt_variants = [(12, 4), (11, 5), (12, 5), (13, 5), (11, 10), (12, 10), (13, 10)]
    cobble_variants = [(16, 1), (17, 1), (18, 1), (16, 2), (17, 2), (18, 2), (16, 3), (17, 3), (18, 3)]

    for y in range(H_TILES):
        for x in range(W_TILES):
            gc, gr = rng.choice(grass_variants)
            paste_tile(ground, floors, x, y, gc, gr)

    # 2. WINDING ORGANIC DIRT TRAIL + FEATHERED GRASS OVERLAYS
    dirt_set = build_winding_trail_tiles()

    for (x, y) in dirt_set:
        dc, dr = rng.choice(dirt_variants)
        paste_tile(ground, floors, x, y, dc, dr)

    for (x, y) in dirt_set:
        if not (x, y - 1) in dirt_set:
            paste_tile(ground, floors, x, y, 2, 1)
        if not (x, y + 1) in dirt_set:
            paste_tile(ground, floors, x, y, 2, 3)
        if not (x - 1, y) in dirt_set:
            paste_tile(ground, floors, x, y, 1, 2)
        if not (x + 1, y) in dirt_set:
            paste_tile(ground, floors, x, y, 3, 2)

    # Cobblestone front patio outside entrance doorway (x=9..13, y=16..17)
    for y in range(16, 18):
        for x in range(9, 14):
            cc, cr = rng.choice(cobble_variants)
            paste_tile(ground, floors, x, y, cc, cr)

    # Stepping stones scattered organically along the dirt trail
    stone_spots = [
        (11, 27, 15, 25), (12, 25, 16, 25), (13, 23, 17, 25),
        (11, 21, 15, 26), (10, 19, 16, 26), (11, 18, 16, 25),
        (17, 23, 15, 25), (22, 24, 16, 25), (28, 24, 17, 25), (34, 23, 15, 26),
    ]
    for (sx, sy, vc, vr) in stone_spots:
        paste_tile(ground, veg, sx, sy, vc, vr)

    # Wildflowers, clovers, grass tufts & cute mushrooms across the garden lawn
    flowers = [
        (4, 23), (5, 23), (6, 23), (7, 23),
        (4, 24), (5, 24), (6, 24), (7, 24),
        (4, 25), (5, 25), (6, 25), (7, 25),
        (4, 26), (5, 26), (6, 26), (7, 26),
        (0, 9), (1, 9), (2, 9), (0, 10), (1, 10),
        (1, 21), (2, 21), (0, 22),
    ]
    for y in range(17, 29):
        for x in range(2, 42):
            if (x, y) in dirt_set or (9 <= x <= 14 and 16 <= y <= 17):
                continue
            if rng.random() < 0.24:
                fc, fr = rng.choice(flowers)
                paste_tile(ground, veg, x, y, fc, fr)

    # Tall ferns & purple foxgloves nestled near the cottage & garden edges
    tall_plants = [
        (7, 17, 12, 10, 1, 2), (15, 17, 13, 10, 1, 2), (20, 17, 12, 10, 1, 2),
        (25, 17, 8, 10, 1, 2), (32, 17, 13, 10, 1, 2), (38, 17, 12, 10, 1, 2),
        (8, 21, 7, 10, 1, 2), (15, 20, 8, 10, 1, 2), (16, 26, 12, 10, 1, 2),
        (7, 26, 7, 10, 1, 2), (23, 21, 13, 10, 1, 2), (34, 21, 8, 10, 1, 2),
    ]
    for (tx, ty, vc, vr, vw, vh) in tall_plants:
        paste_tile(ground, veg, tx, ty, vc, vr, vw, vh)

    # 3. DOM'S LONG CONNECTED HOUSE (x=3..40, y=2..15)
    for y in range(2, 16):
        for x in range(3, 41):
            patch = Image.new("RGBA", (TS, TS), (28, 24, 22, 255))
            ground.alpha_composite(patch, (x * TS, y * TS))

    # Room 1 Floor — Living Room Exhibition Gallery (clean warm wood planks: cols 1..3, rows 36..38)
    for y in range(5, 14):
        for x in range(4, 19):
            paste_tile(ground, int_walls, x, y, 1 + ((x - 4) % 3), 36 + ((y - 5) % 3))

    # Smooth wooden doorway archway Room 1 <-> Room 2 (x=19, y=7..9)
    for y in range(7, 10):
        paste_tile(ground, int_walls, 19, y, 2, 37)

    # Room 2 Floor — Kitchen & Dining (clean stone tiles: cols 6..8, rows 36..38)
    for y in range(5, 14):
        for x in range(20, 29):
            paste_tile(ground, int_walls, x, y, 6 + ((x - 20) % 3), 36 + ((y - 5) % 3))

    # Smooth wooden doorway archway Room 2 <-> Room 3 (x=29, y=7..9)
    for y in range(7, 10):
        paste_tile(ground, int_walls, 29, y, 2, 37)

    # Room 3 Floor — Dom's Studio & Bedroom (clean herringbone parquet: cols 11..13, rows 36..38)
    for y in range(5, 14):
        for x in range(30, 40):
            paste_tile(ground, int_walls, x, y, 11 + ((x - 30) % 3), 36 + ((y - 5) % 3))

    # Front Doorway wooden floor threshold (x=10..12, y=14..15)
    for y in range(14, 16):
        for x in range(10, 13):
            paste_tile(ground, int_walls, x, y, 2, 37)

    # Interior North Walls (y=3..4 — 2 tiles tall)
    for x in range(4, 19):
        col = 31 + ((x - 4) % 4)
        paste_tile(ground, int_walls, x, 3, col, 6)
        paste_tile(ground, int_walls, x, 4, col, 7)

    for x in range(20, 29):
        col = 7 + ((x - 20) % 4)
        paste_tile(ground, int_walls, x, 3, col, 20)
        paste_tile(ground, int_walls, x, 4, col, 21)

    for x in range(30, 40):
        col = 25 + ((x - 30) % 4)
        paste_tile(ground, int_walls, x, 3, col, 6)
        paste_tile(ground, int_walls, x, 4, col, 7)

    # Vertical perimeter & divider wood walls
    for y in range(3, 14):
        paste_tile(ground, int_walls, 3, y, 24, 2)
        paste_tile(ground, int_walls, 40, y, 29, 2)
        if y not in (7, 8, 9):
            paste_tile(ground, int_walls, 19, y, 29, 2)
            paste_tile(ground, int_walls, 29, y, 29, 2)

    # Exterior Front Facade Wall (cream plaster + terracotta brick base, Walls.png cols 31..33, rows 13..14)
    for x in range(3, 41):
        if x in (10, 11, 12):
            continue
        wcol = 31 + (x % 3)
        paste_tile(ground, ext_walls, x, 14, wcol, 13)
        paste_tile(ground, ext_walls, x, 15, wcol, 14)

    # Arched timber front doorway (x=10..11, y=13..15) + matching side post at x=12
    paste_tile(ground, ext_props, 10, 13, 2, 1, 2, 3)
    paste_tile(ground, ext_walls, 12, 14, 31, 13)
    paste_tile(ground, ext_walls, 12, 15, 31, 14)

    # Green Saigon shuttered windows + lush overflowing flowerboxes (Props.png col 3..4, row 10!)
    facade_windows = [5, 15, 22, 26, 32, 36]
    for wx in facade_windows:
        paste_tile(ground, ext_props, wx, 14, 8, 4, 2, 2)
        if wx in (5, 15, 32, 36):
            paste_tile(ground, ext_props, wx, 16, 3, 10, 2, 1)

    # Compact emerald porch awning cleanly over the exterior doorframe (y=13..14, rows 11..12)
    paste_tile(fg, roofs, 9, 13, 10, 11, 4, 2)

    # Full emerald shingle roof crowning the top of the entire estate (x=3..40, y=0..2)
    for rx in range(3, 38, 4):
        paste_tile(ground, roofs, rx, 0, 10, 10, 4, 3)
    paste_tile(ground, roofs, 37, 0, 10, 10, 4, 3)

    # 4. INTERIOR RUGS, FURNITURE & PROPS (Pixel-exact clean cuts!)

    # --- ROOM 1: LONG EXHIBITION GALLERY (x=4..18) ---
    # Plush woven center rug under Exhibition Catalog Table
    paste_tile(ground, int_props, 9, 6, 27, 19, 5, 5)
    # Green-gold accent rug under west & east gallery benches
    paste_tile(ground, int_props, 5, 7, 21, 21, 3, 3)
    paste_tile(ground, int_props, 15, 7, 21, 21, 3, 3)

    # Symmetrical Gallery Catalog Display Table with royal-blue cloth (x=10..12, y=8..9)
    paste_tile(ground, int_props, 10, 8, 14, 0, 3, 2)
    # Gallery visitor benches
    paste_tile(ground, int_props, 5, 8, 8, 19, 3, 1)
    paste_tile(ground, int_props, 15, 8, 5, 19, 3, 1)

    # Postcard Merch Wooden Display Table (clean 3x2 cream-cloth counter at x=6..8, y=12..13)
    paste_tile(ground, int_props, 6, 12, 27, 1, 3, 2)
    # Tall Sketchbook Bookshelf (clean full 3x3 wooden shelving unit at x=4..6, y=10..12 -> put at west wall x=4..5!)
    paste_tile(ground, int_props, 4, 11, 2, 6, 3, 3)
    # Wait: move Merch counter right to x=8..10? No, keep doorway x=10..11 clear!
    # Let's place Bookshelf at x=4..6, y=11..13? No, keep Merch at x=14..16, y=12..13 (east side of entrance!)
    # Re-clear x=6..8, y=12..13 cleanly and put Merch at x=14..16, y=12..13!
    for y in range(12, 14):
        for x in range(6, 9):
            paste_tile(ground, int_walls, x, y, 1 + ((x - 4) % 3), 36 + ((y - 5) % 3))
    paste_tile(ground, int_props, 4, 11, 3, 6, 3, 3)       # Sketchbook Bookshelf (x=4..6, y=11..13)
    paste_tile(ground, int_props, 14, 12, 27, 1, 3, 2)     # Postcard Merch Display Table (x=14..16, y=12..13)

    # --- ROOM 2: COZY KITCHEN & DINING HALL (x=20..28) ---
    # Deluxe Cooking Station (stove + sink + utensil rack: x=20..24, y=3..7)
    paste_tile(ground, cooking, 20, 3, 13, 4, 5, 5)
    # Cozy Brick Hearth / Oven (x=26..28, y=2..7)
    paste_tile(ground, int_props, 26, 2, 24, 3, 3, 6)
    # Kitchen counter + sink along south wall (x=20..24, y=12..13)
    paste_tile(ground, int_props, 20, 12, 7, 14, 5, 2)
    # Long cozy wooden dining table with chairs (x=22..25, y=9..10)
    paste_tile(ground, int_props, 22, 9, 23, 0, 4, 2)
    paste_tile(ground, int_props, 21, 9, 4, 0, 1, 2)
    paste_tile(ground, int_props, 23, 11, 5, 4, 1, 1)
    paste_tile(ground, int_props, 25, 11, 6, 4, 1, 1)
    # Wooden barrel & crate in southeast kitchen corner (x=28, y=12..13)
    paste_tile(ground, int_props, 28, 12, 13, 7, 1, 2)

    # --- ROOM 3: DOM'S STUDIO, HOBBY & BEDROOM (x=30..39) ---
    # Woven studio rug in center (x=32..36, y=8..12)
    paste_tile(ground, int_props, 32, 8, 27, 19, 5, 5)
    # Behind-the-Scenes Chalkboard on north studio wall (x=31..32, y=3..4)
    paste_tile(ground, int_props, 31, 3, 14, 16, 2, 2)
    # Framed mini painting + Hobby wall cabinet (x=34..36, y=3..4)
    paste_tile(ground, int_props, 34, 3, 5, 20, 1, 1)
    paste_tile(ground, int_props, 35, 3, 11, 9, 2, 2)
    # Clean 2x2 sunlit arched bedroom window (Props.png cols 6..7, rows 4..5)
    paste_tile(ground, ext_props, 37, 3, 6, 4, 2, 2)

    # Real Artist Craft Workbench (Dom's Studio Desk: x=30..34, y=5..7)
    paste_tile(ground, workbench, 30, 5, 6, 0, 5, 3)

    # Real Cozy Wooden Bed with Blue Quilted Blanket (x=37..39, y=5..7)
    paste_tile(ground, int_props, 37, 5, 2, 18, 3, 3)

    # Gaming & Hobby Desk Corner (south-east of bedroom: x=35..37, y=11..12)
    paste_tile(ground, int_props, 35, 11, 7, 6, 3, 2)
    # Wooden hobby chest (x=38..39, y=12..13)
    paste_tile(ground, int_props, 38, 12, 11, 4, 2, 2)

    # 5. GARDEN WOODEN FENCES & BENCH
    for fx in range(4, 9, 2):
        paste_tile(ground, ext_props, fx, 27, 1, 15, 2, 1)
    for fx in range(14, 22, 2):
        paste_tile(ground, ext_props, fx, 27, 1, 15, 2, 1)
    paste_tile(ground, ext_props, 27, 20, 5, 10, 4, 2)

    MAP_OUT.mkdir(parents=True, exist_ok=True)
    ground.save(MAP_OUT / "ground.png")
    fg.save(MAP_OUT / "foreground.png")
    print(f"Composed ground.png & foreground.png ({WORLD_W}x{WORLD_H} px)")


def main() -> None:
    player_meta = build_player_sprite()
    prop_metas = extract_tree_and_prop_sprites()

    manifest = {
        "version": 1,
        "sprites": {
            "player": player_meta,
            **prop_metas,
        },
    }
    (SPRITE_OUT / "manifest.json").write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(f"Wrote sprite manifest with {len(manifest['sprites'])} sprites.")
    build_maps()


if __name__ == "__main__":
    main()
