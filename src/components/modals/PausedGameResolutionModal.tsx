import React, { useState } from 'react';
import { 
  X, 
  Gamepad2, 
  Clock, 
  Sparkles, 
  Check, 
  Tv, 
  Flame, 
  BookmarkCheck, 
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import { VipPausedSession, VipStation } from '../../types';

interface PausedGameResolutionModalProps {
  isOpen: boolean;
  pausedSession: VipPausedSession | null;
  availableStations: VipStation[];
  onClose: () => void;
  onResume: (pausedSessionId: string, targetStationId: string) => void;
  onCreditToAccount: (pausedSessionId: string, hours?: number) => void;
  onDiscard?: (pausedSessionId: string) => void;
}

export function PausedGameResolutionModal({
  isOpen,
  pausedSession,
  availableStations,
  onClose,
  onResume,
  onCreditToAccount,
  onDiscard
}: PausedGameResolutionModalProps) {
  const [selectedStationId, setSelectedStationId] = useState<string>('');
  const [mode, setMode] = useState<'choose' | 'select_station'>('choose');

  if (!isOpen || !pausedSession) return null;

  const handleResumeClick = () => {
    // If the original station is available, preselect it; otherwise preselect first available
    const originalAvailable = availableStations.find(s => s.id === pausedSession.stationId);
    if (originalAvailable) {
      setSelectedStationId(originalAvailable.id);
    } else if (availableStations.length > 0) {
      setSelectedStationId(availableStations[0].id);
    }
    setMode('select_station');
  };

  const handleConfirmStation = () => {
    if (!selectedStationId) return;
    onResume(pausedSession.id, selectedStationId);
    onClose();
  };

  const handleConfirmCredit = () => {
    onCreditToAccount(pausedSession.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-carbon border border-gold/40 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-gold/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold/15 border border-gold/30 flex items-center justify-center text-gold animate-bounce">
              <Gamepad2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-gold font-bold bg-gold/10 px-2 py-0.5 rounded border border-gold/20">
                🎮 Tempo de Jogo Restante
              </span>
              <h2 className="text-lg font-bold text-white mt-0.5">
                {pausedSession.clientName}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info Box */}
        <div className="p-5 space-y-5 overflow-y-auto">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] uppercase font-bold text-white/40 tracking-wider">
                Console Anterior (Pausado para corte)
              </p>
              <p className="text-sm font-bold text-white mt-0.5">
                {pausedSession.stationName} • <span className="text-white/60 font-normal">{pausedSession.consoleModel}</span>
              </p>
              <p className="text-[11px] text-white/40 mt-1">
                A máquina foi liberada automaticamente na hora do chamado do barbeiro.
              </p>
            </div>
            <div className="text-right shrink-0 bg-gold/10 border border-gold/20 rounded-xl px-3 py-2">
              <p className="text-[10px] font-bold text-gold uppercase tracking-wider">Tempo Restante</p>
              <p className="text-2xl font-mono font-black text-gold">
                {pausedSession.remainingMinutes} <span className="text-xs font-normal">min</span>
              </p>
            </div>
          </div>

          {mode === 'choose' ? (
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-white/70">
                O que você deseja fazer com o tempo restante do jogador?
              </p>

              {/* Opção 1: Direcionar para console agora */}
              <button
                type="button"
                onClick={handleResumeClick}
                disabled={availableStations.length === 0}
                className="w-full text-left p-4 rounded-xl border border-gold/30 bg-gold/10 hover:bg-gold/20 transition-all flex items-start gap-3.5 group disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <div className="p-2.5 rounded-lg bg-gold text-carbon shrink-0 font-bold">
                  <Tv className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm text-white group-hover:text-gold transition-colors">
                      Direcionar para Console Agora
                    </h4>
                    <ArrowRight className="w-4 h-4 text-gold group-hover:translate-x-1 transition-transform" />
                  </div>
                  <p className="text-xs text-white/60 mt-0.5">
                    {availableStations.length > 0 
                      ? `Escolher entre os ${availableStations.length} consoles disponíveis para ele continuar jogando seus ${pausedSession.remainingMinutes} min.` 
                      : 'Nenhum console disponível no momento (todos ocupados).'}
                  </p>
                </div>
              </button>

              {/* Opção 2: Guardar tempo para outro dia */}
              <button
                type="button"
                onClick={handleConfirmCredit}
                className="w-full text-left p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 transition-all flex items-start gap-3.5 group"
              >
                <div className="p-2.5 rounded-lg bg-emerald-500 text-carbon shrink-0 font-bold">
                  <BookmarkCheck className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm text-white group-hover:text-emerald-400 transition-colors">
                      Guardar Tempo para Outro Dia (Salvar na Conta)
                    </h4>
                    <ArrowRight className="w-4 h-4 text-emerald-400 group-hover:translate-x-1 transition-transform" />
                  </div>
                  <p className="text-xs text-white/60 mt-0.5">
                    Credita o tempo restante na conta do cliente como Bônus VIP para ser gasto em qualquer outra visita.
                  </p>
                </div>
              </button>

              {/* Opção 3: Deixar pendente / Decidir depois */}
              <div className="pt-2 flex items-center justify-between border-t border-white/10 text-xs">
                <button
                  type="button"
                  onClick={onClose}
                  className="text-white/50 hover:text-white transition-colors"
                >
                  Decidir depois (Manter pausado na Sala VIP)
                </button>
                {onDiscard && (
                  <button
                    type="button"
                    onClick={() => {
                      onDiscard(pausedSession.id);
                      onClose();
                    }}
                    className="text-red-400/60 hover:text-red-400 transition-colors"
                  >
                    Descartar tempo
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* Selecionar console */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-white/70">
                  Selecione o Console para Jogar ({pausedSession.remainingMinutes} min)
                </p>
                <button
                  type="button"
                  onClick={() => setMode('choose')}
                  className="text-gold text-xs hover:underline"
                >
                  Voltar
                </button>
              </div>

              {availableStations.length === 0 ? (
                <div className="p-6 bg-white/5 rounded-xl text-center text-white/40 text-xs">
                  Não há consoles livres no momento. Você pode guardar o tempo na conta para outro dia.
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {availableStations.map(station => {
                    const isOriginal = station.id === pausedSession.stationId;
                    const isSelected = selectedStationId === station.id;

                    return (
                      <button
                        key={station.id}
                        type="button"
                        onClick={() => setSelectedStationId(station.id)}
                        className={`w-full p-3.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                          isSelected
                            ? 'bg-gold/15 border-gold shadow-md shadow-gold/10'
                            : 'bg-white/5 border-white/10 hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${isSelected ? 'bg-gold text-carbon' : 'bg-white/10 text-white/60'}`}>
                            <Tv className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-white">{station.name}</span>
                              {isOriginal && (
                                <span className="text-[10px] bg-gold/20 text-gold px-1.5 py-0.5 rounded font-bold uppercase">
                                  Mesmo Console
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-white/50">{station.consoleModel}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                            Disponível
                          </span>
                          {isSelected && <Check className="w-4 h-4 text-gold" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setMode('choose')}
                  className="px-4 py-2 text-xs font-bold text-white/60 hover:text-white"
                >
                  Voltar
                </button>
                <button
                  type="button"
                  disabled={!selectedStationId}
                  onClick={handleConfirmStation}
                  className="btn-primary text-xs font-bold py-2.5 px-5 rounded-xl flex items-center gap-2 disabled:opacity-40"
                >
                  <Gamepad2 className="w-4 h-4" />
                  Iniciar no Console Selecionado
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
