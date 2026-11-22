import type { LocalizedText, TimeOfDayMode, TimePeriod } from '../../types/content';

export type DomScheduleActivity = 'sleep' | 'work' | 'gaming';

export interface TimeOfDayState {
  mode: TimeOfDayMode;
  /** Fractional hour in [0, 24) */
  hour: number;
  /** Formatted clock string e.g. "10:00" */
  clockText: string;
  period: TimePeriod;
  domActivity: DomScheduleActivity;
  skyColor: string;
  /**
   * Multiply tint color + strength for outdoor areas:
   * - Daytime: a = 0 (zero haze, 100% crisp pixel art!)
   * - Sunset: warm golden-peach multiply tint
   * - Night: clear cobalt-slate multiply tint (readable, never muddy or pitch-black)
   */
  outdoorTint: { r: number; g: number; b: number; a: number };
  /** Warm cozy indoor lightmap tint (much brighter & warmer than outdoor at night) */
  indoorTint: { r: number; g: number; b: number; a: number };
  /** 0 = daylight (lamps off), 1 = full night (lamps warm & bright) */
  lightIntensity: number;
  /** 0..1 visibility for fireflies / night glow */
  fireflyAlpha: number;
  /** 0..1 warm window sunlight shafts during daytime */
  sunlightAlpha: number;
  label: LocalizedText;
}

export const TIME_MODE_ORDER: TimeOfDayMode[] = [
  'auto',
  'morning',
  'sunset',
  'night',
  'late_night',
];

const MODE_FIXED_HOUR: Record<Exclude<TimeOfDayMode, 'auto'>, number> = {
  morning: 10.0,
  sunset: 17.5,
  night: 22.5,
  late_night: 4.0,
};

export function getDomActivityForHour(hour: number): DomScheduleActivity {
  const h = ((hour % 24) + 24) % 24;
  if (h >= 3 && h < 9) return 'sleep';
  if (h >= 9 && h < 17) return 'work';
  return 'gaming';
}

