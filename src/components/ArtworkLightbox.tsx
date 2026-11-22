import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Play,
  ShoppingBag,
  Sparkles,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import type { ArtworkCollection, ArtworkMedia, Locale, LocalizedText } from '../types/content';
import { getArtworkImageUrl } from '../game/sprites/placeholderArt';
import { getMerchById } from '../data';
import { soundEngine } from '../audio/SoundEngine';

interface ArtworkLightboxProps {
  collection: ArtworkCollection;
  locale: Locale;
  onClose: () => void;
  onOpenMerch: (merchId?: string) => void;
}

type BookPage =
  | {
      kind: 'artwork';
      pageNumber: number;
      chapterTag: string;
      item: ArtworkMedia;
      itemIndex: number;
      totalItems: number;
    }
  | {
      kind: 'story';
      pageNumber: number;
      heading: string;
      subheading?: string;
      paragraphs: LocalizedText[];
      caption?: LocalizedText;
      merchId?: string;
      showYoutube?: boolean;
      isCoverChapter?: boolean;
    }
  | {
      kind: 'detail';
      pageNumber: number;
      item: ArtworkMedia;
    }
  | {
      kind: 'appendix';
      pageNumber: number;
      paragraphs: LocalizedText[];
      merchId?: string;
      showYoutube?: boolean;
    };

function buildBookPages(collection: ArtworkCollection, locale: Locale): BookPage[] {
  const pages: BookPage[] = [];
  const totalItems = collection.items.length;

  if (totalItems > 1) {
    // Multi-piece series (e.g., Sai Gon Tales): each artwork gets its own 2-page spread
    collection.items.forEach((item, idx) => {
      const isFirst = idx === 0;
      const isLast = idx === totalItems - 1;
      pages.push({
        kind: 'artwork',
        pageNumber: pages.length + 1,
        chapterTag: `${String(idx + 1).padStart(2, '0')} / ${String(totalItems).padStart(2, '0')}`,
        item,
        itemIndex: idx,
        totalItems,
      });
      pages.push({
        kind: 'story',
        pageNumber: pages.length + 1,
        heading: isFirst ? collection.title[locale] : item.title[locale],
        subheading: isFirst ? item.title[locale] : collection.title[locale],
        paragraphs: isFirst
          ? collection.story
          : [
              {
                vi: `Tác phẩm thứ ${idx + 1} trong loạt "${collection.title.vi}" — ghi lại từng chấm pixel ấm áp của đời sống thường ngày.`,
                en: `Piece #${idx + 1} in the "${collection.title.en}" series — capturing quiet everyday warmth dot by dot.`,
              },
            ],
        caption: item.caption,
        merchId: item.merchId,
        showYoutube: isLast && Boolean(collection.youtubeIds && collection.youtubeIds.length > 0),
        isCoverChapter: isFirst,
      });
    });
  } else {
    // Single-piece collection: Spread 1 (Artwork + Opening Story), Spread 2 (Pixel Loupe + Extra Notes / Merch)
    const item = collection.items[0];
    const hasLongStory = collection.story.length > 1;
    const firstParas = hasLongStory ? [collection.story[0]] : collection.story;
    const restParas = hasLongStory ? collection.story.slice(1) : [];

    pages.push({
      kind: 'artwork',
      pageNumber: 1,
      chapterTag: 'PLATE 01',
      item,
      itemIndex: 0,
      totalItems: 1,
    });
    pages.push({
      kind: 'story',
      pageNumber: 2,
      heading: collection.title[locale],
      subheading: collection.subtitle[locale],
      paragraphs: firstParas,
      caption: item.caption,
      isCoverChapter: true,
    });
    pages.push({
      kind: 'detail',
      pageNumber: 3,
      item,
    });
    pages.push({
      kind: 'appendix',
      pageNumber: 4,
      paragraphs: restParas,
      merchId: item.merchId,
      showYoutube: Boolean(collection.youtubeIds && collection.youtubeIds.length > 0),
    });
  }

  return pages;
}

