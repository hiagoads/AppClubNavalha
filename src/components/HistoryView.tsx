import { useState } from 'react';
import { useHistory } from '../hooks/useHistory';
import { useBarbers } from '../hooks/useBarbers';
import { 
  RotateCcw, 
  Clock, 
  Trash2, 
  Loader2, 
  Ban, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  X, 
  Scissors, 
  UserCheck 
} from 'lucide-react';
import { Booking } from '../types';
import { revertCompletedBookingGamification, RevertGamificationResult } from '../utils/revertBookingGamification';
import { useGamificationSettings } from '../hooks/useGamificationSettings';
import toast from 'react-hot-toast';

export function HistoryView() {
  const { history, loadingHistory } = useHistory();
  const { barbers } = useBarbers();
  const { tierThresholds } = useGamificationSettings();

  // Booking selected for cancellation / reversal modal
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [actionChoice, setActionChoice] = useState<'return_to_queue' | 'cancel' | 'delete' | null>(null);
  const [cancellationReason, setCancellationReason] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  const getBarberName = (barberId?: string) => {
    if (!barberId || barberId === 'any') return 'Qualquer barbeiro';
    const b = barbers.find(barber => barber.id === barberId);
    return b ? b.name : 'Barbeiro';
  };

  const getCompletedTime = (booking: any) => {
    if (!booking.estimatedEndTime) return '';
    let time = 0;
    if (typeof booking.estimatedEndTime.toMillis === 'function') {
      time = booking.estimatedEndTime.toMillis();
    } else if (typeof booking.estimatedEndTime === 'string') {
      time = new Date(booking.estimatedEndTime).getTime();
    } else if (typeof booking.estimatedEndTime === 'number') {
      time = booking.estimatedEndTime;
    }
    
    if (time === 0) return '';
    return new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleExecuteReversal = async (targetAction: 'return_to_queue' | 'cancel' | 'delete') => {
    if (!selectedBooking) return;
    setIsProcessing(true);

    try {
      const defaultReason = targetAction === 'return_to_queue'
        ? 'Atendimento devolvido para a fila de espera'
        : targetAction === 'cancel'
        ? (cancellationReason.trim() || 'Atendimento cancelado pelo barbeiro/administrador')
        : 'Registro excluído pelo administrador';

      const result: RevertGamificationResult = await revertCompletedBookingGamification(
        selectedBooking,
        defaultReason,
        tierThresholds,
        targetAction
      );

      if (result.reverted) {
        if (targetAction === 'return_to_queue') {
          toast.success(
            `Cliente ${result.clientName || ''} devolvido para a fila! ${result.pointsDeducted ? `(-${result.pointsDeducted} pts estornados)` : ''}`
          );
        } else if (targetAction === 'cancel') {
          toast.success(
            `Atendimento cancelado! ${result.pointsDeducted ? `-${result.pointsDeducted} pts estornados de ${result.clientName || 'cliente'}.` : ''}`
          );
        } else {
          toast.success(`Registro excluído com sucesso!`);
        }

        if (result.newTier && result.previousTier && result.newTier !== result.previousTier) {
          toast(`Patente do cliente atualizada: ${result.previousTier} ➔ ${result.newTier}`, {
            icon: '📉',
            duration: 5000
          });
        }

        if (result.revokedBonuses && result.revokedBonuses.length > 0) {
          toast(`Prêmios de patente pendentes revogados: ${result.revokedBonuses.join(', ')}`, {
            icon: '⚠️',
            duration: 6000
          });
        }
      } else {
        toast.success(
          targetAction === 'return_to_queue'
            ? 'Cliente devolvido para a fila!'
            : targetAction === 'cancel'
            ? 'Atendimento cancelado!'
            : 'Registro excluído!'
        );
      }

      setSelectedBooking(null);
      setActionChoice(null);
      setCancellationReason('');
    } catch (err) {
      console.error('Erro ao processar estorno:', err);
      toast.error('Erro ao processar estorno do atendimento');
    } finally {
      setIsProcessing(false);
    }
  };

  if (loadingHistory) {
    return (
      <div className="p-12 text-center text-white/50 glass-card flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-gold" />
        <p className="text-sm">Carregando histórico de atendimentos...</p>
      </div>
    );
  }

  // Filtrar apenas o histórico de hoje
  const todayBegin = new Date();
  todayBegin.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const todaysHistory = history.filter(h => {
    if (!h.estimatedEndTime) return true;
    let time = 0;
    if (typeof (h.estimatedEndTime as any).toMillis === 'function') time = (h.estimatedEndTime as any).toMillis();
    else if (typeof h.estimatedEndTime === 'string') time = new Date(h.estimatedEndTime).getTime();
    else if (typeof h.estimatedEndTime === 'number') time = h.estimatedEndTime as number;
    return time >= todayBegin.getTime() && time <= todayEnd.getTime();
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="glass-card p-6 border border-white/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-xl font-bold text-white font-display">Cortes Finalizados Hoje</h2>
            <span className="bg-gold/15 text-gold border border-gold/30 text-xs px-2.5 py-0.5 rounded-full font-bold">
              {todaysHistory.length}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-white/50 mt-1 max-w-2xl">
            Ao cancelar ou devolver um atendimento para a fila, todos os pontos XP, ranking semanal, patente e prêmios obtidos são automaticamente subtraídos da conta do cliente.
          </p>
        </div>
      </div>

      {todaysHistory.length === 0 ? (
        <div className="p-12 text-center glass-card border border-white/10 rounded-2xl">
          <Clock className="w-10 h-10 text-white/20 mx-auto mb-3" />
          <h3 className="text-white/80 font-bold text-base">Nenhum corte finalizado hoje</h3>
          <p className="text-xs text-white/40 mt-1">Os atendimentos concluídos durante o expediente aparecerão aqui.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {todaysHistory.map((booking) => {
            const pointsAwarded = typeof booking.pointsAwarded === 'number' ? booking.pointsAwarded : 0;
            const isClubeNavalha = !!(booking.clientId || (booking as any).awardedClientId);
            const depName = (booking as any).dependentName;

            return (
              <div 
                key={booking.id} 
                className="glass-card p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border border-white/5 hover:border-gold/30 transition-all rounded-xl"
              >
                <div className="flex items-start sm:items-center gap-3.5 flex-1 min-w-0">
                  <div className="p-2.5 rounded-xl bg-gold/10 text-gold shrink-0 mt-0.5 sm:mt-0">
                    <Scissors className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-white text-base tracking-wide truncate">
                        {booking.clientName}
                      </span>

                      {depName && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30 uppercase tracking-wider">
                          Dependente: {depName}
                        </span>
                      )}

                      {isClubeNavalha && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gold/15 text-gold border border-gold/30 uppercase tracking-wider flex items-center gap-1">
                          <Sparkles className="w-2.5 h-2.5" />
                          Clube Navalha
                        </span>
                      )}

                      {pointsAwarded > 0 && (
                        <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          +{pointsAwarded} pts
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-white/40 mt-1 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-white/30" />
                        Finalizado às {getCompletedTime(booking) || 'Hoje'}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <UserCheck className="w-3.5 h-3.5 text-white/30" />
                        {getBarberName(booking.barberId)}
                      </span>
                      {booking.price && (
                        <>
                          <span>•</span>
                          <span className="text-white/60 font-medium">
                            R$ {Number(booking.price).toFixed(2).replace('.', ',')}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Ações */}
                <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-white/5">
                  <button
                    onClick={() => {
                      setSelectedBooking(booking);
                      setActionChoice('return_to_queue');
                    }}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-xl transition-all"
                    title="Devolver para a fila de espera"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Devolver p/ Fila</span>
                  </button>

                  <button
                    onClick={() => {
                      setSelectedBooking(booking);
                      setActionChoice('cancel');
                    }}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-xl transition-all"
                    title="Cancelar este atendimento e subtrair pontos"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    <span>Cancelar</span>
                  </button>

                  <button
                    onClick={() => {
                      setSelectedBooking(booking);
                      setActionChoice('delete');
                    }}
                    className="p-2 text-xs font-bold text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-xl transition-all"
                    title="Excluir registro permanentemente"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Cancelamento / Devolução para Fila com Estorno de Gamificação */}
      {selectedBooking && actionChoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="glass-card max-w-lg w-full p-6 border border-white/10 rounded-2xl shadow-2xl space-y-5 animate-scale-in">
            {/* Header Modal */}
            <div className="flex justify-between items-start border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${
                  actionChoice === 'return_to_queue'
                    ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                    : actionChoice === 'cancel'
                    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                    : 'bg-red-500/15 text-red-400 border border-red-500/30'
                }`}>
                  {actionChoice === 'return_to_queue' && <RotateCcw className="w-5 h-5" />}
                  {actionChoice === 'cancel' && <Ban className="w-5 h-5" />}
                  {actionChoice === 'delete' && <Trash2 className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {actionChoice === 'return_to_queue' && 'Devolver para a Fila'}
                    {actionChoice === 'cancel' && 'Cancelar Atendimento'}
                    {actionChoice === 'delete' && 'Excluir Registro'}
                  </h3>
                  <p className="text-xs text-white/50">
                    Cliente: <strong className="text-white">{selectedBooking.clientName}</strong>
                    {(selectedBooking as any).dependentName && ` (Dependente: ${(selectedBooking as any).dependentName})`}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setSelectedBooking(null);
                  setActionChoice(null);
                  setCancellationReason('');
                }}
                disabled={isProcessing}
                className="text-white/40 hover:text-white transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Aviso sobre Estorno de Gamificação */}
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-400 text-sm">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Estorno Automático no Clube Navalha</span>
              </div>
              <p>
                {typeof selectedBooking.pointsAwarded === 'number' && selectedBooking.pointsAwarded > 0 ? (
                  <>Este corte creditou <strong>{selectedBooking.pointsAwarded} pontos</strong>.</>
                ) : (
                  <>Todos os pontos e benefícios concedidos por este corte serão estornados.</>
                )}
              </p>
              <ul className="list-disc list-inside space-y-1 text-white/70 pt-1 border-t border-amber-500/20">
                <li>Saldo gastável (XP) será subtraído da conta.</li>
                <li>Pontos do Ranking Semanal serão removidos.</li>
                <li>XP Sazonal e Patente serão recalculados.</li>
                <li>Prêmios e bônus de patente pendentes não resgatados serão revogados.</li>
              </ul>
            </div>

            {/* Motivo do Cancelamento (se for cancelamento) */}
            {actionChoice === 'cancel' && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-1.5">
                  Motivo do Cancelamento (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Cliente desistiu após o início, erro de lançamento, etc."
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-gold transition-colors"
                />
              </div>
            )}

            {/* Botões de Escolha de Ação */}
            <div className="space-y-2 pt-2">
              {actionChoice === 'return_to_queue' && (
                <button
                  disabled={isProcessing}
                  onClick={() => handleExecuteReversal('return_to_queue')}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 disabled:opacity-50"
                >
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                  Confirmar Devolução para Fila
                </button>
              )}

              {actionChoice === 'cancel' && (
                <button
                  disabled={isProcessing}
                  onClick={() => handleExecuteReversal('cancel')}
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-600/20 disabled:opacity-50"
                >
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
                  Confirmar Cancelamento do Atendimento
                </button>
              )}

              {actionChoice === 'delete' && (
                <button
                  disabled={isProcessing}
                  onClick={() => handleExecuteReversal('delete')}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-600/20 disabled:opacity-50"
                >
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Confirmar Exclusão Definitiva
                </button>
              )}

              {/* Botão de alternar ação rapidamente */}
              <div className="flex gap-2 pt-2">
                {actionChoice !== 'return_to_queue' && (
                  <button
                    disabled={isProcessing}
                    onClick={() => setActionChoice('return_to_queue')}
                    className="flex-1 py-2 text-xs font-semibold text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg transition-colors border border-blue-500/20"
                  >
                    Mudar p/ Devolver à Fila
                  </button>
                )}
                {actionChoice !== 'cancel' && (
                  <button
                    disabled={isProcessing}
                    onClick={() => setActionChoice('cancel')}
                    className="flex-1 py-2 text-xs font-semibold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 rounded-lg transition-colors border border-amber-500/20"
                  >
                    Mudar p/ Cancelar
                  </button>
                )}
              </div>

              <button
                disabled={isProcessing}
                onClick={() => {
                  setSelectedBooking(null);
                  setActionChoice(null);
                  setCancellationReason('');
                }}
                className="w-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white font-semibold py-2.5 rounded-xl transition-all text-xs"
              >
                Voltar sem alterar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
