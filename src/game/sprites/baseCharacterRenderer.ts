/// <reference types="vite/client" />
import {
  ACCESSORY_COLORS,
  BASE_TONES,
  HAIR_COLORS,
  PANTS_COLORS,
  TOP_COLORS,
  findShadeForHex,
} from '../../data/characterOptions';
import type {
  AccessoryStyle,
  CharacterAnimState,
  CharacterAppearance,
  Facing8,
  HairStyle,
  OutfitStyle,
} from '../../types/content';

type Rgb = readonly [number, number, number];

interface AnimSpec {
  file: string;
  frames: number;
  fps: number;
}

const CELL = 32;
const ROWS = 5;
const CACHE_LIMIT = 24;

type BaseSheetAnim = 'idle' | 'walk' | 'run' | 'interact' | 'jump';

const ANIM_SPECS: Record<BaseSheetAnim, AnimSpec> = {
  idle: { file: 'idle.png', frames: 4, fps: 4 },
  walk: { file: 'walk.png', frames: 4, fps: 8 },
  run: { file: 'run.png', frames: 6, fps: 12 },
  interact: { file: 'interact.png', frames: 4, fps: 11 },
  jump: { file: 'jump.png', frames: 5, fps: 11 },
};

const ANIM_STATES: BaseSheetAnim[] = ['idle', 'walk', 'run', 'interact', 'jump'];

function resolveSheetAnim(anim: CharacterAnimState): BaseSheetAnim {
  if (anim === 'walk' || anim === 'run' || anim === 'interact' || anim === 'jump') return anim;
  if (anim === 'work' || anim === 'gaming' || anim === 'play') return 'interact';
  return 'idle';
}

// Exact 5-color palette in Dom's base character PNGs
const BASE_OUTLINE: Rgb = [47, 37, 34]; // #2f2522
const BASE_BRIGHT: Rgb = [250, 243, 232]; // #faf3e8
const BASE_MID: Rgb = [231, 213, 198]; // #e7d5c6
const BASE_DARK: Rgb = [185, 179, 161]; // #b9b3a1
const BASE_BLUSH: Rgb = [209, 157, 167]; // #d19da7

const CREAM_ACCENT: Rgb = [245, 239, 230]; // #f5efe6
const CREAM_SHADE: Rgb = [206, 196, 182]; // #cec4b6
const GOLD_ACCENT: Rgb = [255, 207, 61]; // #ffcf3d
const PAINT_ACCENT: Rgb = [224, 122, 71]; // #e07a47
const SHOE_LIGHT: Rgb = [68, 60, 56]; // #443c38
const SHOE_DARK: Rgb = [48, 41, 38]; // #302926

const FACING_MAP: Record<Facing8, { row: number; flipX: boolean }> = {
  down: { row: 0, flipX: false },
  down_right: { row: 1, flipX: false },
  down_left: { row: 1, flipX: true },
  right: { row: 2, flipX: false },
  left: { row: 2, flipX: true },
  up_right: { row: 3, flipX: false },
  up_left: { row: 3, flipX: true },
  up: { row: 4, flipX: false },
};

type SheetMap = Record<BaseSheetAnim, HTMLCanvasElement>;

const rawSourceData: Partial<Record<BaseSheetAnim, ImageData>> = {};
let loaded = false;
let loadPromise: Promise<void> | null = null;

// LRU cache of composited sheets keyed by serialized CharacterAppearance
const appearanceCache = new Map<string, SheetMap>();

function hexToRgb(hex: string): Rgb {
  const clean = hex.replace('#', '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  const n = parseInt(full, 16);
  if (Number.isNaN(n)) return [250, 243, 232];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function scaleRgb(rgb: Rgb, factor: number): Rgb {
  return [
    Math.max(0, Math.min(255, Math.round(rgb[0] * factor))),
    Math.max(0, Math.min(255, Math.round(rgb[1] * factor))),
    Math.max(0, Math.min(255, Math.round(rgb[2] * factor))),
  ];
}

function blendRgb(a: Rgb, b: Rgb, t: number): Rgb {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

function isColorClose(r: number, g: number, b: number, target: Rgb): boolean {
  return Math.abs(r - target[0]) <= 4 && Math.abs(g - target[1]) <= 4 && Math.abs(b - target[2]) <= 4;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = url;
  });
}

function extractImageData(img: HTMLImageElement): ImageData {
  const c = document.createElement('canvas');
  c.width = img.width;
  c.height = img.height;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('2D Canvas context unavailable');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0);
  return ctx.getImageData(0, 0, c.width, c.height);
}

/**
 * Preloads all 5 base character PNG spritesheets once. Safe to call multiple times.
 */
export function preloadBaseCharacterSheets(): Promise<void> {
  if (loaded) return Promise.resolve();
  if (loadPromise) return loadPromise;

  const base = import.meta.env.BASE_URL || '/';
  loadPromise = Promise.all(
    ANIM_STATES.map(async (anim) => {
      const url = `${base}assets/game/base-character/${ANIM_SPECS[anim].file}`;
      const img = await loadImage(url);
      rawSourceData[anim] = extractImageData(img);
    })
  )
    .then(() => {
      loaded = true;
    })
    .catch((err) => {
      loadPromise = null;
      console.warn('[baseCharacterRenderer] Failed to load base character sheets:', err);
    });

  return loadPromise;
}

export function isBaseCharacterLoaded(): boolean {
  return loaded;
}

interface CellBuffer {
  data: Uint8ClampedArray;
  sheetW: number;
  ox: number;
  oy: number;
}

function setPx(buf: CellBuffer, x: number, y: number, rgb: Rgb, alpha = 255): void {
  if (x < 0 || x >= CELL || y < 0 || y >= CELL) return;
  const i = ((buf.oy + y) * buf.sheetW + (buf.ox + x)) * 4;
  if (alpha >= 255) {
    buf.data[i] = rgb[0];
    buf.data[i + 1] = rgb[1];
    buf.data[i + 2] = rgb[2];
    buf.data[i + 3] = 255;
  } else {
    const a = alpha / 255;
    const inv = 1 - a;
    buf.data[i] = Math.round(buf.data[i] * inv + rgb[0] * a);
    buf.data[i + 1] = Math.round(buf.data[i + 1] * inv + rgb[1] * a);
    buf.data[i + 2] = Math.round(buf.data[i + 2] * inv + rgb[2] * a);
    buf.data[i + 3] = Math.min(255, Math.round(buf.data[i + 3] + alpha * (1 - buf.data[i + 3] / 255)));
  }
}

function fillRectPx(buf: CellBuffer, x: number, y: number, w: number, h: number, rgb: Rgb): void {
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      setPx(buf, x + dx, y + dy, rgb);
    }
  }
}

