import { LATITUDE, LONGITUDE, WMO_CODES, MOCK_SCENARIOS } from "../constants";
import { StationData, WeatherResponse, AlertLevel, SystemStatus, SimulationScenario, StationHistoryPoint, WindHistoryEntry, StationMeta } from "../types";
import { parseMeasurement, parseStationTimestamp, formatRomeTime } from './dataQuality';

export const STATION_CACHE_KEY = 'ingenio.station.v2';
const CACHE_INTERVAL_MS = 10 * 60_000;
const CACHE_RETENTION_MS = 24 * 60 * 60_000;
let lastAttemptAt: number | null = null;
let lastSuccessAt: number | null = null;
let lastConnection: StationMeta['connection'] = 'UNKNOWN';
let lastError: string | null = null;
let inFlightStation: Promise<StationData> | null = null;
export class StationFetchError extends Error {
  meta: Pick<StationMeta, 'lastAttemptAt' | 'lastSuccessAt' | 'connection' | 'error'>;
  constructor(message: string) {
    super(message);
    this.meta = { lastAttemptAt, lastSuccessAt, connection: lastConnection, error: message };
  }
}
export function resetStationSessionForTests() {
  lastAttemptAt = lastSuccessAt = null;
  lastConnection = 'UNKNOWN'; lastError = null; inFlightStation = null;
}

