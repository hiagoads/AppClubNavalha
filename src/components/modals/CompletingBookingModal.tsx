import React from 'react';
import { X, CheckCircle } from 'lucide-react';
import { Barber, Booking } from '../../types';

interface CompletingBookingModalProps {
  booking: Booking | null;
  onClose: () => void;
  barbers: Barber[];
  completionBarberId: string;
  setCompletionBarberId: (id: string) => void;
  onConfirm: () => void;
}

export function CompletingBookingModal({
  booking,
  onClose,
  barbers,
  completionBarberId,
  setCompletionBarberId,
  onConfirm
}: CompletingBookingModalProps) {
  if (!booking) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#111] border border-white/10 p-6 rounded-2xl w-full max-w-md relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-white/40 hover:text-white p-2">
          <X className="w-5 h-5" />
        </button>
        <h3 className="text-xl font-display font-bold mb-2 text-green-500">Concluir Serviço</h3>
        <p className="text-sm text-white/60 mb-6">Quem realizou o serviço de <strong className="text-white">{booking.clientName}</strong>?</p>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-2 max-h-[40vh] overflow-y-auto pr-2">
            {barbers.filter(b => b.isActive).map(b => (
              <button
                key={b.id}
                onClick={() => setCompletionBarberId(b.id)}
                className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${completionBarberId === b.id ? 'bg-gold/20 border-gold/50 text-gold shadow-sm shadow-gold/10' : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10'}`}
              >
                {b.photoUrl ? (
                  <img src={b.photoUrl} alt={b.name} className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-sm font-bold">
                    {b.name.substring(0,2).toUpperCase()}
                  </div>
                )}
                <span className="text-sm font-bold text-center">{b.name}</span>
              </button>
            ))}
          </div>
          <button
            onClick={onConfirm}
            className="w-full bg-green-500 text-[#111] p-4 rounded-xl hover:bg-green-400 transition-colors font-bold flex items-center justify-center gap-2 mt-2"
          >
            <CheckCircle className="w-5 h-5" />
            Confirmar Conclusão
          </button>
        </div>
      </div>
    </div>
  );
}