function setPxOnTorsoFill(
  buf: CellBuffer,
  orig: Uint8ClampedArray,
  x: number,
  y: number,
  rgb: Rgb
): void {
  if (x < 0 || x >= CELL || y < 0 || y >= CELL) return;
  const i = ((buf.oy + y) * buf.sheetW + (buf.ox + x)) * 4;
  if (orig[i + 3] < 128) return;
  if (isColorClose(orig[i], orig[i + 1], orig[i + 2], BASE_OUTLINE)) return;
  buf.data[i] = rgb[0];
  buf.data[i + 1] = rgb[1];
  buf.data[i + 2] = rgb[2];
  buf.data[i + 3] = 255;
}

interface FrameMetrics {
  headTopY: number;
  footY: number;
  cx: number;
  neckY: number;
  waistY: number;
  shoeY: number;
  eyeY: number;
}

function measureFrame(
  orig: Uint8ClampedArray,
  sheetW: number,
  ox: number,
  oy: number,
  row: number
): FrameMetrics {
  let headTopY = 7;
  let footY = 31;
  let foundTop = false;

  for (let y = 0; y < CELL; y++) {
    for (let x = 0; x < CELL; x++) {
      const a = orig[((oy + y) * sheetW + (ox + x)) * 4 + 3];
      if (a > 128) {
        if (!foundTop) {
          headTopY = y;
          foundTop = true;
        }
        footY = y;
      }
    }
  }

  // Measure head horizontal center from top crown row (headTopY)
  let minTopX = CELL;
  let maxTopX = 0;
  for (let x = 0; x < CELL; x++) {
    if (orig[((oy + headTopY) * sheetW + (ox + x)) * 4 + 3] > 128) {
      if (x < minTopX) minTopX = x;
      if (x > maxTopX) maxTopX = x;
    }
  }
  const cx = minTopX <= maxTopX ? Math.floor((minTopX + maxTopX) / 2) : 15;

  const neckY = headTopY + 11;
  const bodySpan = Math.max(1, footY - neckY);
  const waistY = Math.min(footY - 3, neckY + Math.round(bodySpan * 0.62));
  const shoeY = footY <= 27 ? footY - 1 : footY;

  // Detect eye Y on front/side rows for crisp glasses alignment even during jump/interact squints
  let eyeY = headTopY + 7;
  if (row <= 2) {
    let sumY = 0;
    let count = 0;
    for (let y = headTopY + 5; y <= Math.min(headTopY + 9, CELL - 1); y++) {
      for (let x = Math.max(0, cx - 4); x <= Math.min(CELL - 1, cx + 5); x++) {
        const idx = ((oy + y) * sheetW + (ox + x)) * 4;
        if (orig[idx + 3] > 128 && isColorClose(orig[idx], orig[idx + 1], orig[idx + 2], BASE_OUTLINE)) {
          // Ensure it's an interior eye pixel (surrounded by opaque pixels left & right)
          const leftA = orig[((oy + y) * sheetW + (ox + Math.max(0, x - 1))) * 4 + 3];
          const rightA = orig[((oy + y) * sheetW + (ox + Math.min(CELL - 1, x + 1))) * 4 + 3];
          if (leftA > 128 && rightA > 128) {
            sumY += y;
            count++;
          }
        }
      }
    }
    if (count > 0) {
      eyeY = Math.round(sumY / count);
    }
  }

  return { headTopY, footY, cx, neckY, waistY, shoeY, eyeY };
}

interface ResolvedPalette {
  isOriginalCream: boolean;
  skin: Rgb;
  skinShade: Rgb;
  skinDeep: Rgb;
  hair: Rgb;
  hairShade: Rgb;
  hairHi: Rgb;
  top: Rgb;
  topShade: Rgb;
  topHi: Rgb;
  pants: Rgb;
  pantsShade: Rgb;
  pantsHi: Rgb;
  acc: Rgb;
  accShade: Rgb;
  accHi: Rgb;
}

function resolvePalette(appearance: CharacterAppearance): ResolvedPalette {
  const skin = hexToRgb(appearance.baseTone);
  const skinShade = hexToRgb(findShadeForHex(appearance.baseTone, BASE_TONES, '#e7d5c6'));
  const isOriginalCream = appearance.baseTone.toLowerCase() === '#faf3e8';
  const skinDeep: Rgb = isOriginalCream ? BASE_DARK : scaleRgb(skinShade, 0.84);

  const hair = hexToRgb(appearance.hairColor);
  const hairShade = hexToRgb(findShadeForHex(appearance.hairColor, HAIR_COLORS, '#241a17'));
  const hairHi = blendRgb(hair, [255, 250, 240], 0.22);

  const top = hexToRgb(appearance.topColor);
  const topShade = hexToRgb(findShadeForHex(appearance.topColor, TOP_COLORS, '#a8841c'));
  const topHi = blendRgb(top, [255, 252, 242], 0.2);

  const pants = hexToRgb(appearance.pantsColor);
  const pantsShade = hexToRgb(findShadeForHex(appearance.pantsColor, PANTS_COLORS, '#242220'));
  const pantsHi = blendRgb(pants, [255, 255, 255], 0.14);

  const acc = hexToRgb(appearance.accessoryColor);
  const accShade = hexToRgb(findShadeForHex(appearance.accessoryColor, ACCESSORY_COLORS, '#141211'));
  const accHi = blendRgb(acc, [255, 252, 242], 0.24);

  return {
    isOriginalCream,
    skin,
    skinShade,
    skinDeep,
    hair,
    hairShade,
    hairHi,
    top,
    topShade,
    topHi,
    pants,
    pantsShade,
    pantsHi,
    acc,
    accShade,
    accHi,
  };
}

function isBareHandPixel(
  x: number,
  y: number,
  row: number,
  m: FrameMetrics,
  outfitStyle: OutfitStyle
): boolean {
  const dx = x - (m.cx + 0.5);
  const shortSleeve = outfitStyle === 'tee' || outfitStyle === 'overalls' || outfitStyle === 'apron';

  if (row === 0 || row === 4) {
    // Front & back views: outer arms/hands sit at |dx| >= 4
    if (shortSleeve && y >= m.neckY + 4 && Math.abs(dx) >= 3.8) return true;
    if (y >= m.waistY - 1 && Math.abs(dx) >= 4.0) return true;
    return false;
  }

  if (row === 1) {
    // Down-right: near arm hangs on left (dx <= -2.5), far arm on right (dx >= 3.0)
    if (shortSleeve && y >= m.neckY + 5 && (dx <= -2.5 || dx >= 3.2)) return true;
    if (y >= m.waistY - 1 && (dx <= -2.5 || dx >= 3.0)) return true;
    return false;
  }

  if (row === 2) {
    // Pure side (facing right): near hand hangs at x <= cx - 2 around waist
    if (shortSleeve && y >= m.neckY + 5 && dx <= -2.0) return true;
    if (y >= m.waistY - 1 && dx <= -2.0) return true;
    return false;
  }

  // row === 3 (up-right): far arm left (dx <= -3.5), near arm right (dx >= 3.5)
  if (shortSleeve && y >= m.neckY + 5 && Math.abs(dx) >= 3.5) return true;
  if (y >= m.waistY - 1 && Math.abs(dx) >= 3.5) return true;
  return false;
}

