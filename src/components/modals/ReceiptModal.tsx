import React from 'react';
import { motion } from 'framer-motion';
import { X, Check } from 'lucide-react';

interface ReceiptData {
  clientName: string;
  services: string;
  date: string;
  time: string;
  expectedPrice: number;
}

interface ReceiptModalProps {
  isOpen: boolean;
  receipt: ReceiptData | null;
  onClose: () => void;
}

export function ReceiptModal({ isOpen, receipt, onClose }: ReceiptModalProps) {
  if (!isOpen || !receipt) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/80 flex flex-col justify-center items-center p-4"
    >
      <motion.div 
        initial={{ y: 200, scale: 0.9 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: 200, scale: 0.9 }}
        className="bg-carbon-light rounded-2xl p-6 border border-white/10 w-full max-w-sm max-h-[90vh] overflow-y-auto overflow-x-hidden relative"
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-white/40 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
        
        <div className="text-center mb-6 mt-2">
          <div className="w-12 h-12 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
            <Check className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-display font-bold text-white">Horário Agendado!</h2>
          <p className="text-white/60 text-sm mt-1">Detalhes da reserva</p>
        </div>

        <div className="bg-carbon border border-white/5 rounded-xl p-4 space-y-3 font-mono text-sm mb-6">
          <div className="flex justify-between border-b border-white/5 pb-2">
            <span className="text-white/40">Cliente:</span>
            <span className="text-white text-right font-medium">{receipt.clientName}</span>
          </div>
          <div className="flex justify-between border-b border-white/5 pb-2">
            <span className="text-white/40">Serviços:</span>
            <span className="text-white text-right max-w-[150px] truncate">{receipt.services}</span>
          </div>
          <div className="flex justify-between border-b border-white/5 pb-2">
            <span className="text-white/40">Data:</span>
            <span className="text-gold font-medium">{receipt.date} às {receipt.time}</span>
          </div>
          <div className="flex justify-between pt-1">
            <span className="text-white/40">Valor Total:</span>
            <span className="text-gold font-bold text-lg">R$ {receipt.expectedPrice.toFixed(2)}</span>
          </div>
        </div>

        <button 
          onClick={onClose}
          className="w-full bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded-xl transition-colors"
        >
          Fechar
        </button>
      </motion.div>
    </motion.div>
  );
}
