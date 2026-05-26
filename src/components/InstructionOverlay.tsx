import { motion } from 'motion/react';
import { Eye, ShieldAlert, Volume2, HelpCircle, EyeOff } from 'lucide-react';

interface InstructionOverlayProps {
  onClose: () => void;
}

export default function InstructionOverlay({ onClose }: InstructionOverlayProps) {
  return (
    <div id="tutorial-overlay" className="absolute inset-0 bg-[#050505] flex items-center justify-center p-6 z-45 overflow-y-auto select-none pointer-events-auto">
      {/* Background patterns */}
      <div className="absolute inset-0 elegant-dots opacity-30 pointer-events-none" />
      <div className="absolute inset-0 elegant-vignette pointer-events-none" />

      <div className="w-full max-w-2xl bg-black/60 border border-white/5 rounded p-8 shadow-2xl relative flex flex-col gap-6 max-h-[90vh] z-10">
        
        {/* Title */}
        <div className="text-center space-y-2">
          <div className="flex justify-center text-red-600 mb-1">
            <ShieldAlert className="w-6 h-6 animate-pulse" />
          </div>
          <h2 className="text-xl font-light font-serif tracking-[0.25em] text-[#dfdcd6] uppercase italic">PETUNJUK KELANGSUNGAN HIDUP</h2>
          <p className="text-[9px] font-mono text-white/35 uppercase tracking-[0.3em]">PROYEK GELAP - REKAMAN ARCHIVE RUMAH SAKIT</p>
        </div>

        {/* Content columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-white/70 font-mono text-xs">
          
          {/* Controls Column */}
          <div className="space-y-4 bg-black/40 border border-white/5 rounded p-5">
            <h3 className="text-[10px] font-sans font-bold text-yellow-600/80 tracking-[0.2em] border-b border-white/5 pb-2 uppercase">KONDISI KONTROL</h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-white/40 font-sans uppercase tracking-wider text-[10px]">GERAKAN</span>
                <span className="px-2 py-0.5 bg-white/5 border border-white/5 text-white rounded text-[10px]">W / A / S / D</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/40 font-sans uppercase tracking-wider text-[10px]">JALAN / LARI</span>
                <span className="px-2 py-0.5 bg-white/5 border border-white/5 text-white rounded text-[10px]">SHIFT</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/40 font-sans uppercase tracking-wider text-[10px]">MERANGKAK</span>
                <span className="px-2 py-0.5 bg-white/5 border border-white/5 text-white rounded text-[10px]">CTRL / C</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/40 font-sans uppercase tracking-wider text-[10px]">SENTER</span>
                <span className="px-2 py-0.5 bg-white/5 border border-white/5 text-white rounded text-[10px]">F</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/40 font-sans uppercase tracking-wider text-[10px]">INTERAKSI</span>
                <span className="px-2 py-0.5 bg-white/5 border border-white/5 text-white rounded text-[10px]">E</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/40 font-sans uppercase tracking-wider text-[10px]">TAHAN NAPAS</span>
                <span className="px-2 py-0.5 bg-white/5 border border-white/5 text-white rounded text-[10px]">SPACEBAR</span>
              </div>
            </div>
          </div>

          {/* Survival Mechanics Column */}
          <div className="space-y-4 bg-black/40 border border-white/5 rounded p-5">
            <h3 className="text-[10px] font-sans font-bold text-red-600/80 tracking-[0.2em] border-b border-white/5 pb-2 uppercase">HUKUM ALAM KELAM</h3>
            
            <div className="space-y-4">
              <div className="flex gap-2.5 items-start">
                <Volume2 className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-white/80 font-bold text-[11px] uppercase tracking-wider font-sans">SUARA REAKSI</h4>
                  <p className="text-[10px] text-white/50 leading-relaxed font-sans pt-0.5">
                    Lari mengeluarkan gelombang suara lingkaran merah. Sang Pengintai peka suara. Merangkaklah agar hening total.
                  </p>
                </div>
              </div>

              <div className="flex gap-2.5 items-start">
                <EyeOff className="w-4 h-4 text-cyan-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-white/80 font-bold text-[11px] uppercase tracking-wider font-sans">SENTER SENSENSOR</h4>
                  <p className="text-[10px] text-white/50 leading-relaxed font-sans pt-0.5">
                    Senter menjembatani laci gelap. Namun jika mengarah langsung ke Stalker, cahaya menarik perhatiannya seketika!
                  </p>
                </div>
              </div>

              <div className="flex gap-2.5 items-start">
                <Eye className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-white/80 font-bold text-[11px] uppercase tracking-wider font-sans">MENGHINDAR DI LOKER</h4>
                  <p className="text-[10px] text-white/50 leading-relaxed font-sans pt-0.5">
                    Gunakan locker untuk bersembunyi. Saat monster mendekat, tahan napas dengan menekan berulang Spacebar!
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Objective info */}
        <div className="p-4 bg-red-950/10 border border-red-900/20 rounded space-y-1 text-center">
          <h4 className="text-red-600 font-bold uppercase text-[10px] tracking-widest font-sans">MISI UTAMA KAMU</h4>
          <p className="text-[11px] text-white/60 font-serif leading-relaxed italic">
            Temukan <strong className="text-white font-medium">4 Sekring Daya</strong> yang tersimpan di laci meja, bawa ke panel gerbang selatan untuk memicu evakuasi. Cari kunci <span className="text-red-500 font-bold">Merah</span> dan <span className="text-blue-500 font-bold">Biru</span> untuk membuka pintu bersegel.
          </p>
        </div>

        {/* Exit Button */}
        <div className="flex justify-center pt-2">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClose}
            className="px-8 py-3.5 bg-red-900 hover:bg-red-800 text-white font-mono tracking-[0.2em] rounded border border-red-700/20 shadow-[0_4px_16px_rgba(185,28,28,0.15)] text-xs uppercase cursor-pointer"
          >
            SAYA MENGERTI, MULAI MASUK
          </motion.button>
        </div>

      </div>
    </div>
  );
}