function remapBaseBody(
  buf: CellBuffer,
  orig: Uint8ClampedArray,
  row: number,
  m: FrameMetrics,
  pal: ResolvedPalette,
  outfitStyle: OutfitStyle
): void {
  const longHem = outfitStyle === 'hoodie' || outfitStyle === 'jacket';

  for (let y = 0; y < CELL; y++) {
    for (let x = 0; x < CELL; x++) {
      const idx = ((buf.oy + y) * buf.sheetW + (buf.ox + x)) * 4;
      if (orig[idx + 3] < 128) continue;

      const r = orig[idx];
      const g = orig[idx + 1];
      const b = orig[idx + 2];

      // Preserve outlines, eyes, and rosy blush 100%
      if (isColorClose(r, g, b, BASE_OUTLINE) || isColorClose(r, g, b, BASE_BLUSH)) {
        continue;
      }

      const isBright = isColorClose(r, g, b, BASE_BRIGHT);
      const isMid = isColorClose(r, g, b, BASE_MID);
      const isDark = isColorClose(r, g, b, BASE_DARK);

      // 1. Head & neck
      if (y <= m.neckY) {
        if (isBright) setPx(buf, x, y, pal.skin);
        else if (isMid) setPx(buf, x, y, pal.skinShade);
        else if (isDark) setPx(buf, x, y, pal.skinDeep);
        continue;
      }

      // 2. Shoes at bottom of feet
      if (y >= m.shoeY) {
        setPx(buf, x, y, isDark ? SHOE_DARK : SHOE_LIGHT);
        continue;
      }

      // 3. Legs / Pants
      if (y > m.waistY) {
        // Legs in Dom's sheet are primarily BASE_DARK (#b9b3a1); map main leg fill to pantsColor
        // and add subtle shading on the outer/shadow column so pants swatches pop clearly!
        const isEdgeShadow = x <= m.cx - 2 || (row === 1 && x >= m.cx + 2);
        if (isBright) {
          setPx(buf, x, y, pal.pantsHi);
        } else if (isMid) {
          setPx(buf, x, y, pal.pants);
        } else {
          setPx(buf, x, y, isEdgeShadow ? pal.pantsShade : pal.pants);
        }
        continue;
      }

      // 4. Torso & arms (neckY < y <= waistY)
      if (isBareHandPixel(x, y, row, m, outfitStyle)) {
        if (isBright) setPx(buf, x, y, pal.skin);
        else if (isMid) setPx(buf, x, y, pal.skinShade);
        else if (isDark) setPx(buf, x, y, pal.skinDeep);
        continue;
      }

      // Waistband row (y === waistY)
      const dx = x - (m.cx + 0.5);
      if (y === m.waistY && Math.abs(dx) <= 3.2) {
        setPx(buf, x, y, longHem ? pal.topShade : pal.pantsShade);
        continue;
      }

      // Shirt / Hoodie / Jacket torso fill
      if (isBright) {
        setPx(buf, x, y, pal.top);
      } else if (isMid || isDark) {
        setPx(buf, x, y, pal.topShade);
      }
    }
  }
}

function drawOutfitDetails(
  buf: CellBuffer,
  orig: Uint8ClampedArray,
  row: number,
  m: FrameMetrics,
  pal: ResolvedPalette,
  outfitStyle: OutfitStyle
): void {
  const { cx, neckY, waistY } = m;
  const paint = (x: number, y: number, rgb: Rgb) => setPxOnTorsoFill(buf, orig, x, y, rgb);

  switch (outfitStyle) {
    case 'tee': {
      // Subtle crewneck skin notch on front views + clean bottom hem shade
      if (row === 0) {
        paint(cx, neckY + 1, pal.skinShade);
        paint(cx + 1, neckY + 1, pal.skinShade);
      } else if (row === 1) {
        paint(cx + 1, neckY + 1, pal.skinShade);
      }
      for (let x = cx - 3; x <= cx + 4; x++) {
        paint(x, waistY - 1, pal.topShade);
      }
      break;
    }

    case 'hoodie': {
      // Cozy ribbed hood collar
      for (let x = cx - 2; x <= cx + 3; x++) {
        paint(x, neckY + 1, pal.topShade);
      }
      if (row === 0) {
        // Drawstrings
        paint(cx, neckY + 2, CREAM_ACCENT);
        paint(cx + 1, neckY + 2, CREAM_ACCENT);
        paint(cx, neckY + 3, CREAM_SHADE);
        paint(cx + 1, neckY + 3, CREAM_SHADE);
        // Kangaroo pocket
        for (let x = cx - 1; x <= cx + 2; x++) {
          paint(x, waistY - 2, pal.topShade);
          paint(x, waistY - 1, pal.topHi);
        }
      } else if (row === 1) {
        paint(cx + 1, neckY + 2, CREAM_ACCENT);
        paint(cx + 1, neckY + 3, CREAM_SHADE);
        for (let x = cx; x <= cx + 2; x++) {
          paint(x, waistY - 2, pal.topShade);
          paint(x, waistY - 1, pal.topHi);
        }
      } else if (row === 3 || row === 4) {
        // Draped hood folded on upper back
        for (let x = cx - 2; x <= cx + 3; x++) {
          paint(x, neckY + 1, pal.topHi);
          paint(x, neckY + 2, pal.topShade);
        }
        for (let x = cx - 1; x <= cx + 2; x++) {
          paint(x, neckY + 3, pal.topShade);
        }
      }
      break;
    }

    case 'overalls': {
      // Overalls bib in pantsColor + straps + brass buttons
      const bibTop = neckY + 3;
      for (let y = bibTop; y <= waistY; y++) {
        const minX = row === 2 ? cx : cx - 2;
        const maxX = row === 2 ? cx + 2 : cx + 3;
        for (let x = minX; x <= maxX; x++) {
          paint(x, y, y === waistY ? pal.pantsShade : pal.pants);
        }
      }
      // Straps over shoulders
      if (row === 0 || row === 4) {
        for (let y = neckY + 1; y <= bibTop; y++) {
          paint(cx - 2, y, pal.pants);
          paint(cx + 3, y, pal.pants);
        }
        if (row === 0) {
          paint(cx - 2, bibTop, GOLD_ACCENT);
          paint(cx + 3, bibTop, GOLD_ACCENT);
          // Front bib pocket
          paint(cx, bibTop + 1, pal.pantsShade);
          paint(cx + 1, bibTop + 1, pal.pantsShade);
        }
      } else if (row === 1 || row === 3) {
        for (let y = neckY + 1; y <= bibTop; y++) {
          paint(cx - 1, y, pal.pants);
          paint(cx + 2, y, pal.pants);
        }
        if (row === 1) {
          paint(cx - 1, bibTop, GOLD_ACCENT);
          paint(cx + 2, bibTop, GOLD_ACCENT);
        }
      } else {
        // Side row 2
        for (let y = neckY + 1; y <= bibTop; y++) {
          paint(cx + 1, y, pal.pants);
        }
        paint(cx + 1, bibTop, GOLD_ACCENT);
      }
      break;
    }

    case 'jacket': {
      // Open-front jacket showing a warm cream tee inside with crisp lapels
      if (row === 0) {
        for (let y = neckY + 1; y <= waistY; y++) {
          paint(cx, y, y === waistY ? CREAM_SHADE : CREAM_ACCENT);
          paint(cx + 1, y, y === waistY ? CREAM_SHADE : CREAM_ACCENT);
          paint(cx - 1, y, pal.topShade);
          paint(cx + 2, y, pal.topShade);
        }
      } else if (row === 1) {
        for (let y = neckY + 1; y <= waistY; y++) {
          paint(cx + 1, y, y === waistY ? CREAM_SHADE : CREAM_ACCENT);
          paint(cx, y, pal.topShade);
          paint(cx + 2, y, pal.topShade);
        }
      } else if (row === 2) {
        for (let y = neckY + 1; y <= waistY - 1; y++) {
          paint(cx + 2, y, CREAM_ACCENT);
          paint(cx + 1, y, pal.topShade);
        }
      } else {
        // Back jacket seam & hem cuff
        for (let x = cx - 3; x <= cx + 4; x++) {
          paint(x, waistY - 1, pal.topShade);
        }
        paint(cx, neckY + 1, pal.topShade);
        paint(cx + 1, neckY + 1, pal.topShade);
      }
      break;
    }

    case 'apron': {
      // Cozy artist studio apron in canvas cream with tiny paint-dot pocket!
      const bibTop = neckY + 2;
      if (row <= 2) {
        const minX = row === 0 ? cx - 2 : row === 1 ? cx - 1 : cx;
        const maxX = row === 0 ? cx + 3 : row === 1 ? cx + 2 : cx + 2;
        for (let y = bibTop; y <= waistY; y++) {
          for (let x = minX; x <= maxX; x++) {
            const isEdge = x === minX || x === maxX || y === waistY;
            paint(x, y, isEdge ? CREAM_SHADE : CREAM_ACCENT);
          }
        }
        // Neck loop
        paint(cx, neckY + 1, CREAM_SHADE);
        paint(cx + 1, neckY + 1, CREAM_SHADE);
        // Cute artist paint smudges / pocket on front
        if (row === 0) {
          paint(cx - 1, waistY - 2, CREAM_SHADE);
          paint(cx, waistY - 2, GOLD_ACCENT);
          paint(cx + 1, waistY - 2, PAINT_ACCENT);
          paint(cx + 2, waistY - 2, CREAM_SHADE);
        } else if (row === 1) {
          paint(cx, waistY - 2, GOLD_ACCENT);
          paint(cx + 1, waistY - 2, PAINT_ACCENT);
        }
      } else {
        // Back apron waist tie bow
        for (let x = cx - 2; x <= cx + 3; x++) {
          paint(x, waistY - 2, CREAM_ACCENT);
        }
        paint(cx, waistY - 1, CREAM_SHADE);
        paint(cx + 1, waistY - 1, CREAM_SHADE);
      }
      break;
    }
  }
}

