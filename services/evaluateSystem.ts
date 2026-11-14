import type { StationData, WeatherResponse, SystemStatus } from '../types';
import { analyzeRisk, unavailableStatus } from './weatherService';
import { parseMeasurement, stationFreshness, FORECAST_MAX_AGE_MS } from './dataQuality';
import { getForecastWindow } from './forecastWindow';

export function evaluateAutomatic(station: StationData | null, forecast: WeatherResponse | null, nowMs = Date.now()): SystemStatus {
  const freshness = stationFreshness(station, nowMs);
  if (freshness !== 'FRESH') return unavailableStatus(`Misura stazione: ${freshness}. Nessun esito SAFE dedotto dai dati mancanti.`);
  const temperature = parseMeasurement(station?.temp_med);
  if (temperature === null) return unavailableStatus('Temperatura attuale assente o non valida.');
  if (!forecast) return unavailableStatus('Previsioni assenti.');
  const age = nowMs - (forecast.fetchedAt ?? NaN);
  if (!forecast.isDemo && (!Number.isFinite(age) || age < -120_000 || age > FORECAST_MAX_AGE_MS)) {
    return unavailableStatus('Previsioni non aggiornate o data acquisizione sconosciuta.');
  }
  const window = getForecastWindow(forecast, 12, nowMs);
  if (!window) return unavailableStatus('Copertura previsionale continua insufficiente: servono 12 ore dall’ora corrente.');
  return analyzeRisk(temperature, window.hourly.weather_code, window.hourly.snowfall, window.hourly.time);
}
