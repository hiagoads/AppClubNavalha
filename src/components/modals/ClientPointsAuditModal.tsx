import React, { useState, useEffect } from 'react';
import { 
  X, 
  History, 
  Award, 
  ArrowUpRight, 
  ArrowDownRight, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  Plus, 
  Minus,
  Sparkles, 
  ShieldAlert, 
  Search,
  Filter
} from 'lucide-react';
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { PointTransaction } from '../../types';
import { DEFAULT_THRESHOLDS, getLevelTier } from '../../utils/tierSystem';
import toast from 'react-hot-toast';

interface ClientPointsAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: any | null;
  onClientUpdated?: (updatedClient: any) => void;
}

export function ClientPointsAuditModal({
  isOpen,
  onClose,
  client,
  onClientUpdated
}: ClientPointsAuditModalProps) {
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [filterType, setFilterType] = useState<'all' | 'positive' | 'negative'>('all');
  const [isFixingNegative, setIsFixingNegative] = useState(false);

  // Manual Quick Adjustment inside Modal
  const [showAdjustForm, setShowAdjustForm] = useState(false);
  const [adjPoints, setAdjPoints] = useState('');
  const [adjAction, setAdjAction] = useState<'add' | 'remove'>('add');
  const [adjReason, setAdjReason] = useState('');
  const [isSubmittingAdj, setIsSubmittingAdj] = useState(false);

  useEffect(() => {
    if (!isOpen || !client?.id) return;

    setLoadingTransactions(true);
    const q = query(
      collection(db, 'point_transactions'),
      where('clientId', '==', client.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      } as PointTransaction));

      // Ordenar por data decrescente
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setTransactions(list);
      setLoadingTransactions(false);
    }, (error) => {
      if (error.code !== 'permission-denied') console.error("Error loading client transactions:", error);
      setLoadingTransactions(false);
    });

    return () => unsubscribe();
  }, [isOpen, client?.id]);

  if (!isOpen || !client) return null;

  const currentPoints = client.points ?? 0;
  const isNegative = currentPoints < 0;

  // Função para corrigir saldo negativo para 0
  const handleFixNegativeBalance = async () => {
    if (!client?.id) return;
    setIsFixingNegative(true);
    try {
      const clientRef = doc(db, 'clients', client.id);
      const snap = await getDoc(clientRef);
      const data = snap.exists() ? snap.data() : client;
      const prevPoints = data.points ?? 0;

      // Normaliza para 0
      const updatedPayload = {
        points: 0,
        seasonalPoints: Math.max(0, data.seasonalPoints ?? 0),
        weeklyPoints: Math.max(0, data.weeklyPoints ?? 0)
      };

      await updateDoc(clientRef, updatedPayload);

      // Registra transação corretiva no extrato de auditoria
      await addDoc(collection(db, 'point_transactions'), {
        clientId: client.id,
        clientName: client.username || client.firstName || 'Cliente',
        points: Math.abs(prevPoints),
        type: 'correction',
        description: `Correção de auditoria: saldo negativo normalizado de ${prevPoints} para 0 pts`,
        balanceAfter: 0,
        createdAt: new Date().toISOString()
      });

      const updated = {
        ...client,
        ...updatedPayload
      };
      if (onClientUpdated) onClientUpdated(updated);

      toast.success(`Saldo de ${client.username} corrigido para 0 pts com sucesso!`);
    } catch (err) {
      console.error('Erro ao corrigir saldo negativo:', err);
      toast.error('Erro ao corrigir saldo negativo.');
    } finally {
      setIsFixingNegative(false);
    }
  };

  // Ajuste manual com piso zero garantido
  const handleManualAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    const pts = parseInt(adjPoints);
    if (!pts || pts <= 0) {
      toast.error('Informe uma quantidade válida maior que zero.');
      return;
    }

    setIsSubmittingAdj(true);
    try {
      const clientRef = doc(db, 'clients', client.id);
      const snap = await getDoc(clientRef);
      const data = snap.exists() ? snap.data() : client;

      const currentPts = data.points ?? 0;
      const currentSeasonal = data.seasonalPoints ?? 0;
      const currentWeekly = data.weeklyPoints ?? 0;

      let newPts = 0;
      let newSeasonal = 0;
      let newWeekly = 0;
      let pointsChange = 0;

      let seasonHighest = Math.max(data.seasonHighestPoints ?? 0, data.highestSeasonalPoints ?? 0, currentSeasonal, currentPts);
      let highestTier = data.seasonHighestTierLevel ?? data.highestTierLevel ?? 1;

      if (adjAction === 'add') {
        newPts = Math.max(0, currentPts + pts);
        newSeasonal = Math.max(0, currentSeasonal + pts);
        newWeekly = Math.max(0, currentWeekly + pts);
        seasonHighest = Math.max(seasonHighest, newSeasonal, newPts);
        const tierInfo = getLevelTier(seasonHighest, DEFAULT_THRESHOLDS, highestTier);
        highestTier = Math.max(highestTier, tierInfo.tierLevel);
        pointsChange = pts;
      } else {
        // Remover com piso zero garantido (NUNCA fica negativo)
        // Regra de não-regressão: a patente e os pontos de pico sazonais NUNCA regridem na dedução de saldo
        newPts = Math.max(0, currentPts - pts);
        newSeasonal = currentSeasonal;
        newWeekly = Math.max(0, currentWeekly - pts);
        pointsChange = -(currentPts - newPts); // quantidade real debitada
      }

      await updateDoc(clientRef, {
        points: newPts,
        seasonalPoints: newSeasonal,
        seasonHighestPoints: seasonHighest,
        highestSeasonalPoints: seasonHighest,
        seasonHighestTierLevel: highestTier,
        highestTierLevel: highestTier,
        weeklyPoints: newWeekly
      });

      await addDoc(collection(db, 'point_transactions'), {
        clientId: client.id,
        clientName: client.username || client.firstName || 'Cliente',
        points: pointsChange,
        type: adjAction === 'add' ? 'manual_add' : 'manual_remove',
        description: adjReason || (adjAction === 'add' ? 'Ajuste Manual (Adição)' : 'Ajuste Manual (Remoção)'),
        balanceAfter: newPts,
        createdAt: new Date().toISOString()
      });

      const updated = {
        ...client,
        points: newPts,
        seasonalPoints: newSeasonal,
        seasonHighestPoints: seasonHighest,
        highestSeasonalPoints: seasonHighest,
        seasonHighestTierLevel: highestTier,
        highestTierLevel: highestTier,
        weeklyPoints: newWeekly
      };
      if (onClientUpdated) onClientUpdated(updated);

      toast.success(`${pts} pontos ${adjAction === 'add' ? 'creditados' : 'debitados'} com sucesso!`);
      setAdjPoints('');
      setAdjReason('');
      setShowAdjustForm(false);
    } catch (err) {
      console.error('Erro ao ajustar pontos:', err);
      toast.error('Erro ao realizar ajuste de pontos.');
    } finally {
      setIsSubmittingAdj(false);
    }
  };

  const filteredTransactions = transactions.filter(t => {
    if (filterType === 'positive') return (t.points ?? 0) > 0;
    if (filterType === 'negative') return (t.points ?? 0) < 0;
    return true;
  });

  const totalEarned = transactions
    .filter(t => (t.points ?? 0) > 0)
    .reduce((sum, t) => sum + t.points, 0);

  const totalSpent = transactions
    .filter(t => (t.points ?? 0) < 0)
    .reduce((sum, t) => sum + Math.abs(t.points), 0);

  const getTransactionBadge = (type?: string, points?: number) => {
    if ((points ?? 0) < 0) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-md">
          <ArrowDownRight className="w-3 h-3" /> Débito / Resgate
        </span>
      );
    }
    if (type === 'correction') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md">
          <Sparkles className="w-3 h-3" /> Correção de Auditoria
        </span>
      );
    }
    if (type === 'rank_bonus') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
          <Award className="w-3 h-3" /> Bônus de Patente
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
        <ArrowUpRight className="w-3 h-3" /> Crédito / Ganho
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#181818] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold/15 border border-gold/30 flex items-center justify-center text-gold">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display font-bold text-white text-base">
                  Extrato & Auditoria de Pontos
                </h3>
                {isNegative && (
                  <span className="bg-red-500 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                    <ShieldAlert className="w-3 h-3" /> Saldo Negativo
                  </span>
                )}
              </div>
              <p className="text-xs text-white/50">
                Cliente: <span className="font-bold text-white">{client.firstName ? `${client.firstName} ${client.lastName || ''}` : client.username}</span> (@{client.username})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-5 overflow-y-auto custom-scrollbar">
          
          {/* Banner de Alerta se estiver Negativo */}
          {isNegative && (
            <div className="p-4 rounded-xl bg-red-950/50 border border-red-500/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg shadow-red-950/40">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-red-300">
                    Atenção: Saldo Negativo Detectado ({currentPoints} pts)
                  </h4>
                  <p className="text-[11px] text-red-300/70 mt-0.5">
                    O saldo ficou negativo após uma remoção manual ou resgate sem trava de piso. Clique ao lado para normalizar imediatamente para 0 pts.
                  </p>
                </div>
              </div>
              <button
                onClick={handleFixNegativeBalance}
                disabled={isFixingNegative}
                className="bg-red-500 hover:bg-red-600 text-white text-xs font-bold px-3 py-2 rounded-lg transition-all shrink-0 flex items-center gap-1.5 shadow-md"
              >
                {isFixingNegative ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                <span>Corrigir para 0 pts</span>
              </button>
            </div>
          )}

          {/* Cards com Resumo do Saldo */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className={`p-3 rounded-xl border ${
              isNegative 
                ? 'bg-red-950/30 border-red-500/40' 
                : 'bg-white/[0.03] border-white/10'
            }`}>
              <span className="text-[10px] uppercase tracking-wider text-white/40 font-bold block">
                Saldo Atual
              </span>
              <span className={`text-base font-mono font-bold block mt-1 ${
                isNegative ? 'text-red-400' : 'text-gold'
              }`}>
                {currentPoints.toLocaleString('pt-BR')} pts
              </span>
            </div>

            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10">
              <span className="text-[10px] uppercase tracking-wider text-white/40 font-bold block">
                Temporada
              </span>
              <span className="text-base font-mono font-bold text-white block mt-1">
                {(client.seasonalPoints ?? 0).toLocaleString('pt-BR')} pts
              </span>
            </div>

            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10">
              <span className="text-[10px] uppercase tracking-wider text-white/40 font-bold block">
                Total Acumulado
              </span>
              <span className="text-base font-mono font-bold text-emerald-400 block mt-1">
                +{totalEarned.toLocaleString('pt-BR')} pts
              </span>
            </div>

            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10">
              <span className="text-[10px] uppercase tracking-wider text-white/40 font-bold block">
                Total Resgatado
              </span>
              <span className="text-base font-mono font-bold text-red-400 block mt-1">
                -{totalSpent.toLocaleString('pt-BR')} pts
              </span>
            </div>
          </div>

          {/* Botão de Toggle para Ajuste Rápido */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Histórico de Movimentações ({transactions.length})
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowAdjustForm(!showAdjustForm)}
              className="text-xs font-bold text-gold hover:text-gold-light flex items-center gap-1.5 py-1 px-2.5 rounded-lg bg-gold/10 border border-gold/20 hover:bg-gold/20 transition-all"
            >
              {showAdjustForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              <span>{showAdjustForm ? 'Fechar Ajuste' : 'Novo Ajuste Manual'}</span>
            </button>
          </div>

          {/* Formulário de Ajuste Manual Integrado */}
          {showAdjustForm && (
            <form onSubmit={handleManualAdjust} className="p-4 rounded-xl bg-black/40 border border-gold/30 space-y-3 animate-in fade-in duration-200">
              <p className="text-xs font-bold text-gold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Ajustar Pontuação com Proteção de Saldo
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="flex bg-white/5 border border-white/10 rounded-lg p-0.5 gap-1">
                  <button
                    type="button"
                    onClick={() => setAdjAction('add')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
                      adjAction === 'add' ? 'bg-gold text-carbon' : 'text-white/60 hover:text-white'
                    }`}
                  >
                    Adicionar (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjAction('remove')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
                      adjAction === 'remove' ? 'bg-red-500 text-white' : 'text-white/60 hover:text-white'
                    }`}
                  >
                    Remover (-)
                  </button>
                </div>

                <div>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="Pontos (ex: 500)"
                    value={adjPoints}
                    onChange={(e) => setAdjPoints(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg py-1.5 px-3 text-xs text-white font-mono placeholder:text-white/30 focus:outline-none focus:border-gold/50"
                  />
                </div>

                <div>
                  <input
                    type="text"
                    required
                    placeholder="Motivo / Justificativa"
                    value={adjReason}
                    onChange={(e) => setAdjReason(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg py-1.5 px-3 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-gold/50"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAdjustForm(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-white/50 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAdj}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all shadow-md ${
                    adjAction === 'add'
                      ? 'bg-gold text-carbon hover:bg-gold-light'
                      : 'bg-red-500 text-white hover:bg-red-600'
                  }`}
                >
                  {isSubmittingAdj ? 'Salvando...' : 'Confirmar Ajuste'}
                </button>
              </div>
            </form>
          )}

          {/* Filtros de Tipo */}
          <div className="flex items-center gap-1.5 border-b border-white/10 pb-2">
            <button
              onClick={() => setFilterType('all')}
              className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-all ${
                filterType === 'all'
                  ? 'bg-white/10 text-white'
                  : 'text-white/40 hover:text-white/70'
              }`}
            >
              Todas ({transactions.length})
            </button>
            <button
              onClick={() => setFilterType('positive')}
              className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-all ${
                filterType === 'positive'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'text-white/40 hover:text-white/70'
              }`}
            >
              Entradas (+{transactions.filter(t => (t.points ?? 0) > 0).length})
            </button>
            <button
              onClick={() => setFilterType('negative')}
              className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-all ${
                filterType === 'negative'
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : 'text-white/40 hover:text-white/70'
              }`}
            >
              Saídas (-{transactions.filter(t => (t.points ?? 0) < 0).length})
            </button>
          </div>

          {/* Lista de Transações */}
          {loadingTransactions ? (
            <div className="p-8 text-center text-white/40 text-xs animate-pulse">
              Carregando histórico de movimentações...
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="p-8 text-center text-white/40 text-xs border border-dashed border-white/10 rounded-xl">
              Nenhuma movimentação de pontos registrada até o momento.
            </div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar pr-1">
              {filteredTransactions.map(item => {
                const pts = item.points ?? 0;
                const isPositive = pts > 0;

                return (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 flex items-center justify-between gap-3 transition-colors"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {getTransactionBadge(item.type, pts)}
                        <span className="text-[11px] text-white/40 flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3 text-white/30" />
                          {item.createdAt ? new Date(item.createdAt).toLocaleString('pt-BR') : '-'}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-white/90 truncate">
                        {item.description || 'Movimentação de pontos'}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className={`font-mono font-bold text-sm block ${
                        isPositive ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        {isPositive ? `+${pts.toLocaleString('pt-BR')}` : pts.toLocaleString('pt-BR')} pts
                      </span>
                      {typeof item.balanceAfter === 'number' && (
                        <span className="text-[10px] text-white/30 font-mono block">
                          Saldo após: {item.balanceAfter.toLocaleString('pt-BR')} pts
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-white/10 bg-white/[0.02] flex items-center justify-between">
          <span className="text-[11px] text-white/40">
            Auditado pelo Clube Navalha
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition-all"
          >
            Fechar Extrato
          </button>
        </div>

      </div>
    </div>
  );
}