/**
 * Draws a crisp outlined pixel band at row `y` from `x1`..`x2` inclusive,
 * placing `#2f2522` border on the outer ends if requested.
 */
function hairSpan(
  buf: CellBuffer,
  y: number,
  x1: number,
  x2: number,
  fill: Rgb,
  outlineEnds = true
): void {
  if (outlineEnds) {
    setPx(buf, x1, y, BASE_OUTLINE);
    setPx(buf, x2, y, BASE_OUTLINE);
    for (let x = x1 + 1; x <= x2 - 1; x++) setPx(buf, x, y, fill);
  } else {
    for (let x = x1; x <= x2; x++) setPx(buf, x, y, fill);
  }
}

function drawHair(
  buf: CellBuffer,
  row: number,
  m: FrameMetrics,
  pal: ResolvedPalette,
  hairStyle: HairStyle
): void {
  if (hairStyle === 'none') return;

  const { cx, headTopY: hy } = m;
  const h = pal.hair;
  const hs = pal.hairShade;
  const hi = pal.hairHi;

  // Helper for common rounded top crown cap (rows hy-1..hy+3)
  const drawCrown = (wide: boolean) => {
    const pad = wide ? 1 : 0;
    // Top outline at hy - 1
    for (let x = cx - 3 - pad; x <= cx + 4 + pad; x++) setPx(buf, x, hy - 1, BASE_OUTLINE);
    // Upper crown
    hairSpan(buf, hy, cx - 5 - pad, cx + 6 + pad, h);
    hairSpan(buf, hy + 1, cx - 6 - pad, cx + 7 + pad, h);
    hairSpan(buf, hy + 2, cx - 6 - pad, cx + 7 + pad, h);
    // Specular shine pixels on crown
    setPx(buf, cx - 2, hy + 1, hi);
    setPx(buf, cx - 1, hy + 1, hi);
    setPx(buf, cx + 2, hy + 1, hi);
  };

  // Helper for full back-of-head hair coverage (rows 3 & 4)
  const drawBackCap = (bottomOffset: number, wide = false) => {
    const pad = wide ? 1 : 0;
    drawCrown(wide);
    for (let dy = 3; dy <= bottomOffset; dy++) {
      const shrink = dy >= bottomOffset - 1 ? 1 : 0;
      const x1 = cx - 6 - pad + shrink;
      const x2 = cx + 7 + pad - shrink;
      hairSpan(buf, hy + dy, x1, x2, dy >= bottomOffset - 2 ? hs : h);
      // Subtle vertical texture stripes
      if (dy >= 4 && dy < bottomOffset) {
        setPx(buf, cx - 2, hy + dy, hs);
        setPx(buf, cx + 3, hy + dy, hs);
      }
    }
    // Crisp bottom outline
    for (let x = cx - 4 - pad; x <= cx + 5 + pad; x++) {
      setPx(buf, x, hy + bottomOffset + 1, BASE_OUTLINE);
    }
  };

  switch (hairStyle) {
    case 'short': {
      if (row === 4) {
        drawBackCap(8);
        return;
      }
      if (row === 3) {
        drawBackCap(8);
        return;
      }
      drawCrown(false);
      if (row === 0) {
        // Textured cozy bangs above eyes (leaves hy+5..hy+8 open for face/eyes!)
        hairSpan(buf, hy + 3, cx - 6, cx + 7, h);
        // Jagged bangs tips at hy+4
        setPx(buf, cx - 5, hy + 4, BASE_OUTLINE);
        setPx(buf, cx - 4, hy + 4, hs);
        setPx(buf, cx - 3, hy + 4, h);
        setPx(buf, cx - 1, hy + 4, hs);
        setPx(buf, cx, hy + 4, h);
        setPx(buf, cx + 2, hy + 4, hs);
        setPx(buf, cx + 3, hy + 4, h);
        setPx(buf, cx + 5, hy + 4, hs);
        setPx(buf, cx + 6, hy + 4, BASE_OUTLINE);
        // Tiny sideburn tufts
        setPx(buf, cx - 6, hy + 5, BASE_OUTLINE);
        setPx(buf, cx - 5, hy + 5, hs);
        setPx(buf, cx + 6, hy + 5, hs);
        setPx(buf, cx + 7, hy + 5, BASE_OUTLINE);
      } else {
        // Rows 1 & 2 (facing right): back hair on left, swept bangs on right
        hairSpan(buf, hy + 3, cx - 6, cx + 6, h);
        // Back-left nape coverage
        for (let dy = 4; dy <= 7; dy++) {
          const rightEdge = row === 2 ? cx - 1 : cx - 2;
          hairSpan(buf, hy + dy, cx - 6, rightEdge, dy >= 6 ? hs : h);
        }
        setPx(buf, cx - 5, hy + 8, BASE_OUTLINE);
        setPx(buf, cx - 4, hy + 8, BASE_OUTLINE);
        setPx(buf, cx - 3, hy + 8, BASE_OUTLINE);
        // Front bangs tuft on right
        setPx(buf, cx + 1, hy + 4, hs);
        setPx(buf, cx + 2, hy + 4, h);
        setPx(buf, cx + 4, hy + 4, h);
        setPx(buf, cx + 5, hy + 4, hs);
      }
      break;
    }

    case 'bob': {
      if (row === 3 || row === 4) {
        drawBackCap(10);
        return;
      }
      drawCrown(false);
      if (row === 0) {
        // Full neat bangs
        hairSpan(buf, hy + 3, cx - 6, cx + 7, h);
        hairSpan(buf, hy + 4, cx - 6, cx + 7, hs);
        // Rounded bob cheek-framing curtains on both sides
        for (let dy = 5; dy <= 9; dy++) {
          const fill = dy >= 8 ? hs : h;
          setPx(buf, cx - 7, hy + dy, BASE_OUTLINE);
          setPx(buf, cx - 6, hy + dy, fill);
          setPx(buf, cx - 5, hy + dy, hs);
          setPx(buf, cx + 6, hy + dy, hs);
          setPx(buf, cx + 7, hy + dy, fill);
          setPx(buf, cx + 8, hy + dy, BASE_OUTLINE);
        }
        // Inward bob curl tips at chin level
        setPx(buf, cx - 6, hy + 10, BASE_OUTLINE);
        setPx(buf, cx - 5, hy + 10, BASE_OUTLINE);
        setPx(buf, cx + 6, hy + 10, BASE_OUTLINE);
        setPx(buf, cx + 7, hy + 10, BASE_OUTLINE);
      } else {
        // Rows 1 & 2 (facing right): full rounded bob sweeping behind ear to chin
        hairSpan(buf, hy + 3, cx - 6, cx + 6, h);
        for (let dy = 4; dy <= 9; dy++) {
          const rightEdge = row === 2 ? cx : cx - 2;
          hairSpan(buf, hy + dy, cx - 7, rightEdge, dy >= 8 ? hs : h);
        }
        for (let x = cx - 6; x <= (row === 2 ? cx - 1 : cx - 3); x++) {
          setPx(buf, x, hy + 10, BASE_OUTLINE);
        }
        // Soft front bangs
        setPx(buf, cx + 1, hy + 4, h);
        setPx(buf, cx + 2, hy + 4, hs);
        setPx(buf, cx + 4, hy + 4, h);
        setPx(buf, cx + 5, hy + 4, hs);
      }
      break;
    }

    case 'ponytail': {
      if (row === 4) {
        drawBackCap(8);
        // Cute centered high ponytail + hairband on back
        setPx(buf, cx, hy + 4, GOLD_ACCENT);
        setPx(buf, cx + 1, hy + 4, GOLD_ACCENT);
        for (let dy = 5; dy <= 11; dy++) {
          const half = dy <= 7 ? 2 : dy <= 9 ? 2 : 1;
          hairSpan(buf, hy + dy, cx - half, cx + 1 + half, dy >= 9 ? hs : h);
        }
        setPx(buf, cx, hy + 12, BASE_OUTLINE);
        setPx(buf, cx + 1, hy + 12, BASE_OUTLINE);
        return;
      }
      if (row === 3) {
        drawBackCap(8);
        // Angled ponytail streaming off back-left
        setPx(buf, cx - 4, hy + 4, GOLD_ACCENT);
        for (let dy = 4; dy <= 10; dy++) {
          const shift = Math.floor((dy - 4) / 2);
          hairSpan(buf, hy + dy, cx - 7 - shift, cx - 4 - shift, dy >= 8 ? hs : h);
        }
        return;
      }
      drawCrown(false);
      if (row === 0) {
        // Sleek bangs + tiny ponytail peek behind left side
        hairSpan(buf, hy + 3, cx - 6, cx + 7, h);
        setPx(buf, cx - 4, hy + 4, hs);
        setPx(buf, cx - 2, hy + 4, h);
        setPx(buf, cx, hy + 4, h);
        setPx(buf, cx + 2, hy + 4, h);
        setPx(buf, cx + 4, hy + 4, hs);
        // Side ponytail peek
        setPx(buf, cx - 7, hy + 4, BASE_OUTLINE);
        setPx(buf, cx - 8, hy + 5, BASE_OUTLINE);
        setPx(buf, cx - 7, hy + 5, h);
        setPx(buf, cx - 8, hy + 6, BASE_OUTLINE);
        setPx(buf, cx - 7, hy + 6, hs);
        setPx(buf, cx - 7, hy + 7, BASE_OUTLINE);
      } else {
        // Rows 1 & 2 (facing right): sleek crown + bouncy ponytail streaming behind on left!
        hairSpan(buf, hy + 3, cx - 6, cx + 6, h);
        for (let dy = 4; dy <= 7; dy++) {
          hairSpan(buf, hy + dy, cx - 6, cx - 2, dy >= 6 ? hs : h);
        }
        // Hair tie + streaming tail on left
        setPx(buf, cx - 6, hy + 3, GOLD_ACCENT);
        setPx(buf, cx - 6, hy + 4, GOLD_ACCENT);
        setPx(buf, cx - 7, hy + 2, BASE_OUTLINE);
        setPx(buf, cx - 8, hy + 3, BASE_OUTLINE);
        setPx(buf, cx - 7, hy + 3, hi);
        for (let dy = 4; dy <= 9; dy++) {
          const tailX = cx - 8 - (dy >= 7 ? 1 : 0);
          setPx(buf, tailX - 1, hy + dy, BASE_OUTLINE);
          setPx(buf, tailX, hy + dy, dy >= 7 ? hs : h);
          setPx(buf, tailX + 1, hy + dy, dy >= 8 ? BASE_OUTLINE : h);
        }
        setPx(buf, cx - 9, hy + 10, BASE_OUTLINE);
        setPx(buf, cx - 8, hy + 10, BASE_OUTLINE);
      }
      break;
    }

    case 'curly': {
      // Fluffy cloud-like curls (stays >= hy - 2 so zero top clipping even in jump!)
      for (let x = cx - 4; x <= cx + 5; x++) {
        if ((x - cx) % 3 !== 0) setPx(buf, x, hy - 2, BASE_OUTLINE);
      }
      hairSpan(buf, hy - 1, cx - 6, cx + 7, h);
      setPx(buf, cx - 2, hy - 1, hi);
      setPx(buf, cx + 2, hy - 1, hi);
      hairSpan(buf, hy, cx - 7, cx + 8, h);
      hairSpan(buf, hy + 1, cx - 7, cx + 8, h);
      setPx(buf, cx - 4, hy + 1, hi);
      setPx(buf, cx + 3, hy + 1, hi);
      hairSpan(buf, hy + 2, cx - 7, cx + 8, h);

      if (row === 3 || row === 4) {
        for (let dy = 3; dy <= 9; dy++) {
          const bump = dy % 2 === 0 ? 1 : 0;
          hairSpan(buf, hy + dy, cx - 7 - bump, cx + 8 + bump, dy >= 7 ? hs : h);
          setPx(buf, cx - 3, hy + dy, hs);
          setPx(buf, cx + 1, hy + dy, hs);
          setPx(buf, cx + 4, hy + dy, hs);
        }
        for (let x = cx - 6; x <= cx + 7; x++) setPx(buf, x, hy + 10, BASE_OUTLINE);
      } else if (row === 0) {
        // Fluffy scalloped bangs & puffy sides
        hairSpan(buf, hy + 3, cx - 7, cx + 8, h);
        for (let x = cx - 6; x <= cx + 7; x++) {
          if (Math.abs(x - cx) % 2 === 0) setPx(buf, x, hy + 4, hs);
          else setPx(buf, x, hy + 4, h);
        }
        for (let dy = 4; dy <= 8; dy++) {
          const puff = dy % 2 === 0 ? 1 : 0;
          setPx(buf, cx - 7 - puff, hy + dy, BASE_OUTLINE);
          setPx(buf, cx - 6 - puff, hy + dy, dy >= 7 ? hs : h);
          setPx(buf, cx - 5, hy + dy, hs);
          setPx(buf, cx + 6, hy + dy, hs);
          setPx(buf, cx + 7 + puff, hy + dy, dy >= 7 ? hs : h);
          setPx(buf, cx + 8 + puff, hy + dy, BASE_OUTLINE);
        }
      } else {
        // Side / 3-4 fluffy puffs
        hairSpan(buf, hy + 3, cx - 7, cx + 7, h);
        for (let dy = 4; dy <= 8; dy++) {
          const puff = dy % 2 === 0 ? 1 : 0;
          hairSpan(buf, hy + dy, cx - 7 - puff, row === 2 ? cx - 1 : cx - 2, dy >= 7 ? hs : h);
        }
        setPx(buf, cx + 2, hy + 4, h);
        setPx(buf, cx + 4, hy + 4, hs);
        setPx(buf, cx + 5, hy + 4, h);
      }
      break;
    }

    case 'long': {
      if (row === 3 || row === 4) {
        // Full flowing long hair cape down upper back!
        const endY = Math.min(m.waistY - 1, hy + 15);
        const span = Math.max(10, endY - hy);
        drawBackCap(span);
        return;
      }
      drawCrown(false);
      if (row === 0) {
        // Parted bangs
        hairSpan(buf, hy + 3, cx - 6, cx + 7, h);
        setPx(buf, cx - 5, hy + 4, hs);
        setPx(buf, cx - 4, hy + 4, h);
        setPx(buf, cx - 2, hy + 4, h);
        setPx(buf, cx + 3, hy + 4, h);
        setPx(buf, cx + 5, hy + 4, h);
        setPx(buf, cx + 6, hy + 4, hs);
        // Long framing locks cascading past shoulders
        const endY = Math.min(m.waistY - 1, hy + 14);
        for (let y = hy + 4; y <= endY; y++) {
          const fill = y >= endY - 2 ? hs : h;
          setPx(buf, cx - 7, y, BASE_OUTLINE);
          setPx(buf, cx - 6, y, fill);
          setPx(buf, cx - 5, y, hs);
          setPx(buf, cx + 6, y, hs);
          setPx(buf, cx + 7, y, fill);
          setPx(buf, cx + 8, y, BASE_OUTLINE);
        }
        setPx(buf, cx - 6, endY + 1, BASE_OUTLINE);
        setPx(buf, cx + 7, endY + 1, BASE_OUTLINE);
      } else {
        // Rows 1 & 2: swept side bangs + lush flowing hair down the back (left side)
        hairSpan(buf, hy + 3, cx - 6, cx + 6, h);
        const endY = Math.min(m.waistY - 1, hy + 14);
        for (let y = hy + 4; y <= endY; y++) {
          const rightEdge = y <= hy + 9 ? (row === 2 ? cx : cx - 2) : cx - 3;
          hairSpan(buf, y, cx - 7, rightEdge, y >= endY - 2 ? hs : h);
        }
        for (let x = cx - 6; x <= cx - 3; x++) setPx(buf, x, endY + 1, BASE_OUTLINE);
        // Front bangs sweep
        setPx(buf, cx + 2, hy + 4, h);
        setPx(buf, cx + 3, hy + 4, h);
        setPx(buf, cx + 5, hy + 4, hs);
      }
      break;
    }
  }
}

