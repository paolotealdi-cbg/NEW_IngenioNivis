
import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, Clock, Globe, Sunrise, Sunset, Moon, Circle } from 'lucide-react';
import { LATITUDE, LONGITUDE, ALTITUDE } from '../constants';

interface LocationInfoProps {
  sunrise?: string;
  sunset?: string;
}

const LocationInfo: React.FC<LocationInfoProps> = ({ sunrise, sunset }) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (isoString?: string) => {
    if (!isoString) return "--:--";
    return new Date(isoString).toLocaleTimeString('it-IT', { timeZone: 'Europe/Rome', hour: '2-digit', minute: '2-digit' });
  };

  const getMoonPhase = (date: Date) => {
    const synodic = 29.53058867;
    const knownNewMoon = new Date('2000-01-06T18:14:00Z');
    const diffDays = (date.getTime() - knownNewMoon.getTime()) / (1000 * 60 * 60 * 24);
    const phaseAge = diffDays % synodic;
    
    if (phaseAge < 1.84566) return "Luna Nuova";
    if (phaseAge < 5.53699) return "Crescente";
    if (phaseAge < 9.22831) return "Primo Quarto";
    if (phaseAge < 12.91963) return "Gibbosa Crescente";
    if (phaseAge < 16.61096) return "Luna Piena";
    if (phaseAge < 20.30228) return "Gibbosa Calante";
    if (phaseAge < 23.99361) return "Ultimo Quarto";
    if (phaseAge < 27.68493) return "Calante";
    return "Luna Nuova";
  };

  const currentPhase = getMoonPhase(time);

  // Helper to render standard icons
  const renderMoonIcon = (phase: string) => {
    const size = 28;
    const className = "text-yellow-400"; // Standard uniform color

    switch (phase) {
      case "Luna Nuova":
        return <Circle size={size} className="text-slate-600" />; // Empty circle
      case "Luna Piena":
        return <Circle size={size} className={className} fill="currentColor" />; // Filled circle
      case "Primo Quarto":
      case "Gibbosa Crescente":
        // Right side lit (Approx D shape) - Default Moon icon is C shape, so we flip it
        return <Moon size={size} className={className} style={{ transform: 'scaleX(-1)' }} fill="currentColor" />;
      case "Crescente":
        return <Moon size={size} className={className} style={{ transform: 'scaleX(-1)' }} />;
      case "Ultimo Quarto":
      case "Gibbosa Calante":
        // Left side lit (C shape) - Default Moon icon
        return <Moon size={size} className={className} fill="currentColor" />;
      case "Calante":
        return <Moon size={size} className={className} />;
      default:
        return <Circle size={size} className="text-slate-600" />;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md border border-slate-100 overflow-hidden">
      {/* Live Clock Header */}
      <div className="bg-slate-800 text-white p-4">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-1 text-white">
               <Clock size={14} />
               <span className="text-xs font-black uppercase tracking-wider">Ora Locale</span>
            </div>
            <div className="text-2xl font-mono font-black">
              {time.toLocaleTimeString('it-IT', { timeZone: 'Europe/Rome' })}
            </div>
            <div className="text-xs text-white mt-1 capitalize font-black">
              {time.toLocaleDateString('it-IT', { timeZone: 'Europe/Rome', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>
          <div className="text-right">
             <div className="flex items-center justify-end gap-2 mb-1 text-white">
               <Globe size={14} />
               <span className="text-xs font-black uppercase tracking-wider">UTC</span>
            </div>
            <div className="text-xl font-mono font-black text-white">
               {time.toISOString().substring(11, 19)}Z
            </div>
          </div>
        </div>
      </div>

      {/* Astro Data Grid */}
      <div className="grid grid-cols-3 bg-slate-900 border-t border-slate-700 text-slate-200 divide-x divide-slate-700">
        <div className="p-3 text-center flex flex-col justify-center items-center">
           <div className="flex justify-center mb-1 text-orange-300"><Sunrise size={20}/></div>
           <p className="text-[10px] uppercase font-black text-white mb-0.5">Alba</p>
           <p className="font-mono text-sm font-bold text-white">{formatTime(sunrise)}</p>
        </div>
        <div className="p-3 text-center flex flex-col justify-center items-center">
           <div className="flex justify-center mb-1 text-orange-400"><Sunset size={20}/></div>
           <p className="text-[10px] uppercase font-black text-white mb-0.5">Tramonto</p>
           <p className="font-mono text-sm font-bold text-white">{formatTime(sunset)}</p>
        </div>
        <div className="p-3 text-center flex flex-col justify-center items-center">
           <div className="flex justify-center mb-1">
             {renderMoonIcon(currentPhase)}
           </div>
           <p className="text-[10px] uppercase font-black text-white mb-0.5">Fase</p>
           <p className="text-xs font-bold text-[10px] truncate px-1 text-white">{currentPhase}</p>
        </div>
      </div>

      {/* Map Container - User Requested Exact Code (Zoom 10) */}
      <div className="w-full bg-slate-100">
        <iframe 
          width="100%" 
          height="350" 
          src="https://www.openstreetmap.org/export/embed.html?bbox=6.325378417968751%2C44.07081379264681%2C8.618774414062502%2C44.950221181527546&amp;layer=mapnik&amp;marker=44.512176171071054%2C7.472076416015625" 
          style={{ border: "1px solid black" }}
          title="Mappa OpenStreetMap"
        ></iframe>
        <div className="bg-slate-50 px-2 py-1 text-right">
          <small>
            <a 
              href="https://www.openstreetmap.org/?mlat=44.5122&amp;mlon=7.4721#map=10/44.5122/7.4721" 
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Visualizza mappa ingrandita
            </a>
          </small>
        </div>
      </div>

      {/* Geo Details */}
      <div className="p-4 grid grid-cols-2 gap-4 text-sm bg-slate-50 border-t border-slate-200">
        <div>
          <p className="text-xs text-slate-700 uppercase font-black flex items-center gap-1 mb-1">
            <MapPin size={12} /> Località
          </p>
          <p className="font-black text-slate-900 truncate">Busca (CN)</p>
          <p className="text-xs text-slate-800 font-bold">Parco Museo dell'Ingenio</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-700 uppercase font-black flex items-center justify-end gap-1 mb-1">
            <Navigation size={12} /> Altitudine
          </p>
          <p className="font-black text-slate-900">{ALTITUDE} m s.l.m.</p>
        </div>
        <div className="col-span-2 flex justify-between pt-3 border-t border-slate-200">
           <span className="text-xs font-mono font-bold text-slate-700">Lat: {LATITUDE.toFixed(5)}</span>
           <span className="text-xs font-mono font-bold text-slate-700">Lon: {LONGITUDE.toFixed(5)}</span>
        </div>
      </div>
    </div>
  );
};

export default LocationInfo;
