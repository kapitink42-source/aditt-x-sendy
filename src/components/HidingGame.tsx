import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ShieldAlert, RefreshCw } from 'lucide-react';
import { soundManager } from '../utils/audio';

interface HidingGameProps {
  stalkerProximity: number; // 0 to 1 (1 is standing right next to locker)
  onFail: () => void;
  onExitHiding: () => void;
  isStalkerNearby: boolean;
}

export default function HidingGame({ stalkerProximity, onFail, onExitHiding, isStalkerNearby }: HidingGameProps) {
  const [breath, setBreath] = useState(100);
  const [isHolding, setIsHolding] = useState(false);
  const [pulsingWarning, setPulsingWarning] = useState(false);

  // Keyboard controls for breath holding (Spacebar)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (!isHolding) {
          setIsHolding(true);
          soundManager.playLockerHidingDoor(false); // locker silent sound effect
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setIsHolding(false);
        // Breathing release
        soundManager.playHeavyBreathing(0.4);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isHolding]);

  // Game Loop for Hiding
  useEffect(() => {
    const interval = setInterval(() => {
      if (isHolding) {
        // Holding breath: decays breath
        setBreath((prev) => {
          const next = Math.max(0, prev - 3.8);
          if (next === 0) {
            // Out of breath gasp!
            soundManager.playHeavyBreathing(1.0); // very loud gasp
            onFail(); // failing triggers immediate discovery!
          }
          return next;
        });

        // Trigger pulse audio for hold breath tension
        if (Math.random() < 0.25) {
          soundManager.playTenseLockerHoldBreath(0.3 + (100 - breath) / 100);
        }
      } else {
        // Breathing normally: regenerates breath
        setBreath((prev) => Math.min(100, prev + 6));

        // If breathing normally while monster is RIGHT next to the locker, chance of being caught!
        if (isStalkerNearby && stalkerProximity > 0.70) {
          // If proximity is extremely high and player is not holding breath, stalker catches them
          onFail();
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isHolding, isStalkerNearby, stalkerProximity, breath, onFail]);

  // Pulse effect when monster is very near
  useEffect(() => {
    setPulsingWarning(isStalkerNearby && stalkerProximity > 0.6);
  }, [isStalkerNearby, stalkerProximity]);

  return (
    <div id="hiding-minigame-screen" className="absolute inset-0 bg-black/60 flex items-center justify-center p-4 select-none pointer-events-none">
      {/* Eye-catching horror blood shot vignette framing */}
      {pulsingWarning && (
        <motion.div
          animate={{ opacity: [0.3, 0.75, 0.3] }}
          transition={{ repeat: Infinity, duration: 0.8 }}
          className="absolute inset-0 border-[16px] border-red-950/80 rounded shadow-inner-xl pointer-events-none bg-red-950/20"
        />
      )}

      {/* Locker metal slits visualization */}
      <div className="absolute inset-x-0 top-12 bottom-56 flex flex-col items-center justify-around opacity-15 pointer-events-none">
        <div className="w-1/2 h-3 bg-neutral-800 rounded-full"></div>
        <div className="w-1/2 h-3 bg-neutral-800 rounded-full"></div>
        <div className="w-1/2 h-3 bg-neutral-800 rounded-full"></div>
        <div className="w-1/2 h-3 bg-neutral-800 rounded-full"></div>
        <div className="w-1/2 h-3 bg-neutral-800 rounded-full"></div>
      </div>

      <div className="w-full max-w-sm bg-neutral-950/90 backdrop-blur-lg border border-neutral-800 p-6 rounded-2xl shadow-2xl relative z-10 flex flex-col gap-5 pointer-events-auto text-center">
        
        {/* Warning Badge */}
        <div className="flex justify-center">
          {pulsingWarning ? (
            <motion.div
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ repeat: Infinity, duration: 0.4 }}
              className="bg-red-950/60 text-red-500 border border-red-800/50 px-3 py-1.5 rounded-full flex items-center gap-1.5 text-xs font-mono font-bold tracking-widest"
            >
              <ShieldAlert className="w-4 h-4" />
              SANG PENGINTAI DI DEPAN LOKER!
            </motion.div>
          ) : (
            <div className="bg-neutral-900 text-neutral-400 border border-neutral-800 px-3 py-1 rounded-full flex items-center gap-1 text-xs font-mono tracking-wider">
              <RefreshCw className="w-3.5 h-3.5" />
              BERSEMBUNYI DI DALAM LOKER
            </div>
          )}
        </div>

        {/* Breath Meter */}
        <div className="space-y-2">
          <div className="flex items-center justify-between font-mono text-xs text-neutral-400">
            <span>TAHAN NAPASMUU</span>
            <span className={breath < 30 ? 'text-red-500 font-bold animate-pulse' : 'text-cyan-400'}>
              {Math.round(breath)}%
            </span>
          </div>

          <div className="h-4 bg-neutral-900 border border-neutral-800 rounded p-[2px] relative overflow-hidden">
            {/* Warning threshold divider */}
            <div className="absolute top-0 bottom-0 left-[20%] w-[1px] bg-red-900/40 z-10"></div>
            
            <motion.div
              className={`h-full rounded-sm ${isHolding ? 'bg-cyan-500' : 'bg-emerald-500'}`}
              initial={{ width: '100%' }}
              animate={{ width: `${breath}%` }}
              transition={{ ease: 'linear', duration: 0.1 }}
            />
          </div>
          
          <p className="text-[10px] font-mono text-neutral-500 leading-tight">
            Napas kosong = kamu akan menghirup udara keras (gasp) & langsung ketahuan!
          </p>
        </div>

        {/* Action Prompt */}
        <div className="p-4 bg-black rounded-xl border border-neutral-900 space-y-3">
          <div className="flex justify-center items-center gap-2">
            <span className={`px-3 py-1 font-mono text-sm border rounded font-bold transition-all duration-300 ${isHolding ? 'bg-cyan-950 border-cyan-400 text-cyan-400 scale-95 shadow-cyan-950/50 shadow-md' : 'bg-neutral-900 border-neutral-700 text-white animate-bounce'}`}>
              SPACEBAR
            </span>
            <span className="text-xs font-mono text-neutral-300">untuk Tahan Napas</span>
          </div>

          {/* Prompt warning layout */}
          <div className="text-[10px] text-neutral-400 leading-normal border-t border-neutral-900 pt-2 font-mono">
            {isHolding ? (
              <span className="text-cyan-400">Kamu sedang MENAHAN NAPAS. Hening total.</span>
            ) : (
              <span>Lakukan tahan napas jika Stalker mendekat. Lepaskan untuk memulihkan napas saat dia menjauh.</span>
            )}
          </div>
        </div>

        {/* Exit Hiding Spot Button (ONLY available if stalker is NOT waiting right beside you!) */}
        <button
          onClick={() => {
            soundManager.playLockerHidingDoor(true);
            onExitHiding();
          }}
          disabled={pulsingWarning}
          className={`w-full py-2.5 rounded font-mono text-xs tracking-widest font-bold transition-all border ${pulsingWarning ? 'bg-neutral-950 border-neutral-900 text-neutral-600 cursor-not-allowed opacity-50' : 'bg-neutral-900 hover:bg-neutral-800 border-neutral-700 hover:border-neutral-600 text-white hover:shadow-lg'}`}
        >
          {pulsingWarning ? 'TIDAK BISA KELUAR - ADA MOMOK!' : 'KELUAR DARI LOKER (E)'}
        </button>

      </div>
    </div>
  );
}