function drawAccessory(
  buf: CellBuffer,
  row: number,
  m: FrameMetrics,
  pal: ResolvedPalette,
  accessory: AccessoryStyle
): void {
  if (accessory === 'none') return;

  const { cx, headTopY: hy, neckY, eyeY } = m;
  const a = pal.acc;
  const as = pal.accShade;
  const ahi = pal.accHi;

  switch (accessory) {
    case 'cap': {
      // Dom's signature pixel cap (dome at hy-2..hy+2, directional brim at hy+2..hy+3)
      for (let x = cx - 4; x <= cx + 5; x++) setPx(buf, x, hy - 2, BASE_OUTLINE);
      hairSpan(buf, hy - 1, cx - 5, cx + 6, a);
      setPx(buf, cx - 2, hy - 1, ahi);
      setPx(buf, cx - 1, hy - 1, ahi);
      hairSpan(buf, hy, cx - 6, cx + 7, a);
      hairSpan(buf, hy + 1, cx - 6, cx + 7, as);

      // Tiny gold/cream front emblem badge
      if (row === 0) {
        setPx(buf, cx, hy, GOLD_ACCENT);
        setPx(buf, cx + 1, hy, GOLD_ACCENT);
      } else if (row === 1) {
        setPx(buf, cx + 2, hy, GOLD_ACCENT);
        setPx(buf, cx + 3, hy, GOLD_ACCENT);
      } else if (row === 4) {
        // Back adjuster strap
        setPx(buf, cx, hy + 1, CREAM_ACCENT);
        setPx(buf, cx + 1, hy + 1, CREAM_ACCENT);
      }

      // Directional cap brim
      if (row === 0) {
        hairSpan(buf, hy + 2, cx - 6, cx + 7, a);
        for (let x = cx - 5; x <= cx + 6; x++) setPx(buf, x, hy + 3, BASE_OUTLINE);
      } else if (row === 1 || row === 2) {
        // Brim jutting cleanly forward (to the right)
        hairSpan(buf, hy + 2, cx - 5, cx + 9, a);
        for (let x = cx + 2; x <= cx + 9; x++) setPx(buf, x, hy + 3, BASE_OUTLINE);
      } else if (row === 3) {
        hairSpan(buf, hy + 2, cx - 6, cx + 8, as);
        for (let x = cx + 4; x <= cx + 8; x++) setPx(buf, x, hy + 3, BASE_OUTLINE);
      } else {
        for (let x = cx - 5; x <= cx + 6; x++) setPx(buf, x, hy + 2, BASE_OUTLINE);
      }
      break;
    }

    case 'beanie': {
      // Cozy knit beanie with tiny top pom-pom (fits within hy-3..hy+2 — zero jump clipping!)
      setPx(buf, cx, hy - 3, ahi);
      setPx(buf, cx + 1, hy - 3, a);
      for (let x = cx - 4; x <= cx + 5; x++) setPx(buf, x, hy - 2, BASE_OUTLINE);
      setPx(buf, cx, hy - 2, a);
      setPx(buf, cx + 1, hy - 2, as);

      hairSpan(buf, hy - 1, cx - 5, cx + 6, a);
      hairSpan(buf, hy, cx - 6, cx + 7, a);
      setPx(buf, cx - 2, hy - 1, ahi);
      setPx(buf, cx + 2, hy, ahi);

      // Ribbed folded cuff across hy+1..hy+2
      for (let dy = 1; dy <= 2; dy++) {
        setPx(buf, cx - 6, hy + dy, BASE_OUTLINE);
        setPx(buf, cx + 7, hy + dy, BASE_OUTLINE);
        for (let x = cx - 5; x <= cx + 6; x++) {
          setPx(buf, x, hy + dy, (x + dy) % 2 === 0 ? a : as);
        }
      }
      for (let x = cx - 5; x <= cx + 6; x++) setPx(buf, x, hy + 3, BASE_OUTLINE);
      break;
    }

    case 'glasses': {
      // Crisp retro round pixel glasses aligned dynamically to detected eyeY
      const drawLens = (lx: number, ly: number) => {
        // 4x3 rounded frame with subtle translucent lens tint
        setPx(buf, lx + 1, ly - 1, a);
        setPx(buf, lx + 2, ly - 1, a);
        setPx(buf, lx, ly, a);
        setPx(buf, lx + 3, ly, a);
        setPx(buf, lx, ly + 1, as);
        setPx(buf, lx + 3, ly + 1, as);
        setPx(buf, lx + 1, ly + 2, as);
        setPx(buf, lx + 2, ly + 2, as);
        // Subtle sky-cream lens shine pixel
        setPx(buf, lx + 1, ly, CREAM_ACCENT, 85);
      };

      if (row === 0) {
        drawLens(cx - 4, eyeY);
        drawLens(cx + 2, eyeY);
        // Bridge
        setPx(buf, cx, eyeY, a);
        setPx(buf, cx + 1, eyeY, a);
      } else if (row === 1) {
        drawLens(cx - 2, eyeY);
        drawLens(cx + 3, eyeY);
        setPx(buf, cx + 2, eyeY, a);
        // Left temple arm to ear
        setPx(buf, cx - 3, eyeY, as);
        setPx(buf, cx - 4, eyeY, as);
      } else if (row === 2) {
        drawLens(cx + 2, eyeY);
        // Temple arm extending back to ear
        for (let x = cx - 2; x <= cx + 1; x++) setPx(buf, x, eyeY, as);
      } else if (row === 3) {
        // Subtle arm edge peeking at side
        setPx(buf, cx + 4, eyeY, as);
        setPx(buf, cx + 5, eyeY, a);
      }
      break;
    }

    case 'scarf': {
      // Cozy wrapped neck scarf + hanging tail
      const sy = neckY;
      hairSpan(buf, sy, cx - 4, cx + 5, a);
      hairSpan(buf, sy + 1, cx - 4, cx + 5, as);
      // Ribbed highlight ticks
      setPx(buf, cx - 1, sy, ahi);
      setPx(buf, cx + 2, sy, ahi);

      // Hanging scarf tail adapts to facing direction
      const tailX = row === 0 ? cx + 2 : row === 1 ? cx + 1 : row === 2 ? cx - 3 : cx - 2;
      for (let dy = 2; dy <= 5; dy++) {
        setPx(buf, tailX - 1, sy + dy, BASE_OUTLINE);
        setPx(buf, tailX, sy + dy, dy % 2 === 0 ? a : as);
        setPx(buf, tailX + 1, sy + dy, dy === 5 ? ahi : a);
        setPx(buf, tailX + 2, sy + dy, BASE_OUTLINE);
      }
      setPx(buf, tailX, sy + 6, BASE_OUTLINE);
      setPx(buf, tailX + 1, sy + 6, BASE_OUTLINE);
      break;
    }

    case 'headphones': {
      // Over-ear studio headphones arching cleanly over crown
      for (let x = cx - 4; x <= cx + 5; x++) setPx(buf, x, hy - 2, BASE_OUTLINE);
      for (let x = cx - 4; x <= cx + 5; x++) setPx(buf, x, hy - 1, a);
      setPx(buf, cx - 1, hy - 1, ahi);
      setPx(buf, cx, hy - 1, ahi);

      if (row === 0 || row === 4) {
        // Band curving down both sides
        for (let dy = 0; dy <= 4; dy++) {
          setPx(buf, cx - 6, hy + dy, as);
          setPx(buf, cx + 7, hy + dy, as);
        }
        // Left & right earcups
        fillRectPx(buf, cx - 8, hy + 5, 3, 4, BASE_OUTLINE);
        fillRectPx(buf, cx - 7, hy + 6, 2, 2, a);
        setPx(buf, cx - 7, hy + 6, ahi);

        fillRectPx(buf, cx + 6, hy + 5, 3, 4, BASE_OUTLINE);
        fillRectPx(buf, cx + 6, hy + 6, 2, 2, a);
        setPx(buf, cx + 7, hy + 6, ahi);
      } else if (row === 1 || row === 3) {
        // Prominent near earcup + subtle far cup
        const nearX = row === 1 ? cx - 6 : cx + 4;
        const farX = row === 1 ? cx + 6 : cx - 6;
        for (let dy = 0; dy <= 4; dy++) setPx(buf, nearX + 1, hy + dy, as);
        fillRectPx(buf, nearX - 1, hy + 5, 4, 4, BASE_OUTLINE);
        fillRectPx(buf, nearX, hy + 6, 2, 2, a);
        setPx(buf, nearX, hy + 6, ahi);
        // Far cup peek
        fillRectPx(buf, farX, hy + 5, 2, 4, as);
      } else {
        // Pure side (row 2): band going down center-left directly into a crisp side earcup!
        for (let dy = 0; dy <= 4; dy++) {
          setPx(buf, cx - 1, hy + dy, BASE_OUTLINE);
          setPx(buf, cx, hy + dy, a);
        }
        fillRectPx(buf, cx - 2, hy + 5, 4, 5, BASE_OUTLINE);
        fillRectPx(buf, cx - 1, hy + 6, 2, 3, a);
        setPx(buf, cx - 1, hy + 6, ahi);
      }
      break;
    }

    case 'cat_ears': {
      // Ink the Cat headband ears! Stays within hy-3..hy so zero top clipping in jump
      for (let x = cx - 5; x <= cx + 6; x++) setPx(buf, x, hy, as);

      const drawEar = (ex: number, showInner: boolean) => {
        // 4px wide triangular cat ear rising from hy down to hy-3
        setPx(buf, ex + 1, hy - 3, BASE_OUTLINE);
        setPx(buf, ex, hy - 2, BASE_OUTLINE);
        setPx(buf, ex + 1, hy - 2, a);
        setPx(buf, ex + 2, hy - 2, BASE_OUTLINE);
        setPx(buf, ex - 1, hy - 1, BASE_OUTLINE);
        setPx(buf, ex, hy - 1, a);
        setPx(buf, ex + 1, hy - 1, showInner ? BASE_BLUSH : as);
        setPx(buf, ex + 2, hy - 1, a);
        setPx(buf, ex + 3, hy - 1, BASE_OUTLINE);
        setPx(buf, ex, hy, a);
        setPx(buf, ex + 1, hy, showInner ? BASE_BLUSH : a);
        setPx(buf, ex + 2, hy, a);
      };

      const showInner = row <= 2;
      if (row === 2) {
        // Side view: two ears slightly offset in depth
        drawEar(cx - 2, true);
        drawEar(cx + 2, true);
      } else {
        drawEar(cx - 5, showInner);
        drawEar(cx + 4, showInner);
      }
      break;
    }
  }
}

