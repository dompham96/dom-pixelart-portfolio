import { useEffect, useState } from 'react';
import { X, ZoomIn, ZoomOut, ShoppingBag, ExternalLink, Play } from 'lucide-react';
import type { ArtworkCollection, Locale } from '../types/content';
import { getArtworkImageUrl } from '../game/sprites/placeholderArt';
import { getMerchById } from '../data';

interface ArtworkLightboxProps {
  collection: ArtworkCollection;
  locale: Locale;
  onClose: () => void;
  onOpenMerch: (merchId?: string) => void;
}

export function ArtworkLightbox({
  collection,
  locale,
  onClose,
  onOpenMerch,
}: ArtworkLightboxProps) {
  const [itemIndex, setItemIndex] = useState(0);
  const [zoom, setZoom] = useState<1 | 2 | 3>(1);

  const activeItem = collection.items[itemIndex] || collection.items[0];
  const activeUrl = getArtworkImageUrl(activeItem.proceduralKey, activeItem.src);
  const linkedMerch = activeItem.merchId ? getMerchById(activeItem.merchId) : undefined;

  useEffect(() => {
    setItemIndex(0);
    setZoom(1);
  }, [collection.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0908]/90 p-3 backdrop-blur-sm sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={collection.title[locale]}
      onClick={onClose}
    >
      <div
        className="pixel-panel relative flex max-h-[92dvh] w-full max-w-5xl flex-col overflow-hidden lg:flex-row"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="pixel-btn absolute right-3 top-3 z-20 p-1.5"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Left: Crisp Pixel Art Stage */}
        <div className="flex flex-1 flex-col border-b-2 border-[#3B3630] bg-[#131211] lg:border-b-0 lg:border-r-2">
          <div className="relative flex min-h-[260px] flex-1 items-center justify-center overflow-auto p-4 sm:min-h-[360px]">
            <img
              src={activeUrl}
              alt={activeItem.title[locale]}
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: 'center center',
              }}
              className="pixelated max-h-[48dvh] w-full max-w-lg object-contain transition-transform duration-150 lg:max-h-[62dvh]"
            />

            {/* Zoom toolbar */}
            <div className="absolute bottom-3 left-3 flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setZoom((z) => (z === 1 ? 2 : z === 2 ? 3 : 1))}
                className="pixel-btn flex items-center gap-1 px-2.5 py-1 text-xs"
              >
                {zoom === 3 ? <ZoomOut className="h-3.5 w-3.5" /> : <ZoomIn className="h-3.5 w-3.5" />}
                <span>{zoom === 1 ? 'FIT' : `${zoom}X PIXEL`}</span>
              </button>
              {activeItem.dimensions && (
                <span className="font-mono-code border border-[#3B3630] bg-[#1C1B19]/90 px-2 py-1 text-[11px] text-[#A89F91]">
                  {activeItem.dimensions}
                </span>
              )}
            </div>
          </div>

          {/* Multi-piece selector strip */}
          {collection.items.length > 1 && (
            <div className="flex gap-2 overflow-x-auto border-t-2 border-[#3B3630] bg-[#181715] p-3">
              {collection.items.map((item, idx) => {
                const selected = idx === itemIndex;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setItemIndex(idx);
                      setZoom(1);
                    }}
                    className={`flex shrink-0 items-center gap-2 border-2 px-2.5 py-1.5 text-left transition ${
                      selected
                        ? 'border-[#FFCF3D] bg-[#252320]'
                        : 'border-[#3B3630] bg-[#131211] hover:border-[#A89F91]'
                    }`}
                  >
                    <img
                      src={getArtworkImageUrl(item.proceduralKey, item.src)}
                      alt={item.title[locale]}
                      className="pixelated h-9 w-12 object-cover"
                    />
                    <span className="font-pixel text-xs text-[#F5EFE6]">{item.title[locale]}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Story, Metadata, YouTube & Postcard link */}
        <div className="flex w-full flex-col overflow-y-auto p-5 sm:p-6 lg:w-[390px]">
          <div className="mb-1 flex items-center gap-2 pr-8">
            <span
              className="inline-block h-2.5 w-2.5"
              style={{ backgroundColor: collection.accentColor }}
            />
            <span className="font-mono-code text-xs text-[#A89F91]">
              {collection.dateStamp || collection.year}
            </span>
          </div>

          <h2 className="font-pixel text-2xl font-bold text-[#FFCF3D] sm:text-3xl">
            {collection.title[locale]}
          </h2>

          <p className="mt-1 text-sm font-medium text-[#F5EFE6]">{activeItem.title[locale]}</p>

          {activeItem.caption && (
            <p className="mt-2 border-l-2 border-[#FFCF3D] pl-3 text-xs italic text-[#A89F91]">
              {activeItem.caption[locale]}
            </p>
          )}

          {/* Story paragraphs */}
          <div className="mt-4 space-y-3 border-t border-[#3B3630] pt-4 text-sm leading-relaxed text-[#F5EFE6]/90">
            {collection.story.map((para, i) => (
              <p key={i}>{para[locale]}</p>
            ))}
          </div>

          {/* YouTube Animations (Sai Gon Tales) */}
          {collection.youtubeIds && collection.youtubeIds.length > 0 && (
            <div className="mt-5 border-t border-[#3B3630] pt-4">
              <p className="font-pixel mb-2 text-xs uppercase tracking-wider text-[#FFCF3D]">
                {locale === 'vi' ? 'Hoạt ảnh trên YouTube' : 'Watch Animations on YouTube'}
              </p>
              <div className="flex flex-wrap gap-2">
                {collection.youtubeIds.map((vid, idx) => (
                  <a
                    key={vid}
                    href={`https://www.youtube.com/watch?v=${vid}`}
                    target="_blank"
                    rel="noreferrer"
                    className="pixel-btn flex items-center gap-1.5 px-3 py-1.5 text-xs"
                  >
                    <Play className="h-3.5 w-3.5 fill-current text-[#FFCF3D]" />
                    <span>
                      {locale === 'vi' ? `Tập ${idx + 1}` : `Ep. ${idx + 1}`}
                    </span>
                    <ExternalLink className="h-3 w-3 opacity-70" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Linked Postcard Merch Callout */}
          {linkedMerch && (
            <div className="mt-5 border-2 border-[#3B3630] bg-[#131211] p-3.5">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-pixel text-sm font-bold text-[#FFCF3D]">
                    {linkedMerch.format[locale]} — {linkedMerch.title[locale]}
                  </p>
                  <p className="mt-0.5 text-xs text-[#A89F91]">
                    {linkedMerch.specs[1]?.[locale]}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenMerch(linkedMerch.id)}
                  className="pixel-btn pixel-btn-primary flex shrink-0 items-center gap-1.5 px-3 py-1.5 text-xs font-bold"
                >
                  <ShoppingBag className="h-3.5 w-3.5" />
                  <span>{locale === 'vi' ? 'Xem Merch' : 'Merch'}</span>
                </button>
              </div>
            </div>
          )}

          {!activeItem.src && (
            <p className="font-mono-code mt-5 text-[11px] text-[#A89F91]/80">
              {locale === 'vi'
                ? '* Đang hiển thị tranh pixel mẫu cho bản MVP — Dom chỉ cần thả PNG/GIF gốc vào Drive `01_Artworks_Monthly` để Art Curator Agent tự thay ảnh thật.'
                : '* Showing crisp MVP pixel preview — drop original PNG/GIF files into Drive `01_Artworks_Monthly` for the Art Curator Agent to swap automatically.'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
