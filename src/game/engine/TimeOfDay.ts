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
  /** RGB + alpha for outdoor lightmap darkness */
  outdoorTint: { r: number; g: number; b: number; a: number };
  /** Warm cozy indoor lightmap tint (much brighter than outdoor at night) */
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

const DAY_OUTDOOR = { r: 255, g: 244, b: 214, a: 0.04 };
const SUNSET_OUTDOOR = { r: 214, g: 102, b: 56, a: 0.34 };
const NIGHT_OUTDOOR = { r: 12, g: 14, b: 28, a: 0.68 };
const LATE_NIGHT_OUTDOOR = { r: 8, g: 10, b: 24, a: 0.76 };

const DAY_INDOOR = { r: 255, g: 240, b: 210, a: 0.02 };
const SUNSET_INDOOR = { r: 140, g: 82, b: 52, a: 0.12 };
const NIGHT_INDOOR = { r: 24, g: 18, b: 14, a: 0.24 };
const LATE_NIGHT_INDOOR = { r: 16, g: 14, b: 22, a: 0.38 };

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
    // Dawn transition: night -> day
    const t = (hour - 6) / 1.5;
    period = t < 0.5 ? 'sunset' : 'day';
    skyColor = lerpHex('#1c1b29', '#3d586e', t);
    outdoorTint = lerpRgba(SUNSET_OUTDOOR, DAY_OUTDOOR, t);
    indoorTint = lerpRgba(SUNSET_INDOOR, DAY_INDOOR, t);
    lightIntensity = lerp(0.55, 0.05, t);
    fireflyAlpha = lerp(0.4, 0, t);
    sunlightAlpha = lerp(0.15, 0.65, t);
  } else if (hour >= 7.5 && hour < 16.5) {
    // Bright cozy daytime
    period = 'day';
    skyColor = '#3a5468';
    outdoorTint = DAY_OUTDOOR;
    indoorTint = DAY_INDOOR;
    lightIntensity = 0.06;
    fireflyAlpha = 0;
    sunlightAlpha = 0.7;
  } else if (hour >= 16.5 && hour < 18.75) {
    // Golden hour sunset -> dusk
    const t = (hour - 16.5) / 2.25;
    period = 'sunset';
    if (t < 0.55) {
      const k = t / 0.55;
      skyColor = lerpHex('#3a5468', '#4a2e2b', k);
      outdoorTint = lerpRgba(DAY_OUTDOOR, SUNSET_OUTDOOR, k);
      indoorTint = lerpRgba(DAY_INDOOR, SUNSET_INDOOR, k);
      lightIntensity = lerp(0.1, 0.55, k);
      fireflyAlpha = lerp(0, 0.35, k);
      sunlightAlpha = lerp(0.65, 0.25, k);
    } else {
      const k = (t - 0.55) / 0.45;
      skyColor = lerpHex('#4a2e2b', '#131211', k);
      outdoorTint = lerpRgba(SUNSET_OUTDOOR, NIGHT_OUTDOOR, k);
      indoorTint = lerpRgba(SUNSET_INDOOR, NIGHT_INDOOR, k);
      lightIntensity = lerp(0.55, 0.95, k);
      fireflyAlpha = lerp(0.35, 0.9, k);
      sunlightAlpha = lerp(0.25, 0, k);
    }
  } else if (hour >= 18.75 || hour < 2.5) {
    // Cozy Night Exhibition
    period = 'night';
    skyColor = '#131211';
    outdoorTint = NIGHT_OUTDOOR;
    indoorTint = NIGHT_INDOOR;
    lightIntensity = 1.0;
    fireflyAlpha = 1.0;
    sunlightAlpha = 0;
  } else {
    // Late night / early dawn (02:30 - 06:00) — Dom is sleeping
    period = 'night';
    skyColor = '#0d0e16';
    outdoorTint = LATE_NIGHT_OUTDOOR;
    indoorTint = LATE_NIGHT_INDOOR;
    lightIntensity = 0.92;
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
