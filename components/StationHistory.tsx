import { formatMeasurement } from '../services/dataQuality';

import React, { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { StationData } from '../types';
import { ArrowDown, ArrowUp, CloudRain, Clock, Table, BarChart3, Wind } from 'lucide-react';

interface StationHistoryProps {
  data: StationData | null;
}

type ChartType = 'TEMP' | 'HUM' | 'RAIN';

const StationHistory: React.FC<StationHistoryProps> = ({ data }) => {
  const [viewMode, setViewMode] = useState<'CHART' | 'TABLE'>('CHART');
  const [activeChart, setActiveChart] = useState<ChartType>('TEMP');

  const history = data?.history || [];
  const hasData = history.length > 0;

  const renderChart = () => {
    switch (activeChart) {
      case 'TEMP':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={history}>
              <defs>
                <linearGradient id="colorTempHist" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.5}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="time" fontSize={10} tickMargin={5} minTickGap={30} />
              <YAxis fontSize={10} unit="°C" width={30} domain={['auto', 'auto']} />
              <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
              <Area type="monotone" dataKey="temp" stroke="#ef4444" fillOpacity={1} fill="url(#colorTempHist)" strokeWidth={2} name="Temperatura" />
            </AreaChart>
          </ResponsiveContainer>
        );
      case 'HUM':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={history}>
              <defs>
                <linearGradient id="colorHumHist" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.5}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="time" fontSize={10} tickMargin={5} minTickGap={30} />
              <YAxis fontSize={10} unit="%" width={30} domain={[0, 100]} />
              <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
              <Area type="monotone" dataKey="hum" stroke="#3b82f6" fillOpacity={1} fill="url(#colorHumHist)" strokeWidth={2} name="Umidità" />
            </AreaChart>
          </ResponsiveContainer>
        );
      case 'RAIN':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={history}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="time" fontSize={10} tickMargin={5} minTickGap={30} />
              <YAxis fontSize={10} unit=" mm" width={30} />
              <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
              <Bar dataKey="rain" name="Pioggia (mm)" fill="#0ea5e9" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );
    }
  };

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* 24h Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200">
          <p className="text-xs text-slate-900 uppercase flex items-center gap-1 font-black"><ArrowDown size={12}/> Min 24h</p>
          <p className="text-lg font-black text-blue-800">{data?.tempMin24h || '-'}°C</p>
        </div>
        <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200">
          <p className="text-xs text-slate-900 uppercase flex items-center gap-1 font-black"><ArrowUp size={12}/> Max 24h</p>
          <p className="text-lg font-black text-red-800">{data?.tempMax24h || '-'}°C</p>
        </div>
        <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200">
          <p className="text-xs text-slate-900 uppercase flex items-center gap-1 font-black"><CloudRain size={12}/> Pioggia 24h</p>
          <p className="text-lg font-black text-teal-800">{data?.rain24h || '-'} <span className="text-xs font-black">mm</span></p>
        </div>
        <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200">
          <p className="text-xs text-slate-900 uppercase flex items-center gap-1 font-black"><Wind size={12}/> Vento Max 24h</p>
          <p className="text-lg font-black text-sky-800">{data?.windMax24h || '-'} <span className="text-xs font-black">km/h</span></p>
        </div>
      </div>

      {/* Main Container - Flex grow to fill height */}
      <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden flex flex-col flex-1">
        
        {/* Header with Toggles */}
        <div className="bg-slate-100 p-3 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex bg-white rounded-md shadow-sm self-start border border-slate-200">
            <button 
              onClick={() => setViewMode('CHART')}
              className={`px-3 py-1.5 rounded-l-md flex items-center gap-2 text-xs font-black transition-all ${viewMode === 'CHART' ? 'bg-blue-100 text-blue-900' : 'text-slate-700 hover:text-slate-900'}`}
            >
              <BarChart3 size={14} /> Grafici
            </button>
            <div className="w-[1px] bg-slate-200"></div>
            <button 
              onClick={() => setViewMode('TABLE')}
              className={`px-3 py-1.5 rounded-r-md flex items-center gap-2 text-xs font-black transition-all ${viewMode === 'TABLE' ? 'bg-blue-100 text-blue-900' : 'text-slate-700 hover:text-slate-900'}`}
            >
              <Table size={14} /> Tabella
            </button>
          </div>

          {viewMode === 'CHART' && (
             <div className="flex flex-wrap gap-2">
                <button onClick={() => setActiveChart('TEMP')} className={`px-2 py-1 text-xs rounded border font-black ${activeChart === 'TEMP' ? 'bg-red-100 border-red-300 text-red-900' : 'bg-white border-slate-300 text-slate-800'}`}>
                   Temp
                </button>
                <button onClick={() => setActiveChart('HUM')} className={`px-2 py-1 text-xs rounded border font-black ${activeChart === 'HUM' ? 'bg-blue-100 border-blue-300 text-blue-900' : 'bg-white border-slate-300 text-slate-800'}`}>
                   Umidità
                </button>
                <button onClick={() => setActiveChart('RAIN')} className={`px-2 py-1 text-xs rounded border font-black ${activeChart === 'RAIN' ? 'bg-sky-100 border-sky-300 text-sky-900' : 'bg-white border-slate-300 text-slate-800'}`}>
                   Pioggia
                </button>
             </div>
          )}
        </div>

        {/* Content Area - fill remaining height */}
        <div className="p-4 flex-1 min-h-[300px]">
          {!hasData ? (
             <div className="flex flex-col items-center justify-center h-full text-slate-900 font-black">
                <Clock size={32} className="mb-2" />
                <p className="text-sm">Dati storici non disponibili</p>
             </div>
          ) : viewMode === 'CHART' ? (
            <div className="h-full w-full">
              {renderChart()}
            </div>
          ) : (
            <div className="h-full overflow-y-auto">
             <table className="w-full text-sm text-left">
               <thead className="bg-slate-100 text-slate-900 text-xs uppercase sticky top-0 shadow-sm z-10 font-black">
                 <tr>
                   <th className="px-4 py-3 bg-slate-100">Ora</th>
                   <th className="px-4 py-3 bg-slate-100 text-right text-red-900">Temp</th>
                   <th className="px-4 py-3 bg-slate-100 text-right text-blue-900">Umidità</th>
                   <th className="px-4 py-3 bg-slate-100 text-right text-sky-900">Pioggia</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-200">
                 {[...history].reverse().map((point, idx) => (
                   <tr key={idx} className="hover:bg-slate-50 transition-colors">
                     <td className="px-4 py-2 font-mono text-xs text-slate-900 font-black">{point.time}</td>
                     <td className="px-4 py-2 text-right font-black text-slate-900">{formatMeasurement(point.temp)}°</td>
                     <td className="px-4 py-2 text-right text-slate-900 font-black">{formatMeasurement(point.hum, 0)}%</td>
                     <td className={`px-4 py-2 text-right font-black ${point.rain > 0 ? 'text-teal-800' : 'text-slate-900'}`}>
                        {formatMeasurement(point.rain)}
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StationHistory;
