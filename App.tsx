
import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import SystemAlert from './components/SystemAlert';
import StationCard from './components/StationCard';
import StationHistory from './components/StationHistory';
import StationWindHistory from './components/StationWindHistory';
import WebcamCard from './components/WebcamCard';
import LocationInfo from './components/LocationInfo';
import SatelliteCard from './components/SatelliteCard';
import ForecastCharts from './components/ForecastCharts';
import ForecastTable from './components/ForecastTable';
import EventLog from './components/EventLog';
import LogicModal from './components/LogicModal';
import { fetchForecast, fetchStationData, StationFetchError } from './services/weatherService';
import { StationData, WeatherResponse, SystemStatus, AlertLevel, SimulationScenario, LogEntry } from './types';
import { evaluateAutomatic } from './services/evaluateSystem';
import { getForecastWindow } from './services/forecastWindow';
import { stationFreshness, FORECAST_MAX_AGE_MS } from './services/dataQuality';
import type { ServiceConnection } from './types';
import { Beaker, Lock, Unlock, RefreshCw, CloudSun } from 'lucide-react';

const App: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [stationConnection, setStationConnection] = useState<ServiceConnection>('UNKNOWN');
  const [stationAttemptAt, setStationAttemptAt] = useState<number | null>(null);
  const [stationError, setStationError] = useState<string | null>(null);
  const [forecastError, setForecastError] = useState<string | null>(null);
  const requestId = useRef(0);
  const refreshPending = useRef(false);
  const [stationData, setStationData] = useState<StationData | null>(null);
  const [weatherForecast, setWeatherForecast] = useState<WeatherResponse | null>(null);
  const [scenario, setScenario] = useState<SimulationScenario>('REAL');
  const [manualOverride, setManualOverride] = useState<'ON' | 'OFF' | null>(null);
  const [showLogicModal, setShowLogicModal] = useState(false);
  
  // Track when heating started
  const heatingStartTimeRef = useRef<Date | null>(null);


  // Logs
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const addLog = useCallback((message: string, type: 'INFO' | 'ALERT' | 'ACTION') => {
    setLogs(prev => [{
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      message,
      type
    }, ...prev].slice(0, 200));
  }, []);

  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    alertLevel: AlertLevel.WARNING,
    heatingOn: false,
    evaluationAvailable: false,
    message: "Inizializzazione sistema...",
    source: 'AUTO',
    detailedReason: "Caricamento dati in corso..."
  });

  // Track previous status to prevent log spamming
  const prevStatusRef = useRef<SystemStatus | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 30_000);
    const onResume = () => setNowMs(Date.now());
    window.addEventListener('focus', onResume);
    document.addEventListener('visibilitychange', onResume);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('focus', onResume);
      document.removeEventListener('visibilitychange', onResume);
    };
  }, []);

  const loadData = useCallback(async (force = false) => {
    if (refreshPending.current) return;
    refreshPending.current = true;
    const id = ++requestId.current;
    setLoading(true);
    const [stationResult, forecastResult] = await Promise.allSettled([
      fetchStationData(scenario, force), fetchForecast(scenario)
    ]);
    if (id !== requestId.current) return;
    if (stationResult.status === 'fulfilled') {
      setStationData(stationResult.value);
      setStationConnection(stationResult.value.meta?.connection ?? 'UNKNOWN');
      setStationAttemptAt(stationResult.value.meta?.lastAttemptAt ?? null);
      setStationError(stationResult.value.meta?.error ?? null);
    } else {
      const error = stationResult.reason;
      setStationConnection('ERROR');
      setStationAttemptAt(error instanceof StationFetchError ? error.meta.lastAttemptAt : Date.now());
      setStationError(error instanceof Error ? error.message : 'Acquisizione stazione fallita');
      setStationData(previous => previous ? { ...previous, meta: previous.meta ? {
        ...previous.meta, source: 'CACHE', connection: 'ERROR',
        lastAttemptAt: error instanceof StationFetchError ? error.meta.lastAttemptAt : Date.now(),
        error: error instanceof Error ? error.message : 'Acquisizione fallita'
      } : undefined } : null);
      addLog('Acquisizione stazione fallita; eventuali misure precedenti conservano la loro età.', 'ALERT');
    }
    if (forecastResult.status === 'fulfilled') {
      setWeatherForecast(forecastResult.value);
      setForecastError(null);
    } else {
      setForecastError('Ultimo accesso Open-Meteo fallito. Eventuali previsioni precedenti sono conservate con la loro età.');
      addLog('Errore acquisizione previsioni', 'ALERT');
    }
    setNowMs(Date.now());
    refreshPending.current = false;
    setLoading(false);
  }, [scenario, addLog]);

  useEffect(() => {
    void loadData();
    const interval = window.setInterval(() => { void loadData(); }, 600_000);
    return () => {
      window.clearInterval(interval);
      ++requestId.current;
      refreshPending.current = false;
    };
  }, [loadData]);

  useEffect(() => {
    let status = evaluateAutomatic(stationData, weatherForecast, nowMs);

    // 4. Apply Manual Override (Always takes precedence)
    if (manualOverride === 'ON') {
      status = {
        alertLevel: AlertLevel.MANUAL_ON,
        heatingOn: true,
        message: "FORZATURA MANUALE ATTIVA",
        source: 'MANUAL',
        detailedReason: "L'operatore ha forzato manualmente l'accensione dell'impianto.",
        predictedShutOff: "Manuale"
      };
    } else if (manualOverride === 'OFF') {
      status = {
        alertLevel: AlertLevel.MANUAL_OFF,
        heatingOn: false,
        message: "FORZATURA MANUALE ATTIVA",
        source: 'MANUAL',
        detailedReason: "L'operatore ha forzato manualmente lo spegnimento dell'impianto."
      };
    }

    // 5. Manage Heating Timer
    // If turning ON and wasn't ON before, set start time
    if (status.heatingOn && !heatingStartTimeRef.current) {
      const now = new Date();
      heatingStartTimeRef.current = now;

    }
    // If turning OFF and was ON, clear start time
    if (!status.heatingOn && heatingStartTimeRef.current) {
      heatingStartTimeRef.current = null;

    }

    // Inject the tracked time into the status object for the UI
    status.heatingSince = status.heatingOn ? (heatingStartTimeRef.current || new Date()) : null;

    setSystemStatus(status);

    // Log status changes
    if (!prevStatusRef.current || prevStatusRef.current.heatingOn !== status.heatingOn || prevStatusRef.current.alertLevel !== status.alertLevel || prevStatusRef.current.evaluationAvailable !== status.evaluationAvailable) {
      const type = status.heatingOn || status.evaluationAvailable === false ? 'ALERT' : 'INFO';
      const msg = status.evaluationAvailable === false ? `NON VALUTABILE: ${status.detailedReason}` : status.heatingOn ? `ATTIVAZIONE: ${status.message}` : `STANDBY: ${status.message}`;
      addLog(msg, type);
    }
    prevStatusRef.current = status;
  }, [stationData, weatherForecast, nowMs, manualOverride, addLog]);

  const freshness = stationFreshness(stationData, nowMs);
  const displayForecast = useMemo(() => weatherForecast
    ? getForecastWindow(weatherForecast, 24, nowMs) : null, [weatherForecast, nowMs]);
  const forecastOld = weatherForecast && !weatherForecast.isDemo &&
    nowMs - (weatherForecast.fetchedAt ?? 0) > FORECAST_MAX_AGE_MS;

  // Handle Scenario Change
  const handleScenarioChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newScenario = e.target.value as SimulationScenario;
    setScenario(newScenario);
    setManualOverride(null); // Reset overrides on scenario change
    heatingStartTimeRef.current = null;
    prevStatusRef.current = null;
    ++requestId.current;
    refreshPending.current = false;
    setStationData(null);
    setWeatherForecast(null);
    setStationConnection('UNKNOWN');
    setStationAttemptAt(null);
    setStationError(null);
    setForecastError(null);
    setLoading(true);
    setNowMs(Date.now());
    addLog(`Scenario simulazione cambiato: ${newScenario}`, 'INFO');
  };

  // Handle Manual Action
  const handleManualAction = (action: 'ON' | 'OFF' | null) => {
    setManualOverride(action);
    const msg = action ? `Operatore ha forzato ${action}` : `Operatore ha rimosso forzatura manuale`;
    addLog(msg, 'ACTION');
  };

  // Determine Background Color Class based on status
  const getBackgroundClass = () => {
    if (systemStatus.alertLevel === AlertLevel.CRITICAL || systemStatus.alertLevel === AlertLevel.MANUAL_ON) {
      return "bg-red-50";
    }
    if (systemStatus.alertLevel === AlertLevel.WARNING) {
      return "bg-slate-100";
    }
    if (scenario === 'FREEZING_RAIN') {
      return "bg-cyan-50";
    }
    return "bg-slate-50";
  };

  return (
    <div className={`min-h-screen ${getBackgroundClass()} flex flex-col font-sans transition-colors duration-500`}>
      <Header onOpenLogic={() => setShowLogicModal(true)} station={stationData}
        freshness={freshness} connection={stationConnection} lastAttemptAt={stationAttemptAt} error={stationError} loading={loading} />
      
      {/* Association Info Bar */}
      <Footer />

      <LogicModal isOpen={showLogicModal} onClose={() => setShowLogicModal(false)} />

      {/* Global Loading Overlay for initial load */}
      {loading && !stationData && !weatherForecast && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center max-w-sm text-center">
            <RefreshCw className="text-blue-600 animate-spin mb-4" size={48} />
            <h2 className="text-xl font-black text-slate-900 mb-2">Connessione in corso...</h2>
            <p className="text-sm text-slate-900 font-black">
              Stiamo recuperando i dati in tempo reale dalla stazione di Busca e dai modelli MeteoSwiss.
            </p>
            <div className="mt-6 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div className="bg-blue-600 h-full animate-[loading_2s_ease-in-out_infinite]"></div>
            </div>
          </div>
        </div>
      )}

      <main className="container mx-auto px-4 mt-8 flex-1">
        
        {/* Simulation Bar */}
        <div className="mb-6 bg-blue-100 border border-blue-300 p-3 rounded-lg flex flex-wrap gap-4 items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <Beaker className="text-blue-700" size={20} />
            <span className="text-sm font-black text-blue-900">Modalità Simulazione:</span>
            <select 
              value={scenario} 
              onChange={handleScenarioChange}
              className="bg-white border-blue-300 text-blue-900 text-sm rounded focus:ring-blue-500 focus:border-blue-500 p-1 font-black"
            >
              <option value="REAL">Dati Reali (Live)</option>
              <option value="HEATING_CYCLE_TEST">TEST: Ciclo Neve & Spegnimento</option>
              <option value="SNOW_STORM">Scenario: Tempesta di Neve</option>
              <option value="FREEZING_RAIN">Scenario: Pioggia Gelata</option>
              <option value="CLEAR_COLD">Scenario: Freddo Secco</option>
            </select>
          </div>
          {scenario !== 'REAL' && (
            <span className="text-xs font-bold bg-blue-600 text-white px-2 py-1 rounded animate-pulse">
              SIMULAZIONE ATTIVA
            </span>
          )}
        </div>

        {/* Global Error State if everything fails */}
        {!loading && !stationData && !weatherForecast && (
          <div className="mb-8 bg-white p-12 rounded-2xl shadow-xl border-t-8 border-red-500 flex flex-col items-center text-center">
            <div className="bg-red-100 p-4 rounded-full text-red-600 mb-4">
              <RefreshCw size={48} />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Errore di Connessione</h2>
            <p className="text-slate-500 max-w-md mb-6">
              Non è stato possibile recuperare i dati meteo. Verifica la tua connessione o riprova tra qualche istante.
            </p>
            <button 
              onClick={() => { void loadData(true); }}
              className="flex items-center gap-2 bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg active:scale-95"
            >
              <RefreshCw size={20} /> Riprova Ora
            </button>
          </div>
        )}

        {/* TOP SECTION: ALERT & CONTROLS */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8 items-stretch">
          
          {/* Status Alert (3/4 width) */}
          <div className="lg:col-span-3 flex">
            <SystemAlert status={systemStatus} />
          </div>

          {/* Manual Controls (1/4 width) */}
          <div className="flex flex-col">
            <div className="bg-white p-4 rounded-xl shadow-md border-l-8 border-slate-300 flex flex-col justify-center h-full border border-slate-200">
                <div className="flex justify-between items-center mb-3">
                   <h3 className="text-sm font-black text-slate-900 uppercase">Comandi Manuali</h3>
                   {manualOverride && (
                     <button onClick={() => handleManualAction(null)} className="text-xs text-blue-800 underline hover:text-blue-900 font-black">
                       Ripristina Auto
                     </button>
                   )}
                </div>
                <p className="text-xs text-slate-900 mb-2 font-black">Priorità su automazione. Comandi dimostrativi locali: nessun attuatore collegato.</p>
                <div className="flex flex-col gap-3 flex-1 justify-center">
                   <button 
                    onClick={() => handleManualAction('ON')}
                    className={`w-full flex items-center justify-center gap-2 font-black py-3 px-2 rounded transition-all text-sm ${
                      manualOverride === 'ON' 
                      ? 'bg-red-700 text-white shadow-inner ring-2 ring-offset-2 ring-red-700' 
                      : 'bg-white border border-slate-300 text-slate-900 hover:bg-red-50 hover:border-red-300 hover:text-red-800'
                    }`}
                   >
                      <Unlock size={16} /> FORCE ON
                   </button>
                   <button 
                    onClick={() => handleManualAction('OFF')}
                    className={`w-full flex items-center justify-center gap-2 font-black py-3 px-2 rounded transition-all text-sm ${
                      manualOverride === 'OFF'
                      ? 'bg-slate-900 text-white shadow-inner ring-2 ring-offset-2 ring-slate-900'
                      : 'bg-white border border-slate-300 text-slate-900 hover:bg-slate-100'
                    }`}
                   >
                      <Lock size={16} /> FORCE OFF
                   </button>
                </div>
            </div>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* Left Column: Station Data, Location, Sat, Webcam */}
          <div className="space-y-6">
            
            {/* 1. Station Data */}
            <StationCard data={stationData} loading={loading && !stationData} onRefresh={() => { void loadData(true); }} />

            {/* 2. Location & Time Info */}
            <LocationInfo 
              sunrise={weatherForecast?.daily?.sunrise?.[0]} 
              sunset={weatherForecast?.daily?.sunset?.[0]}
            />
            
            {/* 3. Satellite Map */}
            <SatelliteCard />
            
            {/* 4. Webcam Link */}
            <WebcamCard />
            
          </div>

          {/* Right Column: EventLog & Forecasts */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Event Log (Moved here to be near Manual Controls) */}
            <div className="h-[250px]">
              <EventLog logs={logs} />
            </div>

            {/* Forecast Section */}
            <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200">
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <CloudSun size={24} className="text-sky-600" />
                Previsioni Meteo (MeteoSwiss ICON CH1/CH2)
              </h2>
              <button 
                onClick={() => { void loadData(true); }}
                className="flex items-center gap-2 bg-sky-100 text-sky-900 px-4 py-2 rounded-lg text-sm font-black hover:bg-sky-200 transition-colors border border-sky-200"
                title="Aggiorna previsioni"
              >
                <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                Aggiorna
              </button>
            </div>

            {(forecastError || forecastOld || !displayForecast) && (
              <p role="status" className="bg-amber-50 border border-amber-300 p-4 rounded-lg text-sm text-amber-950">
                {forecastError || (forecastOld ? 'Previsioni vecchie: non usate per la valutazione automatica.' : 'Copertura previsionale insufficiente per le prossime 24 ore.')}
              </p>
            )}
            <p className="text-xs text-slate-700">Finestre dall’ora corrente; neve/pioggia sono accumuli dell’ora precedente. Orari Europe/Rome.</p>
            <ForecastCharts data={displayForecast} />
            <ForecastTable data={displayForecast} />
          </div>

        </div>

        {/* BOTTOM SECTION: HISTORICAL DATA (Horizontal) */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
            {/* Station History (Temp/Hum/Rain) */}
            <div className="h-full">
              <StationHistory data={stationData} />
            </div>

            {/* Station Wind History (Separate) */}
            <div className="h-full">
              <StationWindHistory data={stationData} />
            </div>
        </div>

      </main>
      
      {/* Static Footer for Credits */}
      <footer className="mt-8 py-6 text-center text-slate-900 text-xs border-t border-slate-300 font-black">
        <p>&copy; {new Date().getFullYear()} Datameteo Educational & Ingenium Nivis Project. Developed for monitoring purposes only.</p>
      </footer>
    </div>
  );
};

export default App;