export function formatClock(hour: number): string {
  const h = ((hour % 24) + 24) % 24;
  const hh = Math.floor(h);
  const mm = Math.floor((h - hh) * 60);
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

function lerpRgba(
  c1: { r: number; g: number; b: number; a: number },
  c2: { r: number; g: number; b: number; a: number },
  t: number
): { r: number; g: number; b: number; a: number } {
  return {
    r: Math.round(lerp(c1.r, c2.r, t)),
    g: Math.round(lerp(c1.g, c2.g, t)),
    b: Math.round(lerp(c1.b, c2.b, t)),
    a: Number(lerp(c1.a, c2.a, t).toFixed(3)),
  };
}

function lerpHex(hex1: string, hex2: string, t: number): string {
  const n1 = parseInt(hex1.replace('#', ''), 16);
  const n2 = parseInt(hex2.replace('#', ''), 16);
  const r = Math.round(lerp((n1 >> 16) & 255, (n2 >> 16) & 255, t));
  const g = Math.round(lerp((n1 >> 8) & 255, (n2 >> 8) & 255, t));
  const b = Math.round(lerp(n1 & 255, n2 & 255, t));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

// Multiply-friendly palettes:
// Day = completely clear (a = 0, zero haze!)
// Sunset = warm golden-apricot multiply tint
// Night = crisp moonlit indigo (readable pixel details, cozy contrast with warm golden lamps)
const DAY_OUTDOOR = { r: 255, g: 255, b: 255, a: 0 };
const SUNSET_OUTDOOR = { r: 245, g: 165, b: 120, a: 0.34 };
const NIGHT_OUTDOOR = { r: 92, g: 108, b: 158, a: 0.56 };
const LATE_NIGHT_OUTDOOR = { r: 74, g: 88, b: 140, a: 0.66 };

const DAY_INDOOR = { r: 255, g: 255, b: 255, a: 0 };
const SUNSET_INDOOR = { r: 250, g: 215, b: 185, a: 0.14 };
const NIGHT_INDOOR = { r: 205, g: 184, b: 158, a: 0.24 };
const LATE_NIGHT_INDOOR = { r: 150, g: 144, b: 175, a: 0.38 };

export function evaluateTimeOfDay(mode: TimeOfDayMode, now: Date = new Date()): TimeOfDayState {
  const hour =
    mode === 'auto'
      ? now.getHours() + now.getMinutes() / 60
      : MODE_FIXED_HOUR[mode];

  const domActivity = getDomActivityForHour(hour);
  const clockText = formatClock(hour);

  let period: TimePeriod;
  let skyColor: string;
  let outdoorTint: { r: number; g: number; b: number; a: number };
  let indoorTint: { r: number; g: number; b: number; a: number };
  let lightIntensity: number;
  let fireflyAlpha: number;
  let sunlightAlpha: number;

  if (hour >= 6 && hour < 7.5) {
    const t = (hour - 6) / 1.5;
    period = t < 0.5 ? 'sunset' : 'day';
    skyColor = lerpHex('#2b2838', '#5c839e', t);
    outdoorTint = lerpRgba(SUNSET_OUTDOOR, DAY_OUTDOOR, t);
    indoorTint = lerpRgba(SUNSET_INDOOR, DAY_INDOOR, t);
    lightIntensity = lerp(0.45, 0, t);
    fireflyAlpha = lerp(0.35, 0, t);
    sunlightAlpha = lerp(0.1, 0.55, t);
  } else if (hour >= 7.5 && hour < 16.5) {
    // Crisp clear daytime — zero hazy overlay, zero artificial night lamps
    period = 'day';
    skyColor = '#5b829c';
    outdoorTint = DAY_OUTDOOR;
    indoorTint = DAY_INDOOR;
    lightIntensity = 0;
    fireflyAlpha = 0;
    sunlightAlpha = 0.6;
  } else if (hour >= 16.5 && hour < 18.75) {
    const t = (hour - 16.5) / 2.25;
    period = 'sunset';
    if (t < 0.55) {
      const k = t / 0.55;
      skyColor = lerpHex('#5b829c', '#5e3c38', k);
      outdoorTint = lerpRgba(DAY_OUTDOOR, SUNSET_OUTDOOR, k);
      indoorTint = lerpRgba(DAY_INDOOR, SUNSET_INDOOR, k);
      lightIntensity = lerp(0, 0.48, k);
      fireflyAlpha = lerp(0, 0.3, k);
      sunlightAlpha = lerp(0.55, 0.15, k);
    } else {
      const k = (t - 0.55) / 0.45;
      skyColor = lerpHex('#5e3c38', '#1a1b24', k);
      outdoorTint = lerpRgba(SUNSET_OUTDOOR, NIGHT_OUTDOOR, k);
      indoorTint = lerpRgba(SUNSET_INDOOR, NIGHT_INDOOR, k);
      lightIntensity = lerp(0.48, 0.9, k);
      fireflyAlpha = lerp(0.3, 0.9, k);
      sunlightAlpha = lerp(0.15, 0, k);
    }
  } else if (hour >= 18.75 || hour < 2.5) {
    // Cozy Night Exhibition — atmospheric yet clear and readable
    period = 'night';
    skyColor = '#181a24';
    outdoorTint = NIGHT_OUTDOOR;
    indoorTint = NIGHT_INDOOR;
    lightIntensity = 1.0;
    fireflyAlpha = 1.0;
    sunlightAlpha = 0;
  } else {
    // Late night / early dawn (02:30 - 06:00) — Dom sleeping
    period = 'night';
    skyColor = '#121521';
    outdoorTint = LATE_NIGHT_OUTDOOR;
    indoorTint = LATE_NIGHT_INDOOR;
    lightIntensity = 0.95;
    fireflyAlpha = 0.85;
    sunlightAlpha = 0;
  }

  const labelMap: Record<TimeOfDayMode, LocalizedText> = {
    auto: { vi: `Tự động ${clockText}`, en: `Auto ${clockText}` },
    morning: { vi: 'Sáng 10:00', en: 'Day 10:00' },
    sunset: { vi: 'Chiều 17:30', en: 'Sunset 17:30' },
    night: { vi: 'Đêm 22:30', en: 'Night 22:30' },
    late_night: { vi: 'Khuya 04:00', en: 'Late 04:00' },
  };

  return {
    mode,
    hour,
    clockText,
    period,
    domActivity,
    skyColor,
    outdoorTint,
    indoorTint,
    lightIntensity,
    fireflyAlpha,
    sunlightAlpha,
    label: labelMap[mode],
  };
}
