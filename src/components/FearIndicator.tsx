import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { Heart, Activity } from 'lucide-react';

interface FearIndicatorProps {
  panicLevel: number; // 0 to 100
  heartbeatBPM: number; // 50 to 160
  isHiding: boolean;
}

export default function FearIndicator({ panicLevel, heartbeatBPM, isHiding }: FearIndicatorProps) {
  const [pulsePhase, setPulsePhase] = useState(0);

  // Animate the EKG timeline lines
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();

    const tick = (now: number) => {
      const delta = (now - lastTime) / 1000;
      lastTime = now;

      // Pulse speeds up depending on heartbeat bpm
      const speedMultiplier = heartbeatBPM / 60;
      setPulsePhase((prev) => (prev + delta * 4 * speedMultiplier) % (Math.PI * 2));

      animationFrameId = requestAnimationFrame(tick);
    };

    animationFrameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrameId);
  }, [heartbeatBPM]);

  // Determine safety color scheme
  const getColorScheme = () => {
    if (panicLevel > 75) return { border: 'border-red-900/60', text: 'text-red-500', glow: 'shadow-red-500/30', pulseColor: '#ef4444' };
    if (panicLevel > 40) return { border: 'border-amber-900/40', text: 'text-amber-500', glow: 'shadow-amber-500/20', pulseColor: '#f59e0b' };
    if (isHiding) return { border: 'border-cyan-900/40', text: 'text-cyan-400 font-medium', glow: 'shadow-cyan-400/20', pulseColor: '#22d3ee' };
    return { border: 'border-emerald-950/60', text: 'text-emerald-500', glow: 'shadow-emerald-500/10', pulseColor: '#10b981' };
  };

  const scheme = getColorScheme();

  // Create SVG path representing standard EKG wave: p-wave, q-wave, r-wave notch, s-wave plunge, t-wave, flatter segment
  const generateEKGPath = () => {
    const points: string[] = [];
    const width = 180;
    const height = 40;
    const count = 40;

    for (let i = 0; i < count; i++) {
      const x = (i / (count - 1)) * width;
      // Cycle through EKG wave phases
      const localPhase = (pulsePhase + (i * 0.15)) % (Math.PI * 2);
      let y = height / 2;

      // Approximate a heartbeat waveform
      if (localPhase > 0 && localPhase < 0.3) {
        y -= Math.sin((localPhase / 0.3) * Math.PI) * 4; // P-wave (small bump)
      } else if (localPhase >= 0.35 && localPhase < 0.45) {
        y += ((localPhase - 0.35) / 0.1) * 3; // Q-point down
      } else if (localPhase >= 0.45 && localPhase < 0.55) {
        y -= 14; // HUGE R-spike up
      } else if (localPhase >= 0.55 && localPhase < 0.65) {
        y += 12; // S-drop down
      } else if (localPhase >= 0.7 && localPhase < 0.95) {
        y -= Math.sin(((localPhase - 0.7) / 0.25) * Math.PI) * 5; // T-wave
      }

      points.push(`${x},${y}`);
    }

    return `M ${points.join(' L ')}`;
  };

  return (
    <div id="fear-indicator-hud" className="bg-black/60 backdrop-blur-md rounded border border-white/5 p-4 w-full flex flex-col gap-3.5 shadow-xl transition-all duration-500">
      {/* Top status bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {panicLevel > 75 ? (
            <motion.div
              animate={{ scale: [1, 1.25, 1], rotate: [-5, 5, -5] }}
              transition={{ repeat: Infinity, duration: 0.35 }}
            >
              <Heart className="w-4 h-4 text-red-600 fill-red-600" />
            </motion.div>
          ) : (
            <motion.div
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ repeat: Infinity, duration: 60 / heartbeatBPM }}
            >
              <Heart className={`w-4 h-4 ${isHiding ? 'text-cyan-400 fill-cyan-400/20' : 'text-neutral-400 fill-neutral-400/10'}`} />
            </motion.div>
          )}
          <span className="text-[10px] font-sans tracking-[0.2em] font-medium text-white/40 uppercase">Heart Rate</span>
        </div>
        <span className={`text-[9px] font-mono px-2 py-0.5 rounded border text-[9px] tracking-widest ${isHiding ? 'bg-cyan-950/20 text-cyan-400 border-cyan-800/30' : 'bg-white/5 border-white/5 text-white/40'}`}>
          {isHiding ? 'TERSEMBUNYI' : panicLevel > 75 ? 'PANIK' : panicLevel > 40 ? 'CEMAS' : 'SEHAT'}
        </span>
      </div>

      {/* Heart Rate Display EKG */}
      <div className="h-12 bg-black/45 rounded border border-white/5 flex items-center justify-between px-3 relative overflow-hidden">
        {/* Grid lines */}
        <div className="absolute inset-0 bg-[#0c0c0c] elegant-dots opacity-40"></div>
        
        {/* Dynamic EKG Line */}
        <div className="relative w-[180px] h-full flex items-center">
          <svg className="w-full h-full stroke-red-800 fill-none opacity-60" viewBox="0 0 180 40">
            <path
              d={generateEKGPath()}
              fill="none"
              stroke={scheme.pulseColor}
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Beats Per Minute reading */}
        <div className="text-right z-10 flex flex-col justify-center">
          <span className="text-xl font-mono leading-none tracking-tight text-white/80">
            {Math.round(heartbeatBPM)} BPM
          </span>
        </div>
      </div>

      {/* Fear Gauge Bar */}
      <div className="space-y-1.5 pt-1">
        <div className="flex justify-between text-[9px] font-sans tracking-widest text-white/40 uppercase">
          <span>Panic Level</span>
          <span className="font-mono text-[10px]">{Math.round(panicLevel)}%</span>
        </div>
        <div className="h-[2px] bg-white/10 relative">
          <motion.div
            className={`h-full ${panicLevel > 75 ? 'bg-red-600' : panicLevel > 40 ? 'bg-amber-500' : 'bg-white/60'}`}
            initial={{ width: '0%' }}
            animate={{ width: `${panicLevel}%` }}
            transition={{ type: 'spring', damping: 20 }}
          />
        </div>
      </div>
    </div>
  );
}