function compositeAnimSheet(
  anim: BaseSheetAnim,
  appearance: CharacterAppearance,
  pal: ResolvedPalette
): HTMLCanvasElement {
  const src = rawSourceData[anim];
  const spec = ANIM_SPECS[anim];
  const sheetW = spec.frames * CELL;
  const sheetH = ROWS * CELL;

  const canvas = document.createElement('canvas');
  canvas.width = sheetW;
  canvas.height = sheetH;
  const ctx = canvas.getContext('2d');
  if (!ctx || !src) return canvas;

  const orig = src.data;
  const outImg = new ImageData(new Uint8ClampedArray(orig), sheetW, sheetH);

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < spec.frames; col++) {
      const ox = col * CELL;
      const oy = row * CELL;
      const buf: CellBuffer = { data: outImg.data, sheetW, ox, oy };
      const metrics = measureFrame(orig, sheetW, ox, oy, row);

      // 1. Remap skin tone, base shirt/sleeves, pants, and shoes
      remapBaseBody(buf, orig, row, metrics, pal, appearance.outfitStyle);

      // 2. Layer handcrafted outfit details (hoodie pocket, overalls straps, jacket lapel, studio apron)
      drawOutfitDetails(buf, orig, row, metrics, pal, appearance.outfitStyle);

      // 3. Layer handcrafted directional pixel hair anchored to dynamic headTopY
      drawHair(buf, row, metrics, pal, appearance.hairStyle);

      // 4. Layer handcrafted directional accessory anchored to headTopY / neckY / eyeY
      drawAccessory(buf, row, metrics, pal, appearance.accessory);
    }
  }

  ctx.imageSmoothingEnabled = false;
  ctx.putImageData(outImg, 0, 0);
  return canvas;
}

