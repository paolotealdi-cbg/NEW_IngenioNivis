
export interface HourlyForecast {
  time: string[];
  temperature_2m: Array<number | null>;
  relative_humidity_2m: Array<number | null>;
  precipitation: Array<number | null>;
  snowfall: Array<number | null>;
  weather_code: Array<number | null>;
  cloud_cover: Array<number | null>;
}

export interface DailyForecast {
  sunrise: string[];
  sunset: string[];
}

export interface WeatherResponse {
  fetchedAt?: number;
  isDemo?: boolean;
  latitude: number;
  longitude: number;
  hourly: HourlyForecast;
  daily: DailyForecast;
  hourly_units: {
    temperature_2m: string;
    snowfall: string;
    precipitation: string;
  };
}

export interface StationHistoryPoint {
  observedAt?: number | null;
  time: string;
  temp: number | null;
  hum: number | null;
  rain: number | null;
}

export interface WindHistoryEntry {
  observedAt?: number | null;
  time: string;
  speedKmh: number | null;
  dirDeg: number | null;
  dirText: string;
}

export type DataSource = 'NETWORK' | 'CACHE' | 'DEMO';
export type ServiceConnection = 'UNKNOWN' | 'OK' | 'ERROR';
export type DataFreshness = 'FRESH' | 'OLD' | 'EXPIRED' | 'UNKNOWN' | 'ABSENT';
export interface StationMeta {
  source: DataSource;
  observedAt: number | null;
  downloadedAt: number;
  lastAttemptAt: number | null;
  lastSuccessAt: number | null;
  connection: ServiceConnection;
  missingFields: string[];
  error: string | null;
}

export interface StationData {
  meta?: StationMeta;
  ts: string;
  temp_med: string;
  hum_med: string; // derived from rh
  wind_speed: string; // derived from wes
  wind_dir?: string; // derived from wed_med_direzione
  pressure?: string;
  rain_rate: string; // prp
  
  // 24h Statistics
  tempMin24h?: string;
  tempMax24h?: string;
  rain24h?: string;
  windMax24h?: string;

  // Historical Data Arrays
  history: StationHistoryPoint[];        // Temp, Hum, Rain
  windHistory: WindHistoryEntry[];       // Independent Wind Data
  
  // DEBUG RAW DATA
  rawWindHistory?: any[]; 
}

export enum AlertLevel {
  SAFE = 'SAFE',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL', // Heating ON (Auto)
  MANUAL_ON = 'MANUAL_ON', // Heating Forced ON
  MANUAL_OFF = 'MANUAL_OFF' // Heating Forced OFF
}

export interface SystemStatus {
  evaluationAvailable?: boolean;
  alertLevel: AlertLevel;
  heatingOn: boolean;
  message: string;
  detailedReason?: string; // Explanation of why
  predictedShutOff?: string | null; // When will it stop?
  heatingSince?: Date | null; // When did it start?
  source: 'AUTO' | 'MANUAL';
}

export type SimulationScenario = 'REAL' | 'SNOW_STORM' | 'FREEZING_RAIN' | 'CLEAR_COLD' | 'HEATING_CYCLE_TEST';

export interface LogEntry {
  id: string;
  timestamp: Date;
  message: string;
  type: 'INFO' | 'ALERT' | 'ACTION';
}
