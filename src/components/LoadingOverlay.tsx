import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function LoadingOverlay({ isVisible }: { isVisible: boolean }) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center backdrop-blur-sm"
        >
          <div className="flex flex-col items-center p-6 bg-carbon rounded-2xl border border-white/10 shadow-2xl">
            <div className="w-12 h-12 border-4 border-gold border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-white font-medium">Processando...</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
