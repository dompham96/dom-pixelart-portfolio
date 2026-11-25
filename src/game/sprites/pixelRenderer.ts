import type { CharacterAnimState, Direction, MapProp } from '../../types/content';
import type { NpcEmote } from '../engine/NpcController';
import { spriteManager } from './SpriteManager';

export function drawTile(
  ctx: CanvasRenderingContext2D,
  ch: string,
  px: number,
  py: number,
  ts: number
): void {
  switch (ch) {
    case '.': {
      ctx.fillStyle = '#1c241b';
      ctx.fillRect(px, py, ts, ts);
      if ((px / ts + py / ts) % 3 === 0) {
        ctx.fillStyle = '#283625';
        ctx.fillRect(px + 3, py + 4, 3, 2);
      }
      break;
    }
    case 'G': {
      // Crisp sunlit courtyard grass
      ctx.fillStyle = '#4f7a42';
      ctx.fillRect(px, py, ts, ts);
      ctx.fillStyle = '#60914e';
      if (((px + py) / ts) % 2 === 0) {
        ctx.fillRect(px + 2, py + 3, 2, 1);
        ctx.fillRect(px + 10, py + 11, 2, 1);
      } else {
        ctx.fillRect(px + 6, py + 8, 2, 1);
      }
      break;
    }
    case 'P': {
      // Warm sunlit Saigon brick walkway
      ctx.fillStyle = '#8b7360';
      ctx.fillRect(px, py, ts, ts);
      ctx.fillStyle = '#a38973';
      ctx.fillRect(px + 1, py + 1, 6, 6);
      ctx.fillRect(px + 9, py + 1, 6, 6);
      ctx.fillRect(px + 1, py + 9, 6, 6);
      ctx.fillRect(px + 9, py + 9, 6, 6);
      break;
    }
    case 'O': {
      // Warm honey-wood front porch
      ctx.fillStyle = '#8c6342';
      ctx.fillRect(px, py, ts, ts);
      ctx.fillStyle = '#6e4c32';
      ctx.fillRect(px, py + 7, ts, 1);
      ctx.fillRect(px, py + 15, ts, 1);
      ctx.fillStyle = '#a67852';
      ctx.fillRect(px + 1, py + 1, ts - 2, 1);
      break;
    }
    case 'F': {
      // Warm sunlit oak studio floorboards
      ctx.fillStyle = '#6b513e';
      ctx.fillRect(px, py, ts, ts);
      ctx.fillStyle = '#574131';
      ctx.fillRect(px, py + 7, ts, 1);
      ctx.fillRect(px, py + 15, ts, 1);
      ctx.fillStyle = '#7d604a';
      ctx.fillRect(px + 2, py + 2, 5, 1);
      ctx.fillRect(px + 9, py + 10, 5, 1);
      break;
    }
    case 'K': {
      // Bright cozy Saigon retro kitchen checkered tiles
      ctx.fillStyle = '#7a6f62';
      ctx.fillRect(px, py, ts, ts);
      ctx.fillStyle = '#998d7e';
      ctx.fillRect(px, py, 8, 8);
      ctx.fillRect(px + 8, py + 8, 8, 8);
      break;
    }
    case 'C': {
      // Warm terracotta/amber exhibition gallery runner
      ctx.fillStyle = '#7a4437';
      ctx.fillRect(px, py, ts, ts);
      ctx.fillStyle = '#945544';
      ctx.fillRect(px + 1, py + 1, ts - 2, ts - 2);
      ctx.fillStyle = '#b36b54';
      ctx.fillRect(px + 4, py + 4, 2, 2);
      ctx.fillRect(px + 10, py + 10, 2, 2);
      break;
    }
    case 'T': {
      // Roof / thick upper wall border
      ctx.fillStyle = '#2d2825';
      ctx.fillRect(px, py, ts, ts);
      ctx.fillStyle = '#403934';
      ctx.fillRect(px, py + ts - 4, ts, 4);
      ctx.fillStyle = '#574e47';
      ctx.fillRect(px, py + ts - 4, ts, 1);
      break;
    }
    case 'I': {
      // Interior warm charcoal gallery wall (frames pop cleanly!)
      ctx.fillStyle = '#3f3a36';
      ctx.fillRect(px, py, ts, ts);
      ctx.fillStyle = '#2e2a27';
      ctx.fillRect(px, py + ts - 3, ts, 3);
      ctx.fillStyle = '#544e48';
      ctx.fillRect(px, py, ts, 1);
      break;
    }
    case 'W': {
      // Warm cream-ochre Saigon exterior wall
      ctx.fillStyle = '#806d5c';
      ctx.fillRect(px, py, ts, ts);
      ctx.fillStyle = '#635346';
      ctx.fillRect(px, py + ts - 3, ts, 3);
      ctx.fillStyle = '#96816e';
      ctx.fillRect(px, py + 2, ts, 2);
      break;
    }
    case 'N': {
      // Cozy pixel window on front facade
      ctx.fillStyle = '#806d5c';
      ctx.fillRect(px, py, ts, ts);
      ctx.fillStyle = '#2e2620';
      ctx.fillRect(px + 2, py + 2, 12, 10);
      ctx.fillStyle = '#ffe073';
      ctx.fillRect(px + 3, py + 3, 10, 8);
      ctx.fillStyle = '#fff3c4';
      ctx.fillRect(px + 4, py + 4, 4, 3);
      ctx.fillStyle = '#59422e';
      ctx.fillRect(px + 7, py + 3, 2, 8);
      ctx.fillRect(px + 3, py + 6, 10, 1);
      break;
    }
    case 'D': {
      // Open warm welcoming doorway / room threshold
      ctx.fillStyle = '#8c6342';
      ctx.fillRect(px, py, ts, ts);
      ctx.fillStyle = 'rgba(255, 224, 115, 0.25)';
      ctx.fillRect(px, py, ts, ts);
      ctx.fillStyle = '#a87a54';
      ctx.fillRect(px, py, ts, 2);
      break;
    }
    default: {
      ctx.fillStyle = '#1c241b';
      ctx.fillRect(px, py, ts, ts);
    }
  }
}

