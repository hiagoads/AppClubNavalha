import React from 'react';
import { X, CheckCircle, Sparkles } from 'lucide-react';
import { Barber, Booking, ClientDependent } from '../../types';

interface CompletingBookingModalProps {
  booking: Booking | null;
  onClose: () => void;
  barbers: Barber[];
  completionBarberId: string;
  setCompletionBarberId: (id: string) => void;
  onConfirm: () => void;
  dependents?: ClientDependent[];
  parentClientName?: string;
  awardTarget?: string;
  setAwardTarget?: (target: string) => void;
  pointsToGive?: number;
}

export function CompletingBookingModal({
  booking,
  onClose,
  barbers,
  completionBarberId,
  setCompletionBarberId,
  onConfirm,
  dependents = [],
  parentClientName,
  awardTarget = 'parent',
  setAwardTarget,
  pointsToGive = 0
}: CompletingBookingModalProps) {
  if (!booking) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#111] border border-white/10 p-6 rounded-2xl w-full max-w-md relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-white/40 hover:text-white p-2">
          <X className="w-5 h-5" />
        </button>
        <h3 className="text-xl font-display font-bold mb-1 text-green-500">Concluir Serviço</h3>
        <p className="text-sm text-white/60 mb-5">
          Quem realizou o serviço de <strong className="text-white">{booking.clientName}</strong>?
        </p>

        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-2 max-h-[30vh] overflow-y-auto pr-2 custom-scrollbar">
            {barbers.filter(b => b.isActive).map(b => (
              <button
                key={b.id}
                onClick={() => setCompletionBarberId(b.id)}
                className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                  completionBarberId === b.id 
                    ? 'bg-gold/20 border-gold/50 text-gold shadow-sm shadow-gold/10' 
                    : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10'
                }`}
              >
                {b.photoUrl ? (
                  <img src={b.photoUrl} alt={b.name} className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-sm font-bold">
                    {b.name.substring(0,2).toUpperCase()}
                  </div>
                )}
                <span className="text-sm font-bold text-center truncate w-full">{b.name}</span>
              </button>
            ))}
          </div>

          {/* Opção de Destino dos Pontos (Pai vs Filho/Dependente) */}
          {pointsToGive > 0 && dependents.length > 0 && setAwardTarget && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gold">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Destino dos Pontos (+{pointsToGive.toLocaleString('pt-BR')} pts)</span>
                </div>
                {booking.dependentName && (
                  <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full font-bold">
                    Corte de: {booking.dependentName}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-white/50">
                Identificação do atendimento e distribuição de pontos:
              </p>
              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={() => setAwardTarget('parent')}
                  className={`p-3 rounded-xl border text-left text-xs font-bold transition-all ${
                    awardTarget === 'parent'
                      ? 'bg-gold/20 border-gold/60 text-gold shadow-sm shadow-gold/10'
                      : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="truncate text-white">Atendimento do Titular ({parentClientName || 'Responsável'})</span>
                    {awardTarget === 'parent' && <CheckCircle className="w-4 h-4 text-gold shrink-0 ml-1.5" />}
                  </div>
                  <p className="text-[10px] text-white/40 mt-1 font-normal">
                    Todos os pontos (+{pointsToGive} pts) em XP, Patente e Ranking Semanal vão para o titular.
                  </p>
                </button>

                {dependents.map(dep => {
                  const isSelected = awardTarget === dep.id;
                  return (
                    <button
                      key={dep.id}
                      type="button"
                      onClick={() => setAwardTarget(dep.id)}
                      className={`p-3 rounded-xl border text-left text-xs font-bold transition-all ${
                        isSelected
                          ? 'bg-purple-500/20 border-purple-500/60 text-purple-200 shadow-sm shadow-purple-500/10'
                          : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="truncate text-purple-300 font-bold">Atendimento do Dependente: {dep.name}</span>
                        {isSelected && <CheckCircle className="w-4 h-4 text-purple-400 shrink-0 ml-1.5" />}
                      </div>
                      <p className="text-[10px] text-white/50 mt-1 font-normal leading-relaxed">
                        <strong className="text-gold font-semibold">XP e Patente (+{pointsToGive} pts):</strong> vão para a conta do responsável ({parentClientName || 'Titular'}).<br />
                        <strong className="text-purple-300 font-semibold">Ranking Semanal (+{pointsToGive} pts):</strong> vai para a subconta de {dep.name}.
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <button
            onClick={onConfirm}
            className="w-full bg-green-500 text-[#111] p-4 rounded-xl hover:bg-green-400 transition-colors font-bold flex items-center justify-center gap-2 mt-2 shadow-lg shadow-green-500/20"
          >
            <CheckCircle className="w-5 h-5" />
            Confirmar Conclusão
          </button>
        </div>
      </div>
    </div>
  );
}
