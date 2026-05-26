import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, X, Feather } from 'lucide-react';
import { Diary } from '../types';

interface DiaryModalProps {
  diary: Diary | null;
  onClose: () => void;
}

export default function DiaryModal({ diary, onClose }: DiaryModalProps) {
  return (
    <AnimatePresence>
      {diary && (
        <div id="diary-modal-backdrop" className="fixed inset-0 bg-black/95 backdrop-blur-md z-50 flex items-center justify-center p-4">
          {/* Background patterns */}
          <div className="absolute inset-0 elegant-dots opacity-30 pointer-events-none" />
          <div className="absolute inset-0 elegant-vignette pointer-events-none" />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="w-full max-w-2xl bg-[#090909] border border-white/5 rounded relative shadow-2xl overflow-hidden flex flex-col z-10"
          >
            {/* Top vintage headers */}
            <div className="px-6 py-4 border-b border-white/5 bg-black/40 flex items-center justify-between z-10">
              <div className="flex items-center gap-2 text-white/50">
                <BookOpen className="w-4 h-4" />
                <span className="font-sans text-[10px] tracking-[0.2em] uppercase font-bold">DOKUMEN KELAM</span>
              </div>
              <button
                onClick={onClose}
                className="text-white/40 hover:text-white p-2 rounded transition-colors"
                aria-label="Tutup catatan"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Elegant Vintage paper journal section */}
            <div className="flex-1 p-8 overflow-y-auto max-h-[70vh] relative z-10 flex flex-col gap-6 bg-[#040404]">
              {/* Dotted texture background decoration */}
              <div className="absolute inset-0 elegant-dots opacity-10 pointer-events-none"></div>
              
              <div className="relative z-10 text-[#d1d1d1] space-y-4 pr-2 selection:bg-red-950">
                {/* Header info */}
                <div className="border-b border-white/5 pb-4 space-y-1">
                  <h2 className="text-xl font-light font-serif tracking-tight text-white/95 flex items-center gap-2">
                    <Feather className="w-4 h-4 text-red-600/60" />
                    {diary.title}
                  </h2>
                  <div className="flex justify-between text-[11px] font-sans tracking-wider text-white/30 pt-1">
                    <span>Penulis: {diary.author}</span>
                    <span>Tanggal: {diary.date}</span>
                  </div>
                </div>

                {/* Content with elegant line height */}
                <p className="text-base leading-relaxed font-serif text-white/80 whitespace-pre-wrap text-justify tracking-wide pt-2">
                  {diary.content}
                </p>

                {/* Stains mockup in paper */}
                <div className="pt-8 flex justify-center text-[10px] tracking-widest text-white/20 uppercase font-mono">
                  * Tinta tercoreng oleh noda lemak dan darah tua *
                </div>
              </div>
            </div>

            {/* Explanatory footer */}
            <div className="px-6 py-3 border-t border-white/5 bg-black/60 flex justify-between items-center z-10">
              <span className="text-[9px] text-white/30 font-mono tracking-widest uppercase">TEKAN ESCAPE UNTUK KEMBALI</span>
              <button
                onClick={onClose}
                className="px-4 py-1.5 bg-white/5 hover:bg-white/10 text-white border border-white/5 rounded text-xs font-mono tracking-widest uppercase transition-all"
              >
                KEMBALI KE GAME
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
