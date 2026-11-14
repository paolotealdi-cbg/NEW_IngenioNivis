
import { AlertLevel, WeatherResponse, StationData, StationHistoryPoint, WindHistoryEntry } from "./types";

// Location: Busca (Parco Museo dell'Ingenio) - From PDF Page 9
export const LATITUDE = 44.512;
export const LONGITUDE = 7.47181;
export const ALTITUDE = 510; // Meters

// WMO Weather Codes (Mapping from PDF Page 6 & 7)
export const WMO_CODES: Record<number, { label: string; risk: AlertLevel }> = {
  0: { label: "Cielo sereno", risk: AlertLevel.SAFE },
  1: { label: "Poco nuvoloso", risk: AlertLevel.SAFE },
  2: { label: "Parzialmente nuvoloso", risk: AlertLevel.SAFE },
  3: { label: "Coperto", risk: AlertLevel.SAFE },
  45: { label: "Nebbia", risk: AlertLevel.WARNING },
  48: { label: "Nebbia con brina", risk: AlertLevel.WARNING },
  51: { label: "Pioviggine leggera", risk: AlertLevel.SAFE },
  53: { label: "Pioviggine moderata", risk: AlertLevel.SAFE },
  55: { label: "Pioviggine densa", risk: AlertLevel.SAFE },
  56: { label: "Pioviggine gelata leggera", risk: AlertLevel.WARNING },
  57: { label: "Pioviggine gelata densa", risk: AlertLevel.CRITICAL },
  61: { label: "Pioggia leggera", risk: AlertLevel.SAFE },
  63: { label: "Pioggia moderata", risk: AlertLevel.SAFE },
  65: { label: "Pioggia forte", risk: AlertLevel.SAFE },
  66: { label: "Pioggia gelata leggera", risk: AlertLevel.CRITICAL },
  67: { label: "Pioggia gelata forte", risk: AlertLevel.CRITICAL },
  71: { label: "Nevicata leggera", risk: AlertLevel.CRITICAL },
  73: { label: "Nevicata moderata", risk: AlertLevel.CRITICAL },
  75: { label: "Nevicata forte", risk: AlertLevel.CRITICAL },
  77: { label: "Granelli di neve", risk: AlertLevel.WARNING },
  80: { label: "Rovesci di pioggia lievi", risk: AlertLevel.SAFE },
  81: { label: "Rovesci di pioggia moderati", risk: AlertLevel.SAFE },
  82: { label: "Rovesci di pioggia forti", risk: AlertLevel.SAFE },
  85: { label: "Rovesci di neve lievi", risk: AlertLevel.CRITICAL },
  86: { label: "Rovesci di neve forti", risk: AlertLevel.CRITICAL },
  95: { label: "Temporale", risk: AlertLevel.WARNING },
  96: { label: "Temporale con grandine leggera", risk: AlertLevel.WARNING },
  99: { label: "Temporale con grandine forte", risk: AlertLevel.WARNING },
};

// --- MOCK DATA SCENARIOS FOR DEMO MODE ---

const generateHourly = (temp: number, snow: number, code: number) => {
  return Array(24).fill(0).map(() => ({ temp, snow, code }));
};

const createMockResponse = (temps: number[], snows: number[], codes: number[]): WeatherResponse => ({
  latitude: LATITUDE,
  longitude: LONGITUDE,
  hourly_units: { temperature_2m: "°C", snowfall: "cm", precipitation: "mm" },
  daily: {
    sunrise: [new Date(new Date().setHours(7, 30, 0, 0)).toISOString()],
    sunset: [new Date(new Date().setHours(18, 45, 0, 0)).toISOString()]
  },
  hourly: {
    time: Array.from({ length: 24 }, (_, i) => {
      const d = new Date();
      d.setHours(d.getHours() + i);
      d.setMinutes(0, 0, 0);
      return d.toISOString();
    }),
    temperature_2m: temps,
    snowfall: snows,
    precipitation: snows.map(s => s * 1.5),
    weather_code: codes,
    relative_humidity_2m: Array(24).fill(90),
    cloud_cover: Array(24).fill(100)
  }
});

