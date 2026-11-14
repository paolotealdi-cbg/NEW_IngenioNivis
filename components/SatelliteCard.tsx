
import React from 'react';
import { Satellite, ExternalLink } from 'lucide-react';

const SatelliteCard: React.FC = () => {
  // Windy Embed Configuration:
  // Lat/Lon: Busca (44.512, 7.472)
  // Zoom: 7 (Regional View to see approaching fronts)
  // Overlay: Satellite (Real-time clouds)
  const embedUrl = `https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=mm&metricTemp=%C2%B0C&metricWind=km%2Fh&zoom=7&overlay=satellite&product=satellite&level=surface&lat=44.512&lon=7.472&detailLat=44.512&detailLon=7.472&detail=false&pressure=true&message=true`;

  return (
    <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
      <div className="p-3 bg-slate-100 border-b border-slate-200 flex justify-between items-center">
        <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
          <Satellite size={16} className="text-indigo-700"/>
          Satellite Live (Copertura Nuvolosa)
        </h3>
        <a 
          href="https://www.windy.com/44.512/7.472?satellite,44.512,7.472,8" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-[10px] flex items-center gap-1 text-slate-900 hover:text-indigo-700 transition-colors font-black"
        >
          <ExternalLink size={10} /> Fullscreen
        </a>
      </div>
      
      <div className="w-full h-[300px] bg-slate-100 relative group">
        <iframe 
          width="100%" 
          height="100%" 
          src={embedUrl} 
          frameBorder="0"
          title="Mappa Satellitare Windy"
          className="w-full h-full"
        ></iframe>
        
        {/* Overlay to intercept clicks/scrolls if needed, or attribution */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-2 pointer-events-none">
          <p className="text-[10px] text-white/80 text-right">
            Fonte: Windy.com (Satellite)
          </p>
        </div>
      </div>
    </div>
  );
};

export default SatelliteCard;
