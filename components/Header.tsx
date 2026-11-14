
import React from 'react';
import type { StationData, DataFreshness, ServiceConnection } from '../types';
import { formatRomeTime } from '../services/dataQuality';
import { CloudSnow, Wifi, Workflow, Mail, Globe, Phone } from 'lucide-react';

interface HeaderProps {
  onOpenLogic: () => void;
  station: StationData | null;
  freshness: DataFreshness;
  connection: ServiceConnection;
  loading: boolean;
  lastAttemptAt: number | null;
  error: string | null;
}

const Header: React.FC<HeaderProps> = ({ onOpenLogic, station, freshness, connection, loading, lastAttemptAt, error }) => {
  const freshnessLabels: Record<DataFreshness, string> = {
    FRESH: 'Dati recenti', OLD: 'Dati vecchi', EXPIRED: 'Dati scaduti',
    UNKNOWN: 'Età non verificabile', ABSENT: 'Dati assenti'
  };
  const connectionLabels: Record<ServiceConnection, string> = {
    UNKNOWN: 'API non verificata', OK: 'Ultimo accesso API riuscito', ERROR: 'Ultimo accesso API fallito'
  };
  const demo = station?.meta?.source === 'DEMO';
  return (
    <header className="bg-white border-b border-slate-300 text-slate-900 shadow-md">
      <div className="container mx-auto px-4 py-4 flex flex-col xl:flex-row justify-between items-center gap-4">
        
        {/* Logo & Title Section */}
        <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8">
          <div className="flex items-center space-x-3">
            <div className="bg-sky-700 p-2 rounded-full text-white shadow-md">
              <CloudSnow size={32} />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight leading-none text-slate-900">INGENIO NIVIS</h1>
              <p className="text-slate-800 font-black text-sm">Controllo Smart IoT Tensostruttura</p>
            </div>
          </div>

          {/* Partner Logos (Images) */}
          <div className="flex flex-wrap justify-center gap-3 md:border-l md:border-slate-300 md:pl-6">
            {/* Datameteo Logo */}
            <div className="bg-white p-1 rounded-lg h-14 flex items-center justify-center shadow-sm overflow-hidden border border-slate-200 hover:scale-105 transition-transform">
              <img 
                src="https://datameteo.education/img/logo.png" 
                alt="Datameteo Educational" 
                className="h-full w-auto object-contain"
              />
            </div>
            {/* IIS Cigna Logo */}
            <div className="bg-white p-1 rounded-lg h-14 flex items-center justify-center shadow-sm overflow-hidden border border-slate-200 hover:scale-105 transition-transform">
              <img 
                src="https://www.cigna-baruffi-garelli.edu.it/wp-content/uploads/2025/08/logo-cigna-1.png" 
                alt="IIS Cigna-Baruffi-Garelli" 
                className="h-full w-auto object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  // Simple fallback if image fails to load
                  const span = document.createElement('span');
                  span.className = "text-[10px] font-bold text-slate-900 leading-tight text-center px-1";
                  span.innerHTML = "IIS CIGNA<br/>BARUFFI GARELLI";
                  e.currentTarget.parentElement?.appendChild(span);
                }}
              />
            </div>
          </div>
        </div>

        {/* Right Controls Section */}
        <div className="flex flex-col md:flex-row items-center gap-4">
          
          {/* Association Contacts (Desktop) */}
          <div className="hidden lg:flex flex-col items-end mr-2 border-r border-slate-300 pr-4">
            <a 
              href="tel:+393482750806" 
              className="flex items-center gap-1.5 text-xs text-slate-900 font-black hover:text-blue-700 transition-colors mb-1"
            >
              <Phone size={12} className="text-blue-600" /> +39 348 275 0806
            </a>
            <a 
              href="mailto:ass.ingenium@gmail.com" 
              className="flex items-center gap-1.5 text-xs text-slate-900 font-black hover:text-blue-700 transition-colors mb-1"
            >
              <Mail size={12} className="text-blue-600" /> ass.ingenium@gmail.com
            </a>
            <a 
              href="https://www.ass-ingenium.it" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="flex items-center gap-1.5 text-xs text-slate-900 font-black hover:text-blue-700 transition-colors"
            >
              <Globe size={12} className="text-blue-600" /> www.ass-ingenium.it
            </a>
          </div>

           {/* Logic Button */}
           <button 
            onClick={onOpenLogic}
            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-lg transition-colors border border-slate-300 text-sm font-black text-slate-900 shadow-sm"
          >
            <Workflow size={18} className="text-blue-600" />
            Schema Logico
          </button>

          <div className="flex items-center space-x-4">
            <div aria-live="polite" className="flex flex-col gap-1 text-slate-900 bg-slate-100 px-3 py-2 rounded-lg border border-slate-300 text-xs max-w-sm">
              <span className="font-black flex items-center gap-2"><Wifi size={16} /> Stazione Busca: {demo ? 'SIMULAZIONE' : freshnessLabels[freshness]}</span>
              <span>{demo ? 'Nessuna verifica API in modalità demo' : connectionLabels[connection]}{loading ? ' · acquisizione in corso' : ''}</span>
              <span>Origine: {station?.meta?.source ?? 'N/D'} · Misura: {formatRomeTime(station?.meta?.observedAt ?? null)}</span>
              <span>Ultimo successo API: {formatRomeTime(station?.meta?.lastSuccessAt ?? null)}</span>
              <span>Ultimo tentativo: {formatRomeTime(lastAttemptAt)}</span>
              {!!station?.meta?.missingFields.length && <span>Campi assenti: {station.meta.missingFields.join(', ')}</span>}
              {error && <span>{error}</span>}
            </div>
            <div className="text-right hidden md:block">
              <p className="text-[10px] uppercase font-black text-slate-500 tracking-widest">Località</p>
              <p className="font-black text-sm text-slate-900">Parco Museo dell'Ingenio</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
