import type { WeatherResponse } from '../types';
import { parseStationTimestamp } from './dataQuality';

export const HOUR_MS = 3_600_000;
export function getForecastWindow(data: WeatherResponse, count: number, nowMs = Date.now()): WeatherResponse | null {
  if (!Number.isInteger(count) || count < 1) return null;
  const firstHour = Math.floor(nowMs / HOUR_MS) * HOUR_MS;
  const start = data.hourly.time.findIndex(time => parseStationTimestamp(time) === firstHour);
  if (start < 0) return null;
  const times = data.hourly.time.slice(start, start + count);
  if (times.length !== count || !times.every((t, i) => parseStationTimestamp(t) === firstHour + i * HOUR_MS)) return null;
  const slice = (values: Array<number | null>) => Array.from({ length: count }, (_, i) => {
    const value = values[start + i];
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  });
  return { ...data, hourly: {
    time: times, temperature_2m: slice(data.hourly.temperature_2m),
    relative_humidity_2m: slice(data.hourly.relative_humidity_2m),
    precipitation: slice(data.hourly.precipitation), snowfall: slice(data.hourly.snowfall),
    weather_code: slice(data.hourly.weather_code), cloud_cover: slice(data.hourly.cloud_cover)
  } };
}