export function drawProp(
  ctx: CanvasRenderingContext2D,
  prop: MapProp,
  ts: number,
  timeSec: number,
  isNearby: boolean
): void {
  const x = prop.x * ts;
  const y = prop.y * ts;
  const w = (prop.w || 1) * ts;
  const h = (prop.h || 1) * ts;

  if (!prop.bakedInMap) {
    // Prefer custom animated/static Photoshop sprite sheet if present in manifest
    const customSpriteId = prop.spriteId || prop.kind;
    const phaseOffsetMs = ((prop.x * 7 + prop.y * 13) % 11) * 180;
    const drawnCustom = spriteManager.drawSprite(
      ctx,
      customSpriteId,
      'default',
      'down',
      timeSec * 1000 + phaseOffsetMs,
      x + w / 2,
      y + h
    );

    if (!drawnCustom) {
      drawProceduralProp(ctx, prop, x, y, w, timeSec);
    }
  }

  // Floating pixel interaction badge when player is nearby
  if (isNearby && prop.action) {
    const bob = Math.round(Math.sin(timeSec * 6) * 1.5);
    const bx = x + Math.floor(w / 2) - 5;
    const by = y - 12 + bob;
    ctx.fillStyle = '#131211';
    ctx.fillRect(bx, by, 10, 9);
    ctx.fillStyle = '#ffcf3d';
    ctx.fillRect(bx + 1, by + 1, 8, 7);
    ctx.fillStyle = '#131211';
    ctx.fillRect(bx + 4, by + 2, 2, 3);
    ctx.fillRect(bx + 4, by + 6, 2, 1);
  }
}

