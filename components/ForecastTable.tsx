import { formatRomeTime, formatMeasurement } from '../services/dataQuality';

import React from 'react';
import { WeatherResponse } from '../types';
import { WMO_CODES } from '../constants';

interface ForecastTableProps {
  data: WeatherResponse | null;
}

const ForecastTable: React.FC<ForecastTableProps> = ({ data }) => {
  if (!data) return null;

  // Show next 24 hours as requested
  const hoursToShow = 24;

  return (
    <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-200">
        <h3 className="text-lg font-black text-slate-900">Dettaglio Orario (Prossime 24h - MeteoSwiss ICON CH1/CH2)</h3>
      </div>
      <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-100 text-slate-900 uppercase text-xs sticky top-0 shadow-sm z-10 font-black">
            <tr>
              <th className="px-6 py-3 bg-slate-100">Ora</th>
              <th className="px-6 py-3 bg-slate-100">Condizione (WMO)</th>
              <th className="px-6 py-3 bg-slate-100 text-right">Temp</th>
              <th className="px-6 py-3 bg-slate-100 text-right">Neve</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {data.hourly.time.slice(0, hoursToShow).map((time, index) => {
              const hourStr = formatRomeTime(time);
              const code = data.hourly.weather_code[index];
              const wmoInfo = (code === null ? undefined : WMO_CODES[code]) || { label: "N/D o sconosciuto", risk: "SAFE" };
              const snow = data.hourly.snowfall[index];
              const temp = data.hourly.temperature_2m[index];

              const isFreezing = temp !== null && temp <= 0;
              const hasSnow = snow !== null && snow > 0;

              return (
                <tr key={index} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-black text-slate-900">{hourStr}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black ${
                      wmoInfo.risk === 'CRITICAL' ? 'bg-red-200 text-red-900' : 
                      wmoInfo.risk === 'WARNING' ? 'bg-yellow-200 text-yellow-900' : 'bg-slate-200 text-slate-900'
                    }`}>
                      {wmoInfo.label} ({code ?? "N/D"})
                    </span>
                  </td>
                  <td className={`px-6 py-4 text-right font-black ${isFreezing ? 'text-blue-800' : 'text-slate-900'}`}>
                    {formatMeasurement(temp)}°C
                  </td>
                  <td className={`px-6 py-4 text-right ${hasSnow ? 'font-black text-blue-800' : 'text-slate-900 font-black'}`}>
                    {snow === null ? 'N/D' : `${snow} cm`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ForecastTable;