const generateMockHistory = (baseTemp: number, trend: 'stable' | 'dropping' | 'rising'): StationHistoryPoint[] => {
  return Array.from({ length: 24 }, (_, i) => {
    const d = new Date();
    d.setHours(d.getHours() - (24 - i));
    
    let t = baseTemp;
    if (trend === 'dropping') t = baseTemp + (24 - i) * 0.2;
    if (trend === 'rising') t = baseTemp - (24 - i) * 0.2;
    
    return {
      time: d.getHours().toString().padStart(2, '0') + ':00',
      temp: parseFloat((t + Math.random() * 0.5).toFixed(1)),
      hum: 80 + Math.random() * 20,
      rain: trend === 'stable' ? 0 : Math.random() * 2,
    };
  });
};

const generateMockWindHistory = (baseSpeed: number, dirStr: string): WindHistoryEntry[] => {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const baseDirIndex = directions.indexOf(dirStr);
  const baseDeg = baseDirIndex * 45;

  return Array.from({ length: 24 }, (_, i) => {
    const d = new Date();
    d.setHours(d.getHours() - (24 - i));
    
    return {
      time: d.getHours().toString().padStart(2, '0') + ':00',
      speedKmh: parseFloat((baseSpeed + Math.random() * 5).toFixed(1)),
      dirDeg: (baseDeg + Math.random() * 20 - 10 + 360) % 360,
      dirText: dirStr 
    };
  });
};

export const MOCK_SCENARIOS = {
  REAL: null,
  
  SNOW_STORM: {
    station: {
      ts: "SIMULAZIONE",
      temp_med: "-1.5",
      hum_med: "98",
      wind_speed: "15.1",
      wind_dir: "NE",
      rain_rate: "0",
      tempMin24h: "-2.5",
      tempMax24h: "1.0",
      rain24h: "12.4",
      windMax24h: "25.0",
      history: generateMockHistory(-1.5, 'dropping'),
      windHistory: generateMockWindHistory(15, 'NE')
    } as StationData,
    forecast: createMockResponse(
      Array(24).fill(-2.0),
      Array(24).fill(3.5), 
      Array(24).fill(75) 
    )
  },

  FREEZING_RAIN: {
    station: {
      ts: "SIMULAZIONE",
      temp_med: "-0.5",
      hum_med: "99",
      wind_speed: "4.3",
      wind_dir: "N",
      rain_rate: "2.0",
      tempMin24h: "-1.0",
      tempMax24h: "2.0",
      rain24h: "15.0",
      windMax24h: "12.0",
      history: generateMockHistory(-0.5, 'dropping'),
      windHistory: generateMockWindHistory(4, 'N')
    } as StationData,
    forecast: createMockResponse(
      Array(24).fill(-1.0),
      Array(24).fill(0),
      Array(24).fill(67)
    )
  },

  CLEAR_COLD: {
    station: {
      ts: "SIMULAZIONE",
      temp_med: "-5.0",
      hum_med: "40",
      wind_speed: "7.2",
      wind_dir: "NW",
      rain_rate: "0",
      tempMin24h: "-8.0",
      tempMax24h: "-2.0",
      rain24h: "0.0",
      windMax24h: "15.0",
      history: generateMockHistory(-5.0, 'stable'),
      windHistory: generateMockWindHistory(7, 'NW')
    } as StationData,
    forecast: createMockResponse(
      Array(24).fill(-6.0),
      Array(24).fill(0),
      Array(24).fill(0)
    )
  },

  HEATING_CYCLE_TEST: {
    station: {
      ts: "SIMULAZIONE",
      temp_med: "0.5",
      hum_med: "95",
      wind_speed: "10.0",
      wind_dir: "N",
      rain_rate: "1.0",
      tempMin24h: "-1.0",
      tempMax24h: "3.0",
      rain24h: "5.0",
      windMax24h: "18.0",
      history: generateMockHistory(0.5, 'dropping'),
      windHistory: generateMockWindHistory(10, 'N')
    } as StationData,
    forecast: createMockResponse(
      [-1, -1, -1, 0, 1, 4, 5, 6, 6, 5, 4, 3, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [2.5, 3.0, 2.0, 1.0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [75, 75, 73, 71, 3, 3, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    )
  }
};