function drawProceduralProp(
  ctx: CanvasRenderingContext2D,
  prop: MapProp,
  x: number,
  y: number,
  w: number,
  timeSec: number
): void {
  switch (prop.kind) {
    case 'art_frame': {
      const accent = prop.accentColor || '#ffcf3d';
      ctx.fillStyle = '#6e4e32';
      ctx.fillRect(x + 1, y + 1, 14, 12);
      ctx.fillStyle = '#1a1817';
      ctx.fillRect(x + 2, y + 2, 12, 10);
      ctx.fillStyle = accent;
      ctx.fillRect(x + 3, y + 3, 10, 8);
      ctx.fillStyle = '#1f1d1b';
      ctx.fillRect(x + 4, y + 7, 8, 4);
      ctx.fillStyle = '#f5efe6';
      ctx.fillRect(x + 5, y + 4, 3, 2);
      ctx.fillStyle = '#ffcf3d';
      ctx.fillRect(x + 6, y, 4, 1);
      break;
    }

    case 'merch_stall': {
      ctx.fillStyle = '#5c3c28';
      ctx.fillRect(x + 1, y + 3, w - 2, 12);
      ctx.fillStyle = '#7a5136';
      ctx.fillRect(x + 1, y + 2, w - 2, 4);
      const colors = ['#72b8ff', '#ffcf3d', '#e88d4f', '#ffae33'];
      colors.forEach((c, i) => {
        ctx.fillStyle = '#f5efe6';
        ctx.fillRect(x + 3 + i * 7, y + 3, 5, 6);
        ctx.fillStyle = c;
        ctx.fillRect(x + 4 + i * 7, y + 4, 3, 4);
      });
      ctx.fillStyle = '#ffcf3d';
      ctx.fillRect(x + 2, y, w - 4, 2);
      break;
    }

    case 'easel_desk': {
      ctx.fillStyle = '#4f3a2c';
      ctx.fillRect(x + 1, y + 4, w - 2, 11);
      ctx.fillStyle = '#6b4f3c';
      ctx.fillRect(x + 1, y + 3, w - 2, 4);
      // Monitor with subtle animated pixel art pulse
      ctx.fillStyle = '#1c1b19';
      ctx.fillRect(x + 6, y - 2, 12, 8);
      ctx.fillStyle = Math.floor(timeSec * 2) % 2 === 0 ? '#ffcf3d' : '#ffd866';
      ctx.fillRect(x + 7, y - 1, 10, 6);
      ctx.fillStyle = '#252320';
      ctx.fillRect(x + 9, y + 1, 4, 2);
      ctx.fillStyle = '#2b2927';
      ctx.fillRect(x + 19, y + 4, 8, 5);
      ctx.fillStyle = '#e88d4f';
      ctx.fillRect(x + 3, y + 4, 3, 3);
      break;
    }

    case 'bed': {
      // Cozy single studio bed (2 tiles wide x 2 tiles tall or 2x1)
      ctx.fillStyle = '#5c3c28';
      ctx.fillRect(x + 1, y + 1, w - 2, 14);
      // Mattress & pillow
      ctx.fillStyle = '#f5efe6';
      ctx.fillRect(x + 3, y + 2, w - 6, 5);
      // Warm terracotta/amber blanket
      ctx.fillStyle = '#b85a3a';
      ctx.fillRect(x + 2, y + 6, w - 4, 8);
      ctx.fillStyle = '#d4744f';
      ctx.fillRect(x + 3, y + 7, w - 6, 3);
      ctx.fillStyle = '#ffcf3d';
      ctx.fillRect(x + 4, y + 11, w - 8, 1);
      break;
    }

    case 'gaming_setup': {
      // Dom's after-17:00 gaming desk with glowing RGB monitor & handheld
      ctx.fillStyle = '#2d2938';
      ctx.fillRect(x + 1, y + 4, w - 2, 11);
      ctx.fillStyle = '#3f394f';
      ctx.fillRect(x + 1, y + 3, w - 2, 4);
      // Dual-color glowing gaming monitor
      ctx.fillStyle = '#14131a';
      ctx.fillRect(x + 4, y - 2, 13, 8);
      const glow = Math.floor(timeSec * 3) % 2 === 0 ? '#60a5fa' : '#c084fc';
      ctx.fillStyle = glow;
      ctx.fillRect(x + 5, y - 1, 11, 6);
      ctx.fillStyle = '#f5efe6';
      ctx.fillRect(x + 8, y + 1, 3, 2);
      // Controller & retro console
      ctx.fillStyle = '#18181b';
      ctx.fillRect(x + 20, y + 4, 8, 4);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(x + 25, y + 5, 2, 2);
      break;
    }

    case 'behind_scenes_board': {
      // Corkboard full of sketches, palette swatches & behind-the-scenes notes
      ctx.fillStyle = '#6e4e32';
      ctx.fillRect(x + 1, y + 1, w - 2, 13);
      ctx.fillStyle = '#9c6f44';
      ctx.fillRect(x + 2, y + 2, w - 4, 11);
      // Pinned sketches
      ctx.fillStyle = '#f5efe6';
      ctx.fillRect(x + 4, y + 3, 6, 5);
      ctx.fillRect(x + 12, y + 4, 7, 6);
      ctx.fillRect(x + 21, y + 3, 6, 5);
      // Red pins & yellow notes
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(x + 6, y + 3, 1, 1);
      ctx.fillRect(x + 15, y + 4, 1, 1);
      ctx.fillStyle = '#ffcf3d';
      ctx.fillRect(x + 5, y + 9, 4, 3);
      ctx.fillRect(x + 22, y + 9, 4, 3);
      break;
    }

    case 'hobby_shelf': {
      // Display shelf with pixel figurines, vinyls, camera & game cartridges
      ctx.fillStyle = '#4d3525';
      ctx.fillRect(x + 1, y + 1, 14, 14);
      ctx.fillStyle = '#2e2017';
      ctx.fillRect(x + 2, y + 3, 12, 4);
      ctx.fillRect(x + 2, y + 9, 12, 4);
      // Retro camera + figurine + cartridge
      ctx.fillStyle = '#f5efe6';
      ctx.fillRect(x + 3, y + 4, 4, 3);
      ctx.fillStyle = '#60a5fa';
      ctx.fillRect(x + 9, y + 3, 4, 4);
      ctx.fillStyle = '#ffcf3d';
      ctx.fillRect(x + 3, y + 10, 3, 3);
      ctx.fillStyle = '#f472b6';
      ctx.fillRect(x + 8, y + 9, 4, 4);
      break;
    }

    case 'kitchen_counter': {
      // Cozy Saigon kitchenette with stove, kettle & steaming pot
      ctx.fillStyle = '#5c4b3c';
      ctx.fillRect(x + 1, y + 3, w - 2, 12);
      ctx.fillStyle = '#d6cfc2';
      ctx.fillRect(x + 1, y + 2, w - 2, 5);
      // Burner & little kettle
      ctx.fillStyle = '#262422';
      ctx.fillRect(x + 4, y + 3, 7, 4);
      ctx.fillStyle = '#e88d4f';
      ctx.fillRect(x + 5, y + 1, 5, 4);
      // Cutting board & mug
      ctx.fillStyle = '#8c6239';
      ctx.fillRect(x + 15, y + 3, 8, 3);
      ctx.fillStyle = '#72b8ff';
      ctx.fillRect(x + 25, y + 3, 3, 3);
      // Subtle animated steam puff above kettle
      const steamY = Math.floor(timeSec * 3) % 3;
      ctx.fillStyle = 'rgba(245, 239, 230, 0.55)';
      ctx.fillRect(x + 7, y - 1 - steamY, 1, 2);
      break;
    }

    case 'fridge': {
      ctx.fillStyle = '#cfd8dc';
      ctx.fillRect(x + 2, y - 2, 12, 17);
      ctx.fillStyle = '#eceff1';
      ctx.fillRect(x + 3, y - 1, 10, 7);
      ctx.fillRect(x + 3, y + 7, 10, 7);
      ctx.fillStyle = '#90a4ae';
      ctx.fillRect(x + 11, y + 2, 1, 3);
      ctx.fillRect(x + 11, y + 8, 1, 4);
      // Tiny magnets
      ctx.fillStyle = '#ffcf3d';
      ctx.fillRect(x + 5, y + 2, 2, 2);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(x + 8, y + 3, 2, 2);
      break;
    }

    case 'dining_table': {
      ctx.fillStyle = '#5c3c28';
      ctx.fillRect(x + 1, y + 3, w - 2, 11);
      ctx.fillStyle = '#7a5136';
      ctx.fillRect(x + 1, y + 2, w - 2, 5);
      // Bowls & iced coffee (cà phê sữa đá)
      ctx.fillStyle = '#f5efe6';
      ctx.fillRect(x + 5, y + 3, 5, 4);
      ctx.fillStyle = '#d98a4a';
      ctx.fillRect(x + 13, y + 2, 3, 5);
      ctx.fillStyle = '#f5efe6';
      ctx.fillRect(x + 20, y + 3, 5, 4);
      break;
    }

    case 'cat_bed': {
      ctx.fillStyle = '#8f5236';
      ctx.fillRect(x + 2, y + 5, 12, 8);
      ctx.fillStyle = '#e8b36d';
      ctx.fillRect(x + 4, y + 6, 8, 6);
      ctx.fillStyle = '#ffcf3d';
      ctx.fillRect(x + 6, y + 8, 4, 2);
      break;
    }

    case 'tea_table': {
      ctx.fillStyle = '#523828';
      ctx.fillRect(x + 2, y + 3, w - 4, 11);
      ctx.fillStyle = '#6e4c36';
      ctx.fillRect(x + 2, y + 2, w - 4, 4);
      ctx.fillStyle = '#f5efe6';
      ctx.fillRect(x + 7, y + 3, 18, 6);
      ctx.fillStyle = '#d4c9b8';
      ctx.fillRect(x + 15, y + 3, 2, 6);
      ctx.fillStyle = '#ffcf3d';
      ctx.fillRect(x + 9, y + 5, 5, 2);
      ctx.fillRect(x + 18, y + 5, 5, 2);
      break;
    }

    case 'mailbox': {
      ctx.fillStyle = '#594233';
      ctx.fillRect(x + 7, y + 8, 2, 7);
      ctx.fillStyle = '#c94336';
      ctx.fillRect(x + 3, y + 3, 10, 6);
      ctx.fillStyle = '#ffcf3d';
      ctx.fillRect(x + 11, y + 4, 2, 3);
      ctx.fillStyle = '#f5efe6';
      ctx.fillRect(x + 5, y + 5, 4, 2);
      break;
    }

    case 'welcome_sign': {
      ctx.fillStyle = '#523828';
      ctx.fillRect(x + 7, y + 9, 2, 6);
      ctx.fillStyle = '#735037';
      ctx.fillRect(x + 2, y + 2, 12, 8);
      ctx.fillStyle = '#ffcf3d';
      ctx.fillRect(x + 4, y + 4, 8, 2);
      ctx.fillStyle = '#f5efe6';
      ctx.fillRect(x + 4, y + 7, 6, 1);
      break;
    }

    case 'town_gate': {
      ctx.fillStyle = '#594130';
      ctx.fillRect(x + 2, y + 1, 3, 14);
      ctx.fillRect(x + 11, y + 1, 3, 14);
      ctx.fillStyle = '#7d5b42';
      ctx.fillRect(x + 1, y + 5, 14, 3);
      ctx.fillRect(x + 1, y + 10, 14, 2);
      ctx.fillStyle = '#ffcf3d';
      ctx.fillRect(x + 6, y + 6, 4, 3);
      break;
    }

    case 'lamp_post': {
      ctx.fillStyle = '#292624';
      ctx.fillRect(x + 7, y + 4, 2, 11);
      ctx.fillRect(x + 5, y + 13, 6, 2);
      ctx.fillStyle = '#ffcf3d';
      ctx.fillRect(x + 5, y + 1, 6, 4);
      ctx.fillStyle = '#fff5cc';
      ctx.fillRect(x + 6, y + 2, 4, 2);
      break;
    }

    case 'potted_plant': {
      ctx.fillStyle = '#9e5332';
      ctx.fillRect(x + 4, y + 9, 8, 6);
      ctx.fillStyle = '#3c7a3e';
      ctx.fillRect(x + 3, y + 3, 10, 7);
      ctx.fillStyle = '#57a852';
      ctx.fillRect(x + 5, y + 1, 6, 5);
      break;
    }

    case 'bookshelf': {
      ctx.fillStyle = '#4d3525';
      ctx.fillRect(x + 1, y + 1, 14, 14);
      ctx.fillStyle = '#2e2017';
      ctx.fillRect(x + 2, y + 3, 12, 4);
      ctx.fillRect(x + 2, y + 9, 12, 4);
      ctx.fillStyle = '#ffcf3d';
      ctx.fillRect(x + 3, y + 3, 2, 4);
      ctx.fillStyle = '#e88d4f';
      ctx.fillRect(x + 6, y + 4, 3, 3);
      ctx.fillStyle = '#72b8ff';
      ctx.fillRect(x + 10, y + 3, 3, 4);
      ctx.fillStyle = '#7ed957';
      ctx.fillRect(x + 3, y + 9, 4, 4);
      ctx.fillStyle = '#f472b6';
      ctx.fillRect(x + 8, y + 10, 5, 3);
      break;
    }

    case 'tree': {
      const sway = Math.round(Math.sin(timeSec * 1.8 + prop.x * 0.9) * 0.8);
      ctx.fillStyle = '#4a3222';
      ctx.fillRect(x + 6, y + 10, 4, 6);
      ctx.fillStyle = '#1e4228';
      ctx.fillRect(x + 1 + sway, y + 2, 14, 10);
      ctx.fillStyle = '#2c5e36';
      ctx.fillRect(x + 3 + sway, y - 1, 10, 8);
      ctx.fillStyle = '#3b7844';
      ctx.fillRect(x + 5 + sway, y + 1, 5, 3);
      break;
    }

    case 'lantern': {
      const sway = Math.round(Math.sin(timeSec * 2.4 + prop.x) * 1);
      ctx.fillStyle = '#d93829';
      ctx.fillRect(x + 5 + sway, y + 2, 6, 7);
      ctx.fillStyle = '#ffcf3d';
      ctx.fillRect(x + 6 + sway, y + 3, 4, 5);
      ctx.fillRect(x + 7 + sway, y + 9, 2, 3);
      break;
    }

    case 'mai_tree': {
      const sway = Math.round(Math.sin(timeSec * 2.0 + prop.x) * 0.6);
      ctx.fillStyle = '#9e3226';
      ctx.fillRect(x + 4, y + 10, 8, 5);
      ctx.fillStyle = '#5c3c24';
      ctx.fillRect(x + 7, y + 4, 2, 7);
      ctx.fillRect(x + 4, y + 6, 8, 2);
      const blooms = [[3, 3], [7, 1], [11, 4], [5, 7], [10, 7], [8, 4]];
      blooms.forEach(([bx, by]) => {
        ctx.fillStyle = '#ffcf3d';
        ctx.fillRect(x + bx + sway, y + by, 3, 3);
        ctx.fillStyle = '#fff5bd';
        ctx.fillRect(x + bx + 1 + sway, y + by + 1, 1, 1);
      });
      break;
    }

    case 'couplet': {
      ctx.fillStyle = '#c92a2a';
      ctx.fillRect(x + 6, y + 2, 4, 12);
      ctx.fillStyle = '#ffcf3d';
      ctx.fillRect(x + 7, y + 4, 2, 2);
      ctx.fillRect(x + 7, y + 7, 2, 2);
      ctx.fillRect(x + 7, y + 10, 2, 2);
      break;
    }

    case 'moon_table': {
      ctx.fillStyle = '#5c3c28';
      ctx.fillRect(x + 2, y + 4, 12, 10);
      ctx.fillStyle = '#f5efe6';
      ctx.fillRect(x + 4, y + 5, 8, 6);
      ctx.fillStyle = '#e89b2d';
      ctx.fillRect(x + 5, y + 6, 3, 3);
      ctx.fillStyle = '#a85124';
      ctx.fillRect(x + 8, y + 7, 3, 3);
      break;
    }

    default:
      break;
  }
}

