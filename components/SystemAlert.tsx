
import React, { useEffect, useState, useRef } from 'react';
import { AlertTriangle, CheckCircle, Flame, Hand, PowerOff, Info, Clock, Timer, Volume2, VolumeX, Send, Loader2, Check } from 'lucide-react';
import { AlertLevel, SystemStatus } from '../types';

interface SystemAlertProps {
  status: SystemStatus;
}

// --- CONFIGURAZIONE TELEGRAM BOT ---
const TELEGRAM_BOT_TOKEN = ""; 
const TELEGRAM_CHAT_ID = "";   

const SystemAlert: React.FC<SystemAlertProps> = ({ status }) => {
  const [durationStr, setDurationStr] = useState<string>("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioBlocked, setAudioBlocked] = useState(false);
  
  // Telegram States
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  
  // Web Audio API Refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const lfoRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);

  // Function to generate Siren Sound using Web Audio API
  const playSiren = () => {
    try {
      // Init Context if needed
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;

      // Check if context is suspended (browser policy)
      if (ctx.state === 'suspended') {
        ctx.resume().then(() => {
          // Resume success
        }).catch(() => {
          setAudioBlocked(true);
          return;
        });
      }

      // Stop previous if active
      stopSiren();

      // Create Nodes
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();

      // Configure Main Tone (Sawtooth for alarm sound)
      osc.type = 'sawtooth';
      osc.frequency.value = 600; // Base freq

      // Configure LFO (Modulation for siren effect)
      lfo.type = 'sine';
      lfo.frequency.value = 0.5; // Speed of siren wail (Hz)
      lfoGain.gain.value = 200; // Range of wail (+/- 200Hz)

      // Connect Graph
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency); // Modulate frequency
      
      osc.connect(gain);
      gain.connect(ctx.destination);

      // Volume settings
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      
      // Start
      lfo.start();
      osc.start();

      // Store refs
      oscillatorRef.current = osc;
      lfoRef.current = lfo;
      gainRef.current = gain;

      setIsPlaying(true);
      setAudioBlocked(false);

    } catch (e) {
      console.error("Siren Synth Error:", e);
      // Even if synth fails, we just don't play sound, no UI crash
    }
  };

  const stopSiren = () => {
    try {
      if (oscillatorRef.current) oscillatorRef.current.stop();
      if (lfoRef.current) lfoRef.current.stop();
      if (gainRef.current) gainRef.current.disconnect();
      
      oscillatorRef.current = null;
      lfoRef.current = null;
      gainRef.current = null;
      
      setIsPlaying(false);
    } catch (e) {
      console.error("Stop Siren Error:", e);
    }
  };

  // Effect: Handle Heating Status Change
  useEffect(() => {
    if (status.heatingOn) {
      setSendSuccess(false); // Reset telegram status
      
      // Attempt to play siren
      if (audioCtxRef.current?.state === 'suspended') {
        setAudioBlocked(true);
      } else {
        playSiren();
      }

      // Auto-stop timer (15s)
      const stopTimer = setTimeout(() => {
        stopSiren();
      }, 15000);

      return () => {
        clearTimeout(stopTimer);
        stopSiren();
      };
    } else {
      // Heating OFF -> Stop All
      stopSiren();
      setAudioBlocked(false);
    }
  }, [status.heatingOn]); 

  // Manual Enable Audio (for browser autoplay policies)
  const enableAudioManual = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    audioCtxRef.current.resume().then(() => {
      setAudioBlocked(false);
      if (status.heatingOn) {
        playSiren();
      }
    });
  };

  // Telegram Logic
  const sendTelegramReport = async () => {
    const cleanReason = status.detailedReason 
      ? status.detailedReason.replace(/<[^>]*>?/gm, '') 
      : "Nessun dettaglio disponibile";

    const message = 
`🚨 *INGENIO NIVIS - REPORT ALLERTA* 🚨

*STATO:* ${status.message}
*CAUSA:* ${cleanReason}
*ORARIO:* ${new Date().toLocaleTimeString('it-IT', { timeZone: 'Europe/Rome' })}
${status.heatingOn ? `*AZIONE:* Riscaldamento ATTIVO 🔥` : ''}
${status.predictedShutOff ? `*FINE PREVISTA:* ${status.predictedShutOff}` : ''}

_Messaggio automatico dal sistema di controllo._`;

    if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
      setIsSending(true);
      try {
        const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: TELEGRAM_CHAT_ID,
            text: message,
            parse_mode: 'Markdown'
          }),
        });

        if (response.ok) {
          setSendSuccess(true);
          setTimeout(() => setSendSuccess(false), 3000);
        } else {
          alert("Errore invio Bot. Apertura fallback...");
          window.open(`https://t.me/share/url?text=${encodeURIComponent(message)}`, '_blank');
        }
      } catch (error) {
        window.open(`https://t.me/share/url?text=${encodeURIComponent(message)}`, '_blank');
      } finally {
        setIsSending(false);
      }
    } else {
      const url = `https://t.me/share/url?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
    }
  };

  // Timer Logic (Duration)
  useEffect(() => {
    if (!status.heatingOn || !status.heatingSince) {
      setDurationStr("");
      return;
    }
    const updateTimer = () => {
      if (!status.heatingSince) return;
      const now = new Date();
      const diffMs = now.getTime() - status.heatingSince.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const remMins = diffMins % 60;
      setDurationStr(diffHours > 0 ? `${diffHours}h ${remMins}m` : `${remMins} min`);
    };
    updateTimer();
    const interval = setInterval(updateTimer, 60000); 
    return () => clearInterval(interval);
  }, [status.heatingOn, status.heatingSince]);

  const getColors = () => {
    switch (status.alertLevel) {
      case AlertLevel.CRITICAL:
      case AlertLevel.MANUAL_ON: return "bg-red-50 border-red-600 text-red-950";
      case AlertLevel.WARNING: return "bg-amber-100 border-amber-600 text-amber-950";
      case AlertLevel.MANUAL_OFF: return "bg-slate-200 border-slate-500 text-slate-800";
      default: return "bg-emerald-50 border-emerald-600 text-emerald-950";
    }
  };

  const getIcon = () => {
    switch (status.alertLevel) {
      case AlertLevel.CRITICAL: return <Flame size={48} className="text-red-600 animate-pulse" />;
      case AlertLevel.MANUAL_ON: return <Hand size={48} className="text-red-600" />;
      case AlertLevel.MANUAL_OFF: return <PowerOff size={48} className="text-slate-500" />;
      case AlertLevel.WARNING: return <AlertTriangle size={48} className="text-amber-500" />;
      default: return <CheckCircle size={48} className="text-emerald-500" />;
    }
  };

  return (
    <div className={`w-full rounded-xl border-l-8 shadow-md transition-all duration-300 overflow-hidden h-full ${getColors()}`}>
      
      {/* Main Alert Header */}
      <div className="p-6 flex items-start md:items-center justify-between flex-col md:flex-row gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-white/80 p-3 rounded-full shadow-sm relative">
            {getIcon()}
            {isPlaying && (
              <div className="absolute -top-1 -right-1 bg-red-600 rounded-full p-1 animate-ping">
                 <Volume2 size={12} className="text-white" />
              </div>
            )}
          </div>
          <div>
            <h2 className="text-2xl font-black uppercase tracking-wider mb-1 flex items-center gap-2">
              {status.evaluationAvailable === false && status.source === 'AUTO' ? "AUTOMAZIONE NON VALUTABILE" : status.heatingOn ? "RISCALDAMENTO ATTIVO" : "SISTEMA IN STANDBY"}
              {status.source === 'MANUAL' && (
                 <span className="text-xs bg-black/30 px-2 py-0.5 rounded ml-2 border border-black/30 font-black">MANUALE</span>
              )}
            </h2>
            <p className="font-black text-lg">{status.message}</p>
          </div>
        </div>
        
        {status.heatingOn && (
          <div className="flex flex-col gap-2 min-w-[160px]">
             <div className="px-6 py-3 bg-red-600 text-white font-bold rounded-lg shadow-lg animate-bounce flex items-center justify-center gap-2">
                <Flame size={20} className="fill-white" />
                SCARICO NEVE
             </div>
             
             <button 
                onClick={sendTelegramReport}
                disabled={isSending || sendSuccess}
                className={`px-3 py-2 text-white rounded-lg shadow-md flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                  sendSuccess ? "bg-green-500" : "bg-sky-500 hover:bg-sky-600"
                }`}
             >
                {isSending ? <Loader2 size={16} className="animate-spin" /> : sendSuccess ? <><Check size={16} /> INVIATO!</> : <><Send size={16} /> TELEGRAM</>}
             </button>
             
             {isPlaying && (
               <div className="px-3 py-2 bg-red-800 text-white rounded-lg shadow-lg flex items-center justify-center gap-2 text-xs font-bold animate-pulse">
                 <Volume2 size={16} /> SIRENA SYNTH
               </div>
             )}
             
             {audioBlocked && (
                <button 
                  onClick={enableAudioManual}
                  className="px-3 py-2 rounded-lg shadow-lg flex items-center justify-center gap-2 text-xs font-bold bg-yellow-400 text-yellow-900 hover:bg-yellow-300 animate-pulse"
                >
                  <VolumeX size={16} /> ABILITA AUDIO
                </button>
             )}
          </div>
        )}
      </div>

      {/* Detail Panel */}
      <div className="bg-white/70 border-t border-black/20 p-4 flex flex-col md:flex-row gap-6 text-sm">
        <div className="flex-1">
          <div className="flex items-center gap-2 font-black mb-1 text-black">
            <Info size={16} />
            ANALISI STATO:
          </div>
          <div className="text-base font-black leading-snug" dangerouslySetInnerHTML={{ __html: status.detailedReason || "Analisi in corso..." }} />
        </div>

        {status.heatingOn && (
          <div className="flex flex-col gap-2 md:border-l border-black/30 md:pl-6 min-w-[200px]">
            <div className="flex items-center gap-3">
              <div className="bg-red-200 p-1.5 rounded text-red-800"><Timer size={18} /></div>
              <div>
                <p className="text-xs uppercase font-black text-black">In funzione da</p>
                <p className="font-mono font-black text-lg leading-none">{durationStr || "0 min"}</p>
              </div>
            </div>
            {status.source === 'AUTO' && (
              <div className="flex items-center gap-3">
                 <div className="bg-blue-200 p-1.5 rounded text-blue-800"><Clock size={18} /></div>
                <div>
                  <p className="text-xs uppercase font-black text-black">Spegnimento previsto</p>
                  <p className="font-black text-blue-900">{status.predictedShutOff || "Da calcolare"}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SystemAlert;
