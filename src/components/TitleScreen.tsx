import { useEffect, useRef } from 'react';
import { Play, Grid2x2, Shirt, Dices } from 'lucide-react';
import type { CharacterAppearance, Locale, SeasonConfig } from '../types/content';
import { domHouseMap, siteProfile } from '../data';
import { drawProp, drawTile } from '../game/sprites/pixelRenderer';
import { CharacterPreviewCanvas } from './CharacterPreviewCanvas';

interface TitleScreenProps {
  locale: Locale;
  season: SeasonConfig;
  playerAppearance: CharacterAppearance;
  onStartGame: () => void;
  onOpenGallery: () => void;
  onOpenCustomizer: () => void;
  onRandomizeAppearance: () => void;
}

export function TitleScreen({
  locale,
  season,
  playerAppearance,
  onStartGame,
  onOpenGallery,
  onOpenCustomizer,
  onRandomizeAppearance,
}: TitleScreenProps) {
  const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Full-bleed living pixel-art scene behind the minimalist game title screen
  useEffect(() => {
    const canvas = bgCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    const ts = domHouseMap.tileSize;
    const worldW = domHouseMap.width * ts;
    const worldH = domHouseMap.height * ts;

    const particles = Array.from({ length: 28 }, () => ({
      x: Math.random() * worldW,
      y: Math.random() * worldH,
      vy: season.particleType === 'lanterns' ? -5 : season.particleType === 'petals' ? 7 : -2.2,
      phase: Math.random() * Math.PI * 2,
    }));

    const render = (now: number) => {
      const t = now / 1000;
      const width = window.innerWidth;
      const height = window.innerHeight;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = season.skyColor;
      ctx.fillRect(0, 0, width, height);

      // Slight overscan allows a gentle pixel-snapped breathing drift like a game title camera
      const scale = Math.max(2, Math.ceil(Math.max((width + 24) / worldW, (height + 24) / worldH)));
      const driftX = Math.round(Math.sin(t * 0.22) * 6);
      const driftY = Math.round(Math.cos(t * 0.17) * 4);
      const offsetX = Math.floor((width - worldW * scale) / 2) + driftX;
      const offsetY = Math.floor((height - worldH * scale) / 2) + driftY;

      ctx.save();
      ctx.translate(offsetX, offsetY);
      ctx.scale(scale, scale);

      for (let y = 0; y < domHouseMap.height; y++) {
        for (let x = 0; x < domHouseMap.width; x++) {
          drawTile(ctx, domHouseMap.tiles[y][x], x * ts, y * ts, ts);
        }
      }

      for (const prop of [...domHouseMap.props, ...season.extraProps]) {
        drawProp(ctx, prop, ts, t, false);
      }

      // Warm cozy spotlight halos from studio windows & streetlamps
      const glows: Array<[number, number, number]> = [
        ...(domHouseMap.lights || []).map((l) => [l.x * ts, l.y * ts, l.radius] as [number, number, number]),
        ...domHouseMap.props
          .filter((p) => p.kind === 'lamp_post')
          .map((p) => [p.x * ts + 8, p.y * ts + 6, 36] as [number, number, number]),
      ];
      for (const [gx, gy, gr] of glows) {
        const pulse = 0.92 + 0.08 * Math.sin(t * 2.1 + gx * 0.05);
        const grad = ctx.createRadialGradient(gx, gy, 2, gx, gy, gr * pulse);
        grad.addColorStop(0, season.spotlightColor);
        grad.addColorStop(1, 'rgba(255,207,61,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(gx - gr, gy - gr, gr * 2, gr * 2);
      }

      for (const p of particles) {
        p.phase += 0.028;
        p.y = (p.y + p.vy * 0.016 + worldH) % worldH;
        const alpha = 0.35 + 0.5 * Math.sin(p.phase);
        ctx.fillStyle =
          season.particleType === 'lanterns'
            ? `rgba(255, 148, 66, ${alpha.toFixed(2)})`
            : `rgba(255, 207, 61, ${alpha.toFixed(2)})`;
        ctx.fillRect(Math.round(p.x + Math.sin(p.phase) * 3), Math.round(p.y), 2, 2);
      }

      ctx.restore();

      // Cinematic game-screen vignette: keeps pixel art vivid while ensuring crisp title legibility
      const vignette = ctx.createRadialGradient(
        width / 2,
        height / 2,
        Math.min(width, height) * 0.14,
        width / 2,
        height / 2,
        Math.max(width, height) * 0.78
      );
      vignette.addColorStop(0, 'rgba(19, 18, 17, 0.28)');
      vignette.addColorStop(0.65, 'rgba(15, 14, 13, 0.54)');
      vignette.addColorStop(1, 'rgba(10, 9, 8, 0.84)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, width, height);

      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafId);
  }, [season]);

  return (
    <main className="relative flex min-h-dvh w-full flex-col items-center justify-center overflow-hidden px-6 py-10">
      <canvas
        ref={bgCanvasRef}
        aria-hidden="true"
        className="pixelated pointer-events-none fixed inset-0 h-full w-full"
      />

      {/* Minimalist Game Title / Loading Screen Composition */}
      <section className="relative z-10 flex w-full max-w-3xl flex-col items-center gap-9 text-center sm:gap-12">
        {/* Game Logo Typography */}
        <div className="flex flex-col items-center">
          <div className="mb-4 flex items-center gap-3" aria-hidden="true">
            <span className="h-[2px] w-10 bg-[#FFCF3D]/55 sm:w-14" />
            <span className="animate-float-slow inline-block h-2.5 w-2.5 bg-[#FFCF3D] shadow-[0_0_12px_rgba(255,207,61,0.8)]" />
            <span className="h-[2px] w-10 bg-[#FFCF3D]/55 sm:w-14" />
          </div>

          <h1 className="game-title-logo font-pixel text-5xl font-bold tracking-[0.08em] text-[#F5EFE6] sm:text-7xl md:text-8xl">
            {siteProfile.brandName}
          </h1>

          <p className="game-title-sub font-pixel mt-3 text-sm tracking-[0.18em] text-[#FFCF3D] sm:mt-4 sm:text-xl">
            {siteProfile.tagline[locale]}
          </p>
        </div>

        {/* Two Game Menu Actions: Start & Quick View */}
        <div className="flex w-full max-w-[260px] flex-col gap-3.5 sm:max-w-none sm:flex-row sm:justify-center sm:gap-5">
          <button
            id="btn-start-game"
            type="button"
            onClick={onStartGame}
            className="pixel-btn pixel-btn-primary group flex min-w-[196px] items-center justify-center gap-2.5 px-8 py-3.5 text-lg font-bold tracking-[0.12em]"
          >
            <Play className="h-4 w-4 fill-current transition-transform group-hover:translate-x-0.5" />
            <span>START</span>
          </button>

          <button
            id="btn-quick-gallery"
            type="button"
            onClick={onOpenGallery}
            className="pixel-btn group flex min-w-[196px] items-center justify-center gap-2.5 bg-[#131211]/85 px-8 py-3.5 text-lg font-semibold tracking-[0.08em] backdrop-blur-[2px]"
          >
            <Grid2x2 className="h-4 w-4 text-[#FFCF3D] transition-transform group-hover:scale-110" />
            <span>{locale === 'vi' ? 'XEM NHANH' : 'QUICK VIEW'}</span>
          </button>
        </div>

        {/* Sleek Visitor Avatar Pill (Randomly generated + quick customize) */}
        <div className="flex items-center gap-3 border-2 border-[#3B3630] bg-[#131211]/85 px-3.5 py-2 backdrop-blur-sm">
          <div className="flex h-14 w-12 shrink-0 items-center justify-center border border-[#3B3630] bg-[#1C1B19]">
            <CharacterPreviewCanvas
              appearance={playerAppearance}
              anim="idle"
              facing="down"
              scale={2}
              width={48}
              height={56}
            />
          </div>
          <div className="text-left">
            <div className="font-pixel text-xs text-[#F5EFE6] sm:text-sm">
              {locale === 'vi' ? 'Nhân vật của bạn' : 'Your Visitor Avatar'}
            </div>
            <div className="mt-1.5 flex items-center gap-1.5">
              <button
                id="btn-title-customize"
                type="button"
                onClick={onOpenCustomizer}
                className="pixel-btn flex items-center gap-1.5 px-2.5 py-1 text-xs"
              >
                <Shirt className="h-3.5 w-3.5 text-[#FFCF3D]" />
                <span>{locale === 'vi' ? 'Đổi trang phục' : 'Customize'}</span>
              </button>
              <button
                id="btn-title-randomize"
                type="button"
                onClick={onRandomizeAppearance}
                className="pixel-btn flex items-center justify-center p-1.5 text-xs"
                title={locale === 'vi' ? 'Tạo ngẫu nhiên' : 'Randomize look'}
                aria-label={locale === 'vi' ? 'Tạo ngẫu nhiên' : 'Randomize look'}
              >
                <Dices className="h-3.5 w-3.5 text-[#FFCF3D]" />
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