function getCompositedSheets(appearance: CharacterAppearance): SheetMap | null {
  if (!loaded) return null;
  const key = JSON.stringify(appearance);
  const cached = appearanceCache.get(key);
  if (cached) {
    // Refresh LRU recency
    appearanceCache.delete(key);
    appearanceCache.set(key, cached);
    return cached;
  }

  const pal = resolvePalette(appearance);
  const built = {} as SheetMap;
  for (const anim of ANIM_STATES) {
    built[anim] = compositeAnimSheet(anim, appearance, pal);
  }

  if (appearanceCache.size >= CACHE_LIMIT) {
    const oldestKey = appearanceCache.keys().next().value;
    if (oldestKey !== undefined) {
      appearanceCache.delete(oldestKey);
    }
  }
  appearanceCache.set(key, built);
  return built;
}

function drawLoadingFallback(
  ctx: CanvasRenderingContext2D,
  appearance: CharacterAppearance,
  footCenterX: number,
  footBottomY: number,
  scale: number
): void {
  const px = (x: number, y: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(
      Math.round(footCenterX + x * scale),
      Math.round(footBottomY + y * scale),
      Math.max(1, Math.round(w * scale)),
      Math.max(1, Math.round(h * scale))
    );
  };

  // Crisp 16x24 pixel silhouette while PNGs load on frame 0
  px(-4, -5, 3, 5, appearance.pantsColor);
  px(1, -5, 3, 5, appearance.pantsColor);
  px(-5, -13, 10, 8, appearance.topColor);
  px(-5, -23, 10, 10, appearance.baseTone);
  if (appearance.hairStyle !== 'none') {
    px(-6, -24, 12, 4, appearance.hairColor);
  }
  px(-3, -18, 1, 2, '#2f2522');
  px(2, -18, 1, 2, '#2f2522');
}