export function drawCharacter(
  ctx: CanvasRenderingContext2D,
  spriteKey: 'player' | 'dom' | 'ink_cat' | 'task_snake',
  px: number,
  py: number,
  facing: Direction,
  walkPhase: number,
  animState: CharacterAnimState,
  isNearby: boolean,
  timeSec: number,
  emote?: NpcEmote | null
): void {
  // Ground drop shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
  ctx.fillRect(px + 3, py + 13, 10, 3);

  // Prefer custom Photoshop GIF/WebP-imported sprite sheet when available
  const animMs =
    animState === 'walk' || animState === 'run' ? walkPhase * 1000 : timeSec * 1000;
  const drawnCustom = spriteManager.drawSprite(
    ctx,
    spriteKey,
    animState,
    facing,
    animMs,
    px + 8,
    py + 15
  );

  if (!drawnCustom) {
    drawProceduralCharacter(ctx, spriteKey, px, py, facing, walkPhase, animState, timeSec);
  }

  // Floating NPC emote (Zzz, Heart, !, Gaming, Meow speech bubble)
  if (emote) {
    drawNpcEmote(ctx, px, py - 10, emote, timeSec);
  } else if (isNearby && spriteKey !== 'player') {
    const bob = Math.round(Math.sin(timeSec * 6) * 1.5);
    const bx = px + 3;
    const by = py - 17 + bob;
    ctx.fillStyle = '#131211';
    ctx.fillRect(bx, by, 10, 8);
    ctx.fillStyle = '#f5efe6';
    ctx.fillRect(bx + 1, by + 1, 8, 6);
    ctx.fillStyle = '#131211';
    ctx.fillRect(bx + 2, by + 3, 1, 2);
    ctx.fillRect(bx + 5, by + 3, 1, 2);
    ctx.fillRect(bx + 7, by + 3, 1, 2);
  }
}

