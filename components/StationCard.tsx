import React from 'react';
import { Thermometer, Droplets, Wind, Clock, AlertCircle, RefreshCw } from 'lucide-react';
import { StationData } from '../types';

interface StationCardProps {
  data: StationData | null;
  loading: boolean;
  onRefresh: () => void;
}

const StationCard: React.FC<StationCardProps> = ({ data, loading, onRefresh }) => {
  if (loading && !data) {
    return <div className="h-48 bg-gray-100 rounded-xl animate-pulse"></div>;
  }

  // Error/Offline State
  if (!data) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6 border border-slate-100 h-48 flex flex-col items-center justify-center text-red-500">
         <AlertCircle size={32} className="mb-2" />
         <h3 className="font-bold">Dati stazione assenti</h3>
         <p className="text-xs text-red-400 mb-4">Nessuna misura disponibile; verificare il servizio API.</p>
         <button 
           onClick={onRefresh}
            disabled={loading}
           className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
         >
           <RefreshCw size={14} /> Riprova
         </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md p-6 border border-slate-100">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-black text-slate-900">Dati Stazione Locale</h3>
        <div className="flex items-center gap-2">
          <div className="flex items-center text-xs text-slate-900 bg-slate-100 px-2 py-1 rounded font-black">
            <Clock size={12} className="mr-1" />
            {data.ts}
          </div>
          <button 
            onClick={onRefresh}
            disabled={loading}
            className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
            title="Aggiorna dati stazione"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg flex flex-col items-center justify-center text-center border border-blue-100">
          <Thermometer className="text-blue-700 mb-2" size={24} />
          <span className="text-2xl font-black text-slate-900">{data.temp_med}°C</span>
          <span className="text-xs text-slate-900 font-black uppercase">Temperatura</span>
        </div>
        
        <div className="bg-indigo-50 p-4 rounded-lg flex flex-col items-center justify-center text-center border border-indigo-100">
          <Droplets className="text-indigo-700 mb-2" size={24} />
          <span className="text-2xl font-black text-slate-900">{data.hum_med}%</span>
          <span className="text-xs text-slate-900 font-black uppercase">Umidità</span>
        </div>

        <div className="bg-sky-50 p-4 rounded-lg flex flex-col items-center justify-center text-center border border-sky-100">
          <Wind className="text-sky-700 mb-2" size={24} />
          <span className="text-2xl font-black text-slate-900">{data.wind_speed} <span className="text-sm font-black text-slate-900">{data.wind_dir || ''}</span></span>
          <span className="text-xs text-slate-900 font-black uppercase">Vento (Km/h)</span>
        </div>

        <div className="bg-teal-50 p-4 rounded-lg flex flex-col items-center justify-center text-center border border-teal-100">
          <CloudSnow className="text-teal-700 mb-2" size={24} />
          <span className="text-2xl font-black text-slate-900">{data.rain_rate}</span>
          <span className="text-xs text-slate-900 font-black uppercase">Precipitazioni</span>
        </div>
      </div>
    </div>
  );
};

// Helper icon
const CloudSnow = ({ size, className }: { size: number, className: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
    <path d="M8 19v-2" />
    <path d="M8 22v-2" />
    <path d="M12 19v-2" />
    <path d="M12 22v-2" />
    <path d="M16 19v-2" />
    <path d="M16 22v-2" />
  </svg>
);

export default StationCard;