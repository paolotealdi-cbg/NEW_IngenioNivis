
import React from 'react';
import { Globe, Facebook, Instagram, Youtube, Heart } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <div className="bg-white border-b border-slate-200 py-4 shadow-sm relative z-10">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          
          {/* Association Info */}
          <div className="flex items-center gap-3">
            <div className="bg-sky-100 p-2 rounded-full text-sky-700">
               <Heart size={20} />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm">Associazione Ingenium APS</h4>
              <p className="text-xs text-slate-700 font-medium">Gestione Parco-Museo dell'Ingenio</p>
            </div>
          </div>

          {/* Links */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <a 
              href="https://www.ass-ingenium.it/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg transition-colors border border-slate-200 text-xs font-medium"
            >
              <Globe size={14} className="text-blue-500" />
              www.ass-ingenium.it
            </a>
            
            <div className="flex items-center gap-2">
              <a href="https://www.facebook.com/Parco.Museo.Dell.Ingenio" target="_blank" rel="noopener noreferrer" className="p-1.5 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition-colors" title="Facebook">
                <Facebook size={16} />
              </a>
              <a href="https://www.instagram.com/associazioneingenium/" target="_blank" rel="noopener noreferrer" className="p-1.5 bg-pink-50 text-pink-600 rounded-full hover:bg-pink-100 transition-colors" title="Instagram">
                <Instagram size={16} />
              </a>
              <a href="https://youtube.com/@parcomuseodellingenio" target="_blank" rel="noopener noreferrer" className="p-1.5 bg-red-50 text-red-600 rounded-full hover:bg-red-100 transition-colors" title="YouTube">
                <Youtube size={16} />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Footer;
