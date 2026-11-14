import { Temporal } from '@js-temporal/polyfill';
import type { DataFreshness, StationData } from '../types';

export const FRESH_LIMIT_MS = 20 * 60_000;
export const EXPIRED_LIMIT_MS = 60 * 60_000;
export const FORECAST_MAX_AGE_MS = 30 * 60_000;

export function parseMeasurement(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  const text = value.trim().replace(',', '.');
  if (!/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/.test(text)) return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

/** Unix seconds/milliseconds, ISO with offset, or documented Rome local format.
 * Ambiguous/nonexistent local times at DST transitions are rejected, not guessed. */
export function parseStationTimestamp(value: unknown): number | null {
  try {
    if (typeof value === 'number' && Number.isFinite(value)) {
      const ms = value < 100_000_000_000 ? value * 1000 : value;
      Temporal.Instant.fromEpochMilliseconds(ms);
      return ms;
    }
    if (typeof value !== 'string') return null;
    const text = value.trim();
    if (/^\d{10}(?:\.\d+)?$|^\d{13}$/.test(text)) {
      return parseStationTimestamp(Number(text));
    }
    if (/T.*(?:Z|[+-]\d{2}:?\d{2})$/i.test(text)) {
      return Temporal.Instant.from(text).epochMilliseconds;
    }
    let iso = text.replace(' ', 'T');
    const italian = /^(\d{2})\/(\d{2})\/(\d{4})[ T](\d{2}:\d{2}(?::\d{2})?)$/.exec(text);
    if (italian) iso = `${italian[3]}-${italian[2]}-${italian[1]}T${italian[4]}`;
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/.test(iso)) return null;
    return Temporal.PlainDateTime.from(iso)
      .toZonedDateTime('Europe/Rome', { disambiguation: 'reject' })
      .epochMilliseconds;
  } catch { return null; }
}

export function classifyFreshness(hasData: boolean, observedAt: number | null, nowMs = Date.now()): DataFreshness {
  if (!hasData) return 'ABSENT';
  if (observedAt === null || !Number.isFinite(observedAt)) return 'UNKNOWN';
  const age = nowMs - observedAt;
  if (age < -120_000) return 'UNKNOWN';
  if (Math.max(0, age) <= FRESH_LIMIT_MS) return 'FRESH';
  return age <= EXPIRED_LIMIT_MS ? 'OLD' : 'EXPIRED';
}

export function stationFreshness(station: StationData | null, nowMs = Date.now()): DataFreshness {
  if (station?.meta?.source === 'DEMO') return 'FRESH';
  const hasData = !!station && [station.temp_med, station.hum_med, station.wind_speed, station.rain_rate]
    .some(value => parseMeasurement(value) !== null);
  return classifyFreshness(hasData, station?.meta?.observedAt ?? null, nowMs);
}

export function formatRomeTime(value: string | number | null, includeDate = true): string {
  if (value === null) return 'N/D';
  const ms = typeof value === 'number' ? value : parseStationTimestamp(value);
  if (ms === null || !Number.isFinite(ms)) return 'N/D';
  return new Intl.DateTimeFormat('it-IT', {
    timeZone: 'Europe/Rome', ...(includeDate ? { day: '2-digit', month: '2-digit' } : {}),
    hour: '2-digit', minute: '2-digit', timeZoneName: 'short'
  }).format(new Date(ms));
}

export function formatMeasurement(value: number | null | undefined, digits = 1): string {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(digits) : 'N/D';
}