function drawProceduralCharacter(
  ctx: CanvasRenderingContext2D,
  spriteKey: 'player' | 'dom' | 'ink_cat' | 'task_snake',
  px: number,
  py: number,
  facing: Direction,
  walkPhase: number,
  animState: CharacterAnimState,
  timeSec: number
): void {
  const isMoving = animState === 'walk' || animState === 'run';
  const isRunning = animState === 'run';
  const cycleSpeed = isRunning ? 12 : 8;
  const step = isMoving ? (Math.floor(walkPhase * cycleSpeed) % 2 === 0 ? 1 : -1) : 0;
  const bounce = isRunning ? Math.abs(step) : 0;
  const idleBreath = !isMoving && animState !== 'sleep' ? (Math.sin(timeSec * 2.8) > 0.7 ? 1 : 0) : 0;
  const blink = !isMoving && Math.floor(timeSec * 1.3) % 5 === 0 && (timeSec * 1.3) % 1 < 0.14;

  if (spriteKey === 'ink_cat') {
    const hop = animState === 'play' ? Math.round(Math.abs(Math.sin(timeSec * 8)) * 2) : bounce;
    const tailWag = Math.round(Math.sin(timeSec * (isRunning ? 10 : 4.5)) * 1);
    const dirOffset = facing === 'left' ? -1 : facing === 'right' ? 1 : 0;
    // Tail
    ctx.fillStyle = '#141317';
    const tailX = facing === 'right' ? px + 2 : px + 12;
    ctx.fillRect(tailX, py + 8 + tailWag - hop, 3, 2);
    ctx.fillRect(tailX + (facing === 'right' ? -1 : 1), py + 5 + tailWag - hop, 2, 4);
    // Body & head
    ctx.fillStyle = '#141317';
    ctx.fillRect(px + 4, py + 7 - hop, 8, 6);
    ctx.fillRect(px + 4 + dirOffset, py + 3 - hop + idleBreath, 8, 5);
    // Animated paws
    ctx.fillRect(px + 4, py + 12 + (step > 0 ? 1 : 0) - hop, 2, 2);
    ctx.fillRect(px + 10, py + 12 + (step < 0 ? 1 : 0) - hop, 2, 2);
    // Ears
    ctx.fillRect(px + 4 + dirOffset, py + 1 - hop + idleBreath, 2, 2);
    ctx.fillRect(px + 10 + dirOffset, py + 1 - hop + idleBreath, 2, 2);
    // Golden collar scarf
    ctx.fillStyle = '#ffcf3d';
    ctx.fillRect(px + 4, py + 7 - hop, 8, 2);
    // Glowing golden eyes
    if (facing !== 'up' && !blink) {
      ctx.fillRect(px + 5 + dirOffset, py + 4 - hop + idleBreath, 2, 2);
      ctx.fillRect(px + 9 + dirOffset, py + 4 - hop + idleBreath, 2, 2);
    }
    return;
  }

  if (spriteKey === 'task_snake') {
    const wiggle = Math.round(Math.sin(timeSec * 5) * 1);
    ctx.fillStyle = '#4ea843';
    ctx.fillRect(px + 3, py + 10, 10, 4);
    ctx.fillStyle = '#6ad158';
    ctx.fillRect(px + 4 + wiggle, py + 6, 8, 5);
    ctx.fillRect(px + 5 + wiggle, py + 2, 6, 5);
    ctx.fillStyle = '#131211';
    ctx.fillRect(px + 6 + wiggle, py + 3, 1, 2);
    ctx.fillRect(px + 9 + wiggle, py + 3, 1, 2);
    ctx.fillStyle = '#ffcf3d';
    ctx.fillRect(px + 11, py + 6, 4, 4);
    return;
  }

  // Humanoid 16x24 pixel character (Player visitor or Dom) anchored on tile (px, py)
  const isDom = spriteKey === 'dom';
  const shirt = isDom ? '#ffcf3d' : '#e88d4f';
  const hair = isDom ? '#261e1b' : '#302520';
  const pants = isDom ? '#2b3240' : '#334155';

  // Sleeping Dom tucked cozily on his bed
  if (animState === 'sleep') {
    const breathe = Math.sin(timeSec * 2.2) > 0 ? 1 : 0;
    // Head resting on pillow
    ctx.fillStyle = hair;
    ctx.fillRect(px + 3, py - 2, 9, 4);
    ctx.fillStyle = '#f2caa7';
    ctx.fillRect(px + 4, py + 1, 7, 4);
    // Closed peaceful eyes
    ctx.fillStyle = '#131211';
    ctx.fillRect(px + 5, py + 3, 2, 1);
    ctx.fillRect(px + 8, py + 3, 2, 1);
    // Blanket rise/fall
    ctx.fillStyle = '#c45e3e';
    ctx.fillRect(px + 2, py + 5 - breathe, 12, 7 + breathe);
    return;
  }

  // Taller 16x24 proportions extending 6px above tile top for Stardew-like silhouette
  const topY = py - 6 - bounce + idleBreath;
  const leanX = isRunning ? (facing === 'right' ? 1 : facing === 'left' ? -1 : 0) : 0;
  const playHop = animState === 'play' ? Math.round(Math.abs(Math.sin(timeSec * 7)) * 2) : 0;
  const y0 = topY - playHop;

  // Legs
  ctx.fillStyle = pants;
  ctx.fillRect(px + 4, py + 9 + (step > 0 ? 1 : 0), 3, 5);
  ctx.fillRect(px + 9, py + 9 + (step < 0 ? 1 : 0), 3, 5);

  // Arms swinging when walking/running
  ctx.fillStyle = shirt;
  const armSwing = isMoving ? step : 0;
  ctx.fillRect(px + 2 + leanX, y0 + 10 + armSwing, 2, 5);
  ctx.fillRect(px + 12 + leanX, y0 + 10 - armSwing, 2, 5);

  // Torso / hoodie
  ctx.fillRect(px + 4 + leanX, y0 + 9, 8, 7);

  // Backpack when facing up (player)
  if (!isDom && facing === 'up') {
    ctx.fillStyle = '#ffcf3d';
    ctx.fillRect(px + 5 + leanX, y0 + 10, 6, 5);
  }

  // Head
  ctx.fillStyle = '#f2caa7';
  ctx.fillRect(px + 4 + leanX, y0 + 2, 8, 7);

  // Hair / artist cap
  ctx.fillStyle = hair;
  ctx.fillRect(px + 3 + leanX, y0, 10, 4);
  if (isDom) {
    ctx.fillStyle = '#1c1b19';
    ctx.fillRect(px + 3 + leanX, y0, 10, 2);
    ctx.fillStyle = '#ffcf3d';
    ctx.fillRect(px + 6 + leanX, y0, 4, 1);
  }

  // Eyes (blinks naturally in idle)
  if (facing !== 'up') {
    ctx.fillStyle = '#131211';
    const ex = facing === 'left' ? -1 : facing === 'right' ? 1 : 0;
    if (blink) {
      ctx.fillRect(px + 5 + ex + leanX, y0 + 6, 2, 1);
      ctx.fillRect(px + 9 + ex + leanX, y0 + 6, 2, 1);
    } else {
      ctx.fillRect(px + 5 + ex + leanX, y0 + 5, 1, 2);
      ctx.fillRect(px + 9 + ex + leanX, y0 + 5, 1, 2);
    }
  }
}

