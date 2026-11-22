import { useMemo, useState } from 'react';
import { Film, ShoppingBag, Sparkles, ArrowUpRight, Gamepad2 } from 'lucide-react';
import type { ArtworkCollection, Locale } from '../types/content';
import { artworkCollections } from '../data';
import { getArtworkImageUrl } from '../game/sprites/placeholderArt';

interface QuickGalleryProps {
  locale: Locale;
  onSelectCollection: (collection: ArtworkCollection) => void;
  onSwitchToGame: () => void;
}

type CategoryFilter = 'all' | 'saigon' | 'festival' | 'life' | 'wip';

export function QuickGallery({ locale, onSelectCollection, onSwitchToGame }: QuickGalleryProps) {
  const [filter, setFilter] = useState<CategoryFilter>('all');

  const filters: Array<{ id: CategoryFilter; label: { vi: string; en: string } }> = [
    { id: 'all', label: { vi: 'Tất cả (8)', en: 'All (8)' } },
    { id: 'saigon', label: { vi: 'Sài Gòn', en: 'Saigon' } },
    { id: 'festival', label: { vi: 'Lễ hội & Tết', en: 'Festivals' } },
    { id: 'life', label: { vi: 'Ký ức & Đời sống', en: 'Memories' } },
    { id: 'wip', label: { vi: 'Sắp ra mắt', en: 'Coming Soon' } },
  ];

  const filtered = useMemo(() => {
    if (filter === 'all') return artworkCollections;
    if (filter === 'wip') return artworkCollections.filter((c) => c.status === 'coming_soon');
    return artworkCollections.filter((c) => c.category === filter);
  }, [filter]);

  return (
    <main className="museum-backdrop min-h-dvh w-full px-4 pb-16 pt-20 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl">
        {/* Exhibition Header */}
        <div className="mb-8 flex flex-col justify-between gap-4 border-b-2 border-[#3B3630] pb-6 md:flex-row md:items-end">
          <div>
            <p className="font-mono-code mb-1.5 text-xs uppercase tracking-[0.2em] text-[#FFCF3D]">
              {locale === 'vi' ? 'Chế độ xem tranh tổng hợp' : 'Quick Exhibition Overview'}
            </p>
            <h1 className="font-pixel text-3xl font-bold text-[#F5EFE6] sm:text-5xl">
              DOM GALLERY
            </h1>
            <p className="mt-2 max-w-xl text-sm text-[#A89F91] sm:text-base">
              {locale === 'vi'
                ? 'Vui lòng gác việc đang làm lại và dạo một vòng triển lãm nhé. Bấm vào từng tác phẩm để phóng to sắc nét nguyên bản pixel và đọc câu chuyện phía sau.'
                : 'Take a slow scroll through all pixel art series. Select any frame to inspect crisp pixel details and read the full story.'}
            </p>
          </div>

          <button
            type="button"
            onClick={onSwitchToGame}
            className="pixel-btn pixel-btn-primary flex shrink-0 items-center justify-center gap-2 self-start px-4 py-2.5 text-sm font-bold md:self-auto"
          >
            <Gamepad2 className="h-4 w-4" />
            <span>{locale === 'vi' ? 'Vào nhà chơi Minigame' : 'Explore in 2D Minigame'}</span>
          </button>
        </div>

        {/* Filter Bar */}
        <div className="mb-7 flex flex-wrap gap-2">
          {filters.map((f) => {
            const active = filter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={`pixel-btn px-3.5 py-1.5 text-xs sm:text-sm ${
                  active ? 'pixel-btn-primary font-bold' : ''
                }`}
              >
                {f.label[locale]}
              </button>
            );
          })}
        </div>

        {/* Exhibition Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((col) => {
            const cover = col.items[0];
            const imgUrl = getArtworkImageUrl(cover.proceduralKey, cover.src);
            const hasMerch = col.items.some((i) => Boolean(i.merchId));
            const hasVideo = Boolean(col.youtubeIds && col.youtubeIds.length > 0);

            return (
              <article
                key={col.id}
                onClick={() => onSelectCollection(col)}
                className="pixel-panel group flex cursor-pointer flex-col overflow-hidden transition duration-200 hover:-translate-y-1 hover:border-[#FFCF3D]"
              >
                {/* Framed pixel artwork stage */}
                <div className="relative aspect-[4/3] w-full overflow-hidden border-b-2 border-[#3B3630] bg-[#131211] p-3">
                  {/* Subtle top museum spotlight */}
                  <div
                    className="pointer-events-none absolute inset-x-0 top-0 h-16 opacity-35 transition-opacity group-hover:opacity-65"
                    style={{
                      background: `radial-gradient(ellipse at top, ${col.accentColor}55, transparent 70%)`,
                    }}
                  />

                  <img
                    src={imgUrl}
                    alt={col.title[locale]}
                    className="pixelated relative z-10 h-full w-full object-contain transition-transform duration-300 group-hover:scale-[1.03]"
                  />

                  {/* Status / media badges */}
                  <div className="absolute left-3 top-3 z-20 flex flex-wrap gap-1.5">
                    {col.status === 'coming_soon' && (
                      <span className="font-pixel flex items-center gap-1 border border-[#FFCF3D] bg-[#131211]/90 px-2 py-0.5 text-[11px] text-[#FFCF3D]">
                        <Sparkles className="h-3 w-3" />
                        {locale === 'vi' ? 'Đang tải lên' : 'Coming Soon'}
                      </span>
                    )}
                    {hasVideo && (
                      <span className="font-mono-code flex items-center gap-1 border border-[#3B3630] bg-[#131211]/90 px-2 py-0.5 text-[10px] text-[#F5EFE6]">
                        <Film className="h-3 w-3 text-[#FFCF3D]" />
                        YouTube
                      </span>
                    )}
                    {hasMerch && (
                      <span className="font-mono-code flex items-center gap-1 border border-[#3B3630] bg-[#131211]/90 px-2 py-0.5 text-[10px] text-[#F5EFE6]">
                        <ShoppingBag className="h-3 w-3 text-[#FFCF3D]" />
                        Postcard
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Copy */}
                <div className="flex flex-1 flex-col justify-between p-4">
                  <div>
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="font-mono-code text-[11px] text-[#A89F91]">
                        {col.year} • {col.items.length}{' '}
                        {locale === 'vi' ? 'tác phẩm' : col.items.length > 1 ? 'works' : 'work'}
                      </span>
                      <ArrowUpRight className="h-4 w-4 text-[#A89F91] transition group-hover:text-[#FFCF3D]" />
                    </div>

                    <h2 className="font-pixel text-xl font-bold text-[#F5EFE6] transition group-hover:text-[#FFCF3D]">
                      {col.title[locale]}
                    </h2>
                    <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-[#A89F91] sm:text-sm">
                      {col.subtitle[locale]}
                    </p>
                  </div>

                  <div className="mt-4 flex items-center gap-2 border-t border-[#3B3630]/80 pt-3">
                    <span
                      className="inline-block h-2.5 w-2.5"
                      style={{ backgroundColor: col.accentColor }}
                    />
                    <span className="font-pixel text-xs text-[#F5EFE6]">
                      {locale === 'vi' ? 'Mở câu chuyện & phóng to' : 'Inspect artwork & story'}
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </main>
  );
}
