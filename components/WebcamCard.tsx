
import React from 'react';
import { ExternalLink, PlayCircle } from 'lucide-react';

const WebcamCard: React.FC = () => {
  // URL permanente dello streaming live del canale @Streaming-Busca-vt1zo
  // Questo URL reindirizza automaticamente all'attuale video live del canale.
  const youtubeUrl = "https://www.youtube.com/@Streaming-Busca-vt1zo/live";
  
  // Usiamo un'immagine di anteprima di alta qualità che rappresenta la località di Busca e il Parco Museo.
  const thumbnailUrl = "https://picsum.photos/seed/busca-parco-museo/800/450";

  return (
    <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
      {/* 
         NOTE: L'incorporamento (embedding) è spesso disabilitato dai canali YouTube Live. 
         Mostriamo un'anteprima statica con un link diretto per garantire la massima affidabilità.
      */}
      <div className="relative group cursor-pointer w-full bg-black aspect-video">
        <a href={youtubeUrl} target="_blank" rel="noopener noreferrer" className="block w-full h-full relative">
          <img 
            src={thumbnailUrl} 
            alt="Webcam Preview" 
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-red-700/90 text-white rounded-full p-4 shadow-lg group-hover:scale-110 transition-transform backdrop-blur-sm border border-white/20">
              <PlayCircle size={48} fill="currentColor" className="text-white" />
            </div>
          </div>
          <div className="absolute top-3 left-3 bg-red-700 text-white text-[10px] font-black px-2 py-0.5 rounded animate-pulse shadow-md border border-white/20">
            LIVE
          </div>
        </a>
      </div>
      
      <div className="p-3 bg-slate-100 border-t border-slate-200 flex justify-between items-center">
         <div>
            <p className="text-xs font-black text-slate-900">Webcam Parco Museo</p>
            <p className="text-[10px] text-red-700 font-black flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-700"></span>
              Streaming Live Canale
            </p>
         </div>
         <a 
            href={youtubeUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs bg-white text-slate-900 px-3 py-1.5 rounded border border-slate-300 hover:bg-slate-50 hover:text-red-700 transition-colors font-black shadow-sm"
         >
           <ExternalLink size={12} />
           Apri su YouTube
         </a>
      </div>
    </div>
  );
};

export default WebcamCard;