export function drawNpcEmote(
  ctx: CanvasRenderingContext2D,
  px: number,
  baseY: number,
  emote: NpcEmote,
  timeSec: number
): void {
  const bob = Math.round(Math.sin(timeSec * 5) * 1.5);

  if (emote.kind === 'zzz') {
    const drift = Math.floor((timeSec * 6) % 6);
    ctx.fillStyle = '#93c5fd';
    // Tiny pixel "Z"
    const zx = px + 10 + Math.floor(drift / 2);
    const zy = baseY - drift;
    ctx.fillRect(zx, zy, 3, 1);
    ctx.fillRect(zx + 1, zy + 1, 1, 1);
    ctx.fillRect(zx, zy + 2, 3, 1);
    // Second smaller z
    ctx.fillStyle = 'rgba(147, 197, 253, 0.65)';
    ctx.fillRect(zx + 4, zy - 4, 2, 1);
    ctx.fillRect(zx + 4, zy - 2, 2, 1);
    return;
  }

  if (emote.kind === 'heart') {
    const hx = px + 5;
    const hy = baseY - 4 + bob;
    ctx.fillStyle = '#f472b6';
    ctx.fillRect(hx + 1, hy, 2, 1);
    ctx.fillRect(hx + 4, hy, 2, 1);
    ctx.fillRect(hx, hy + 1, 7, 2);
    ctx.fillRect(hx + 1, hy + 3, 5, 1);
    ctx.fillRect(hx + 2, hy + 4, 3, 1);
    ctx.fillRect(hx + 3, hy + 5, 1, 1);
    return;
  }

  if (emote.kind === 'alert') {
    const bx = px + 4;
    const by = baseY - 6 + bob;
    ctx.fillStyle = '#131211';
    ctx.fillRect(bx, by, 8, 9);
    ctx.fillStyle = '#ffcf3d';
    ctx.fillRect(bx + 1, by + 1, 6, 7);
    ctx.fillStyle = '#131211';
    ctx.fillRect(bx + 3, by + 2, 2, 3);
    ctx.fillRect(bx + 3, by + 6, 2, 1);
    return;
  }

  if (emote.kind === 'gaming') {
    const gx = px + 3;
    const gy = baseY - 6 + bob;
    ctx.fillStyle = '#131211';
    ctx.fillRect(gx, gy, 10, 7);
    ctx.fillStyle = '#c084fc';
    ctx.fillRect(gx + 1, gy + 1, 8, 5);
    ctx.fillStyle = '#f5efe6';
    ctx.fillRect(gx + 2, gy + 3, 2, 1);
    ctx.fillRect(gx + 7, gy + 2, 1, 1);
    ctx.fillRect(gx + 6, gy + 4, 1, 1);
    return;
  }

  if (emote.kind === 'meow') {
    const bx = px - 4;
    const by = baseY - 9 + bob;
    ctx.fillStyle = '#131211';
    ctx.fillRect(bx, by, 24, 10);
    ctx.fillStyle = '#f5efe6';
    ctx.fillRect(bx + 1, by + 1, 22, 8);
    // Tiny bubble tail
    ctx.fillStyle = '#131211';
    ctx.fillRect(px + 6, by + 10, 3, 2);
    ctx.fillStyle = '#131211';
    ctx.font = 'bold 6px monospace';
    ctx.fillText(emote.text || 'Meo~', bx + 3, by + 7);
  }
}