export const fetchForecast = async (scenario: SimulationScenario = 'REAL'): Promise<WeatherResponse> => {
  const now = Date.now();
  if (scenario !== 'REAL' && MOCK_SCENARIOS[scenario]) {
    const template = MOCK_SCENARIOS[scenario]!.forecast;
    return { ...template, fetchedAt: now, isDemo: true, hourly: { ...template.hourly,
      time: template.hourly.time.map((_, i) => new Date(Math.floor(now / 3_600_000) * 3_600_000 + i * 3_600_000).toISOString())
    }};
  }
  const paramsMeteo = new URLSearchParams({
    latitude: String(LATITUDE), longitude: String(LONGITUDE),
    hourly: 'temperature_2m,rain,relative_humidity_2m,snowfall,weather_code,cloud_cover',
    models: 'meteoswiss_icon_ch1,meteoswiss_icon_ch2',
    forecast_hours: '48', timezone: 'Europe/Rome', timeformat: 'unixtime'
  });
  const paramsAstro = new URLSearchParams({
    latitude: String(LATITUDE), longitude: String(LONGITUDE), daily: 'sunrise,sunset',
    timezone: 'Europe/Rome', forecast_days: '1', timeformat: 'unixtime'
  });
  const request = async (params: URLSearchParams) => {
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`);
    return res.json();
  };
  // Astronomy failure must not invalidate otherwise usable weather data.
  const [meteo, astro] = await Promise.allSettled([request(paramsMeteo), request(paramsAstro)]);
  if (meteo.status === 'rejected') throw meteo.reason;
  const result = normalizeForecast(meteo.value);
  result.fetchedAt = Date.now();
  if (astro.status === 'fulfilled') {
    const convert = (values: unknown) => Array.isArray(values) ? values.filter(v => typeof v === 'number' && Number.isFinite(v)).map(v => new Date(v * 1000).toISOString()) : [];
    result.daily = { sunrise: convert(astro.value.daily?.sunrise), sunset: convert(astro.value.daily?.sunset) };
  }
  return result;
};

export function normalizeForecast(json: any): WeatherResponse {
  const hourly = json.hourly || {};
  const models = ['meteoswiss_icon_ch1', 'meteoswiss_icon_ch2'];
  const times = hourly.time ?? hourly.time_meteoswiss_icon_ch1 ?? hourly.time_meteoswiss_icon_ch2;
  if (!Array.isArray(times) || !times.length || !times.every(t => typeof t === 'number' && Number.isFinite(t))) {
    throw new Error('Orari previsionali Unix assenti o non validi.');
  }
  const mapped: any = { time: times.map(t => new Date(t * 1000).toISOString()) };
  for (const key of ['temperature_2m', 'relative_humidity_2m', 'rain', 'snowfall', 'weather_code', 'cloud_cover']) {
    const arrays = [hourly[key], ...models.map(model => hourly[`${key}_${model}`])];
    mapped[key] = times.map((_, i) => {
      for (const array of arrays) {
        const v = Array.isArray(array) ? array[i] : null;
        if (typeof v === 'number' && Number.isFinite(v) &&
            (!(key === 'snowfall' || key === 'rain') || v >= 0) &&
            (!(key === 'relative_humidity_2m' || key === 'cloud_cover') || (v >= 0 && v <= 100))) return v;
      }
      return null;
    });
  }
  mapped.precipitation = mapped.rain;
  return { latitude: json.latitude, longitude: json.longitude, hourly: mapped,
    daily: { sunrise: [], sunset: [] }, hourly_units: { temperature_2m: '°C', snowfall: 'cm', precipitation: 'mm' } };
}

const findKeyRecursively = (obj: any, name: string): any => {
  if (!obj || typeof obj !== 'object') return undefined;
  if (Object.prototype.hasOwnProperty.call(obj, name)) return obj[name];
  for (const child of Object.values(obj)) {
    const found = findKeyRecursively(child, name);
    if (found !== undefined) return found;
  }
};
const direction = (degrees: number | null) => degrees === null ? 'N/D' : ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(((degrees % 360 + 360) % 360) / 45) % 8];
const measure = (value: unknown, min = -Infinity, max = Infinity): number | null => {
  const n = parseMeasurement(value);
  return n !== null && n >= min && n <= max ? n : null;
};

export function normalizeStationData(raw: any): StationData {
  if (!raw || typeof raw !== 'object' || raw.error) throw new Error('Risposta stazione non valida.');
  const stats = findKeyRecursively(raw, 'result_misure');
  if (!stats || typeof stats !== 'object' || Array.isArray(stats) ||
      !['temp_med', 'rh', 'wes_med', 'prp'].some(key => Object.prototype.hasOwnProperty.call(stats, key))) {
    throw new Error('Struttura delle misure stazione non riconosciuta.');
  }
  const current = {
    temp_med: measure(stats.temp_med, -80, 70), hum_med: measure(stats.rh, 0, 100),
    wind_speed: measure(stats.wes_med, 0), rain_rate: measure(stats.prp, 0)
  };
  const fmt = (value: number | null) => value === null ? 'N/D' : String(value);
  const history: StationHistoryPoint[] = [];
  const rows = findKeyRecursively(raw, 'array_misure_24h');
  if (Array.isArray(rows)) for (const row of rows) {
    if (!Array.isArray(row) || row.length < 6) continue;
    const observedAt = parseStationTimestamp(row[1]);
    history.push({ observedAt, time: observedAt === null ? String(row[1] ?? 'N/D') : formatRomeTime(observedAt),
      hum: measure(row[2], 0, 100), rain: measure(row[3], 0), temp: measure(row[5], -80, 70) });
  }
  const windHistory: WindHistoryEntry[] = [];
  const rawWind = findKeyRecursively(raw, 'array_misurev_24h');
  for (const row of Array.isArray(rawWind) ? rawWind : Object.values(rawWind || {})) {
    if (!Array.isArray(row) || row.length < 4) continue;
    const observedAt = parseStationTimestamp(row[1]);
    const degrees = measure(row[2], 0, 360), speed = measure(row[3], 0);
    windHistory.push({ observedAt, time: observedAt === null ? String(row[1] ?? 'N/D') : formatRomeTime(observedAt),
      dirDeg: degrees, dirText: direction(degrees), speedKmh: speed === null ? null : speed * 3.6 });
  }
  const sort = (a: { observedAt?: number | null }, b: { observedAt?: number | null }) =>
    (a.observedAt ?? Infinity) - (b.observedAt ?? Infinity);
  history.sort(sort); windHistory.sort(sort);
  return { ts: String(stats.ts ?? 'N/D'), ...Object.fromEntries(Object.entries(current).map(([k,v]) => [k,fmt(v)])),
    wind_dir: typeof stats.wed_med_direzione === 'string' && stats.wed_med_direzione.trim() ? stats.wed_med_direzione : direction(measure(stats.wed_med, 0, 360)),
    tempMin24h: fmt(measure(stats.tmin_24h)), tempMax24h: fmt(measure(stats.tmax_24h)),
    rain24h: fmt(measure(stats.prp_24h, 0)), windMax24h: fmt(measure(stats.wes_max_24h, 0)),
    history, windHistory, rawWindHistory: Array.isArray(rawWind) ? rawWind : undefined
  } as StationData;
}

function readCache(): { raw: any; downloadedAt: number } | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(STATION_CACHE_KEY) || 'null');
    const age = Date.now() - parsed?.downloadedAt;
    if (parsed?.version !== 2 || !Number.isFinite(parsed.downloadedAt) || age < 0 || age > CACHE_RETENTION_MS) return null;
    normalizeStationData(parsed.raw);
    return parsed;
  } catch { return null; }
}
async function loadStation(force = false): Promise<StationData> {
  const cached = readCache();
  let raw = cached?.raw, downloadedAt = cached?.downloadedAt ?? Date.now();
  let source: StationMeta['source'] = 'CACHE';
  if (force || !cached || Date.now() - cached.downloadedAt >= CACHE_INTERVAL_MS) {
    lastAttemptAt = Date.now();
    try {
      const res = await fetch('/api/station', { cache: 'no-store', signal: AbortSignal.timeout(25_000) });
      if (!res.ok) throw new Error(`Servizio stazione HTTP ${res.status}`);
      if (!(res.headers.get('content-type') || '').includes('application/json')) throw new Error('Risposta non JSON.');
      const candidate = await res.json();
      normalizeStationData(candidate); // Never poison the cache with invalid payloads.
      raw = candidate; downloadedAt = Date.now(); source = 'NETWORK';
      lastSuccessAt = downloadedAt; lastConnection = 'OK'; lastError = null;
      try { localStorage.setItem(STATION_CACHE_KEY, JSON.stringify({ version: 2, raw, downloadedAt })); } catch {}
    } catch (error) {
      lastConnection = 'ERROR';
      lastError = error instanceof Error ? error.message : 'Acquisizione fallita.';
      if (!cached) throw new StationFetchError(lastError);
    }
  }
  const data = normalizeStationData(raw);
  data.meta = { source, downloadedAt, observedAt: parseStationTimestamp(data.ts),
    lastAttemptAt, lastSuccessAt, connection: lastConnection, error: lastError,
    missingFields: ['temp_med','hum_med','wind_speed','rain_rate'].filter(key => parseMeasurement(data[key as keyof StationData]) === null)
  };
  return data;
}
export async function fetchStationData(scenario: SimulationScenario = 'REAL', force = false): Promise<StationData> {
  if (scenario !== 'REAL' && MOCK_SCENARIOS[scenario]) {
    const data = MOCK_SCENARIOS[scenario]!.station;
    return { ...data, meta: { source: 'DEMO', observedAt: Date.now(), downloadedAt: Date.now(),
      lastAttemptAt: null, lastSuccessAt: null, connection: 'UNKNOWN', missingFields: [], error: null } };
  }
  if (!inFlightStation) inFlightStation = loadStation(force).finally(() => { inFlightStation = null; });
  return inFlightStation;
}
export function unavailableStatus(reason: string): SystemStatus {
  return { evaluationAvailable: false, alertLevel: AlertLevel.WARNING, heatingOn: false,
    message: 'Valutazione automatica non disponibile', detailedReason: reason, source: 'AUTO' };
}

export const analyzeRisk = (
  currentTemp: number,
  next12HoursCodes: Array<number | null>,
  next12HoursSnow: Array<number | null>,
  next12HoursTime: string[]
): SystemStatus => {
  if (!Number.isFinite(currentTemp) || next12HoursCodes.length !== 12 ||
      next12HoursSnow.length !== 12 || next12HoursTime.length !== 12 ||
      next12HoursCodes.some(code => typeof code !== 'number' || !WMO_CODES[code]) ||
      next12HoursSnow.some(snow => typeof snow !== 'number' || !Number.isFinite(snow) || snow < 0) ||
      next12HoursTime.some((time, i) => {
        const ms = parseStationTimestamp(time);
        return ms === null || (i > 0 && ms - parseStationTimestamp(next12HoursTime[i - 1])! !== 3_600_000);
      })) return unavailableStatus('Previsioni incomplete, non continue o codici WMO sconosciuti.');
  let lastHazard = -1;
  for (let i = 0; i < next12HoursCodes.length; i++) {
    if (WMO_CODES[next12HoursCodes[i]!]?.risk === AlertLevel.CRITICAL || next12HoursSnow[i]! >= 0.1) lastHazard = i;
  }
  let activationReason = "";
  let predictedShutOff: string | null = null;
  let heatingOn = false;
  let alertLevel = AlertLevel.SAFE;
  let message = "Nessun rischio rilevato. Sistema in standby.";

  for (let i = 0; i < next12HoursCodes.length; i++) {
    const code = next12HoursCodes[i];
    const snowAmount = next12HoursSnow[i];
    const risk = WMO_CODES[code]?.risk;
    const hourStr = formatRomeTime(next12HoursTime[i]);

    if (risk === AlertLevel.CRITICAL) {
      heatingOn = true;
      alertLevel = AlertLevel.CRITICAL;
      message = "ALLERTA NEVE";
      activationReason = `Rilevato codice WMO critico <b>${code} (${WMO_CODES[code].label})</b> previsto alle ore <b>${hourStr}</b>.`;
      break;
    }

    if (snowAmount > 0.5 && currentTemp < 3.0) {
      heatingOn = true;
      alertLevel = AlertLevel.CRITICAL;
      message = "ALLERTA ACCUMULO";
      activationReason = `Previsto accumulo neve <b>${snowAmount}cm</b> alle ore <b>${hourStr}</b> con temperatura attuale <b>${currentTemp}°C</b> (< 3°C).`;
      break;
    }
  }

  if (heatingOn) {
    let safeIndex = -1;
    // Require two confirmed safe hours after the last hazardous hour.
    for (let i = lastHazard + 1; i + 1 < next12HoursCodes.length; i++) {
      if (WMO_CODES[next12HoursCodes[i]!]?.risk !== AlertLevel.CRITICAL && next12HoursSnow[i]! < 0.1 &&
          WMO_CODES[next12HoursCodes[i + 1]!]?.risk !== AlertLevel.CRITICAL && next12HoursSnow[i + 1]! < 0.1) {
        safeIndex = i;
        break;
      }
    }

    if (safeIndex !== -1) {
      predictedShutOff = formatRomeTime(next12HoursTime[safeIndex]);
    } else {
      predictedShutOff = "Non prevista nelle prossime 12 ore";
    }
  }

  if (!heatingOn) {
    if (currentTemp < 2.0 && currentTemp > -2.0) {
      alertLevel = AlertLevel.WARNING;
      message = "PRE-ALLERTA 0°C";
      activationReason = `Temperatura attuale <b>${currentTemp}°C</b> in zona critica (-2/+2°C). Monitoraggio precipitazioni attivo.`;
    } else {
      activationReason = `Condizioni meteo stabili. Nessuna nevicata prevista.`;
    }
  }

  return {
    evaluationAvailable: true,
    alertLevel,
    heatingOn,
    message: heatingOn ? `${message}: Attivazione riscaldamento.` : message,
    source: 'AUTO',
    detailedReason: activationReason,
    predictedShutOff
  };
};
