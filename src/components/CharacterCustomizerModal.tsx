import { useEffect, useRef, useState } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Shirt,
  Sparkles,
  X,
} from 'lucide-react';
import type {
  CharacterAnimState,
  CharacterAppearance,
  Facing8,
  Locale,
  LocalizedText,
} from '../types/content';
import {
  ACCESSORY_COLORS,
  ACCESSORY_STYLES,
  BASE_TONES,
  HAIR_COLORS,
  HAIR_STYLES,
  OUTFIT_STYLES,
  PANTS_COLORS,
  TOP_COLORS,
  randomizeAppearance,
  type ColorSwatch,
  type OptionItem,
} from '../data/characterOptions';
import { soundEngine } from '../audio/SoundEngine';
import { CharacterPreviewCanvas } from './CharacterPreviewCanvas';

type CustomizerTab = 'hair' | 'outfit' | 'accessory' | 'base';
type PreviewAnim = Extract<CharacterAnimState, 'idle' | 'walk' | 'run' | 'jump'>;

const DIRECTIONS_8: Facing8[] = [
  'down',
  'down_right',
  'right',
  'up_right',
  'up',
  'up_left',
  'left',
  'down_left',
];

const FACING_LABELS: Record<Facing8, LocalizedText> = {
  down: { vi: 'Trước', en: 'Front' },
  down_right: { vi: 'Trước · Phải', en: 'Front · R' },
  right: { vi: 'Phải', en: 'Right' },
  up_right: { vi: 'Sau · Phải', en: 'Back · R' },
  up: { vi: 'Sau', en: 'Back' },
  up_left: { vi: 'Sau · Trái', en: 'Back · L' },
  left: { vi: 'Trái', en: 'Left' },
  down_left: { vi: 'Trước · Trái', en: 'Front · L' },
};

const PREVIEW_ANIMS: { id: PreviewAnim; label: LocalizedText }[] = [
  { id: 'idle', label: { vi: 'Đứng', en: 'Idle' } },
  { id: 'walk', label: { vi: 'Đi', en: 'Walk' } },
  { id: 'run', label: { vi: 'Chạy', en: 'Run' } },
  { id: 'jump', label: { vi: 'Nhảy', en: 'Jump' } },
];

const CATEGORY_TABS: { id: CustomizerTab; label: LocalizedText }[] = [
  { id: 'hair', label: { vi: 'Tóc', en: 'Hair' } },
  { id: 'outfit', label: { vi: 'Trang phục', en: 'Outfit' } },
  { id: 'accessory', label: { vi: 'Phụ kiện', en: 'Accessory' } },
  { id: 'base', label: { vi: 'Tông da', en: 'Base' } },
];

function findSwatchLabel(hex: string, swatches: ColorSwatch[], locale: Locale): string {
  const match = swatches.find((s) => s.hex.toLowerCase() === hex.toLowerCase());
  return match ? match.label[locale] : hex;
}

function isLightHex(hex: string): boolean {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return false;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.65;
}

interface StyleChipGroupProps<T extends string> {
  label: string;
  options: OptionItem<T>[];
  value: T;
  locale: Locale;
  onSelect: (next: T) => void;
}

