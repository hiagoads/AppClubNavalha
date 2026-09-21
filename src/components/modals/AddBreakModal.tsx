import React, { useState } from 'react';
import { XCircle, Clock, Coffee, PlayCircle, UserCheck, CalendarClock, Scissors, Sparkles } from 'lucide-react';
import { Barber, Booking } from '../../types';

export interface BreakFormData {
  duration: number;
  type: 'now' | 'after_current' | 'scheduled';
  scheduledTime: string;
  barberId: string;
  reason: string;
}

interface AddBreakModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: BreakFormData) => void;
  activeBookings?: Booking[];
  barbers?: Barber[];
  isProcessing?: boolean;
}

const DURATION_PRESETS = [15, 30, 45, 60, 90];
const REASON_PRESETS = ['Almoço / Lanche', 'Café', 'Descanso', 'Manutenção'];

export function AddBreakModal({
  isOpen,
  onClose,
  onConfirm,
  activeBookings = [],
  barbers = [],
  isProcessing = false
}: AddBreakModalProps) {
  const [duration, setDuration] = useState<number>(30);
  const [isCustomDuration, setIsCustomDuration] = useState(false);
  const [type, setType] = useState<'now' | 'after_current' | 'scheduled'>('now');
  const [scheduledTime, setScheduledTime] = useState(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 15);
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });
  const [barberId, setBarberId] = useState<string>('any');
  const [reason, setReason] = useState<string>('Almoço / Lanche');

  if (!isOpen) return null;

  const activeBarbers = barbers.filter(b => b.isActive);
  const hasActiveBookings = activeBookings.length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (duration <= 0) return;
    onConfirm({
      duration: Number(duration),
      type,
      scheduledTime,
      barberId,
      reason: reason.trim() || 'Pausa'
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="glass-card p-6 sm:p-7 bg-[#171717] border border-gold/30 rounded-2xl w-full max-w-lg relative shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Glow Header Accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-gold/20 via-gold to-gold/20" />
        
        {/* Header */}
        <div className="flex justify-between items-center mb-5 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-gold/10 text-gold border border-gold/20">
              <Coffee className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold font-display text-white">
                Adicionar Pausa / Intervalo
              </h3>
              <p className="text-xs text-white/50">Configure o tempo e quando a pausa deve iniciar</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white transition-colors p-1"
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="space-y-5 overflow-y-auto pr-1 flex-1">
          {/* 1. Duração da Pausa */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs uppercase tracking-widest text-gold font-bold flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> 1. Tempo Total da Pausa
              </label>
              <span className="text-xs text-white/70 font-mono font-bold">{duration} minutos</span>
            </div>

            {/* Quick Presets */}
            <div className="grid grid-cols-5 gap-2">
              {DURATION_PRESETS.map((mins) => {
                const isSelected = !isCustomDuration && duration === mins;
                return (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => {
                      setDuration(mins);
                      setIsCustomDuration(false);
                    }}
                    className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all border ${
                      isSelected
                        ? 'bg-gold text-carbon border-gold shadow-lg shadow-gold/20 font-black'
                        : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {mins}m
                  </button>
                );
              })}
            </div>

            {/* Custom duration toggle / input */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setIsCustomDuration(!isCustomDuration)}
                className="text-[11px] text-gold/80 hover:text-gold font-bold underline mb-1.5 block"
              >
                {isCustomDuration ? '← Usar tempos rápidos' : '+ Definir outro tempo em minutos'}
              </button>

              {isCustomDuration && (
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="480"
                    value={duration}
                    onChange={(e) => setDuration(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-black/40 border border-gold/40 rounded-xl p-3 text-white focus:border-gold outline-none transition-colors pr-16 font-mono font-bold"
                    placeholder="Ex: 25"
                    required
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-white/50 uppercase font-bold">
                    minutos
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 2. Momento de Início */}
          <div className="space-y-2.5">
            <label className="text-xs uppercase tracking-widest text-gold font-bold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> 2. Quando Iniciar a Pausa?
            </label>

            <div className="grid grid-cols-1 gap-2.5">
              {/* Option A: Agora */}
              <div
                onClick={() => setType('now')}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                  type === 'now'
                    ? 'bg-gold/10 border-gold shadow-md'
                    : 'bg-white/5 border-white/10 hover:bg-white/10 opacity-70 hover:opacity-100'
                }`}
              >
                <div className={`p-2 rounded-lg mt-0.5 ${type === 'now' ? 'bg-gold text-carbon' : 'bg-white/10 text-white/50'}`}>
                  <PlayCircle className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-white">Adicionar a pausa agora</span>
                    {type === 'now' && <span className="text-[10px] uppercase font-bold text-gold bg-gold/20 px-2 py-0.5 rounded-full">Selecionado</span>}
                  </div>
                  <p className="text-xs text-white/50 mt-0.5">Inicia o cronômetro da pausa imediatamente neste momento.</p>
                </div>
              </div>

              {/* Option B: Ao finalizar cliente atual */}
              <div
                onClick={() => setType('after_current')}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                  type === 'after_current'
                    ? 'bg-gold/10 border-gold shadow-md'
                    : 'bg-white/5 border-white/10 hover:bg-white/10 opacity-70 hover:opacity-100'
                }`}
              >
                <div className={`p-2 rounded-lg mt-0.5 ${type === 'after_current' ? 'bg-gold text-carbon' : 'bg-white/10 text-white/50'}`}>
                  <UserCheck className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-white">Ao finalizar cliente em atendimento</span>
                    {type === 'after_current' && <span className="text-[10px] uppercase font-bold text-gold bg-gold/20 px-2 py-0.5 rounded-full">Selecionado</span>}
                  </div>
                  <p className="text-xs text-white/50 mt-0.5">
                    {hasActiveBookings
                      ? `Inicia assim que o atendimento atual (${activeBookings.map(b => b.clientName).join(', ')}) for concluído.`
                      : 'Nenhum cliente em atendimento no momento (iniciará logo após o próximo ou agora).'}
                  </p>
                </div>
              </div>

              {/* Option C: Programar Horário */}
              <div
                onClick={() => setType('scheduled')}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col gap-2.5 ${
                  type === 'scheduled'
                    ? 'bg-gold/10 border-gold shadow-md'
                    : 'bg-white/5 border-white/10 hover:bg-white/10 opacity-70 hover:opacity-100'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg mt-0.5 ${type === 'scheduled' ? 'bg-gold text-carbon' : 'bg-white/10 text-white/50'}`}>
                    <CalendarClock className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-white">Programar uma hora para começar</span>
                      {type === 'scheduled' && <span className="text-[10px] uppercase font-bold text-gold bg-gold/20 px-2 py-0.5 rounded-full">Selecionado</span>}
                    </div>
                    <p className="text-xs text-white/50 mt-0.5">Escolha um horário fixo de início durante o dia de hoje.</p>
                  </div>
                </div>

                {type === 'scheduled' && (
                  <div className="pl-11 pt-1">
                    <label className="text-[10px] uppercase text-gold font-bold tracking-wider block mb-1">
                      Horário de Início (HH:MM)
                    </label>
                    <input
                      type="time"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      className="w-full bg-black/50 border border-gold/40 rounded-xl p-2.5 text-white focus:border-gold outline-none text-base font-mono font-bold"
                      required={type === 'scheduled'}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 3. Barbeiro (se houver múltiplos) */}
          {activeBarbers.length > 1 && (
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-widest text-gold font-bold flex items-center gap-1.5">
                <Scissors className="w-3.5 h-3.5" /> 3. Barbeiro
              </label>
              <select
                value={barberId}
                onChange={(e) => setBarberId(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-gold outline-none transition-colors"
              >
                <option value="any">Todos os Barbeiros (Pausa Geral / Toda a Barbearia)</option>
                {activeBarbers.map((b) => (
                  <option key={b.id} value={b.id}>
                    Pausa individual: {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 4. Motivo / Descrição */}
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-widest text-gold font-bold flex items-center gap-1.5">
              <Coffee className="w-3.5 h-3.5" /> 4. Motivo / Identificação (Opcional)
            </label>
            
            <div className="flex flex-wrap gap-1.5 mb-1.5">
              {REASON_PRESETS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReason(r)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                    reason === r
                      ? 'bg-gold/20 text-gold border border-gold/40'
                      : 'bg-white/5 text-white/50 border border-white/5 hover:text-white'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Almoço, Lanche, Descanso..."
              className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-gold outline-none transition-colors text-sm"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 flex justify-end gap-3 shrink-0 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2.5 text-white/60 hover:text-white font-bold transition-colors text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isProcessing}
              className="bg-gold text-carbon px-6 py-2.5 rounded-xl font-bold hover:bg-gold-dark transition-all text-sm flex items-center gap-2 shadow-lg shadow-gold/10 font-sans"
            >
              {isProcessing ? 'Salvando...' : 'Confirmar Pausa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
