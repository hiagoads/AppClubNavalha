import React from 'react';
import { X, ArrowLeft, XCircle } from 'lucide-react';
import { Booking } from '../../types';

interface CancelingBookingModalProps {
  booking: Booking | null;
  onClose: () => void;
  onReturnToQueue: (id: string) => void;
  onCancelBooking: (id: string) => void;
}

export function CancelingBookingModal({
  booking,
  onClose,
  onReturnToQueue,
  onCancelBooking
}: CancelingBookingModalProps) {
  if (!booking) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#111] border border-white/10 p-6 rounded-2xl w-full max-w-md relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-white/40 hover:text-white p-2">
          <X className="w-5 h-5" />
        </button>
        <h3 className="text-xl font-display font-bold mb-6 text-red-500">Cancelar Ação</h3>
        <p className="text-sm text-white/60 mb-6">O que deseja fazer com <strong className="text-white">{booking.clientName}</strong>?</p>
        <div className="flex flex-col gap-3">
          <button
            onClick={() => onReturnToQueue(booking.id)}
            className="bg-yellow-500/20 text-yellow-500 border border-yellow-500/40 p-4 rounded-xl hover:bg-yellow-500/30 transition-colors font-bold flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            Devolver para a Fila
          </button>
          <button
            onClick={() => onCancelBooking(booking.id)}
            className="bg-red-500/20 text-red-500 border border-red-500/40 p-4 rounded-xl hover:bg-red-500/30 transition-colors font-bold flex items-center justify-center gap-2"
          >
            <XCircle className="w-5 h-5" />
            Cancelar Agendamento Totalmente
          </button>
        </div>
      </div>
    </div>
  );
}