function StyleChipGroup<T extends string>({
  label,
  options,
  value,
  locale,
  onSelect,
}: StyleChipGroupProps<T>) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="font-pixel text-xs uppercase tracking-wider text-[#A89F91]">{label}</span>
      </div>
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        {options.map((opt) => {
          const active = opt.id === value;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onSelect(opt.id)}
              aria-pressed={active}
              className={`font-pixel border-2 px-2.5 py-2 text-xs transition sm:text-sm ${
                active
                  ? 'border-[#FFCF3D] bg-[#FFCF3D]/15 font-bold text-[#FFCF3D] shadow-[inset_0_1px_0_rgba(255,207,61,0.3)]'
                  : 'border-[#3B3630] bg-[#131211] text-[#F5EFE6]/85 hover:border-[#A89F91] hover:text-[#F5EFE6]'
              }`}
            >
              {opt.label[locale]}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface ColorSwatchGroupProps {
  label: string;
  swatches: ColorSwatch[];
  value: string;
  locale: Locale;
  dimmed?: boolean;
  onSelect: (hex: string) => void;
}

function ColorSwatchGroup({
  label,
  swatches,
  value,
  locale,
  dimmed = false,
  onSelect,
}: ColorSwatchGroupProps) {
  const activeName = findSwatchLabel(value, swatches, locale);
  return (
    <div className={dimmed ? 'opacity-65 transition-opacity hover:opacity-100' : ''}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="font-pixel text-xs uppercase tracking-wider text-[#A89F91]">{label}</span>
        <span className="font-mono-code text-[11px] text-[#FFCF3D]">{activeName}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {swatches.map((swatch) => {
          const selected = swatch.hex.toLowerCase() === value.toLowerCase();
          const light = isLightHex(swatch.hex);
          return (
            <button
              key={swatch.id}
              type="button"
              onClick={() => onSelect(swatch.hex)}
              title={swatch.label[locale]}
              aria-label={swatch.label[locale]}
              aria-pressed={selected}
              className={`relative flex h-9 w-9 items-center justify-center border-2 transition sm:h-10 sm:w-10 ${
                selected
                  ? 'scale-105 border-[#FFCF3D] ring-2 ring-[#FFCF3D]/40'
                  : 'border-[#3B3630] hover:scale-105 hover:border-[#A89F91]'
              }`}
              style={{
                backgroundColor: swatch.hex,
                boxShadow: `inset 0 -5px 0 ${swatch.shade}`,
              }}
            >
              {selected && (
                <Check
                  className={`h-4 w-4 stroke-[3] ${light ? 'text-[#131211]' : 'text-[#F5EFE6]'}`}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export interface CharacterCustomizerModalProps {
  locale: Locale;
  appearance: CharacterAppearance;
  onChange: (next: CharacterAppearance) => void;
  onClose: () => void;
}

export function CharacterCustomizerModal({
  locale,
  appearance,
  onChange,
  onClose,
}: CharacterCustomizerModalProps) {
  const initialAppearanceRef = useRef<CharacterAppearance>(appearance);
  const [activeTab, setActiveTab] = useState<CustomizerTab>('hair');
  const [facingIndex, setFacingIndex] = useState(0);
  const [previewAnim, setPreviewAnim] = useState<PreviewAnim>('idle');

  const facing = DIRECTIONS_8[facingIndex];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const updateField = <K extends keyof CharacterAppearance>(
    key: K,
    val: CharacterAppearance[K]
  ) => {
    onChange({ ...appearance, [key]: val });
  };

  const handleRandomize = () => {
    soundEngine.playChime();
    onChange(randomizeAppearance());
  };

  const handleReset = () => {
    onChange(initialAppearanceRef.current);
  };

  const rotateLeft = () => {
    setFacingIndex((i) => (i - 1 + DIRECTIONS_8.length) % DIRECTIONS_8.length);
  };

  const rotateRight = () => {
    setFacingIndex((i) => (i + 1) % DIRECTIONS_8.length);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0908]/88 p-2.5 backdrop-blur-sm sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-label={locale === 'vi' ? 'Tùy chỉnh nhân vật' : 'Character Customizer'}
      onClick={onClose}
    >
      <div
        className="pixel-panel relative flex max-h-[92dvh] w-full max-w-4xl flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b-2 border-[#3B3630] bg-[#181715] px-4 py-3 sm:px-5 sm:py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center border-2 border-[#FFCF3D] bg-[#131211]">
              <Shirt className="h-4 w-4 text-[#FFCF3D]" />
            </span>
            <div>
              <h2 className="font-pixel text-lg font-bold leading-tight text-[#FFCF3D] sm:text-2xl">
                {locale === 'vi' ? 'TÙY CHỈNH NHÂN VẬT' : 'VISITOR WARDROBE'}
              </h2>
              <p className="mt-0.5 text-[11px] text-[#A89F91] sm:text-xs">
                {locale === 'vi'
                  ? 'Phối tóc, trang phục & phụ kiện cho chuyến dạo quanh nhà Dom'
                  : 'Style hair, outfit & accessories for your visit to Dom’s studio'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="pixel-btn shrink-0 p-1.5"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body: Left/Top Live Preview Stage + Right/Bottom Customization Panel */}
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto md:flex-row md:overflow-hidden">
          {/* Live Preview Stage */}
          <div className="flex shrink-0 flex-col items-center justify-between gap-2.5 border-b-2 border-[#3B3630] bg-[#151412] p-3.5 md:w-[276px] md:border-b-0 md:border-r-2 md:p-5">
            {/* Museum Spotlight Pedestal */}
            <div
              className="relative flex w-full flex-col items-center justify-center overflow-hidden border-2 border-[#3B3630] bg-[#131211] px-3 pb-3 pt-2"
              style={{
                backgroundImage:
                  'radial-gradient(circle at 50% 22%, rgba(255, 207, 61, 0.16) 0%, rgba(232, 141, 79, 0.05) 45%, rgba(19, 18, 17, 0) 76%)',
              }}
            >
              {/* Subtle corner exhibit brackets */}
              <span className="pointer-events-none absolute left-1.5 top-1.5 h-2 w-2 border-l-2 border-t-2 border-[#FFCF3D]/45" />
              <span className="pointer-events-none absolute right-1.5 top-1.5 h-2 w-2 border-r-2 border-t-2 border-[#FFCF3D]/45" />
              <span className="pointer-events-none absolute bottom-1.5 left-1.5 h-2 w-2 border-b-2 border-l-2 border-[#FFCF3D]/45" />
              <span className="pointer-events-none absolute bottom-1.5 right-1.5 h-2 w-2 border-b-2 border-r-2 border-[#FFCF3D]/45" />

              <div className="relative flex items-end justify-center">
                {/* Warm museum floor spotlight pad */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute bottom-1 h-5 w-28 rounded-full border border-[#FFCF3D]/30 bg-[#1C1B19]"
                  style={{
                    boxShadow: '0 0 20px rgba(255, 207, 61, 0.18), inset 0 2px 6px rgba(255, 207, 61, 0.12)',
                  }}
                />
                <CharacterPreviewCanvas
                  appearance={appearance}
                  anim={previewAnim}
                  facing={facing}
                  scale={4}
                  width={148}
                  height={152}
                  className="relative z-10"
                />
              </div>

              {/* Direction Rotate Controls */}
              <div className="mt-2 flex w-full items-center justify-between gap-2">
                <button
                  id="btn-customizer-rotate-left"
                  type="button"
                  onClick={rotateLeft}
                  className="pixel-btn flex h-8 w-8 items-center justify-center"
                  title={locale === 'vi' ? 'Xoay trái' : 'Rotate left'}
                  aria-label={locale === 'vi' ? 'Xoay trái' : 'Rotate left'}
                >
                  <ChevronLeft className="h-4 w-4 text-[#FFCF3D]" />
                </button>
                <span className="font-mono-code text-[11px] uppercase tracking-wider text-[#A89F91]">
                  {FACING_LABELS[facing][locale]}
                </span>
                <button
                  id="btn-customizer-rotate-right"
                  type="button"
                  onClick={rotateRight}
                  className="pixel-btn flex h-8 w-8 items-center justify-center"
                  title={locale === 'vi' ? 'Xoay phải' : 'Rotate right'}
                  aria-label={locale === 'vi' ? 'Xoay phải' : 'Rotate right'}
                >
                  <ChevronRight className="h-4 w-4 text-[#FFCF3D]" />
                </button>
              </div>
            </div>

            {/* Preview Animation Toggle */}
            <div className="w-full">
              <div className="grid grid-cols-4 gap-1">
                {PREVIEW_ANIMS.map((animOpt) => {
                  const active = previewAnim === animOpt.id;
                  return (
                    <button
                      key={animOpt.id}
                      type="button"
                      onClick={() => setPreviewAnim(animOpt.id)}
                      aria-pressed={active}
                      className={`font-pixel border px-1.5 py-1.5 text-xs transition ${
                        active
                          ? 'border-[#FFCF3D] bg-[#FFCF3D]/15 font-bold text-[#FFCF3D]'
                          : 'border-[#3B3630] bg-[#131211] text-[#A89F91] hover:border-[#A89F91] hover:text-[#F5EFE6]'
                      }`}
                    >
                      {animOpt.label[locale]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Prominent Randomize Button */}
            <button
              id="btn-customizer-randomize"
              type="button"
              onClick={handleRandomize}
              className="pixel-btn flex w-full items-center justify-center gap-2 border-[#FFCF3D]/70 px-3 py-2 text-sm font-bold text-[#FFCF3D]"
            >
              <span aria-hidden="true">🎲</span>
              <span>{locale === 'vi' ? 'Ngẫu nhiên' : 'Randomize'}</span>
            </button>
          </div>

          {/* Right/Bottom Customization Panel */}
          <div className="flex min-h-0 flex-1 flex-col bg-[#1C1B19]">
            {/* 4 Compact Category Tabs */}
            <div
              role="tablist"
              aria-label={locale === 'vi' ? 'Danh mục trang phục' : 'Customization categories'}
              className="grid shrink-0 grid-cols-4 gap-1 border-b-2 border-[#3B3630] bg-[#181715] p-2.5 sm:gap-1.5 sm:px-5 sm:py-3"
            >
              {CATEGORY_TABS.map((tab) => {
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    id={`tab-customizer-${tab.id}`}
                    role="tab"
                    type="button"
                    aria-selected={active}
                    onClick={() => setActiveTab(tab.id)}
                    className={`pixel-btn whitespace-nowrap px-1.5 py-2 text-[11px] sm:px-3 sm:text-sm ${
                      active ? 'pixel-btn-primary font-bold' : 'text-[#A89F91]'
                    }`}
                  >
                    {tab.label[locale]}
                  </button>
                );
              })}
            </div>

            {/* Tab Options Panel */}
            <div className="flex-1 space-y-5 overflow-y-auto p-4 sm:p-5">
              {activeTab === 'hair' && (
                <>
                  <StyleChipGroup
                    label={locale === 'vi' ? 'Kiểu tóc' : 'Hairstyle'}
                    options={HAIR_STYLES}
                    value={appearance.hairStyle}
                    locale={locale}
                    onSelect={(hairStyle) => updateField('hairStyle', hairStyle)}
                  />
                  <ColorSwatchGroup
                    label={locale === 'vi' ? 'Màu tóc' : 'Hair Color'}
                    swatches={HAIR_COLORS}
                    value={appearance.hairColor}
                    locale={locale}
                    dimmed={appearance.hairStyle === 'none'}
                    onSelect={(hairColor) => updateField('hairColor', hairColor)}
                  />
                </>
              )}

              {activeTab === 'outfit' && (
                <>
                  <StyleChipGroup
                    label={locale === 'vi' ? 'Kiểu trang phục' : 'Outfit Style'}
                    options={OUTFIT_STYLES}
                    value={appearance.outfitStyle}
                    locale={locale}
                    onSelect={(outfitStyle) => updateField('outfitStyle', outfitStyle)}
                  />
                  <ColorSwatchGroup
                    label={locale === 'vi' ? 'Màu áo' : 'Top Color'}
                    swatches={TOP_COLORS}
                    value={appearance.topColor}
                    locale={locale}
                    onSelect={(topColor) => updateField('topColor', topColor)}
                  />
                  <ColorSwatchGroup
                    label={locale === 'vi' ? 'Màu quần' : 'Pants Color'}
                    swatches={PANTS_COLORS}
                    value={appearance.pantsColor}
                    locale={locale}
                    onSelect={(pantsColor) => updateField('pantsColor', pantsColor)}
                  />
                </>
              )}

              {activeTab === 'accessory' && (
                <>
                  <StyleChipGroup
                    label={locale === 'vi' ? 'Phụ kiện' : 'Accessory'}
                    options={ACCESSORY_STYLES}
                    value={appearance.accessory}
                    locale={locale}
                    onSelect={(accessory) => updateField('accessory', accessory)}
                  />
                  <ColorSwatchGroup
                    label={locale === 'vi' ? 'Màu phụ kiện' : 'Accessory Color'}
                    swatches={ACCESSORY_COLORS}
                    value={appearance.accessoryColor}
                    locale={locale}
                    dimmed={appearance.accessory === 'none'}
                    onSelect={(accessoryColor) => updateField('accessoryColor', accessoryColor)}
                  />
                </>
              )}

              {activeTab === 'base' && (
                <div>
                  <div className="mb-2.5 flex items-center justify-between gap-2">
                    <span className="font-pixel text-xs uppercase tracking-wider text-[#A89F91]">
                      {locale === 'vi' ? 'Tông màu cơ bản' : 'Base Skin Tone'}
                    </span>
                    <span className="font-mono-code text-[11px] text-[#FFCF3D]">
                      {findSwatchLabel(appearance.baseTone, BASE_TONES, locale)}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {BASE_TONES.map((tone) => {
                      const selected =
                        tone.hex.toLowerCase() === appearance.baseTone.toLowerCase();
                      const light = isLightHex(tone.hex);
                      return (
                        <button
                          key={tone.id}
                          type="button"
                          onClick={() => updateField('baseTone', tone.hex)}
                          aria-pressed={selected}
                          className={`flex items-center gap-3 border-2 p-2.5 text-left transition ${
                            selected
                              ? 'border-[#FFCF3D] bg-[#FFCF3D]/12 text-[#FFCF3D]'
                              : 'border-[#3B3630] bg-[#131211] text-[#F5EFE6] hover:border-[#A89F91]'
                          }`}
                        >
                          <span
                            className="flex h-9 w-9 shrink-0 items-center justify-center border-2 border-[#3B3630]"
                            style={{
                              backgroundColor: tone.hex,
                              boxShadow: `inset 0 -5px 0 ${tone.shade}`,
                            }}
                          >
                            {selected && (
                              <Check
                                className={`h-4 w-4 stroke-[3] ${
                                  light ? 'text-[#131211]' : 'text-[#F5EFE6]'
                                }`}
                              />
                            )}
                          </span>
                          <div className="min-w-0">
                            <div className="font-pixel truncate text-sm font-bold">
                              {tone.label[locale]}
                            </div>
                            <div className="font-mono-code text-[10px] uppercase text-[#A89F91]">
                              {tone.hex}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Subtle cozy hint */}
              <div className="flex items-center gap-2 border border-[#3B3630] bg-[#131211]/70 px-3 py-2 text-[11px] text-[#A89F91]">
                <Sparkles className="h-3.5 w-3.5 shrink-0 text-[#FFCF3D]" />
                <span>
                  {locale === 'vi'
                    ? 'Trang phục của bạn được lưu tự động và có thể đổi lại bất cứ lúc nào trên thanh HUD.'
                    : 'Your look saves automatically and can be updated anytime from the top HUD.'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t-2 border-[#3B3630] bg-[#181715] px-4 py-3 sm:px-5">
          <button
            id="btn-customizer-reset"
            type="button"
            onClick={handleReset}
            className="pixel-btn flex items-center gap-1.5 px-3 py-2 text-xs text-[#A89F91] sm:text-sm"
            title={locale === 'vi' ? 'Khôi phục trang phục trước đó' : 'Reset changes'}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>{locale === 'vi' ? 'Đặt lại' : 'Reset'}</span>
          </button>

          <button
            id="btn-customizer-done"
            type="button"
            onClick={() => {
              soundEngine.playChime();
              onClose();
            }}
            className="pixel-btn pixel-btn-primary flex items-center gap-2 px-5 py-2 text-sm font-bold sm:px-6"
          >
            <Check className="h-4 w-4 stroke-[2.5]" />
            <span>{locale === 'vi' ? 'Xong / Vào triển lãm' : 'Done'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
