import React from 'react';
import { X, Scissors } from 'lucide-react';
import { Barber, Booking } from '../../types';

interface CallingBookingModalProps {
  booking: Booking | null;
  onClose: () => void;
  barbers: Barber[];
  onSelectBarber: (bookingId: string, barberId: string) => void;
}

export function CallingBookingModal({
  booking,
  onClose,
  barbers,
  onSelectBarber
}: CallingBookingModalProps) {
  if (!booking) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#111] border border-white/10 p-6 rounded-2xl w-full max-w-md relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-white/40 hover:text-white p-2">
          <X className="w-5 h-5" />
        </button>
        <h3 className="text-xl font-display font-bold mb-6">Selecionar Barbeiro</h3>
        <p className="text-sm text-white/60 mb-6">Selecione qual barbeiro irá atender <strong className="text-white">{booking.clientName}</strong>.</p>
        <div className="grid grid-cols-2 gap-4">
          {barbers.filter(b => b.isActive).map(barber => (
            <button
              key={barber.id}
              onClick={() => {
                onSelectBarber(booking.id, barber.id);
                onClose();
              }}
              className="bg-white/5 border border-white/10 p-4 rounded-xl hover:bg-gold/20 hover:border-gold/50 transition-colors flex flex-col items-center gap-2"
            >
              <Scissors className="w-6 h-6 text-gold" />
              <span className="font-bold">{barber.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
