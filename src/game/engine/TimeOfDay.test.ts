import { describe, expect, it } from 'vitest';
import { evaluateTimeOfDay, getDomActivityForHour } from './TimeOfDay';

describe('TimeOfDay', () => {
  it('maps Dom daily schedule accurately across all 24 hours', () => {
    expect(getDomActivityForHour(3)).toBe('sleep');
    expect(getDomActivityForHour(6.5)).toBe('sleep');
    expect(getDomActivityForHour(8.9)).toBe('sleep');

    expect(getDomActivityForHour(9)).toBe('work');
    expect(getDomActivityForHour(13.5)).toBe('work');
    expect(getDomActivityForHour(16.9)).toBe('work');

    expect(getDomActivityForHour(17)).toBe('gaming');
    expect(getDomActivityForHour(23)).toBe('gaming');
    expect(getDomActivityForHour(2.5)).toBe('gaming');
  });

  it('produces distinct lighting moods and indoor/outdoor split across presets', () => {
    const morning = evaluateTimeOfDay('morning');
    const sunset = evaluateTimeOfDay('sunset');
    const night = evaluateTimeOfDay('night');
    const lateNight = evaluateTimeOfDay('late_night');

    expect(morning.period).toBe('day');
    expect(morning.domActivity).toBe('work');
    expect(morning.sunlightAlpha).toBeGreaterThan(0.5);
    expect(morning.lightIntensity).toBeLessThan(0.15);

    expect(sunset.period).toBe('sunset');
    expect(sunset.domActivity).toBe('gaming');
    expect(sunset.lightIntensity).toBeGreaterThan(0.3);

    expect(night.period).toBe('night');
    expect(night.domActivity).toBe('gaming');
    expect(night.outdoorTint.a).toBeGreaterThan(night.indoorTint.a);
    expect(night.fireflyAlpha).toBeGreaterThan(0.8);

    expect(lateNight.period).toBe('night');
    expect(lateNight.domActivity).toBe('sleep');
    expect(lateNight.clockText).toBe('04:00');
  });

  it('uses local real time in auto mode', () => {
    const customDate = new Date(2026, 5, 1, 14, 30, 0);
    const state = evaluateTimeOfDay('auto', customDate);
    expect(state.clockText).toBe('14:30');
    expect(state.period).toBe('day');
    expect(state.domActivity).toBe('work');
  });
});
