import type {
  AccessoryStyle,
  CharacterAppearance,
  HairStyle,
  LocalizedText,
  OutfitStyle,
} from '../types/content';

export interface OptionItem<T extends string> {
  id: T;
  label: LocalizedText;
}

export interface ColorSwatch {
  id: string;
  hex: string;
  shade: string;
  label: LocalizedText;
}

export const BASE_TONES: ColorSwatch[] = [
  { id: 'cream', hex: '#faf3e8', shade: '#e7d5c6', label: { vi: 'Kem gốc', en: 'Original Cream' } },
  { id: 'peach', hex: '#f7d8be', shade: '#deb392', label: { vi: 'Hồng ấm', en: 'Warm Peach' } },
  { id: 'honey', hex: '#e8bc8e', shade: '#c99567', label: { vi: 'Mật ong', en: 'Honey' } },
  { id: 'cocoa', hex: '#b8825a', shade: '#915f3d', label: { vi: 'Nâu cacao', en: 'Cocoa' } },
  { id: 'moon', hex: '#e4e8f0', shade: '#bfc8d6', label: { vi: 'Ánh trăng', en: 'Moonlight' } },
];

export const HAIR_STYLES: OptionItem<HairStyle>[] = [
  { id: 'short', label: { vi: 'Tóc ngắn', en: 'Short' } },
  { id: 'bob', label: { vi: 'Tóc bob', en: 'Cozy Bob' } },
  { id: 'ponytail', label: { vi: 'Đuôi ngựa', en: 'Ponytail' } },
  { id: 'curly', label: { vi: 'Tóc xoăn', en: 'Fluffy' } },
  { id: 'long', label: { vi: 'Tóc dài', en: 'Long' } },
  { id: 'none', label: { vi: 'Gốc (trơn)', en: 'Base' } },
];

export const HAIR_COLORS: ColorSwatch[] = [
  { id: 'espresso', hex: '#382a26', shade: '#241a17', label: { vi: 'Nâu đen', en: 'Espresso' } },
  { id: 'chestnut', hex: '#7a492e', shade: '#54301d', label: { vi: 'Hạt dẻ', en: 'Chestnut' } },
  { id: 'gold', hex: '#ffcf3d', shade: '#d49d1d', label: { vi: 'Vàng nắng', en: 'Golden' } },
  { id: 'sunset', hex: '#d96b38', shade: '#a64a21', label: { vi: 'Cam hoàng hôn', en: 'Sunset' } },
  { id: 'midnight', hex: '#3b5284', shade: '#253559', label: { vi: 'Xanh đêm', en: 'Midnight' } },
  { id: 'blossom', hex: '#d97ba5', shade: '#a65078', label: { vi: 'Hồng phấn', en: 'Blossom' } },
  { id: 'matcha', hex: '#589452', shade: '#3c6b37', label: { vi: 'Matcha', en: 'Matcha' } },
  { id: 'silver', hex: '#cfd6e0', shade: '#9aa5b5', label: { vi: 'Bạc khói', en: 'Silver' } },
];

export const OUTFIT_STYLES: OptionItem<OutfitStyle>[] = [
  { id: 'hoodie', label: { vi: 'Áo Hoodie', en: 'Hoodie' } },
  { id: 'tee', label: { vi: 'Áo Thun', en: 'Tee' } },
  { id: 'jacket', label: { vi: 'Áo Khoác', en: 'Jacket' } },
  { id: 'overalls', label: { vi: 'Yếm Vẽ', en: 'Overalls' } },
  { id: 'apron', label: { vi: 'Tạp Dề Studio', en: 'Studio Apron' } },
];

export const TOP_COLORS: ColorSwatch[] = [
  { id: 'gold', hex: '#ffcf3d', shade: '#cfa025', label: { vi: 'Vàng Dom', en: 'Dom Gold' } },
  { id: 'terracotta', hex: '#e07a47', shade: '#b0562c', label: { vi: 'Cam đất', en: 'Terracotta' } },
  { id: 'sage', hex: '#6ba368', shade: '#4c7a49', label: { vi: 'Xanh rêu', en: 'Sage' } },
  { id: 'sky', hex: '#5c9ce6', shade: '#3c73b5', label: { vi: 'Xanh trời', en: 'Sky Blue' } },
  { id: 'berry', hex: '#c95370', shade: '#96354d', label: { vi: 'Đỏ dâu', en: 'Berry' } },
  { id: 'lavender', hex: '#9b7fd4', shade: '#7258a6', label: { vi: 'Tím nhạt', en: 'Lavender' } },
  { id: 'cream', hex: '#ebe3d5', shade: '#c4b8a5', label: { vi: 'Kem sáng', en: 'Cream' } },
  { id: 'charcoal', hex: '#3e3b38', shade: '#262422', label: { vi: 'Than tối', en: 'Charcoal' } },
];

