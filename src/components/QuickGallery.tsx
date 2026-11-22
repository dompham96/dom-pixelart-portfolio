import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  Compass,
  Film,
  Gamepad2,
  Lock,
  MapPin,
  ShoppingBag,
  Sparkles,
} from 'lucide-react';
import type { ArtworkCollection, Locale } from '../types/content';
import { artworkCollections } from '../data';
import { getArtworkImageUrl } from '../game/sprites/placeholderArt';
import { soundEngine } from '../audio/SoundEngine';

interface QuickGalleryProps {
  locale: Locale;
  onSelectCollection: (collection: ArtworkCollection) => void;
  onSwitchToGame: () => void;
}

type CategoryFilter = 'all' | 'saigon' | 'festival' | 'life' | 'wip';

interface MapNodeConfig {
  id: string;
  chapter: string;
  x: number; // percentage 0..100 on 16:9 map
  y: number; // percentage 0..100 on 16:9 map
  landmark: { vi: string; en: string };
}

const MAP_NODES: MapNodeConfig[] = [
  {
    id: 'ma-lon',
    chapter: '01',
    x: 17,
    y: 28,
    landmark: { vi: 'Con Hẻm Đêm Trăng', en: 'Moonlit Folklore Alley' },
  },
  {
    id: 'sai-gon-tales',
    chapter: '02',
    x: 24,
    y: 67,
    landmark: { vi: 'Góc Phố Ẩm Thực Sài Gòn', en: 'Saigon Street Flavor Corner' },
  },
  {
    id: 'the-mam-ment',
    chapter: '03',
    x: 41,
    y: 47,
    landmark: { vi: 'Mái Nhà Ký Ức', en: 'Family Memory Hearth' },
  },
  {
    id: 'trung-thu-vui-ky',
    chapter: '04',
    x: 51,
    y: 23,
    landmark: { vi: 'Đồi Đèn Lồng Rằm Tháng 8', en: 'Mid-Autumn Lantern Hill' },
  },
  {
    id: 'qua-o-cua-so',
    chapter: '05',
    x: 58,
    y: 62,
    landmark: { vi: 'Ban Công Ô Cửa Sổ', en: 'Quiet Window Lookout' },
  },
  {
    id: 'ran-an-task',
    chapter: '06',
    x: 72,
    y: 74,
    landmark: { vi: 'Sân Làng Dọn Tết', en: 'Tet Blossom Courtyard' },
  },
  {
    id: 'astrovert',
    chapter: '07',
    x: 79,
    y: 26,
    landmark: { vi: 'Đài Quan Sát Ngân Hà', en: 'Quiet Galaxy Observatory' },
  },
  {
    id: 'ink-the-game',
    chapter: '08',
    x: 84,
    y: 52,
    landmark: { vi: 'Khu Vườn Mèo Ink', en: "Cat Ink's Pixel Glade" },
  },
];

const NODE_MAP = new Map(MAP_NODES.map((n) => [n.id, n]));

function matchesFilter(col: ArtworkCollection, filter: CategoryFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'wip') return col.status === 'coming_soon';
  return col.category === filter;
}

