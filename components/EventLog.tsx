import React from 'react';
import { LogEntry } from '../types';
import { ScrollText, Activity, AlertCircle, Info } from 'lucide-react';

interface EventLogProps {
  logs: LogEntry[];
}

const EventLog: React.FC<EventLogProps> = ({ logs }) => {
  return (
    <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden h-full flex flex-col">
      <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-100">
        <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
          <ScrollText size={16} />
          Registro Eventi
        </h3>
        <span className="text-xs text-slate-900 font-black">{logs.length} eventi</span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[300px]">
        {logs.length === 0 && (
          <p className="text-center text-slate-900 font-black text-sm py-4">Nessun evento registrato.</p>
        )}
        {logs.map((log) => (
          <div key={log.id} className="flex gap-3 items-start text-sm">
            <div className={`mt-0.5 min-w-[16px]`}>
              {log.type === 'ALERT' && <AlertCircle size={16} className="text-red-600" />}
              {log.type === 'ACTION' && <Activity size={16} className="text-blue-700" />}
              {log.type === 'INFO' && <Info size={16} className="text-slate-700" />}
            </div>
            <div>
              <span className="text-xs text-slate-900 font-black font-mono block mb-0.5">
                {log.timestamp.toLocaleTimeString('it-IT', { timeZone: 'Europe/Rome' })}
              </span>
              <p className="text-slate-900 font-black leading-tight">{log.message}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EventLog;