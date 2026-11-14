// Artificial test fixtures only; never measurements or operational weather data.
import type { WeatherResponse } from '../types';
export const NOW = Date.parse('2026-10-22T15:23:00Z'); // 17:23 Europe/Rome.
export const HOUR = 3_600_000;
export const stationPayload = (observedAt = NOW - 5 * 60_000, overrides: Record<string, unknown> = {}) => ({
  result_misure: { ts: new Date(observedAt).toISOString(), temp_med: '5.2', rh: '78',
    wes_med: '3.1', wed_med_direzione: 'NE', prp: '0', ...overrides },
  array_misure_24h: [[0, new Date(observedAt).toISOString(), '78', '0', null, '5.2']],
  array_misurev_24h: [[0, new Date(observedAt).toISOString(), '45', '2']]
});
export const forecastPayload = (now = NOW, startHourOffset = 0) => {
  const start = Math.floor(now / HOUR) * HOUR + startHourOffset * HOUR;
  return { latitude: 44.5, longitude: 7.5, hourly: {
    time: Array.from({length: 48}, (_, i) => (start + i * HOUR) / 1000),
    temperature_2m_meteoswiss_icon_ch1: Array(48).fill(5),
    relative_humidity_2m_meteoswiss_icon_ch1: Array(48).fill(80),
    rain_meteoswiss_icon_ch1: Array(48).fill(0),
    snowfall_meteoswiss_icon_ch1: Array(48).fill(0),
    weather_code_meteoswiss_icon_ch1: Array(48).fill(0),
    cloud_cover_meteoswiss_icon_ch1: Array(48).fill(30)
  }};
};
export const normalizedForecast = (now = NOW, startHourOffset = 0): WeatherResponse => {
  const start = Math.floor(now / HOUR) * HOUR + startHourOffset * HOUR;
  return { latitude: 44.5, longitude: 7.5, fetchedAt: now,
    daily: { sunrise: [], sunset: [] }, hourly_units: { temperature_2m: '°C', snowfall: 'cm', precipitation: 'mm' },
    hourly: { time: Array.from({length:48}, (_, i) => new Date(start + i * HOUR).toISOString()),
      temperature_2m: Array(48).fill(5), relative_humidity_2m: Array(48).fill(80),
      precipitation: Array(48).fill(0), snowfall: Array(48).fill(0), weather_code: Array(48).fill(0), cloud_cover: Array(48).fill(30) }
  };
};