export function QuickGallery({ locale, onSelectCollection, onSwitchToGame }: QuickGalleryProps) {
  const [filter, setFilter] = useState<CategoryFilter>('all');
  const [focusedId, setFocusedId] = useState<string>(artworkCollections[0]?.id ?? 'sai-gon-tales');
  const mapCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const filters: Array<{ id: CategoryFilter; label: { vi: string; en: string } }> = [
    { id: 'all', label: { vi: `Tất cả (${artworkCollections.length})`, en: `All (${artworkCollections.length})` } },
    { id: 'saigon', label: { vi: 'Sài Gòn', en: 'Saigon' } },
    { id: 'festival', label: { vi: 'Lễ hội & Tết', en: 'Festivals' } },
    { id: 'life', label: { vi: 'Ký ức', en: 'Memories' } },
    { id: 'wip', label: { vi: 'Sắp ra mắt', en: 'Coming Soon' } },
  ];

  // Ordered collection list synced with map nodes
  const mapEntries = useMemo(() => {
    return artworkCollections.map((col, idx) => {
      const fallbackX = 16 + (idx % 4) * 22;
      const fallbackY = idx < 4 ? 30 : 68;
      const node = NODE_MAP.get(col.id) ?? {
        id: col.id,
        chapter: String(idx + 1).padStart(2, '0'),
        x: fallbackX,
        y: fallbackY,
        landmark: col.title,
      };
      return { col, node, highlighted: matchesFilter(col, filter) };
    });
  }, [filter]);

  const focusedEntry = useMemo(() => {
    return (
      mapEntries.find((e) => e.col.id === focusedId) ||
      mapEntries.find((e) => e.highlighted) ||
      mapEntries[0]
    );
  }, [mapEntries, focusedId]);

  // Procedural Cozy Night 16-bit Pixel Overworld Map Canvas (320x180 scaled crisp)
  useEffect(() => {
    const canvas = mapCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = 320;
    const H = 180;
    canvas.width = W;
    canvas.height = H;

    const stars = Array.from({ length: 30 }, (_, i) => ({
      x: 205 + ((i * 37) % 110),
      y: 6 + ((i * 23) % 62),
      phase: i * 0.7,
    }));

    const fireflies = Array.from({ length: 18 }, (_, i) => ({
      x: 24 + ((i * 53) % (W - 48)),
      y: 22 + ((i * 31) % (H - 44)),
      phase: i * 1.1,
    }));

    const trees: Array<[number, number, string]> = [
      [26, 46, '#233629'], [34, 64, '#1D2E23'], [44, 34, '#233629'],
      [88, 36, '#25392B'], [114, 72, '#1F3125'], [134, 52, '#273D2D'],
      [184, 38, '#233629'], [178, 86, '#1E3024'], [148, 128, '#233629'],
      [206, 122, '#2A3F2F'], [236, 98, '#24382A'], [274, 114, '#2A3B28'],
      [104, 134, '#213327'], [62, 138, '#1D2E23'], [254, 72, '#223329'],
    ];

    const lamps: Array<[number, number, string]> = [
      [56, 52, '#C084FC'],
      [78, 118, '#FFCF3D'],
      [132, 86, '#E88D4F'],
      [164, 42, '#FFAE33'],
      [186, 112, '#72B8FF'],
      [230, 132, '#7ED957'],
      [252, 46, '#60A5FA'],
      [268, 92, '#F472B6'],
    ];

    let rafId = 0;

    const drawPixelIsland = (
      cx: number,
      cy: number,
      rx: number,
      ry: number,
      color: string
    ) => {
      ctx.fillStyle = color;
      for (let py = -ry; py <= ry; py += 2) {
        const ratio = py / ry;
        const span = Math.floor(rx * Math.sqrt(Math.max(0, 1 - ratio * ratio)));
        const snap = Math.floor(span / 2) * 2;
        if (snap > 0) {
          ctx.fillRect(Math.round(cx - snap), Math.round(cy + py), snap * 2, 2);
        }
      }
    };

    const render = (now: number) => {
      const t = now / 1000;
      ctx.imageSmoothingEnabled = false;

      // 1. Deep cozy night ocean / parchment-night backdrop
      ctx.fillStyle = '#12151C';
      ctx.fillRect(0, 0, W, H);

      // Subtle pixel cartography grid lines
      ctx.fillStyle = 'rgba(255, 207, 61, 0.045)';
      for (let gx = 0; gx < W; gx += 20) ctx.fillRect(gx, 0, 1, H);
      for (let gy = 0; gy < H; gy += 20) ctx.fillRect(0, gy, W, 1);

      // Animated water ripple pixels
      ctx.fillStyle = '#1D2534';
      for (let r = 0; r < 22; r++) {
        const rx = ((r * 47 + Math.floor(t * 4)) % (W - 12)) + 4;
        const ry = (r * 29) % (H - 8);
        ctx.fillRect(rx, ry, 5, 1);
      }

      // 2. Main island coastline shadow + shore trim + warm mossy/stone terrain
      drawPixelIsland(156, 94, 134, 68, '#1B222D'); // outer shallow water
      drawPixelIsland(156, 94, 128, 63, '#3B3630'); // stone coastline border
      drawPixelIsland(156, 93, 125, 60, '#222823'); // main dark meadow

      // Distinct regional terrain biomes matching Dom's artwork worlds
      drawPixelIsland(58, 52, 34, 24, '#231F2C');  // Folklore alley (top-left, subtle violet night)
      drawPixelIsland(80, 118, 42, 24, '#2D251E'); // Saigon street food corner (warm brick earth)
      drawPixelIsland(134, 86, 36, 24, '#2C261F'); // Family Memory Hearth (center)
      drawPixelIsland(164, 46, 34, 20, '#2E251C'); // Mid-Autumn Lantern Hill
      drawPixelIsland(226, 126, 36, 22, '#243025'); // Tet Blossom Courtyard
      drawPixelIsland(252, 46, 34, 22, '#171C2E'); // Astrovert Observatory (starry indigo)
      drawPixelIsland(264, 94, 28, 22, '#27232E'); // Cat Ink's Pixel Glade

      // Curving Saigon-inspired midnight river cutting through bottom-left/center
      ctx.fillStyle = '#182130';
      for (let i = 0; i < 65; i++) {
        const rx = 104 + Math.sin(i * 0.08) * 14 + i * 0.55;
        const ry = 108 + i * 1.1;
        if (ry < H) ctx.fillRect(Math.round(rx), Math.round(ry), 8, 2);
      }
      // Tiny wooden pixel bridge across the river
      ctx.fillStyle = '#8C5E3C';
      ctx.fillRect(114, 122, 14, 5);
      ctx.fillStyle = '#C99563';
      ctx.fillRect(114, 122, 14, 1);

      // 3. Tiny pixel houses & landmarks decorating the world
      const drawTinyHouse = (x: number, y: number, roof: string, lit = true) => {
        ctx.fillStyle = '#3B3028';
        ctx.fillRect(x, y + 4, 10, 6);
        ctx.fillStyle = roof;
        ctx.fillRect(x - 1, y + 2, 12, 3);
        ctx.fillRect(x + 1, y, 8, 2);
        if (lit) {
          ctx.fillStyle = '#FFCF3D';
          ctx.fillRect(x + 2, y + 6, 2, 2);
          ctx.fillRect(x + 6, y + 6, 2, 2);
        }
      };

      drawTinyHouse(64, 114, '#A84832');
      drawTinyHouse(86, 122, '#8F3E2D');
      drawTinyHouse(126, 82, '#B66A36');
      drawTinyHouse(182, 106, '#506B8C');
      drawTinyHouse(220, 126, '#A3483A');

      // Tiny Tet apricot blossom dots around Tet courtyard
      ctx.fillStyle = '#FFCF3D';
      ctx.fillRect(216, 134, 2, 2);
      ctx.fillRect(238, 126, 2, 2);
      ctx.fillRect(242, 136, 2, 2);

      // Tiny glowing Mid-Autumn lanterns on top hill
      ctx.fillStyle = '#FF6B4A';
      ctx.fillRect(156, 38, 2, 3);
      ctx.fillRect(170, 36, 2, 3);
      ctx.fillStyle = '#FFCF3D';
      ctx.fillRect(163, 33, 3, 3);

      // Tiny pixel trees
      for (const [tx, ty, col] of trees) {
        ctx.fillStyle = '#151210';
        ctx.fillRect(tx + 2, ty + 6, 2, 2);
        ctx.fillStyle = col;
        ctx.fillRect(tx, ty + 2, 6, 4);
        ctx.fillRect(tx + 1, ty, 4, 2);
      }

      // Twinkling stars in Astrovert cosmic corner
      for (const s of stars) {
        const alpha = 0.25 + 0.65 * Math.abs(Math.sin(t * 1.4 + s.phase));
        ctx.fillStyle = `rgba(214, 232, 255, ${alpha.toFixed(2)})`;
        ctx.fillRect(s.x, s.y, 1, 1);
      }

      // 4. Soft glowing landmark pools beneath each project badge
      for (const [lx, ly, hex] of lamps) {
        const pulse = 0.88 + 0.12 * Math.sin(t * 2 + lx * 0.1);
        const grad = ctx.createRadialGradient(lx, ly, 1, lx, ly, 20 * pulse);
        grad.addColorStop(0, `${hex}44`);
        grad.addColorStop(1, `${hex}00`);
        ctx.fillStyle = grad;
        ctx.fillRect(lx - 22, ly - 22, 44, 44);
      }

      // 5. Drifting golden fireflies
      for (const f of fireflies) {
        const fx = f.x + Math.sin(t * 0.9 + f.phase) * 3;
        const fy = f.y + Math.cos(t * 0.7 + f.phase) * 2;
        const alpha = 0.25 + 0.55 * Math.abs(Math.sin(t * 1.8 + f.phase));
        ctx.fillStyle = `rgba(255, 207, 61, ${alpha.toFixed(2)})`;
        ctx.fillRect(Math.round(fx), Math.round(fy), 1, 1);
      }

      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const handleOpenBook = (col: ArtworkCollection) => {
    soundEngine.playChime();
    onSelectCollection(col);
  };

  // Build SVG polyline string connecting map nodes in chapter order
  const trailPoints = useMemo(() => {
    return [...mapEntries]
      .sort((a, b) => a.node.chapter.localeCompare(b.node.chapter))
      .map((e) => `${e.node.x},${e.node.y}`)
      .join(' ');
  }, [mapEntries]);

  return (
    <main className="museum-backdrop min-h-dvh w-full px-3 pb-14 pt-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        {/* Compact RPG Map Header */}
        <div className="mb-4 flex flex-col justify-between gap-3 border-b-2 border-[#3B3630] pb-4 md:flex-row md:items-end">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <Compass className="h-4 w-4 text-[#FFCF3D]" />
              <span className="font-mono-code text-[11px] uppercase tracking-[0.2em] text-[#FFCF3D]">
                {locale === 'vi'
                  ? 'Bản đồ Triển lãm • Draft Demo'
                  : 'Exhibition Mini-Map • Draft Demo'}
              </span>
            </div>
            <h1 className="font-pixel text-2xl font-bold text-[#F5EFE6] sm:text-4xl">
              DOM GALLERY MAP
            </h1>
            <p className="mt-1 text-xs text-[#A89F91] sm:text-sm">
              {locale === 'vi'
                ? 'Mỗi huy hiệu là một bộ tranh trên bản đồ. Bấm vào huy hiệu để mở cuốn sách và lật từng trang khám phá.'
                : 'Each badge marks a pixel art series on the map. Click any badge to open its flipbook and turn the pages.'}
            </p>
          </div>

          <button
            type="button"
            onClick={onSwitchToGame}
            className="pixel-btn pixel-btn-primary flex shrink-0 items-center justify-center gap-2 self-start px-3.5 py-2 text-xs font-bold sm:text-sm md:self-auto"
          >
            <Gamepad2 className="h-4 w-4" />
            <span>{locale === 'vi' ? 'Vào nhà chơi Minigame' : 'Back to 2D Minigame'}</span>
          </button>
        </div>

        {/* Filter Bar */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {filters.map((f) => {
              const active = filter === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => {
                    setFilter(f.id);
                    const firstMatch = mapEntries.find((e) => matchesFilter(e.col, f.id));
                    if (firstMatch) setFocusedId(firstMatch.col.id);
                  }}
                  className={`pixel-btn px-3 py-1 text-xs sm:text-sm ${
                    active ? 'pixel-btn-primary font-bold' : ''
                  }`}
                >
                  {f.label[locale]}
                </button>
              );
            })}
          </div>

          <span className="font-mono-code hidden text-[11px] text-[#A89F91] sm:inline">
            {locale === 'vi' ? '★ Click huy hiệu → Mở sách lật trang' : '★ Click badge → Open artbook'}
          </span>
        </div>

        {/* Interactive Pixel Mini-Map Stage */}
        <section className="pixel-panel relative overflow-hidden p-2 sm:p-3">
          {/* Mobile horizontal pan hint */}
          <div className="mb-1.5 flex items-center justify-between px-1 sm:hidden">
            <span className="font-mono-code text-[10px] text-[#FFCF3D]">
              {locale === 'vi' ? '← Vuốt ngang bản đồ →' : '← Swipe map horizontally →'}
            </span>
            <span className="font-mono-code text-[10px] text-[#A89F91]">
              {locale === 'vi' ? 'Chạm huy hiệu mở sách' : 'Tap badge to open'}
            </span>
          </div>

          <div className="overflow-x-auto pb-1 sm:overflow-visible sm:pb-0">
            <div className="relative aspect-[16/9] min-w-[620px] w-full overflow-hidden border-2 border-[#3B3630] bg-[#12151C] sm:min-w-0">
              {/* Crisp Pixel Overworld Canvas */}
              <canvas
                ref={mapCanvasRef}
                aria-hidden="true"
                className="pixelated absolute inset-0 h-full w-full"
              />

              {/* Subtle map frame vignette */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 shadow-[inset_0_0_48px_rgba(10,9,8,0.75)]"
              />

              {/* Decorative RPG Compass Rose (top-right) */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute right-3 top-3 z-10 flex flex-col items-center border border-[#3B3630] bg-[#131211]/85 px-2 py-1.5"
              >
                <span className="font-pixel text-[10px] font-bold leading-none text-[#FFCF3D]">N</span>
                <Compass className="my-0.5 h-4 w-4 text-[#A89F91]" />
                <span className="font-mono-code text-[9px] leading-none text-[#A89F91]">16-BIT</span>
              </div>

              {/* Coordinates stamp (top-left) */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-3 z-10 border border-[#3B3630] bg-[#131211]/85 px-2.5 py-1"
              >
                <span className="font-mono-code text-[10px] uppercase tracking-wider text-[#A89F91]">
                  {locale === 'vi' ? 'THẾ GIỚI DOM • 8 ĐỊA ĐIỂM' : 'DOM WORLD • 8 LANDMARKS'}
                </span>
              </div>

              {/* Dashed RPG Quest Trail connecting all 8 badges */}
              <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 z-10 h-full w-full"
              >
                <polyline
                  points={trailPoints}
                  fill="none"
                  stroke="#0a0908"
                  strokeWidth="0.9"
                  strokeDasharray="1.8 1.6"
                  opacity="0.7"
                />
                <polyline
                  points={trailPoints}
                  fill="none"
                  stroke="#FFCF3D"
                  strokeWidth="0.45"
                  strokeDasharray="1.8 1.6"
                  opacity="0.58"
                />
              </svg>

              {/* 8 Interactive Project Badge Pins */}
              {mapEntries.map(({ col, node, highlighted }) => {
                const cover = col.items[0];
                const imgUrl = getArtworkImageUrl(cover.proceduralKey, cover.src);
                const isFocused = focusedEntry?.col.id === col.id;
                const isComingSoon = col.status === 'coming_soon';

                return (
                  <button
                    key={col.id}
                    type="button"
                    onMouseEnter={() => setFocusedId(col.id)}
                    onFocus={() => setFocusedId(col.id)}
                    onClick={() => handleOpenBook(col)}
                    style={{ left: `${node.x}%`, top: `${node.y}%` }}
                    aria-label={`${col.title[locale]} — ${node.landmark[locale]}`}
                    className={`group absolute z-20 -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-200 focus:outline-none ${
                      highlighted ? 'opacity-100' : 'opacity-30 hover:opacity-80'
                    } ${isFocused ? 'z-30 scale-110' : 'hover:z-30 hover:scale-110'}`}
                  >
                    {/* Pulsing beacon ring */}
                    {highlighted && (
                      <span
                        aria-hidden="true"
                        className="animate-map-beacon pointer-events-none absolute -inset-1.5 border-2"
                        style={{ borderColor: col.accentColor }}
                      />
                    )}

                    {/* Badge Crest Medallion */}
                    <div
                      className="relative flex h-12 w-12 items-center justify-center border-2 bg-[#131211] p-1 shadow-[0_4px_0_#0a0908,0_8px_18px_rgba(0,0,0,0.75)] transition sm:h-14 sm:w-14"
                      style={{
                        borderColor: isFocused ? '#FFCF3D' : col.accentColor,
                        boxShadow: isFocused
                          ? `0 0 18px ${col.accentColor}66, 0 4px 0 #0a0908`
                          : '0 4px 0 #0a0908',
                      }}
                    >
                      <img
                        src={imgUrl}
                        alt=""
                        className={`pixelated h-full w-full object-cover ${
                          isComingSoon ? 'opacity-75 grayscale-[25%]' : ''
                        }`}
                      />

                      {/* Corner chapter number or lock tag */}
                      <span
                        className="font-mono-code absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center border border-[#131211] px-1 text-[9px] font-bold text-[#131211]"
                        style={{ backgroundColor: col.accentColor }}
                      >
                        {isComingSoon ? <Lock className="h-2.5 w-2.5" /> : node.chapter}
                      </span>
                    </div>

                    {/* Pin pointer stem */}
                    <div
                      aria-hidden="true"
                      className="mx-auto h-0 w-0 border-x-[6px] border-t-[7px] border-x-transparent"
                      style={{ borderTopColor: isFocused ? '#FFCF3D' : col.accentColor }}
                    />

                    {/* Compact Ribbon Label */}
                    <div
                      className={`font-pixel mt-0.5 whitespace-nowrap border px-1.5 py-0.5 text-[10px] leading-tight shadow-[0_2px_0_#0a0908] transition sm:text-[11px] ${
                        isFocused
                          ? 'border-[#FFCF3D] bg-[#131211] text-[#FFCF3D]'
                          : 'border-[#3B3630] bg-[#131211]/92 text-[#F5EFE6]'
                      }`}
                    >
                      {col.title[locale]}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* RPG Map Inspector Plaque (Focused Project Preview + Open Artbook CTA) */}
          {focusedEntry && (
            <div className="mt-2.5 flex flex-col justify-between gap-3 border-2 border-[#3B3630] bg-[#131211]/95 p-3 sm:flex-row sm:items-center sm:p-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <div
                  className="h-14 w-16 shrink-0 border-2 bg-[#1C1B19] p-1 sm:h-16 sm:w-20"
                  style={{ borderColor: focusedEntry.col.accentColor }}
                >
                  <img
                    src={getArtworkImageUrl(
                      focusedEntry.col.items[0].proceduralKey,
                      focusedEntry.col.items[0].src
                    )}
                    alt={focusedEntry.col.title[locale]}
                    className="pixelated h-full w-full object-contain"
                  />
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono-code inline-flex items-center gap-1 text-[11px] text-[#FFCF3D]">
                      <MapPin className="h-3 w-3" />
                      {focusedEntry.node.landmark[locale]}
                    </span>
                    <span className="font-mono-code text-[11px] text-[#A89F91]">
                      • {focusedEntry.col.year} • {focusedEntry.col.items.length}{' '}
                      {locale === 'vi' ? 'tác phẩm' : focusedEntry.col.items.length > 1 ? 'works' : 'work'}
                    </span>
                    {focusedEntry.col.status === 'coming_soon' && (
                      <span className="font-pixel inline-flex items-center gap-1 border border-[#FFCF3D]/60 bg-[#FFCF3D]/10 px-1.5 py-0.5 text-[10px] text-[#FFCF3D]">
                        <Sparkles className="h-2.5 w-2.5" />
                        {locale === 'vi' ? 'Sắp ra mắt' : 'Coming Soon'}
                      </span>
                    )}
                    {focusedEntry.col.youtubeIds && focusedEntry.col.youtubeIds.length > 0 && (
                      <span className="font-mono-code inline-flex items-center gap-1 border border-[#3B3630] bg-[#1C1B19] px-1.5 py-0.5 text-[10px] text-[#F5EFE6]">
                        <Film className="h-2.5 w-2.5 text-[#FFCF3D]" />
                        YouTube
                      </span>
                    )}
                    {focusedEntry.col.items.some((i) => Boolean(i.merchId)) && (
                      <span className="font-mono-code inline-flex items-center gap-1 border border-[#3B3630] bg-[#1C1B19] px-1.5 py-0.5 text-[10px] text-[#F5EFE6]">
                        <ShoppingBag className="h-2.5 w-2.5 text-[#FFCF3D]" />
                        Postcard
                      </span>
                    )}
                  </div>

                  <h2 className="font-pixel mt-0.5 truncate text-lg font-bold text-[#F5EFE6] sm:text-xl">
                    {focusedEntry.col.title[locale]}
                  </h2>
                  <p className="line-clamp-1 text-xs text-[#A89F91] sm:text-sm">
                    {focusedEntry.col.subtitle[locale]}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleOpenBook(focusedEntry.col)}
                className="pixel-btn pixel-btn-primary flex shrink-0 items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold"
              >
                <BookOpen className="h-4 w-4" />
                <span>{locale === 'vi' ? 'Mở cuốn sách' : 'Open Artbook'}</span>
              </button>
            </div>
          )}
        </section>

        {/* Quick Badge Collection Tray (Fast access on Mobile & Desktop) */}
        <section className="mt-5">
          <div className="mb-2.5 flex items-center justify-between">
            <h2 className="font-pixel text-sm uppercase tracking-wider text-[#A89F91]">
              {locale === 'vi' ? 'Bộ sưu tập Huy hiệu (8 Dự án)' : 'Project Badges (8 Series)'}
            </h2>
            <span className="font-mono-code text-[11px] text-[#A89F91]">
              {locale === 'vi' ? 'Bấm để mở sách' : 'Click to open book'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {mapEntries.map(({ col, node, highlighted }) => {
              const cover = col.items[0];
              const imgUrl = getArtworkImageUrl(cover.proceduralKey, cover.src);
              const isFocused = focusedEntry?.col.id === col.id;
              return (
                <button
                  key={col.id}
                  type="button"
                  onMouseEnter={() => setFocusedId(col.id)}
                  onClick={() => handleOpenBook(col)}
                  className={`flex items-center gap-2.5 border-2 bg-[#1C1B19] p-2 text-left transition ${
                    highlighted ? 'opacity-100' : 'opacity-40 hover:opacity-85'
                  } ${
                    isFocused
                      ? 'border-[#FFCF3D] bg-[#252320]'
                      : 'border-[#3B3630] hover:border-[#A89F91]'
                  }`}
                >
                  <div
                    className="relative h-10 w-10 shrink-0 border bg-[#131211] p-0.5"
                    style={{ borderColor: col.accentColor }}
                  >
                    <img
                      src={imgUrl}
                      alt={col.title[locale]}
                      className="pixelated h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-mono-code text-[10px] text-[#A89F91]">
                      #{node.chapter} • {col.year}
                    </div>
                    <div className="font-pixel truncate text-xs font-bold text-[#F5EFE6] sm:text-sm">
                      {col.title[locale]}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
