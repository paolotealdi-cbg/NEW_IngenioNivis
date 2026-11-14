import { formatMeasurement } from '../services/dataQuality';

import React, { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { StationData } from '../types';
import { Wind, Table, BarChart3, Navigation } from 'lucide-react';

interface StationWindHistoryProps {
  data: StationData | null;
}

const StationWindHistory: React.FC<StationWindHistoryProps> = ({ data }) => {
  const [viewMode, setViewMode] = useState<'CHART' | 'TABLE'>('CHART');

  // Use the independent wind history array
  const history = data?.windHistory || [];
  const hasData = history.length > 0;

  // Custom Dot for Chart to show direction vectors
  const CustomizedDot = (props: any) => {
    const { cx, cy, payload } = props;
    const rotate = payload.dirDeg || 0;

    // Don't render if value is close to 0 to avoid clutter
    if (payload.speedKmh === null || payload.dirDeg === null || payload.speedKmh < 1) return null;

    return (
      <g transform={`translate(${cx},${cy}) rotate(${rotate})`}>
         <path d="M0,-6 L3,2 L0,0 L-3,2 Z" fill="#166534" />
      </g>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden h-full flex flex-col">
      <div className="bg-green-100 p-3 border-b border-green-200 flex items-center justify-between">
        <h3 className="text-sm font-black text-green-900 flex items-center gap-2">
           <Wind size={16} /> Storico Vento
        </h3>

        <div className="flex bg-white rounded-md shadow-sm border border-green-300">
            <button
              onClick={() => setViewMode('CHART')}
              className={`px-3 py-1 rounded-l-md flex items-center gap-2 text-xs font-black transition-all ${viewMode === 'CHART' ? 'bg-green-200 text-green-900' : 'text-slate-700 hover:text-slate-900'}`}
            >
              <BarChart3 size={12} /> Grafico
            </button>
            <div className="w-[1px] bg-green-300"></div>
            <button
              onClick={() => setViewMode('TABLE')}
              className={`px-3 py-1 rounded-r-md flex items-center gap-2 text-xs font-black transition-all ${viewMode === 'TABLE' ? 'bg-green-200 text-green-900' : 'text-slate-700 hover:text-slate-900'}`}
            >
              <Table size={12} /> Tabella
            </button>
        </div>
      </div>

      <div className="p-4 flex-1 min-h-[250px]">
        {!hasData ? (
           <div className="flex flex-col items-center justify-center h-full text-slate-900 font-black">
              <Wind size={32} className="mb-2" />
              <p className="text-sm">Dati vento storici non disponibili</p>
           </div>
        ) : viewMode === 'CHART' ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={history}>
               <defs>
                <linearGradient id="colorWindSpecific" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.6}/>
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0fdf4" />
              <XAxis dataKey="time" fontSize={10} tickMargin={5} minTickGap={30} stroke="#0f172a" fontWeight="bold" />
              <YAxis fontSize={10} unit=" km/h" width={35} domain={[0, 'auto']} stroke="#0f172a" fontWeight="bold" />
              <Tooltip
                contentStyle={{ borderRadius: '8px', fontSize: '12px', border: '1px solid #bbf7d0', fontWeight: 'bold' }}
                itemStyle={{ color: '#15803d', fontWeight: 'bold' }}
                formatter={(value: number, name: string, props: any) => [
                    `${value.toFixed(1)} km/h`,
                    `Velocità (${props.payload.dirText})`
                ]}
              />
              <Area
                type="monotone"
                dataKey="speedKmh"
                stroke="#16a34a"
                fillOpacity={1}
                fill="url(#colorWindSpecific)"
                strokeWidth={2}
                activeDot={{ r: 4, strokeWidth: 0 }}
                dot={<CustomizedDot />}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full overflow-y-auto pr-1">
             <table className="w-full text-sm text-left">
               <thead className="bg-green-100 text-green-900 text-xs uppercase sticky top-0 z-10 font-black">
                 <tr>
                   <th className="px-4 py-2">Ora</th>
                   <th className="px-4 py-2 text-right">Velocità (km/h)</th>
                   <th className="px-4 py-2 text-center">Direzione</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-green-100">
                 {[...history].reverse().map((point, idx) => (
                   <tr key={idx} className="hover:bg-green-50/30 transition-colors">
                     <td className="px-4 py-2 font-mono text-xs text-slate-900 font-black">{point.time}</td>
                     <td className={`px-4 py-2 text-right font-mono font-black ${point.speedKmh > 0 ? 'text-green-800' : 'text-slate-900'}`}>
                        {formatMeasurement(point.speedKmh)}
                     </td>
                     <td className="px-4 py-2 text-center text-xs flex justify-center items-center gap-2">
                        <span className="font-black text-slate-900">{point.dirText}</span>
                        <Navigation
                            size={12}
                            className="text-green-700"
                            style={{ transform: `rotate(${(point.dirDeg ?? 45) - 45}deg)` }}
                        />
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
        )}
      </div>
    </div>
  );
};

export default StationWindHistory;
