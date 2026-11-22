import { useEffect, useState } from 'react';
import { X, Copy, Check, ExternalLink, Mail, ShoppingBag, Sparkles } from 'lucide-react';
import type { ArtworkCollection, Locale } from '../types/content';
import { getCollectionById, merchItems, siteProfile } from '../data';
import { getArtworkImageUrl } from '../game/sprites/placeholderArt';

interface ModalShellProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}

function ModalShell({ title, subtitle, onClose, children }: ModalShellProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0908]/88 p-3 backdrop-blur-sm sm:p-6"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="pixel-panel relative flex max-h-[90dvh] w-full max-w-3xl flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b-2 border-[#3B3630] bg-[#181715] px-5 py-4">
          <div>
            <h2 className="font-pixel text-2xl font-bold text-[#FFCF3D]">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs text-[#A89F91] sm:text-sm">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} className="pixel-btn p-1.5" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-y-auto p-5 sm:p-6">{children}</div>
      </div>
    </div>
  );
}

export function MerchModal({
  locale,
  highlightId,
  onClose,
  onViewCollection,
  onOpenContact,
}: {
  locale: Locale;
  highlightId?: string;
  onClose: () => void;
  onViewCollection: (col: ArtworkCollection) => void;
  onOpenContact: () => void;
}) {
  return (
    <ModalShell
      title="MERCHANDISE"
      subtitle={
        locale === 'vi'
          ? 'Bộ sưu tập Postcard A5 giấy mỹ thuật C300 kèm bìa kính từ các tác phẩm của Dom'
          : 'A5 300gsm art postcards with protective sleeves crafted from Dom’s pixel works'
      }
      onClose={onClose}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {merchItems.map((item) => {
          const isHighlighted = highlightId === item.id;
          const col = getCollectionById(item.collectionId);
          return (
            <div
              key={item.id}
              className={`flex flex-col border-2 bg-[#131211] p-3.5 transition ${
                isHighlighted ? 'border-[#FFCF3D]' : 'border-[#3B3630]'
              }`}
            >
              <div className="mb-3 aspect-[4/3] overflow-hidden border border-[#3B3630] bg-[#1C1B19] p-2">
                <img
                  src={getArtworkImageUrl(item.proceduralKey, item.src)}
                  alt={item.title[locale]}
                  className="pixelated h-full w-full object-contain"
                />
              </div>

              <div className="flex items-center justify-between gap-2">
                <h3 className="font-pixel text-lg font-bold text-[#F5EFE6]">{item.title[locale]}</h3>
                <span className="font-mono-code border border-[#FFCF3D]/50 px-1.5 py-0.5 text-[10px] text-[#FFCF3D]">
                  {item.format[locale]}
                </span>
              </div>

              <ul className="mt-2 space-y-1 text-xs text-[#A89F91]">
                {item.specs.map((sp, i) => (
                  <li key={i}>• {sp[locale]}</li>
                ))}
              </ul>

              <div className="mt-4 flex flex-wrap gap-2 pt-2">
                {col && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onViewCollection(col);
                    }}
                    className="pixel-btn flex-1 px-2.5 py-1.5 text-xs"
                  >
                    {locale === 'vi' ? 'Về tác phẩm' : 'View Artwork'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenContact();
                  }}
                  className="pixel-btn pixel-btn-primary flex flex-1 items-center justify-center gap-1 px-2.5 py-1.5 text-xs font-bold"
                >
                  <ShoppingBag className="h-3.5 w-3.5" />
                  <span>{locale === 'vi' ? 'Nhắn đặt mua' : 'Inquire'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ModalShell>
  );
}

export function AboutModal({
  locale,
  onClose,
  onOpenContact,
}: {
  locale: Locale;
  onClose: () => void;
  onOpenContact: () => void;
}) {
  return (
    <ModalShell
      title={locale === 'vi' ? 'VỀ DOM (PHÚ SỸ)' : 'ABOUT DOM (PHÚ SỸ)'}
      subtitle={`“${siteProfile.tagline[locale]}” • ${siteProfile.location[locale]}`}
      onClose={onClose}
    >
      <div className="space-y-4 text-sm leading-relaxed text-[#F5EFE6]/92 sm:text-base">
        <div className="flex items-center gap-3 border-2 border-[#3B3630] bg-[#131211] p-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center border-2 border-[#FFCF3D] bg-[#1C1B19]">
            <Sparkles className="h-5 w-5 text-[#FFCF3D]" />
          </div>
          <div>
            <p className="font-pixel text-lg font-bold text-[#FFCF3D]">
              {locale === 'vi' ? 'Chuyện của những chấm nhỏ' : 'Stories of Tiny Dots'}
            </p>
            <p className="text-xs text-[#A89F91]">
              Pixel Artist • Storyteller • Game Enthusiast
            </p>
          </div>
        </div>

        {siteProfile.aboutParagraphs.map((p, idx) => (
          <p key={idx}>{p[locale]}</p>
        ))}

        <div className="pt-3">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenContact();
            }}
            className="pixel-btn pixel-btn-primary px-5 py-2.5 text-sm font-bold"
          >
            {locale === 'vi' ? 'Kết nối & Cà phê cùng Dom' : 'Connect with Dom'}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

export function ContactModal({ locale, onClose }: { locale: Locale; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(siteProfile.email);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback ignored if clipboard blocked
    }
  };

  return (
    <ModalShell
      title={locale === 'vi' ? 'LIÊN HỆ VỚI DOM' : 'CONTACT DOM'}
      subtitle={locale === 'vi' ? 'Commission, hợp tác dự án, đặt Postcard hoặc cà phê trò chuyện' : 'Commissions, collaborations, postcards, or a quiet coffee chat'}
      onClose={onClose}
    >
      <p className="text-sm leading-relaxed text-[#F5EFE6]/90 sm:text-base">
        {siteProfile.contactMessage[locale]}
      </p>

      {/* Email block */}
      <div className="mt-5 flex flex-col items-start justify-between gap-3 border-2 border-[#FFCF3D]/60 bg-[#131211] p-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <Mail className="h-5 w-5 text-[#FFCF3D]" />
          <div>
            <div className="font-mono-code text-[11px] uppercase text-[#A89F91]">Email</div>
            <a
              href={`mailto:${siteProfile.email}`}
              className="font-mono-code text-sm font-semibold text-[#F5EFE6] hover:text-[#FFCF3D]"
            >
              {siteProfile.email}
            </a>
          </div>
        </div>
        <button
          type="button"
          onClick={copyEmail}
          className="pixel-btn flex items-center gap-1.5 px-3 py-1.5 text-xs"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-[#7ED957]" /> : <Copy className="h-3.5 w-3.5" />}
          <span>{copied ? (locale === 'vi' ? 'Đã chép!' : 'Copied!') : locale === 'vi' ? 'Chép Email' : 'Copy Email'}</span>
        </button>
      </div>

      {/* Social Links from Linktree */}
      <div className="mt-6">
        <p className="font-pixel mb-3 text-sm uppercase tracking-wider text-[#FFCF3D]">
          {locale === 'vi' ? 'Tìm Dom trên mạng xã hội' : 'Find Dom online'}
        </p>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {siteProfile.socials.map((s) => (
            <a
              key={s.id}
              href={s.url}
              target="_blank"
              rel="noreferrer"
              className="pixel-btn flex items-center justify-between px-3.5 py-2.5 text-left"
            >
              <div>
                <div className="font-pixel text-sm font-bold text-[#F5EFE6]">{s.label}</div>
                <div className="font-mono-code text-[11px] text-[#A89F91]">{s.handle}</div>
              </div>
              <ExternalLink className="h-4 w-4 text-[#FFCF3D]" />
            </a>
          ))}
        </div>
      </div>
    </ModalShell>
  );
}
