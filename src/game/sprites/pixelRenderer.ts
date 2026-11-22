import type { Direction, MapProp } from '../../types/content';

export function drawTile(
  ctx: CanvasRenderingContext2D,
  ch: string,
  px: number,
  py: number,
  ts: number
): void {
  switch (ch) {
    case '.': {
      ctx.fillStyle = '#0e0d0c';
      ctx.fillRect(px, py, ts, ts);
      // Subtle dark foliage dots on border
      if ((px / ts + py / ts) % 3 === 0) {
        ctx.fillStyle = '#181a15';
        ctx.fillRect(px + 3, py + 4, 3, 2);
      }
      break;
    }
    case 'G': {
      // Night courtyard grass
      ctx.fillStyle = '#202b1e';
      ctx.fillRect(px, py, ts, ts);
      ctx.fillStyle = '#293826';
      if (((px + py) / ts) % 2 === 0) {
        ctx.fillRect(px + 2, py + 3, 2, 1);
        ctx.fillRect(px + 10, py + 11, 2, 1);
      } else {
        ctx.fillRect(px + 6, py + 8, 2, 1);
      }
      break;
    }
    case 'P': {
      // Warm Saigon brick walkway
      ctx.fillStyle = '#473c35';
      ctx.fillRect(px, py, ts, ts);
      ctx.fillStyle = '#574a42';
      ctx.fillRect(px + 1, py + 1, 6, 6);
      ctx.fillRect(px + 9, py + 1, 6, 6);
      ctx.fillRect(px + 1, py + 9, 6, 6);
      ctx.fillRect(px + 9, py + 9, 6, 6);
      break;
    }
    case 'O': {
      // Wooden front porch
      ctx.fillStyle = '#5c412c';
      ctx.fillRect(px, py, ts, ts);
      ctx.fillStyle = '#4a3322';
      ctx.fillRect(px, py + 7, ts, 1);
      ctx.fillRect(px, py + 15, ts, 1);
      ctx.fillStyle = '#705037';
      ctx.fillRect(px + 1, py + 1, ts - 2, 1);
      break;
    }
    case 'F': {
      // Cozy wooden studio floorboards
      ctx.fillStyle = '#332821';
      ctx.fillRect(px, py, ts, ts);
      ctx.fillStyle = '#2b211b';
      ctx.fillRect(px, py + 7, ts, 1);
      ctx.fillRect(px, py + 15, ts, 1);
      ctx.fillStyle = '#3c3027';
      ctx.fillRect(px + 2, py + 2, 5, 1);
      ctx.fillRect(px + 9, py + 10, 5, 1);
      break;
    }
    case 'C': {
      // Exhibition dark-red/amber woven gallery runner
      ctx.fillStyle = '#472a23';
      ctx.fillRect(px, py, ts, ts);
      ctx.fillStyle = '#59362c';
      ctx.fillRect(px + 1, py + 1, ts - 2, ts - 2);
      ctx.fillStyle = '#6e4535';
      ctx.fillRect(px + 4, py + 4, 2, 2);
      ctx.fillRect(px + 10, py + 10, 2, 2);
      break;
    }
    case 'T': {
      // Roof / thick upper wall border
      ctx.fillStyle = '#1b1918';
      ctx.fillRect(px, py, ts, ts);
      ctx.fillStyle = '#292522';
      ctx.fillRect(px, py + ts - 4, ts, 4);
      ctx.fillStyle = '#3b3530';
      ctx.fillRect(px, py + ts - 4, ts, 1);
      break;
    }
    case 'I': {
      // Interior dark charcoal museum wall (frames hang here!)
      ctx.fillStyle = '#242220';
      ctx.fillRect(px, py, ts, ts);
      ctx.fillStyle = '#1a1817';
      ctx.fillRect(px, py + ts - 3, ts, 3);
      ctx.fillStyle = '#36322e';
      ctx.fillRect(px, py, ts, 1);
      break;
    }
    case 'W': {
      // Exterior front facade wall
      ctx.fillStyle = '#3d342d';
      ctx.fillRect(px, py, ts, ts);
      ctx.fillStyle = '#2e2722';
      ctx.fillRect(px, py + ts - 3, ts, 3);
      ctx.fillStyle = '#4f443b';
      ctx.fillRect(px, py + 2, ts, 2);
      break;
    }
    case 'N': {
      // Cozy glowing pixel window on front facade
      ctx.fillStyle = '#3d342d';
      ctx.fillRect(px, py, ts, ts);
      ctx.fillStyle = '#1f1a17';
      ctx.fillRect(px + 2, py + 2, 12, 10);
      ctx.fillStyle = '#ffcf3d';
      ctx.fillRect(px + 3, py + 3, 10, 8);
      ctx.fillStyle = '#ffe99e';
      ctx.fillRect(px + 4, py + 4, 4, 3);
      // Window mullions
      ctx.fillStyle = '#4f3a29';
      ctx.fillRect(px + 7, py + 3, 2, 8);
      ctx.fillRect(px + 3, py + 6, 10, 1);
      break;
    }
    case 'D': {
      // Open warm welcoming doorway
      ctx.fillStyle = '#5c412c';
      ctx.fillRect(px, py, ts, ts);
      ctx.fillStyle = 'rgba(255, 207, 61, 0.22)';
      ctx.fillRect(px, py, ts, ts);
      ctx.fillStyle = '#7a563b';
      ctx.fillRect(px, py, ts, 2);
      break;
    }
    default: {
      ctx.fillStyle = '#131211';
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

  switch (prop.kind) {
    case 'art_frame': {
      const accent = prop.accentColor || '#ffcf3d';
      // Wooden exhibition frame
      ctx.fillStyle = '#6e4e32';
      ctx.fillRect(x + 1, y + 1, 14, 12);
      ctx.fillStyle = '#1a1817';
      ctx.fillRect(x + 2, y + 2, 12, 10);
      // Mini pixel painting preview
      ctx.fillStyle = accent;
      ctx.fillRect(x + 3, y + 3, 10, 8);
      ctx.fillStyle = '#1f1d1b';
      ctx.fillRect(x + 4, y + 7, 8, 4);
      ctx.fillStyle = '#f5efe6';
      ctx.fillRect(x + 5, y + 4, 3, 2);
      // Gallery track light above frame
      ctx.fillStyle = '#ffcf3d';
      ctx.fillRect(x + 6, y, 4, 1);
      break;
    }

    case 'merch_stall': {
      // Postcard wooden display counter (2 tiles wide)
      ctx.fillStyle = '#5c3c28';
      ctx.fillRect(x + 1, y + 3, w - 2, 12);
      ctx.fillStyle = '#7a5136';
      ctx.fillRect(x + 1, y + 2, w - 2, 4);
      // Colorful A5 postcards fanned out
      const colors = ['#72b8ff', '#ffcf3d', '#e88d4f', '#ffae33'];
      colors.forEach((c, i) => {
        ctx.fillStyle = '#f5efe6';
        ctx.fillRect(x + 3 + i * 7, y + 3, 5, 6);
        ctx.fillStyle = c;
        ctx.fillRect(x + 4 + i * 7, y + 4, 3, 4);
      });
      // Awning stripe
      ctx.fillStyle = '#ffcf3d';
      ctx.fillRect(x + 2, y, w - 4, 2);
      break;
    }

    case 'easel_desk': {
      // Dom's pixel-art studio desk with glowing display
      ctx.fillStyle = '#4f3a2c';
      ctx.fillRect(x + 1, y + 4, w - 2, 11);
      ctx.fillStyle = '#6b4f3c';
      ctx.fillRect(x + 1, y + 3, w - 2, 4);
      // Monitor glowing warmly
      ctx.fillStyle = '#1c1b19';
      ctx.fillRect(x + 6, y - 2, 12, 8);
      ctx.fillStyle = '#ffcf3d';
      ctx.fillRect(x + 7, y - 1, 10, 6);
      ctx.fillStyle = '#252320';
      ctx.fillRect(x + 9, y + 1, 4, 2);
      // Drawing tablet & mug
      ctx.fillStyle = '#2b2927';
      ctx.fillRect(x + 19, y + 4, 8, 5);
      ctx.fillStyle = '#e88d4f';
      ctx.fillRect(x + 3, y + 4, 3, 3);
      break;
    }

    case 'tea_table': {
      // Center exhibition catalog podium / tea table
      ctx.fillStyle = '#523828';
      ctx.fillRect(x + 2, y + 3, w - 4, 11);
      ctx.fillStyle = '#6e4c36';
      ctx.fillRect(x + 2, y + 2, w - 4, 4);
      // Open exhibition book
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
      ctx.fillStyle = '#4a3222';
      ctx.fillRect(x + 6, y + 10, 4, 6);
      ctx.fillStyle = '#1e4228';
      ctx.fillRect(x + 1, y + 2, 14, 10);
      ctx.fillStyle = '#2c5e36';
      ctx.fillRect(x + 3, y - 1, 10, 8);
      ctx.fillStyle = '#3b7844';
      ctx.fillRect(x + 5, y + 1, 5, 3);
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
      // Tet Golden Apricot Blossom Tree (Cây Mai Vàng)
      ctx.fillStyle = '#9e3226';
      ctx.fillRect(x + 4, y + 10, 8, 5);
      ctx.fillStyle = '#5c3c24';
      ctx.fillRect(x + 7, y + 4, 2, 7);
      ctx.fillRect(x + 4, y + 6, 8, 2);
      // Golden blossoms
      const blooms = [[3, 3], [7, 1], [11, 4], [5, 7], [10, 7], [8, 4]];
      blooms.forEach(([bx, by]) => {
        ctx.fillStyle = '#ffcf3d';
        ctx.fillRect(x + bx, y + by, 3, 3);
        ctx.fillStyle = '#fff5bd';
        ctx.fillRect(x + bx + 1, y + by + 1, 1, 1);
      });
      break;
    }

    case 'couplet': {
      // Red Tet vertical couplet banner on front wall
      ctx.fillStyle = '#c92a2a';
      ctx.fillRect(x + 6, y + 2, 4, 12);
      ctx.fillStyle = '#ffcf3d';
      ctx.fillRect(x + 7, y + 4, 2, 2);
      ctx.fillRect(x + 7, y + 7, 2, 2);
      ctx.fillRect(x + 7, y + 10, 2, 2);
      break;
    }

    case 'moon_table': {
      // Mid-Autumn mooncake tea table
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
    // "!" mark
    ctx.fillRect(bx + 4, by + 2, 2, 3);
    ctx.fillRect(bx + 4, by + 6, 2, 1);
  }
}

export function drawCharacter(
  ctx: CanvasRenderingContext2D,
  spriteKey: 'player' | 'dom' | 'ink_cat' | 'task_snake',
  px: number,
  py: number,
  facing: Direction,
  walkPhase: number,
  isMoving: boolean,
  isNearby: boolean,
  timeSec: number
): void {
  const step = isMoving ? (Math.floor(walkPhase * 8) % 2 === 0 ? 1 : -1) : 0;

  // Ground drop shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
  ctx.fillRect(px + 3, py + 13, 10, 3);

  if (spriteKey === 'ink_cat') {
    const tailWag = Math.round(Math.sin(timeSec * 4) * 1);
    // Tail
    ctx.fillStyle = '#141317';
    ctx.fillRect(px + 12, py + 8 + tailWag, 3, 2);
    ctx.fillRect(px + 13, py + 5 + tailWag, 2, 4);
    // Body & head
    ctx.fillStyle = '#141317';
    ctx.fillRect(px + 4, py + 7, 8, 6);
    ctx.fillRect(px + 4, py + 3, 8, 5);
    // Ears
    ctx.fillRect(px + 4, py + 1, 2, 2);
    ctx.fillRect(px + 10, py + 1, 2, 2);
    // Golden collar scarf
    ctx.fillStyle = '#ffcf3d';
    ctx.fillRect(px + 4, py + 7, 8, 2);
    // Glowing golden eyes
    ctx.fillRect(px + 5, py + 4, 2, 2);
    ctx.fillRect(px + 9, py + 4, 2, 2);
  } else if (spriteKey === 'task_snake') {
    const wiggle = Math.round(Math.sin(timeSec * 5) * 1);
    // Coiled green snake body
    ctx.fillStyle = '#4ea843';
    ctx.fillRect(px + 3, py + 10, 10, 4);
    ctx.fillStyle = '#6ad158';
    ctx.fillRect(px + 4 + wiggle, py + 6, 8, 5);
    ctx.fillRect(px + 5 + wiggle, py + 2, 6, 5);
    // Eyes
    ctx.fillStyle = '#131211';
    ctx.fillRect(px + 6 + wiggle, py + 3, 1, 2);
    ctx.fillRect(px + 9 + wiggle, py + 3, 1, 2);
    // Tiny yellow Task sticky note in front
    ctx.fillStyle = '#ffcf3d';
    ctx.fillRect(px + 11, py + 6, 4, 4);
  } else {
    // Humanoid pixel character (Player visitor or Dom!)
    const isDom = spriteKey === 'dom';
    const shirt = isDom ? '#ffcf3d' : '#e88d4f';
    const hair = isDom ? '#261e1b' : '#302520';
    const pants = isDom ? '#2b3240' : '#334155';

    // Legs (animated step)
    ctx.fillStyle = pants;
    ctx.fillRect(px + 4, py + 10 + (step > 0 ? 1 : 0), 3, 4);
    ctx.fillRect(px + 9, py + 10 + (step < 0 ? 1 : 0), 3, 4);

    // Torso / hoodie
    ctx.fillStyle = shirt;
    ctx.fillRect(px + 3, py + 6, 10, 5);

    // Backpack if facing up (player)
    if (!isDom && facing === 'up') {
      ctx.fillStyle = '#ffcf3d';
      ctx.fillRect(px + 5, py + 6, 6, 4);
    }

    // Head
    ctx.fillStyle = '#f2caa7';
    ctx.fillRect(px + 4, py + 1, 8, 5);

    // Hair / beanie
    ctx.fillStyle = hair;
    ctx.fillRect(px + 3, py, 10, 3);
    if (isDom) {
      // Dom's signature little artist cap brim
      ctx.fillStyle = '#1c1b19';
      ctx.fillRect(px + 3, py, 10, 2);
      ctx.fillStyle = '#ffcf3d';
      ctx.fillRect(px + 6, py, 4, 1);
    }

    // Eyes based on facing direction
    if (facing !== 'up') {
      ctx.fillStyle = '#131211';
      const ex = facing === 'left' ? -1 : facing === 'right' ? 1 : 0;
      ctx.fillRect(px + 5 + ex, py + 3, 1, 2);
      ctx.fillRect(px + 9 + ex, py + 3, 1, 2);
    }
  }

  if (isNearby && spriteKey !== 'player') {
    const bob = Math.round(Math.sin(timeSec * 6) * 1.5);
    const bx = px + 3;
    const by = py - 11 + bob;
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
