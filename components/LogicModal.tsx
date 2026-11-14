
import React from 'react';
import { X } from 'lucide-react';

interface LogicModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LogicModal: React.FC<LogicModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-100">
          <div>
            <h2 className="text-xl font-black text-slate-900">Logica di Controllo Automatica</h2>
            <p className="text-xs text-slate-900 font-black">Diagramma di flusso del processo decisionale (Ciclo: 10 min)</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-900 hover:text-black"
          >
            <X size={24} />
          </button>
        </div>

        {/* Modal Content - SVG Flowchart */}
        <div className="flex-1 overflow-auto p-8 bg-slate-100 flex justify-center">
          <svg width="600" height="900" viewBox="0 0 600 900" className="w-full max-w-[600px] drop-shadow-sm">
            <defs>
              <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#0f172a" />
              </marker>
            </defs>

            {/* START */}
            <rect x="200" y="0" width="200" height="40" rx="20" fill="#cbd5e1" stroke="#0f172a" strokeWidth="2" />
            <text x="300" y="25" textAnchor="middle" className="text-sm font-black fill-slate-900">INIZIO (Ciclo 10 min)</text>
            <line x1="300" y1="40" x2="300" y2="70" stroke="#0f172a" strokeWidth="2" markerEnd="url(#arrowhead)" />

            {/* MANUAL CHECK */}
            <polygon points="300,70 480,120 300,170 120,120" fill="#fff" stroke="#92400e" strokeWidth="2" />
            <text x="300" y="115" textAnchor="middle" className="text-xs font-black fill-slate-900">Override Manuale</text>
            <text x="300" y="130" textAnchor="middle" className="text-xs font-black fill-slate-900">Attivo?</text>

            {/* Manual Branches */}
            <line x1="480" y1="120" x2="550" y2="120" stroke="#0f172a" strokeWidth="2" />
            <line x1="550" y1="120" x2="550" y2="180" stroke="#0f172a" strokeWidth="2" markerEnd="url(#arrowhead)" />
            <text x="510" y="115" className="text-xs font-black fill-red-800">SI</text>

            <rect x="480" y="180" width="140" height="50" rx="4" fill="#fee2e2" stroke="#991b1b" strokeWidth="2" />
            <text x="550" y="205" textAnchor="middle" className="text-xs font-black fill-red-900">ESEGUI COMANDO</text>
            <text x="550" y="220" textAnchor="middle" className="text-xs font-black fill-red-900">(FORCE ON/OFF)</text>


            {/* AUTO PATH */}
            <line x1="300" y1="170" x2="300" y2="210" stroke="#0f172a" strokeWidth="2" markerEnd="url(#arrowhead)" />
            <text x="310" y="190" className="text-xs font-black fill-green-800">NO (AUTO)</text>

            {/* FORECAST ANALYSIS */}
            <rect x="150" y="210" width="300" height="50" rx="4" fill="#fff" stroke="#1e40af" strokeWidth="2" />
            <text x="300" y="235" textAnchor="middle" className="text-xs font-black fill-slate-900">Analisi Input Dati</text>
            <text x="300" y="250" textAnchor="middle" className="text-[10px] font-black fill-slate-900">Prev. 12h (MeteoSwiss ICON CH1/CH2) + Temp. Stazione</text>
            <line x1="300" y1="260" x2="300" y2="300" stroke="#0f172a" strokeWidth="2" markerEnd="url(#arrowhead)" />

            {/* WMO CHECK */}
            <polygon points="300,300 480,350 300,400 120,350" fill="#fff" stroke="#1e40af" strokeWidth="2" />
            <text x="300" y="340" textAnchor="middle" className="text-xs font-black fill-slate-900">Previsione:</text>
            <text x="300" y="355" textAnchor="middle" className="text-xs font-black fill-slate-900">Codice WMO Critico?</text>
            <text x="300" y="370" textAnchor="middle" className="text-[10px] font-black fill-slate-900">(es. 71, 75, 67 nelle prox 12h)</text>

            {/* WMO YES */}
            <line x1="480" y1="350" x2="530" y2="350" stroke="#0f172a" strokeWidth="2" />
            <line x1="530" y1="350" x2="530" y2="720" stroke="#0f172a" strokeWidth="2" markerEnd="url(#arrowhead)" />
            <text x="490" y="345" className="text-xs font-black fill-red-800">SI</text>

            {/* WMO NO */}
            <line x1="300" y1="400" x2="300" y2="440" stroke="#0f172a" strokeWidth="2" markerEnd="url(#arrowhead)" />
            <text x="310" y="420" className="text-xs font-black fill-slate-900">NO</text>

            {/* SNOW AMOUNT CHECK */}
            <polygon points="300,440 480,490 300,540 120,490" fill="#fff" stroke="#1e40af" strokeWidth="2" />
            <text x="300" y="475" textAnchor="middle" className="text-xs font-black fill-slate-900">Prev. Neve &gt; 0.5cm</text>
            <text x="300" y="490" textAnchor="middle" className="text-[10px] font-black fill-slate-900">AND</text>
            <text x="300" y="505" textAnchor="middle" className="text-xs font-black fill-slate-900">Stazione Temp &lt; 3°C?</text>

            {/* SNOW YES */}
            <line x1="480" y1="490" x2="530" y2="490" stroke="#0f172a" strokeWidth="2" markerEnd="url(#arrowhead)" />
            <text x="490" y="485" className="text-xs font-black fill-red-800">SI</text>

            {/* SNOW NO */}
            <line x1="300" y1="540" x2="300" y2="580" stroke="#0f172a" strokeWidth="2" markerEnd="url(#arrowhead)" />
            <text x="310" y="560" className="text-xs font-black fill-slate-900">NO</text>

            {/* TEMP WARNING CHECK (New Logic) */}
            <polygon points="300,580 480,630 300,680 120,630" fill="#fff" stroke="#854d0e" strokeWidth="2" />
            <text x="300" y="620" textAnchor="middle" className="text-xs font-black fill-slate-900">Zona 0°C?</text>
            <text x="300" y="635" textAnchor="middle" className="text-[10px] font-black fill-slate-900">(-2°C &lt; Stazione Temp &lt; +2°C)</text>

            {/* WARNING YES */}
            <line x1="480" y1="630" x2="520" y2="630" stroke="#0f172a" strokeWidth="2" markerEnd="url(#arrowhead)" />
            <text x="490" y="625" className="text-xs font-black fill-amber-800">SI</text>

            <rect x="520" y="605" width="70" height="50" rx="4" fill="#fef3c7" stroke="#854d0e" strokeWidth="2" />
            <text x="555" y="630" textAnchor="middle" className="text-[10px] font-black fill-amber-900">PRE-ALLERTA</text>
            <text x="555" y="640" textAnchor="middle" className="text-[8px] font-black fill-amber-900">(Monitor)</text>

            {/* WARNING NO -> SAFE */}
            <line x1="300" y1="680" x2="300" y2="720" stroke="#0f172a" strokeWidth="2" markerEnd="url(#arrowhead)" />
            <text x="310" y="700" className="text-xs font-black fill-green-800">NO</text>


            {/* FINAL STATES */}
            
            {/* HEATING ON */}
            <rect x="450" y="720" width="160" height="90" rx="8" fill="#dc2626" stroke="#7f1d1d" strokeWidth="2" />
            <text x="530" y="750" textAnchor="middle" className="text-sm font-black fill-white">RISCALDAMENTO</text>
            <text x="530" y="770" textAnchor="middle" className="text-2xl font-black fill-white">ON</text>
            <text x="530" y="795" textAnchor="middle" className="text-[10px] font-black fill-white">Calcolo Spegnimento Previsto</text>

            {/* HEATING OFF */}
            <rect x="220" y="720" width="160" height="80" rx="8" fill="#16a34a" stroke="#064e3b" strokeWidth="2" />
            <text x="300" y="755" textAnchor="middle" className="text-sm font-black fill-white">STANDBY / OFF</text>
            <text x="300" y="775" textAnchor="middle" className="text-[10px] font-black fill-green-50">(Condizioni Safe)</text>

          </svg>
        </div>
      </div>
    </div>
  );
};

export default LogicModal;
