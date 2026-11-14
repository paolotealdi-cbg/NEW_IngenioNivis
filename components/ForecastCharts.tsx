import { formatRomeTime } from '../services/dataQuality';

import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, ReferenceLine } from 'recharts';
import { WeatherResponse } from '../types';

interface ForecastChartsProps {
  data: WeatherResponse | null;
}

const ForecastCharts: React.FC<ForecastChartsProps> = ({ data }) => {
  if (!data) return null;

  // Prepare data for Recharts
  // Take first 24 hours
  const chartData = data.hourly.time.slice(0, 24).map((time, index) => {
    const hours = formatRomeTime(time);
    return {
      time: hours,
      temp: data.hourly.temperature_2m[index],
      snow: data.hourly.snowfall[index],
      rain: data.hourly.precipitation[index],
      cloud: data.hourly.cloud_cover[index]
    };
  });

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200">
        <h3 className="text-lg font-black text-slate-900 mb-4">Previsione Temperature (MeteoSwiss ICON CH1/CH2)</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="time" fontSize={12} tickMargin={10} stroke="#0f172a" fontWeight="bold" />
              <YAxis unit="°C" fontSize={12} stroke="#0f172a" fontWeight="bold" />
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 'bold', color: '#0f172a' }} />
              <ReferenceLine y={0} stroke="red" strokeDasharray="3 3" label={{ value: '0°C', fill: 'red', fontWeight: 'bold' }} />
              <Area type="monotone" dataKey="temp" stroke="#0ea5e9" fillOpacity={1} fill="url(#colorTemp)" strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200">
        <h3 className="text-lg font-black text-slate-900 mb-4">Neve & Precipitazioni Previste</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="time" fontSize={12} tickMargin={10} stroke="#0f172a" fontWeight="bold" />
              <YAxis yAxisId="left" orientation="left" stroke="#4338ca" unit="cm" fontWeight="bold" label={{ value: 'Neve', angle: -90, position: 'insideLeft', fill: '#4338ca', fontWeight: 'bold' }} />
              <YAxis yAxisId="right" orientation="right" stroke="#047857" unit="mm" fontWeight="bold" label={{ value: 'Pioggia', angle: 90, position: 'insideRight', fill: '#047857', fontWeight: 'bold' }} />
              <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{ borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 'bold', color: '#0f172a' }} />
              <Legend wrapperStyle={{ fontWeight: 'bold', color: '#0f172a' }} />
              <Bar yAxisId="left" dataKey="snow" name="Neve (cm)" fill="#2563eb" radius={[4, 4, 0, 0]} />
              <Bar yAxisId="right" dataKey="rain" name="Pioggia (mm)" fill="#059669" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default ForecastCharts;