/**
 * Draws the composited 32x32 base character sprite anchored so cell bottom-center (16, 32)
 * lands at (footCenterX, footBottomY) with crisp nearest-neighbor pixel rendering.
 */
export function drawBaseCharacterSprite(
  ctx: CanvasRenderingContext2D,
  appearance: CharacterAppearance,
  anim: CharacterAnimState,
  facing: Facing8,
  timeSec: number,
  footCenterX: number,
  footBottomY: number,
  scale = 1
): void {
  ctx.imageSmoothingEnabled = false;

  const sheets = getCompositedSheets(appearance);
  if (!sheets) {
    drawLoadingFallback(ctx, appearance, footCenterX, footBottomY, scale);
    return;
  }

  const sheetAnim = resolveSheetAnim(anim);
  const sheet = sheets[sheetAnim];
  const spec = ANIM_SPECS[sheetAnim];
  const frame = Math.floor(Math.max(0, timeSec) * spec.fps) % spec.frames;
  const { row, flipX } = FACING_MAP[facing] ?? FACING_MAP.down;

  const sx = frame * CELL;
  const sy = row * CELL;
  const dw = CELL * scale;
  const dh = CELL * scale;
  const fx = Math.round(footCenterX);
  const fy = Math.round(footBottomY);

  if (flipX) {
    ctx.save();
    ctx.translate(fx, fy);
    ctx.scale(-1, 1);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sheet, sx, sy, CELL, CELL, Math.round(-16 * scale), Math.round(-32 * scale), dw, dh);
    ctx.restore();
  } else {
    ctx.drawImage(sheet, sx, sy, CELL, CELL, Math.round(fx - 16 * scale), Math.round(fy - 32 * scale), dw, dh);
  }
}