export function ArtworkLightbox({
  collection,
  locale,
  onClose,
  onOpenMerch,
}: ArtworkLightboxProps) {
  const pages = useMemo(() => buildBookPages(collection, locale), [collection, locale]);
  const totalSpreads = Math.ceil(pages.length / 2);

  // Desktop uses spreadIndex (0..totalSpreads-1), Mobile uses mobilePage (0..pages.length-1)
  const [spreadIndex, setSpreadIndex] = useState(0);
  const [mobilePage, setMobilePage] = useState(0);
  const [flipDir, setFlipDir] = useState<'next' | 'prev'>('next');
  const [flipTick, setFlipTick] = useState(0);
  const [zoom, setZoom] = useState<1 | 2 | 3>(1);

  useEffect(() => {
    setSpreadIndex(0);
    setMobilePage(0);
    setZoom(1);
  }, [collection.id]);

  const goSpread = useCallback(
    (nextIndex: number) => {
      const clamped = Math.max(0, Math.min(totalSpreads - 1, nextIndex));
      if (clamped === spreadIndex) return;
      setFlipDir(clamped > spreadIndex ? 'next' : 'prev');
      setSpreadIndex(clamped);
      setMobilePage(clamped * 2);
      setFlipTick((t) => t + 1);
      setZoom(1);
      soundEngine.playPageFlip();
    },
    [spreadIndex, totalSpreads]
  );

  const goMobilePage = useCallback(
    (nextPage: number) => {
      const clamped = Math.max(0, Math.min(pages.length - 1, nextPage));
      if (clamped === mobilePage) return;
      setFlipDir(clamped > mobilePage ? 'next' : 'prev');
      setMobilePage(clamped);
      setSpreadIndex(Math.floor(clamped / 2));
      setFlipTick((t) => t + 1);
      setZoom(1);
      soundEngine.playPageFlip();
    },
    [mobilePage, pages.length]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        onClose();
      } else if (e.code === 'ArrowRight') {
        if (window.innerWidth >= 1024) goSpread(spreadIndex + 1);
        else goMobilePage(mobilePage + 1);
      } else if (e.code === 'ArrowLeft') {
        if (window.innerWidth >= 1024) goSpread(spreadIndex - 1);
        else goMobilePage(mobilePage - 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, goSpread, goMobilePage, spreadIndex, mobilePage]);

  const renderPageContent = (page: BookPage) => {
    if (page.kind === 'artwork') {
      const imgUrl = getArtworkImageUrl(page.item.proceduralKey, page.item.src);
      return (
        <div className="flex h-full flex-col justify-between">
          <div className="mb-3 flex items-center justify-between border-b border-[#3B3630]/80 pb-2">
            <span className="font-mono-code text-[11px] uppercase tracking-widest text-[#A89F91]">
              {page.chapterTag}
            </span>
            <span className="font-pixel text-xs text-[#FFCF3D]">
              {page.item.title[locale]}
            </span>
          </div>

          {/* Mounted archival pixel art stage */}
          <div className="relative flex min-h-[230px] flex-1 items-center justify-center overflow-auto border-2 border-[#3B3630] bg-[#131211] p-4 shadow-[inset_0_0_24px_rgba(0,0,0,0.6)]">
            {/* Corner photo-mount brackets */}
            <span className="pointer-events-none absolute left-2 top-2 h-3 w-3 border-l-2 border-t-2 border-[#FFCF3D]/60" />
            <span className="pointer-events-none absolute right-2 top-2 h-3 w-3 border-r-2 border-t-2 border-[#FFCF3D]/60" />
            <span className="pointer-events-none absolute bottom-2 left-2 h-3 w-3 border-b-2 border-l-2 border-[#FFCF3D]/60" />
            <span className="pointer-events-none absolute bottom-2 right-2 h-3 w-3 border-b-2 border-r-2 border-[#FFCF3D]/60" />

            <img
              src={imgUrl}
              alt={page.item.title[locale]}
              style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
              className="pixelated max-h-[38dvh] w-full max-w-md object-contain transition-transform duration-150 lg:max-h-[46dvh]"
            />
          </div>

          {/* Bottom plate controls */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setZoom((z) => (z === 1 ? 2 : z === 2 ? 3 : 1))}
                className="pixel-btn flex items-center gap-1 px-2.5 py-1 text-xs"
              >
                {zoom === 3 ? <ZoomOut className="h-3.5 w-3.5" /> : <ZoomIn className="h-3.5 w-3.5" />}
                <span>{zoom === 1 ? 'FIT' : `${zoom}X PIXEL`}</span>
              </button>
              {page.item.dimensions && (
                <span className="font-mono-code border border-[#3B3630] bg-[#131211] px-2 py-1 text-[11px] text-[#A89F91]">
                  {page.item.dimensions}
                </span>
              )}
            </div>

            <span className="font-mono-code text-[11px] text-[#A89F91]">
              {String(page.pageNumber).padStart(2, '0')}
            </span>
          </div>
        </div>
      );
    }

    if (page.kind === 'detail') {
      const imgUrl = getArtworkImageUrl(page.item.proceduralKey, page.item.src);
      return (
        <div className="flex h-full flex-col justify-between">
          <div className="mb-3 flex items-center justify-between border-b border-[#3B3630]/80 pb-2">
            <span className="font-mono-code text-[11px] uppercase tracking-widest text-[#FFCF3D]">
              {locale === 'vi' ? 'SOI CHI TIẾT PIXEL (2×)' : 'PIXEL LOUPE STUDY (2×)'}
            </span>
            <span className="font-mono-code text-[11px] text-[#A89F91]">
              {page.item.dimensions || 'PIXEL ART'}
            </span>
          </div>

          {/* Magnified 2x Pixel Loupe */}
          <div className="relative flex min-h-[210px] flex-1 items-center justify-center overflow-hidden border-2 border-[#3B3630] bg-[#131211] p-3">
            <img
              src={imgUrl}
              alt={page.item.title[locale]}
              className="pixelated h-full max-h-[34dvh] w-full scale-[1.55] object-contain"
            />
            <div className="pointer-events-none absolute inset-0 border-[6px] border-[#131211]/70" />
            <span className="font-mono-code absolute bottom-2.5 right-2.5 border border-[#FFCF3D]/60 bg-[#131211]/90 px-2 py-0.5 text-[10px] text-[#FFCF3D]">
              CRISP NEAREST-NEIGHBOR
            </span>
          </div>

          {/* Archival Spec Stamp */}
          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-[#3B3630]/80 pt-3">
            <div className="border border-[#3B3630] bg-[#131211]/80 px-2.5 py-2">
              <div className="font-mono-code text-[10px] uppercase text-[#A89F91]">
                {locale === 'vi' ? 'Màu chủ đạo' : 'Accent Palette'}
              </div>
              <div className="mt-1 flex items-center gap-2">
                <span
                  className="inline-block h-3.5 w-3.5 border border-[#F5EFE6]/30"
                  style={{ backgroundColor: collection.accentColor }}
                />
                <span className="font-mono-code text-xs text-[#F5EFE6]">
                  {collection.accentColor}
                </span>
              </div>
            </div>
            <div className="border border-[#3B3630] bg-[#131211]/80 px-2.5 py-2">
              <div className="font-mono-code text-[10px] uppercase text-[#A89F91]">
                {locale === 'vi' ? 'Niên đại' : 'Year / Stamp'}
              </div>
              <div className="font-mono-code mt-1 truncate text-xs text-[#F5EFE6]">
                {collection.dateStamp || collection.year}
              </div>
            </div>
          </div>

          <div className="mt-3 flex justify-end">
            <span className="font-mono-code text-[11px] text-[#A89F91]">
              {String(page.pageNumber).padStart(2, '0')}
            </span>
          </div>
        </div>
      );
    }

    const linkedMerch = page.merchId ? getMerchById(page.merchId) : undefined;

    if (page.kind === 'story') {
      return (
        <div className="flex h-full flex-col justify-between">
          <div>
            <div className="mb-3 flex items-center justify-between border-b border-[#3B3630]/80 pb-2">
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-2.5 w-2.5"
                  style={{ backgroundColor: collection.accentColor }}
                />
                <span className="font-mono-code text-[11px] uppercase tracking-wider text-[#A89F91]">
                  {collection.dateStamp || collection.year}
                </span>
              </div>
              {collection.status === 'coming_soon' && (
                <span className="font-pixel inline-flex items-center gap-1 border border-[#FFCF3D]/60 bg-[#FFCF3D]/10 px-2 py-0.5 text-[10px] text-[#FFCF3D]">
                  <Sparkles className="h-3 w-3" />
                  {locale === 'vi' ? 'Sắp ra mắt' : 'Coming Soon'}
                </span>
              )}
            </div>

            <h2 className="font-pixel text-2xl font-bold text-[#FFCF3D] sm:text-3xl">
              {page.heading}
            </h2>

            {page.subheading && (
              <p className="mt-1 text-sm font-medium text-[#F5EFE6]/90">{page.subheading}</p>
            )}

            {page.caption && (
              <blockquote className="mt-3 border-l-2 border-[#FFCF3D] bg-[#131211]/55 px-3 py-2 text-xs italic leading-relaxed text-[#A89F91]">
                “{page.caption[locale]}”
              </blockquote>
            )}

            <div className="mt-4 space-y-3 text-sm leading-relaxed text-[#F5EFE6]/90">
              {page.paragraphs.map((para, i) => (
                <p key={i}>{para[locale]}</p>
              ))}
            </div>

            {page.showYoutube && collection.youtubeIds && collection.youtubeIds.length > 0 && (
              <div className="mt-4 border-t border-[#3B3630]/80 pt-3">
                <p className="font-pixel mb-2 text-xs uppercase tracking-wider text-[#FFCF3D]">
                  {locale === 'vi' ? 'Hoạt ảnh trên YouTube' : 'Watch on YouTube'}
                </p>
                <div className="flex flex-wrap gap-2">
                  {collection.youtubeIds.map((vid, idx) => (
                    <a
                      key={vid}
                      href={`https://www.youtube.com/watch?v=${vid}`}
                      target="_blank"
                      rel="noreferrer"
                      className="pixel-btn flex items-center gap-1.5 px-2.5 py-1 text-xs"
                    >
                      <Play className="h-3 w-3 fill-current text-[#FFCF3D]" />
                      <span>{locale === 'vi' ? `Tập ${idx + 1}` : `Ep. ${idx + 1}`}</span>
                      <ExternalLink className="h-3 w-3 opacity-70" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {linkedMerch && (
              <div className="mt-4 border-2 border-[#3B3630] bg-[#131211]/85 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-pixel truncate text-xs font-bold text-[#FFCF3D] sm:text-sm">
                      {linkedMerch.format[locale]} — {linkedMerch.title[locale]}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-[#A89F91]">
                      {linkedMerch.specs[1]?.[locale]}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenMerch(linkedMerch.id)}
                    className="pixel-btn pixel-btn-primary flex shrink-0 items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold"
                  >
                    <ShoppingBag className="h-3.5 w-3.5" />
                    <span>{locale === 'vi' ? 'Merch' : 'Merch'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-[#3B3630]/60 pt-2">
            <span className="font-mono-code text-[10px] uppercase tracking-widest text-[#A89F91]/80">
              DOM ARTBOOK
            </span>
            <span className="font-mono-code text-[11px] text-[#A89F91]">
              {String(page.pageNumber).padStart(2, '0')}
            </span>
          </div>
        </div>
      );
    }

    // Appendix page (continued story, YouTube, Postcard Merch, Artist note)
    return (
      <div className="flex h-full flex-col justify-between">
        <div>
          <div className="mb-3 flex items-center justify-between border-b border-[#3B3630]/80 pb-2">
            <span className="font-mono-code text-[11px] uppercase tracking-widest text-[#FFCF3D]">
              {locale === 'vi' ? 'NHẬT KÝ & PHỤ LỤC' : 'NOTES & APPENDIX'}
            </span>
            <span className="font-mono-code text-[11px] text-[#A89F91]">
              {collection.title[locale]}
            </span>
          </div>

          {page.paragraphs.length > 0 ? (
            <div className="space-y-3 text-sm leading-relaxed text-[#F5EFE6]/90">
              {page.paragraphs.map((para, i) => (
                <p key={i}>{para[locale]}</p>
              ))}
            </div>
          ) : (
            <div className="border-l-2 border-[#FFCF3D]/70 bg-[#131211]/60 p-3.5 text-sm leading-relaxed text-[#F5EFE6]/85">
              {locale === 'vi'
                ? '“Mỗi bức tranh pixel là một mảnh ký ức được gói lại từ những điểm nhỏ bé nhất — Tiny dot... touch the story.”'
                : '“Every pixel artwork holds a quiet memory woven from the tiniest dots — Tiny dot... touch the story.”'}
            </div>
          )}

          {page.showYoutube && collection.youtubeIds && collection.youtubeIds.length > 0 && (
            <div className="mt-4 border-t border-[#3B3630]/80 pt-3">
              <p className="font-pixel mb-2 text-xs uppercase tracking-wider text-[#FFCF3D]">
                {locale === 'vi' ? 'Hoạt ảnh trên YouTube' : 'Watch on YouTube'}
              </p>
              <div className="flex flex-wrap gap-2">
                {collection.youtubeIds.map((vid, idx) => (
                  <a
                    key={vid}
                    href={`https://www.youtube.com/watch?v=${vid}`}
                    target="_blank"
                    rel="noreferrer"
                    className="pixel-btn flex items-center gap-1.5 px-2.5 py-1 text-xs"
                  >
                    <Play className="h-3 w-3 fill-current text-[#FFCF3D]" />
                    <span>{locale === 'vi' ? `Tập ${idx + 1}` : `Ep. ${idx + 1}`}</span>
                    <ExternalLink className="h-3 w-3 opacity-70" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {linkedMerch && (
            <div className="mt-4 border-2 border-[#3B3630] bg-[#131211]/85 p-3.5">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
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

          {!collection.items[0]?.src && (
            <p className="font-mono-code mt-4 border border-dashed border-[#3B3630] bg-[#131211]/60 p-2.5 text-[11px] leading-relaxed text-[#A89F91]">
              {locale === 'vi'
                ? '* Bản nháp Artbook — khi Dom thả PNG/GIF gốc vào Drive `01_Artworks_Monthly` hoặc khung sách vẽ tay vào `04_UI_UX_Design/artbook/`, cuốn sách sẽ tự hiển thị ảnh thật.'
                : '* Artbook draft — drop original PNG/GIF files into Drive `01_Artworks_Monthly` or hand-drawn book frames into `04_UI_UX_Design/artbook/` to swap automatically.'}
            </p>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-[#3B3630]/60 pt-2">
          <span className="font-mono-code text-[10px] uppercase tracking-widest text-[#A89F91]/80">
            FIN • {collection.year}
          </span>
          <span className="font-mono-code text-[11px] text-[#A89F91]">
            {String(page.pageNumber).padStart(2, '0')}
          </span>
        </div>
      </div>
    );
  };

  const leftPage = pages[spreadIndex * 2];
  const rightPage = pages[spreadIndex * 2 + 1];
  const activeMobilePage = pages[mobilePage] || pages[0];
  const flipAnimClass =
    flipTick === 0 ? '' : flipDir === 'next' ? 'animate-book-next' : 'animate-book-prev';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0908]/92 p-2.5 backdrop-blur-sm sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={collection.title[locale]}
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[94dvh] w-full max-w-5xl flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Book Ribbon Bar */}
        <div className="mb-2 flex items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-[#FFCF3D]" />
            <span className="font-pixel text-sm font-bold tracking-wider text-[#F5EFE6] sm:text-base">
              {collection.title[locale]}
            </span>
            <span className="font-mono-code hidden text-xs text-[#A89F91] sm:inline">
              • {locale === 'vi' ? 'Sách triển lãm' : 'Exhibition Artbook'}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="pixel-btn flex items-center gap-1.5 px-2.5 py-1 text-xs"
            aria-label="Close artbook"
          >
            <X className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{locale === 'vi' ? 'Đóng sách' : 'Close'}</span>
          </button>
        </div>

        {/* Hardcover Leather Book Shell with Stacked Page Edges */}
        <div className="relative flex flex-1 flex-col overflow-hidden border-2 border-[#4A3F35] bg-[#28221D] p-2 shadow-[0_18px_50px_rgba(0,0,0,0.85)] sm:p-3">
          {/* Golden ribbon bookmark peeking at spine top */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-0 z-30 hidden h-7 w-4 -translate-x-1/2 border-x border-b border-[#b88816] bg-[#FFCF3D] shadow-[0_4px_10px_rgba(0,0,0,0.5)] lg:block"
            style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 76%, 0 100%)' }}
          />

          {/* Decorative gold pixel corner brackets on leather cover */}
          <span className="pointer-events-none absolute left-1 top-1 h-3 w-3 border-l-2 border-t-2 border-[#FFCF3D]/70" />
          <span className="pointer-events-none absolute right-1 top-1 h-3 w-3 border-r-2 border-t-2 border-[#FFCF3D]/70" />
          <span className="pointer-events-none absolute bottom-1 left-1 h-3 w-3 border-b-2 border-l-2 border-[#FFCF3D]/70" />
          <span className="pointer-events-none absolute bottom-1 right-1 h-3 w-3 border-b-2 border-r-2 border-[#FFCF3D]/70" />

          {/* Stacked Paper Edges Wrapper */}
          <div className="relative flex flex-1 overflow-hidden border-2 border-[#3B3630] bg-[#1A1714] shadow-[inset_4px_0_0_#2E2924,inset_-4px_0_0_#2E2924]">
            {/* DESKTOP: 2-Page Open Book Spread */}
            <div
              key={`desktop-${spreadIndex}-${flipTick}`}
              className={`hidden min-h-[480px] max-h-[70dvh] w-full lg:grid lg:grid-cols-2 ${flipAnimClass}`}
            >
              {/* Left Page */}
              <div className="book-page-left relative overflow-y-auto border-r border-[#12100E] p-7">
                {leftPage && renderPageContent(leftPage)}
              </div>

              {/* Right Page */}
              <div className="book-page-right relative overflow-y-auto border-l border-[#3B3630]/50 p-7">
                {rightPage && renderPageContent(rightPage)}
              </div>
            </div>

            {/* Center Spine Shadow Overlay (Desktop only) */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-1/2 z-20 hidden w-8 -translate-x-1/2 bg-gradient-to-r from-transparent via-[#090807]/65 to-transparent lg:block"
            />

            {/* MOBILE: Single-Page Flippable Book View */}
            <div
              key={`mobile-${mobilePage}-${flipTick}`}
              className={`book-page-right max-h-[68dvh] min-h-[420px] w-full overflow-y-auto p-4 sm:p-6 lg:hidden ${flipAnimClass}`}
            >
              {renderPageContent(activeMobilePage)}
            </div>
          </div>
        </div>

        {/* Bottom Book Page-Turn Navigation Controls */}
        <div className="mt-2.5 flex items-center justify-between gap-2 px-1">
          {/* Desktop Controls */}
          <div className="hidden w-full items-center justify-between lg:flex">
            <button
              type="button"
              disabled={spreadIndex === 0}
              onClick={() => goSpread(spreadIndex - 1)}
              className={`pixel-btn flex items-center gap-1.5 px-4 py-2 text-sm font-semibold ${
                spreadIndex === 0 ? 'cursor-not-allowed opacity-40' : ''
              }`}
            >
              <ChevronLeft className="h-4 w-4" />
              <span>{locale === 'vi' ? 'Lật trang trước' : 'Previous Spread'}</span>
            </button>

            {/* Spread Bookmark Dots */}
            <div className="flex items-center gap-2">
              {Array.from({ length: totalSpreads }).map((_, idx) => {
                const active = idx === spreadIndex;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => goSpread(idx)}
                    className={`font-mono-code border px-2.5 py-1 text-xs transition ${
                      active
                        ? 'border-[#FFCF3D] bg-[#FFCF3D]/15 text-[#FFCF3D]'
                        : 'border-[#3B3630] bg-[#1C1B19] text-[#A89F91] hover:border-[#A89F91]'
                    }`}
                  >
                    {`${idx * 2 + 1}–${Math.min(pages.length, idx * 2 + 2)}`}
                  </button>
                );
              })}
              <span className="font-mono-code ml-2 text-xs text-[#A89F91]">
                ({locale === 'vi' ? 'Phím ← / →' : 'Keys ← / →'})
              </span>
            </div>

            <button
              type="button"
              disabled={spreadIndex >= totalSpreads - 1}
              onClick={() => goSpread(spreadIndex + 1)}
              className={`pixel-btn pixel-btn-primary flex items-center gap-1.5 px-4 py-2 text-sm font-bold ${
                spreadIndex >= totalSpreads - 1 ? 'cursor-not-allowed opacity-40' : ''
              }`}
            >
              <span>{locale === 'vi' ? 'Lật trang sau' : 'Next Spread'}</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Mobile Single-Page Controls */}
          <div className="flex w-full items-center justify-between gap-2 lg:hidden">
            <button
              type="button"
              disabled={mobilePage === 0}
              onClick={() => goMobilePage(mobilePage - 1)}
              className={`pixel-btn flex items-center gap-1 px-3 py-2 text-xs font-semibold ${
                mobilePage === 0 ? 'cursor-not-allowed opacity-40' : ''
              }`}
            >
              <ChevronLeft className="h-4 w-4" />
              <span>{locale === 'vi' ? 'Trang trước' : 'Prev'}</span>
            </button>

            <span className="font-mono-code text-xs text-[#FFCF3D]">
              {locale === 'vi'
                ? `Trang ${mobilePage + 1} / ${pages.length}`
                : `Page ${mobilePage + 1} / ${pages.length}`}
            </span>

            <button
              type="button"
              disabled={mobilePage >= pages.length - 1}
              onClick={() => goMobilePage(mobilePage + 1)}
              className={`pixel-btn pixel-btn-primary flex items-center gap-1 px-3 py-2 text-xs font-bold ${
                mobilePage >= pages.length - 1 ? 'cursor-not-allowed opacity-40' : ''
              }`}
            >
              <span>{locale === 'vi' ? 'Trang sau' : 'Next'}</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
