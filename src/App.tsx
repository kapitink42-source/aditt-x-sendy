import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldAlert, Volume2, Sparkles, AlertCircle, RefreshCw, Play, HelpCircle } from 'lucide-react';
import { GamePhase } from './types';
import GameCanvas from './components/GameCanvas';
import InstructionOverlay from './components/InstructionOverlay';
import { soundManager } from './utils/audio';

// Direct string path to avoid TS compilation asset import errors
const horrorBg = "/src/assets/images/horror_asylum_bg_1779778863051.png";

export default function App() {
  const [phase, setPhase] = useState<GamePhase>('menu');
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [introSentenceIndex, setIntroSentenceIndex] = useState(0);

  // Spooky intro cinematic text sentences
  const introSentences = [
    "Tahun 1978. Rumah Sakit Jiwa Ambarawa dikunci mendadak...",
    "Kegagalan 'Proyek Gelap' membangkitkan Entitas tanpa mata yang sangat ganas.",
    "Pasien dan staf lenyap. Sisa tubuh tercabik-cabik di sepanjang koridor basah.",
    "Kamu terjebak di dalam. Sendirian. Tanpa senjata.",
    "Satu-satunya jalan keluar adalah mencari 4 sekring tenaga untuk menyalakan panel gerbang selatan.",
    "Ingat: Senter dapat menolongmu, namun cahaya dapat memicu datangnya Sang Pengintai.",
    "Tahan napasmu, melangkahlah dalam hening..."
  ];

  // Try to keep audio context running on user interaction
  useEffect(() => {
    const unlockAudio = () => {
      soundManager.resume();
    };
    window.addEventListener('click', unlockAudio);
    window.addEventListener('keydown', unlockAudio);
    return () => {
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
  }, []);

  // Handle phase transitions
  const handleStartGame = () => {
    soundManager.resume();
    soundManager.playFlashlightClick();
    setIntroSentenceIndex(0);
    setPhase('intro');
  };

  const triggerRealPlay = () => {
    soundManager.playLockerHidingDoor(true);
    setPhase('playing');
    soundManager.startAmbientDrone();
    soundManager.startHeartbeat();
  };

  const handleRestart = () => {
    soundManager.resume();
    soundManager.playFlashlightClick();
    setPhase('playing');
    soundManager.startAmbientDrone();
    soundManager.startHeartbeat();
  };

  const toggleMute = () => {
    soundManager.isMuted = !soundManager.isMuted;
    setSoundEnabled(!soundManager.isMuted);
    if (soundManager.isMuted) {
      soundManager.stopAmbientDrone();
      soundManager.stopHeartbeat();
    } else {
      soundManager.resume();
      soundManager.startAmbientDrone();
      soundManager.startHeartbeat();
    }
  };

  return (
    <div id="horror-game-root" className="w-screen h-screen bg-[#050505] text-[#d1d1d1] font-sans overflow-hidden relative flex flex-col">
      
      {/* Elegant Dark dotted grid overlay */}
      <div className="absolute inset-0 pointer-events-none elegant-dots opacity-35 z-20" />

      {/* Elegant Dark Vignette border and ambient focus */}
      <div className="absolute inset-0 pointer-events-none elegant-vignette z-20" />

      {/* VHS subtle scanlines overlay */}
      <div className="absolute inset-0 vhs-scanlines pointer-events-none z-30 opacity-20" />

      {/* CCTV Camera static corner metadata */}
      <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 z-20">
        <div className="flex justify-between text-[9px] font-mono text-white/20 tracking-wider">
          <span>REC [00:42:15:09]</span>
          <span>ISO 3200 | 1/50</span>
        </div>
        <div className="flex justify-between text-[9px] font-mono text-white/20 tracking-wider">
          <span>S-LOG3.GAMUT3</span>
          <span>AUDIO CH1 -42dB</span>
        </div>
      </div>

      {/* RENDER VIEW BASED ON GAME PHASE */}
      <AnimatePresence mode="wait">
        
        {/* PHASE 1: MAIN MENU */}
        {phase === 'menu' && (
          <motion.div
            key="menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col justify-between p-10 relative z-10"
          >
            {/* Background generated image with dark ambient coverage */}
            <div
              className="absolute inset-0 bg-cover bg-center transition-transform duration-10000"
              style={{
                backgroundImage: `url(${horrorBg})`,
                filter: 'brightness(0.3) contrast(1.2) saturate(0.5)',
              }}
            />
            
            {/* Top Navigation Row */}
            <header className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-2 border border-white/5 bg-black/60 px-3 py-1.5 rounded text-[9px] tracking-widest text-[#d1d1d1] font-bold uppercase">
                <div className="w-2 h-2 bg-red-700 animate-pulse rounded-full shadow-[0_0_8px_rgba(185,28,28,0.8)]"></div>
                LIVE FEEDBACK RECORDING / AMBARAWA ARCHIVE
              </div>

              {/* Mute button */}
              <button
                onClick={toggleMute}
                className={`flex items-center gap-1.5 px-3 py-1.5 border rounded text-[10px] tracking-widest font-mono uppercase transition-all relative z-25 cursor-pointer ${soundEnabled ? 'bg-red-950/20 text-red-400 border-red-900/30 hover:bg-red-900/45' : 'bg-white/5 text-white/40 border-white/5 hover:bg-white/10'}`}
              >
                <Volume2 className="w-3.5 h-3.5" />
                {soundEnabled ? 'SUARA: AKTIF' : 'SUARA: BISU'}
              </button>
            </header>

            {/* Center title & menus */}
            <main className="relative z-10 max-w-xl mx-auto w-full flex flex-col items-center text-center gap-12 my-auto">
              
              {/* Title blocks - Elegant Dark Vintage Serif Header */}
              <div className="space-y-3">
                <motion.h1
                  animate={{ scale: [1, 1.01, 1], skewX: [0, 0.2, -0.2, 0] }}
                  transition={{ repeat: Infinity, duration: 6 }}
                  className="text-5xl md:text-6xl font-light font-serif tracking-[0.3em] text-white/95 drop-shadow-[0_12px_24px_rgba(0,0,0,0.95)] uppercase select-none leading-none pl-[0.3em] italic"
                >
                  K E L A M
                </motion.h1>
                <div className="flex items-center justify-center gap-3">
                  <span className="h-[1px] w-8 bg-white/10" />
                  <p className="text-[10px] tracking-[0.35em] text-red-500 font-bold uppercase whitespace-nowrap pl-1">
                    SECTOR 4 MAINTENANCE ARCHIVE
                  </p>
                  <span className="h-[1px] w-8 bg-white/10" />
                </div>
              </div>

              {/* Primary buttons selection stack */}
              <div className="w-full max-w-xs flex flex-col gap-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleStartGame}
                  className="w-full py-4 bg-red-900/80 hover:bg-red-800 text-white font-mono tracking-[0.2em] rounded border border-red-700/30 shadow-[0_4px_20px_rgba(185,28,28,0.15)] transition-all text-xs flex items-center justify-center gap-2 cursor-pointer uppercase"
                >
                  <Play className="w-3.5 h-3.5 fill-white text-white" /> MASUK KORIDOR (PLAY)
                </motion.button>

                <button
                  onClick={() => setPhase('tutorial')}
                  className="w-full py-3.5 bg-black/80 hover:bg-white/5 text-white/80 font-mono tracking-[0.2em] rounded border border-white/5 hover:border-white/15 transition-all text-[11px] flex items-center justify-center gap-2 cursor-pointer uppercase"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-white/60" /> CARA BERMAIN
                </button>
              </div>

              {/* Sound calibration notice */}
              {!soundEnabled && (
                <p className="text-[10px] text-yellow-600/70 tracking-wider max-w-xs leading-relaxed animate-pulse uppercase font-mono">
                  ⚠ PERINGATAN: Gunakan headphone untuk detail spasial audio & jumpscare terbaik.
                </p>
              )}
            </main>

            {/* Footer lines */}
            <footer className="relative z-10 flex justify-between text-[9px] text-[#white]/30 font-mono tracking-widest uppercase">
              <span>SISTEM DECOY GENERASI HOROR - INDONESIA</span>
              <span>VERSI 1.0.4-DEV [S-LOG3]</span>
            </footer>
          </motion.div>
        )}

        {/* PHASE 2: INTERACTIVE TUTORIAL OVERLAY */}
        {phase === 'tutorial' && (
          <InstructionOverlay onClose={() => setPhase('menu')} />
        )}

        {/* PHASE 3: CINEMATIC LORE INTRO */}
        {phase === 'intro' && (
          <motion.div
            key="intro"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#050505] flex items-center justify-center p-6"
          >
            <div className="w-full max-w-xl flex flex-col gap-8 text-center relative z-10 selection:bg-red-950 p-10 bg-black/40 border border-white/5 rounded">
              
              {/* Retro elegant indicator */}
              <div className="flex flex-col items-center gap-2 mb-2">
                <AlertCircle className="w-8 h-8 text-red-600/80 animate-pulse" />
                <span className="text-[10px] tracking-[0.25em] uppercase text-red-600 font-bold font-mono">SECTOR 4 OBJECTIVE RECORDS</span>
              </div>

              <div className="min-h-[140px] flex items-center justify-center">
                <motion.p
                  key={introSentenceIndex}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.5 }}
                  className="text-base md:text-lg font-serif font-light leading-relaxed text-[#d1d1d1] italic tracking-wide"
                >
                  "{introSentences[introSentenceIndex]}"
                </motion.p>
              </div>

              {/* Progress control buttons */}
              <div className="flex justify-center items-center gap-5 pt-4">
                {introSentenceIndex < introSentences.length - 1 ? (
                  <button
                    onClick={() => setIntroSentenceIndex((prev) => prev + 1)}
                    className="px-6 py-2.5 bg-black/60 hover:bg-white/5 border border-white/5 text-white/80 hover:text-white text-xs font-mono tracking-widest uppercase transition-all duration-200 cursor-pointer rounded"
                  >
                    LANJUTKAN CATATAN
                  </button>
                ) : (
                  <button
                    onClick={triggerRealPlay}
                    className="px-8 py-3 bg-red-900 hover:bg-red-800 font-bold border border-red-700/20 text-white text-xs font-mono tracking-[0.2em] uppercase transition-all duration-300 animate-pulse cursor-pointer rounded"
                  >
                    MASUK KE KELAM
                  </button>
                )}

                <button
                  onClick={triggerRealPlay}
                  className="text-white/40 hover:text-white text-[10px] font-mono tracking-widest uppercase underline cursor-pointer duration-200"
                >
                  LEWATI (SKIP)
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* PHASE 4: GAME AREA (PLAYING) */}
        {phase === 'playing' && (
          <GameCanvas
            phase={phase}
            setPhase={setPhase}
            onExitToMenu={() => {
              soundManager.stopAmbientDrone();
              soundManager.stopHeartbeat();
              setPhase('menu');
            }}
          />
        )}

        {/* PHASE 5: GAME OVER SCREAMER */}
        {phase === 'gameover' && (
          <motion.div
            key="gameover"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#050505] flex flex-col items-center justify-center p-6 relative z-50 text-center select-none"
          >
            {/* TV static bloodied flicker overlay with grid dots */}
            <div className="absolute inset-0 bg-black/95 z-10" />
            <div className="absolute inset-0 elegant-dots opacity-40 z-11 pointer-events-none" />

            {/* Terrifying glowing eyes outline in shadows */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-25 z-15">
              <div className="flex gap-24">
                <span className="w-2.5 h-2.5 bg-red-600 rounded-full shadow-[0_0_12px_rgba(220,38,38,0.9)] animate-pulse" />
                <span className="w-2.5 h-2.5 bg-red-600 rounded-full shadow-[0_0_12px_rgba(220,38,38,0.9)] animate-pulse" />
              </div>
            </div>

            <div className="max-w-md w-full relative z-20 space-y-10">
              <div className="space-y-4">
                <h1 className="text-5xl font-light font-serif tracking-[0.3em] text-red-600 drop-shadow-[0_4px_16px_rgba(185,28,28,0.2)] uppercase pl-[0.3em] italic">
                  T E W A S
                </h1>
                <p className="text-[10px] text-white/40 font-bold uppercase tracking-[0.25em] font-mono leading-normal">
                  SANG PENGINTAI MENEMUKANMU DALAM SEKTOR RECOVERY
                </p>
              </div>

              {/* Static visual stats */}
              <div className="p-6 bg-black/60 rounded border border-white/5 text-left font-mono text-[11px] space-y-3 text-white/60">
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span>METODE KEMATIAN:</span>
                  <span className="text-red-500 font-bold uppercase tracking-wider">Gagal Mengendap</span>
                </div>
                <div className="flex justify-between">
                  <span>KEADAAN HOROR:</span>
                  <span className="text-white/80 uppercase">Mental Tembus Kebisingan</span>
                </div>
              </div>

              {/* Restart button */}
              <div className="flex flex-col gap-3.5 pt-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleRestart}
                  className="w-full py-4 bg-red-900/80 hover:bg-red-800 border border-red-700/20 text-white font-mono tracking-widest rounded text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer uppercase"
                >
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '4s' }} /> REINKARNASI (COBA LAGI)
                </motion.button>

                <button
                  onClick={() => setPhase('menu')}
                  className="w-full py-3 bg-black/80 hover:bg-white/5 text-white/60 hover:text-white font-mono border border-white/5 hover:border-white/10 rounded text-xs tracking-widest uppercase transition-all cursor-pointer"
                >
                  KEMBALI KE LOBI UTAMA
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* PHASE 6: GAME WON (VICTORY ESCAPE) */}
        {phase === 'gamewon' && (
          <motion.div
            key="gamewon"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#050505] flex flex-col items-center justify-center p-6 text-center select-none z-50 animate-fade-in"
          >
            {/* Visual morning golden sun rays with grid overlay */}
            <div className="absolute inset-0 bg-radial-gradient from-emerald-950/25 via-[#050505]/95 to-[#050505] pointer-events-none" />
            <div className="absolute inset-0 elegant-dots opacity-30 z-1 pointer-events-none" />

            <div className="max-w-md w-full bg-black/60 border border-white/5 p-10 rounded shadow-2xl relative z-10 space-y-8">
              
              <div className="flex justify-center text-emerald-500/80 mb-2">
                <Sparkles className="w-8 h-8 animate-pulse" />
              </div>

              <div className="space-y-3">
                <h1 className="text-4xl md:text-5xl font-light font-serif tracking-[0.3em] text-[#dfecd2] uppercase pl-[0.3em] italic">
                  L O L O S
                </h1>
                <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-[0.25em] font-mono pl-1">
                  KAMU BERHASIL EVAKUASI KE AMBARAWA LUAR
                </p>
              </div>

              <p className="text-xs leading-relaxed text-white/50 font-serif italic text-justify pr-1 font-light">
                "Ketika daya sekring tersambung penuh, gerbang tua terbuka dengan deritan keras. Kamu berlari kencang menerobos embun fajar Ambarawa, meninggalkan lolongan gelap si Pengintai jauh di belakangan..."
              </p>

              {/* Statistics info */}
              <div className="p-6 bg-black/40 rounded border border-white/5 text-left font-mono text-[11px] space-y-3 text-white/60">
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span>KEADAAN MENTAL:</span>
                  <span className="text-emerald-500 font-bold uppercase tracking-wider">Stabil (Lolos)</span>
                </div>
                <div className="flex justify-between">
                  <span>SEKRING DIINTEGRASIKAN:</span>
                  <span className="text-white/80 font-bold">4 dari 4 Sekring</span>
                </div>
              </div>

              {/* Main buttons */}
              <button
                onClick={() => setPhase('menu')}
                className="w-full py-4 bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-800/20 text-emerald-300 font-mono tracking-widest rounded text-xs uppercase cursor-pointer duration-200"
              >
                KEMBALI KE LOBI MENU
              </button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