export const PANTS_COLORS: ColorSwatch[] = [
  { id: 'denim', hex: '#445a7d', shade: '#2d3e59', label: { vi: 'Jean xanh', en: 'Denim' } },
  { id: 'charcoal', hex: '#3a3836', shade: '#242220', label: { vi: 'Đen xám', en: 'Charcoal' } },
  { id: 'khaki', hex: '#b59d79', shade: '#8c7554', label: { vi: 'Kaki ấm', en: 'Khaki' } },
  { id: 'olive', hex: '#546648', shade: '#394730', label: { vi: 'Xanh rêu', en: 'Olive' } },
  { id: 'espresso', hex: '#5e4334', shade: '#402c21', label: { vi: 'Nâu đất', en: 'Espresso' } },
];

export const ACCESSORY_STYLES: OptionItem<AccessoryStyle>[] = [
  { id: 'none', label: { vi: 'Không có', en: 'None' } },
  { id: 'cap', label: { vi: 'Mũ lưỡi trai', en: 'Cap' } },
  { id: 'beanie', label: { vi: 'Mũ len', en: 'Beanie' } },
  { id: 'glasses', label: { vi: 'Kính tròn', en: 'Glasses' } },
  { id: 'scarf', label: { vi: 'Khăn choàng', en: 'Scarf' } },
  { id: 'headphones', label: { vi: 'Tai nghe', en: 'Headphones' } },
  { id: 'cat_ears', label: { vi: 'Tai mèo Ink', en: 'Cat Ears' } },
];

export const ACCESSORY_COLORS: ColorSwatch[] = [
  { id: 'gold', hex: '#ffcf3d', shade: '#cfa025', label: { vi: 'Vàng ấm', en: 'Gold' } },
  { id: 'crimson', hex: '#d94848', shade: '#a32c2c', label: { vi: 'Đỏ đô', en: 'Crimson' } },
  { id: 'ink', hex: '#262322', shade: '#141211', label: { vi: 'Đen mực', en: 'Ink Black' } },
  { id: 'mint', hex: '#66c2a5', shade: '#43947b', label: { vi: 'Xanh bạc hà', en: 'Mint' } },
  { id: 'peach', hex: '#f08a5d', shade: '#bf6239', label: { vi: 'Cam đào', en: 'Peach' } },
  { id: 'cream', hex: '#f5efe6', shade: '#ccc3b4', label: { vi: 'Trắng kem', en: 'Cream' } },
];

export const DOM_NPC_APPEARANCE: CharacterAppearance = {
  baseTone: '#faf3e8',
  hairStyle: 'short',
  hairColor: '#382a26',
  outfitStyle: 'hoodie',
  topColor: '#ffcf3d',
  pantsColor: '#3a3836',
  accessory: 'cap',
  accessoryColor: '#262322',
};

const STORAGE_KEY = 'dom-portfolio-visitor-appearance-v1';

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function randomizeAppearance(): CharacterAppearance {
  // Give visitors a fun non-bald hairstyle most of the time, and ~75% chance of an accessory
  const hairPool = HAIR_STYLES.filter((h) => h.id !== 'none');
  const accPool = ACCESSORY_STYLES.filter((a) => a.id !== 'none');
  return {
    baseTone: pick(BASE_TONES).hex,
    hairStyle: Math.random() < 0.88 ? pick(hairPool).id : 'none',
    hairColor: pick(HAIR_COLORS).hex,
    outfitStyle: pick(OUTFIT_STYLES).id,
    topColor: pick(TOP_COLORS).hex,
    pantsColor: pick(PANTS_COLORS).hex,
    accessory: Math.random() < 0.72 ? pick(accPool).id : 'none',
    accessoryColor: pick(ACCESSORY_COLORS).hex,
  };
}

export function loadOrCreateVisitorAppearance(): CharacterAppearance {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<CharacterAppearance>;
      if (parsed.baseTone && parsed.hairStyle && parsed.outfitStyle && parsed.accessory) {
        return {
          ...randomizeAppearance(),
          ...parsed,
        };
      }
    }
  } catch {
    // Ignore storage errors
  }
  const fresh = randomizeAppearance();
  saveVisitorAppearance(fresh);
  return fresh;
}

export function saveVisitorAppearance(appearance: CharacterAppearance): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appearance));
  } catch {
    // Ignore storage errors
  }
}

export function findShadeForHex(hex: string, swatches: ColorSwatch[], fallback = '#241f1c'): string {
  return swatches.find((s) => s.hex.toLowerCase() === hex.toLowerCase())?.shade ?? fallback;
}
