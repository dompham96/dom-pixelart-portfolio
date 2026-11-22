import { useEffect, useRef } from 'react';
import { Play, Grid2x2, Volume2, VolumeX, Sparkles } from 'lucide-react';
import type { Locale, SeasonConfig, SeasonId } from '../types/content';
import { domHouseMap, seasonList, siteProfile } from '../data';
import { drawProp, drawTile } from '../game/sprites/pixelRenderer';

interface TitleScreenProps {
  locale: Locale;
  season: SeasonConfig;
  audioEnabled: boolean;
  onStartGame: () => void;
  onOpenGallery: () => void;
  onToggleLocale: () => void;
  onToggleAudio: () => void;
  onChangeSeason: (id: SeasonId) => void;
}

export function TitleScreen({
  locale,
  season,
  audioEnabled,
  onStartGame,
  onOpenGallery,
  onToggleLocale,
  onToggleAudio,
  onChangeSeason,
}: TitleScreenProps) {
  const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Live cozy miniature preview of Dom's night house behind the title screen
  useEffect(() => {
    const canvas = bgCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    const ts = domHouseMap.tileSize;
    const worldW = domHouseMap.width * ts;
    const worldH = domHouseMap.height * ts;

    const particles = Array.from({ length: 22 }, () => ({
      x: Math.random() * worldW,
      y: Math.random() * worldH,
      vy: season.particleType === 'lanterns' ? -5 : season.particleType === 'petals' ? 7 : -2,
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

      const scale = Math.max(2, Math.ceil(Math.max(width / worldW, height / worldH)));
      const offsetX = Math.floor((width - worldW * scale) / 2);
      const offsetY = Math.floor((height - worldH * scale) / 2);

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

      // Soft warm glow from front windows & streetlamps
      const glows = [
        [4.5 * ts, 12.5 * ts, 36],
        [18.5 * ts, 12.5 * ts, 36],
        [12 * ts, 12.5 * ts, 40],
        [9.5 * ts, 13.5 * ts, 34],
        [14.5 * ts, 16.5 * ts, 34],
      ];
      for (const [gx, gy, gr] of glows) {
        const grad = ctx.createRadialGradient(gx, gy, 2, gx, gy, gr);
        grad.addColorStop(0, season.spotlightColor);
        grad.addColorStop(1, 'rgba(255,207,61,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(gx - gr, gy - gr, gr * 2, gr * 2);
      }

      for (const p of particles) {
        p.phase += 0.03;
        p.y = (p.y + p.vy * 0.016 + worldH) % worldH;
        const alpha = 0.4 + 0.45 * Math.sin(p.phase);
        ctx.fillStyle =
          season.particleType === 'lanterns'
            ? `rgba(255, 148, 66, ${alpha.toFixed(2)})`
            : `rgba(255, 207, 61, ${alpha.toFixed(2)})`;
        ctx.fillRect(Math.round(p.x + Math.sin(p.phase) * 3), Math.round(p.y), 2, 2);
      }

      ctx.restore();

      // Atmospheric dark vignette so the typography reads effortlessly
      const vignette = ctx.createRadialGradient(
        width / 2,
        height / 2,
        Math.min(width, height) * 0.12,
        width / 2,
        height / 2,
        Math.max(width, height) * 0.72
      );
      vignette.addColorStop(0, 'rgba(19, 18, 17, 0.52)');
      vignette.addColorStop(1, 'rgba(13, 12, 11, 0.88)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, width, height);

      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafId);
  }, [season]);

  return (
    <main className="relative flex min-h-dvh w-full flex-col items-center justify-between overflow-hidden px-4 py-6 sm:px-8 sm:py-8">
      <canvas
        ref={bgCanvasRef}
        aria-hidden="true"
        className="pixelated pointer-events-none fixed inset-0 h-full w-full"
      />

      {/* Top utility bar */}
      <header className="relative z-10 flex w-full max-w-5xl items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 bg-[#FFCF3D]" />
          <span className="font-pixel text-xs uppercase tracking-widest text-[#A89F91] sm:text-sm">
            {siteProfile.location[locale]}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="title-lang-toggle"
            type="button"
            onClick={onToggleLocale}
            className="pixel-btn px-2.5 py-1 text-xs sm:text-sm"
            aria-label="Switch language"
          >
            {locale === 'vi' ? 'VI → EN' : 'EN → VI'}
          </button>
          <button
            id="title-audio-toggle"
            type="button"
            onClick={onToggleAudio}
            className="pixel-btn flex items-center gap-1.5 px-2.5 py-1 text-xs sm:text-sm"
            aria-label="Toggle sound"
          >
            {audioEnabled ? <Volume2 className="h-3.5 w-3.5 text-[#FFCF3D]" /> : <VolumeX className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{audioEnabled ? 'SFX ON' : 'SFX OFF'}</span>
          </button>
        </div>
      </header>

      {/* Center Game-Like Exhibition Start Card */}
      <section className="relative z-10 my-auto flex w-full max-w-xl flex-col items-center text-center">
        <div className="pixel-panel w-full px-6 py-8 sm:px-10 sm:py-10">
          {/* Tiny dot emblem */}
          <div className="animate-float-slow mx-auto mb-5 flex h-12 w-12 items-center justify-center border-2 border-[#3B3630] bg-[#131211]">
            <div className="h-3.5 w-3.5 bg-[#FFCF3D]" />
          </div>

          <p className="font-mono-code mb-2 text-xs uppercase tracking-[0.22em] text-[#FFCF3D]">
            {locale === 'vi' ? 'Triển lãm Pixel Art Tương tác' : 'Interactive Pixel Art Exhibition'}
          </p>

          <h1 className="font-pixel text-4xl font-bold tracking-wider text-[#F5EFE6] sm:text-6xl">
            {siteProfile.brandName}
          </h1>

          <p className="font-pixel mt-2 text-base text-[#FFCF3D] sm:text-xl">
            “{siteProfile.tagline[locale]}”
          </p>

          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-[#A89F91] sm:text-base">
            {siteProfile.heroGreeting[locale]}
          </p>

          {/* Primary & Secondary Action Buttons */}
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              id="btn-start-game"
              type="button"
              onClick={onStartGame}
              className="pixel-btn pixel-btn-primary flex items-center justify-center gap-2.5 px-7 py-3.5 text-lg font-bold tracking-wider"
            >
              <Play className="h-5 w-5 fill-current" />
              <span>{locale === 'vi' ? 'START GAME' : 'START GAME'}</span>
            </button>

            <button
              id="btn-quick-gallery"
              type="button"
              onClick={onOpenGallery}
              className="pixel-btn flex items-center justify-center gap-2 px-6 py-3.5 text-base font-semibold"
            >
              <Grid2x2 className="h-4 w-4 text-[#FFCF3D]" />
              <span>{locale === 'vi' ? 'XEM TRANH NHANH' : 'QUICK GALLERY'}</span>
            </button>
          </div>

          <p className="font-pixel animate-pixel-blink mt-5 text-xs tracking-widest text-[#A89F91]">
            {locale === 'vi'
              ? '— BẤM START ĐỂ VÀO NHÀ THĂM QUAN —'
              : '— PRESS START TO ENTER THE STUDIO —'}
          </p>

          {/* Season preview selector */}
          <div className="mt-6 border-t border-[#3B3630] pt-4">
            <div className="mb-2 flex items-center justify-center gap-1.5 text-xs text-[#A89F91]">
              <Sparkles className="h-3.5 w-3.5 text-[#FFCF3D]" />
              <span>{locale === 'vi' ? 'Không khí mùa triển lãm:' : 'Exhibition Season Theme:'}</span>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {seasonList.map((s) => {
                const active = s.id === season.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => onChangeSeason(s.id)}
                    className={`font-pixel border px-3 py-1 text-xs transition ${
                      active
                        ? 'border-[#FFCF3D] bg-[#FFCF3D]/15 text-[#FFCF3D]'
                        : 'border-[#3B3630] bg-[#131211]/70 text-[#A89F91] hover:border-[#A89F91] hover:text-[#F5EFE6]'
                    }`}
                  >
                    {s.badge[locale]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Footer hint */}
      <footer className="relative z-10 text-center text-xs text-[#A89F91]">
        {locale === 'vi'
          ? 'Desktop: WASD / Mũi tên + E • Mobile: Chạm sàn để đi hoặc bật D-Pad ảo'
          : 'Desktop: WASD / Arrows + E • Mobile: Tap to walk or toggle Virtual D-Pad'}
      </footer>
    </main>
  );
}
