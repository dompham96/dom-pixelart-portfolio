const artCache = new Map<string, string>();

type PxFn = (x: number, y: number, w: number, h: number, color: string) => void;

function createPixelCanvas(w: number, h: number, draw: (px: PxFn, ctx: CanvasRenderingContext2D) => void): string {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  ctx.imageSmoothingEnabled = false;
  const px: PxFn = (x, y, rw, rh, color) => {
    ctx.fillStyle = color;
    ctx.fillRect(Math.floor(x), Math.floor(y), Math.floor(rw), Math.floor(rh));
  };
  draw(px, ctx);
  return canvas.toDataURL('image/png');
}

/**
 * Generates crisp low-resolution pixel-art showcase canvases for each artwork slot.
 * Replaced automatically whenever an item specifies a real `src` PNG/GIF in `artworks.json`.
 */
export function getArtworkImageUrl(proceduralKey: string, src?: string): string {
  if (src) return src;
  const cached = artCache.get(proceduralKey);
  if (cached) return cached;

  const url = createPixelCanvas(64, 48, (px) => {
    // Deep cozy background
    px(0, 0, 64, 48, '#171514');

    switch (proceduralKey) {
      case 'saigon_com_tam': {
        // Warm alleyway lunch scene + plate of broken rice
        px(0, 0, 64, 24, '#241c18');
        px(0, 24, 64, 24, '#362720');
        // Hanging warm bulb
        px(31, 0, 2, 7, '#4d4138');
        px(29, 7, 6, 4, '#ffcf3d');
        px(25, 11, 14, 2, 'rgba(255,207,61,0.22)');
        // Wooden table
        px(6, 26, 52, 18, '#5c3c28');
        px(6, 26, 52, 2, '#785038');
        // White plate
        px(16, 29, 32, 12, '#e6dfd3');
        px(18, 30, 28, 10, '#f7f2e8');
        // Broken rice mound
        px(20, 32, 12, 6, '#fffdf5');
        px(22, 31, 8, 2, '#fffdf5');
        // Grilled pork chop (sườn nướng)
        px(31, 31, 13, 7, '#9e461f');
        px(32, 32, 11, 5, '#c45b28');
        px(34, 33, 2, 3, '#6e2c11');
        px(38, 33, 2, 3, '#6e2c11');
        // Sunny side egg + scallion oil
        px(23, 34, 6, 4, '#ffffff');
        px(25, 35, 2, 2, '#ffae2b');
        px(28, 31, 3, 2, '#62b346');
        // Small fish sauce bowl
        px(48, 30, 7, 5, '#e6dfd3');
        px(49, 31, 5, 3, '#d97724');
        // Steam wisps
        px(24, 20, 1, 5, 'rgba(255,245,220,0.45)');
        px(35, 18, 1, 6, 'rgba(255,245,220,0.45)');
        px(40, 21, 1, 4, 'rgba(255,245,220,0.35)');
        break;
      }

      case 'saigon_coffee': {
        // Morning Saigon sidewalk coffee
        px(0, 0, 64, 26, '#2a2c38');
        px(0, 26, 64, 22, '#3d3732');
        // Sun rays
        px(46, 4, 10, 10, '#ffcf3d');
        px(44, 6, 14, 6, 'rgba(255,207,61,0.35)');
        // Red plastic stool table
        px(20, 30, 24, 4, '#c93b3b');
        px(22, 34, 3, 12, '#a32c2c');
        px(39, 34, 3, 12, '#a32c2c');
        // Glass of iced milk coffee (Cà phê sữa đá)
        px(27, 17, 10, 13, '#d8e2e6');
        px(28, 19, 8, 10, '#6e3f22');
        px(28, 25, 8, 4, '#e8d5b7');
        // Ice cubes
        px(29, 20, 3, 3, '#ffffff');
        px(33, 21, 2, 2, '#d8f0ff');
        // Straw
        px(33, 11, 2, 8, '#ffcf3d');
        // Iced tea glass beside it
        px(39, 22, 5, 8, '#c7b887');
        px(40, 24, 3, 5, '#a88a32');
        break;
      }

      case 'saigon_hu_tieu': {
        // Midnight noodle cart glowing in the dark
        px(0, 0, 64, 34, '#111420');
        px(0, 34, 64, 14, '#242220');
        // Stars
        px(8, 5, 1, 1, '#fff3c4');
        px(54, 8, 1, 1, '#fff3c4');
        px(16, 10, 1, 1, '#ffcf3d');
        // Cart body
        px(16, 12, 32, 24, '#7d4a2d');
        px(18, 14, 28, 12, '#ffcf3d');
        px(19, 15, 26, 10, '#ffe89c');
        // Red sign stripe "HỦ TIẾU"
        px(16, 10, 32, 4, '#c9382b');
        px(21, 11, 22, 2, '#ffcf3d');
        // Silhouettes of bottles & bowls inside glass
        px(21, 20, 4, 5, '#59331e');
        px(28, 18, 5, 7, '#a83c28');
        px(36, 21, 6, 4, '#f5efe6');
        // Cart wheels
        px(20, 36, 6, 6, '#131211');
        px(22, 38, 2, 2, '#a89f91');
        px(38, 36, 6, 6, '#131211');
        px(40, 38, 2, 2, '#a89f91');
        // Warm glow on street
        px(12, 36, 40, 6, 'rgba(255,207,61,0.16)');
        break;
      }

      case 'the_mam_ment': {
        // Circular silver Vietnamese dining tray (Mâm cơm) overhead
        px(0, 0, 64, 48, '#261a14');
        // Floor mat pattern
        for (let y = 0; y < 48; y += 4) {
          px(0, y, 64, 1, '#2f2119');
        }
        // Round tray
        px(14, 6, 36, 36, '#9ba3ad');
        px(16, 8, 32, 32, '#c8d0d8');
        px(18, 10, 28, 28, '#aeb7c2');
        // Bowls of memories & food
        // Rice bowl
        px(20, 12, 9, 9, '#f5efe6');
        px(22, 14, 5, 5, '#ffffff');
        // Braised fish pot (cá kho)
        px(34, 12, 10, 10, '#592e1a');
        px(36, 14, 6, 6, '#c46625');
        // Soup bowl (canh chua)
        px(27, 25, 11, 10, '#f5efe6');
        px(29, 27, 7, 6, '#e87f35');
        px(31, 28, 2, 2, '#59b347');
        // Blue butter cookie sewing tin memory!
        px(19, 26, 7, 7, '#2d5ea8');
        px(21, 28, 3, 3, '#ffcf3d');
        // Chopsticks
        px(12, 18, 2, 14, '#7a4927');
        px(50, 18, 2, 14, '#7a4927');
        break;
      }

      case 'trung_thu_mooncake': {
        // Full moon night + two mooncake champions + star lantern
        px(0, 0, 64, 30, '#18142b');
        px(0, 30, 64, 18, '#2b1e24');
        // Giant glowing full moon
        px(22, 3, 20, 20, '#ffcf3d');
        px(24, 5, 16, 16, '#ffe58f');
        px(28, 9, 4, 3, '#f0be3e');
        // Hanging star lantern
        px(9, 0, 1, 9, '#a89f91');
        px(6, 9, 7, 7, '#e63946');
        px(8, 11, 3, 3, '#ffcf3d');
        // Mung Bean Mooncake (Left - Golden)
        px(11, 28, 16, 13, '#d99526');
        px(13, 30, 12, 9, '#f2b844');
        px(16, 33, 6, 3, '#ffea80');
        // Mixed Nuts Mooncake (Right - Rich Amber)
        px(37, 28, 16, 13, '#9c4e1c');
        px(39, 30, 12, 9, '#c76c2a');
        px(41, 32, 2, 2, '#7ed957');
        px(45, 34, 3, 2, '#e63946');
        px(47, 31, 2, 2, '#ffcf3d');
        // VS spark in center
        px(31, 32, 2, 6, '#ffcf3d');
        px(29, 34, 6, 2, '#ffffff');
        break;
      }

      case 'qua_o_cua_so': {
        // Cozy wooden window overlooking twilight Saigon sky
        px(0, 0, 64, 48, '#261e1b');
        // Sky outside window
        px(12, 6, 40, 32, '#243554');
        px(12, 22, 40, 16, '#4a4369');
        px(12, 30, 40, 8, '#c9724b');
        // Fluffy pixel clouds
        px(17, 13, 10, 4, '#e6b89c');
        px(36, 16, 11, 3, '#d49d8a');
        // Distant city rooftops + warm lights
        px(12, 31, 9, 7, '#1a1824');
        px(23, 28, 12, 10, '#15141f');
        px(38, 30, 14, 8, '#1b1826');
        px(26, 31, 2, 2, '#ffcf3d');
        px(31, 33, 2, 2, '#ffcf3d');
        px(42, 33, 2, 2, '#ffcf3d');
        // Wooden window frame & shutters
        px(10, 4, 44, 3, '#6b4226');
        px(10, 38, 44, 4, '#7d4f2f');
        px(10, 4, 3, 36, '#6b4226');
        px(51, 4, 3, 36, '#6b4226');
        px(31, 6, 2, 32, '#6b4226');
        // Tiny potted cactus on sill
        px(43, 33, 5, 5, '#b85332');
        px(44, 29, 3, 4, '#59a848');
        break;
      }

      case 'ran_an_task': {
        // Classic Snake game board but eating sticky-note Tasks!
        px(0, 0, 64, 48, '#17241a');
        px(4, 4, 56, 40, '#213626');
        // Subtle grid
        for (let x = 8; x < 60; x += 8) px(x, 4, 1, 40, '#28422e');
        for (let y = 8; y < 44; y += 8) px(4, y, 56, 1, '#28422e');
        // Pixel green snake winding around
        const segs = [
          [12, 32], [16, 32], [20, 32], [24, 32],
          [24, 28], [24, 24], [24, 20],
          [28, 20], [32, 20], [36, 20], [40, 20],
        ];
        segs.forEach(([sx, sy], i) => {
          px(sx, sy, 4, 4, i === segs.length - 1 ? '#a3f06c' : '#65c447');
        });
        // Snake eyes + tiny sweat drop
        px(42, 21, 1, 1, '#131211');
        px(41, 17, 1, 2, '#72b8ff');
        // Yellow sticky-note "TASK" ahead of snake
        px(48, 19, 6, 6, '#ffcf3d');
        px(49, 21, 4, 1, '#8a5a14');
        px(49, 23, 3, 1, '#8a5a14');
        // Red Tet envelope / banh chung corner
        px(10, 10, 6, 6, '#4ea843');
        px(12, 10, 1, 6, '#e6dfd3');
        px(10, 12, 6, 1, '#e6dfd3');
        break;
      }

      case 'ma_lon': {
        // Spooky-cute midnight alley with rolling glowing tin can
        px(0, 0, 64, 32, '#141121');
        px(0, 32, 64, 16, '#23202b');
        // Crescent moon
        px(48, 5, 8, 8, '#e8e0c5');
        px(46, 5, 6, 6, '#141121');
        // Alley walls
        px(0, 10, 16, 24, '#241f30');
        px(48, 12, 16, 22, '#241f30');
        // Tin can rolling with ghostly lavender aura
        px(24, 28, 16, 12, 'rgba(192,132,252,0.22)');
        px(27, 31, 10, 7, '#9ba3ad');
        px(28, 32, 8, 5, '#cbd4de');
        px(30, 33, 4, 3, '#c9382b');
        // Cute ghost eyes peeking above the can
        px(29, 24, 6, 6, 'rgba(245,239,230,0.75)');
        px(30, 26, 1, 1, '#131211');
        px(33, 26, 1, 1, '#131211');
        break;
      }

      case 'astrovert': {
        // Quiet introverted astronaut floating in starry cosmos
        px(0, 0, 64, 48, '#0c1021');
        // Stars & tiny planets
        const stars = [[6, 8], [15, 5], [50, 10], [56, 22], [10, 36], [46, 40], [24, 12]];
        stars.forEach(([sx, sy]) => px(sx, sy, 1, 1, '#f5efe6'));
        px(48, 12, 8, 8, '#3b5c99');
        px(46, 15, 12, 2, '#ffcf3d');
        // Astronaut helmet & suit
        px(25, 14, 14, 13, '#e8edf2');
        px(27, 17, 10, 7, '#1b2b4a');
        px(29, 18, 3, 2, '#72b8ff');
        px(26, 27, 12, 11, '#d3dce6');
        px(29, 29, 6, 4, '#ffcf3d');
        // Tiny headphones
        px(23, 17, 2, 6, '#e88d4f');
        px(39, 17, 2, 6, '#e88d4f');
        break;
      }

      case 'ink_the_cat':
      default: {
        // Ink the black cat with golden eyes & game controller
        px(0, 0, 64, 48, '#1b1620');
        px(0, 34, 64, 14, '#2b232e');
        // Spotlight behind Ink
        px(18, 8, 28, 28, 'rgba(255,207,61,0.12)');
        // Cat ears
        px(22, 10, 4, 5, '#121114');
        px(38, 10, 4, 5, '#121114');
        px(23, 12, 2, 2, '#f472b6');
        px(39, 12, 2, 2, '#f472b6');
        // Cat head & body
        px(22, 14, 20, 13, '#121114');
        px(24, 27, 16, 11, '#121114');
        // Golden glowing eyes
        px(26, 18, 3, 3, '#ffcf3d');
        px(35, 18, 3, 3, '#ffcf3d');
        px(27, 19, 1, 2, '#131211');
        px(36, 19, 1, 2, '#131211');
        // Yellow scarf
        px(24, 26, 16, 3, '#ffcf3d');
        // Tail
        px(40, 32, 6, 3, '#121114');
        px(44, 27, 3, 6, '#121114');
        break;
      }
    }
  });

  artCache.set(proceduralKey, url);
  return url;
}
