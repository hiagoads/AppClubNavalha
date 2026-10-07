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
  Filter,
  Crown,
  Shield,
  RotateCcw,
  Sliders,
  Layers,
  Zap,
  Trophy,
  Coins
} from 'lucide-react';
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { PointTransaction } from '../../types';
import { DEFAULT_THRESHOLDS, getLevelTier, getTierName, getTierTheme, getClientTier } from '../../utils/tierSystem';
import { checkAndSyncClientRankBonuses, DEFAULT_RANK_BONUSES } from '../../utils/bonusSystem';
import { useGamificationSettings } from '../../hooks/useGamificationSettings';
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
  const { thresholds } = useGamificationSettings();
  const [liveClient, setLiveClient] = useState<any>(client);
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [filterType, setFilterType] = useState<'all' | 'positive' | 'negative'>('all');
  const [isFixingNegative, setIsFixingNegative] = useState(false);

  // Manual Quick Adjustment inside Modal
  const [showAdjustForm, setShowAdjustForm] = useState(false);
  const [adjPoints, setAdjPoints] = useState('');
  const [adjAction, setAdjAction] = useState<'add' | 'remove'>('add');
  const [adjScope, setAdjScope] = useState<'weekly_only' | 'seasonal_only' | 'balance_only' | 'all_balances' | 'custom_direct'>('weekly_only');
  const [adjReason, setAdjReason] = useState('');
  const [customDirectPts, setCustomDirectPts] = useState('');
  const [customDirectSeasonal, setCustomDirectSeasonal] = useState('');
  const [customDirectWeekly, setCustomDirectWeekly] = useState('');
  const [isSubmittingAdj, setIsSubmittingAdj] = useState(false);

  // Manual Tier (Patente) Override inside Modal
  const [showTierForm, setShowTierForm] = useState(false);
  const [selectedTierLevel, setSelectedTierLevel] = useState<number>(1);
  const [tierOverrideReason, setTierOverrideReason] = useState('');
  const [isSubmittingTier, setIsSubmittingTier] = useState(false);

  useEffect(() => {
    if (client) {
      setLiveClient(client);
      const currentTier = client.seasonHighestTierLevel ?? client.highestTierLevel ?? 1;
      setSelectedTierLevel(currentTier);
      setCustomDirectPts(String(client.points ?? 0));
      setCustomDirectSeasonal(String(client.seasonalPoints ?? 0));
      setCustomDirectWeekly(String(client.weeklyPoints ?? 0));
    }
  }, [client]);

  // Escuta em tempo real o documento do cliente para atualizar instantaneamente o Saldo Atual na tela
  useEffect(() => {
    if (!isOpen || !client?.id) return;
    const unsub = onSnapshot(doc(db, 'clients', client.id), (snap) => {
      if (snap.exists()) {
        const d: any = { id: snap.id, ...snap.data() };
        setLiveClient(d);
        setCustomDirectPts(String(d.points ?? 0));
        setCustomDirectSeasonal(String(d.seasonalPoints ?? 0));
        setCustomDirectWeekly(String(d.weeklyPoints ?? 0));
      }
    });
    return () => unsub();
  }, [isOpen, client?.id]);

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

  const activeClient = liveClient || client;
  const currentPoints = activeClient?.points ?? 0;
  const isNegative = currentPoints < 0;

  // Cálculos dinâmicos de prévia para o formulário de ajuste
  const previewData = React.useMemo(() => {
    const curPts = activeClient?.points ?? 0;
    const curSeasonal = activeClient?.seasonalPoints ?? 0;
    const curWeekly = activeClient?.weeklyPoints ?? 0;
    const pts = parseInt(adjPoints) || 0;

    let resPts = curPts;
    let resSeasonal = curSeasonal;
    let resWeekly = curWeekly;

    if (adjScope === 'custom_direct') {
      resPts = Math.max(0, parseInt(customDirectPts) || 0);
      resSeasonal = Math.max(0, parseInt(customDirectSeasonal) || 0);
      resWeekly = Math.max(0, parseInt(customDirectWeekly) || 0);
    } else if (adjScope === 'weekly_only') {
      if (adjAction === 'add') {
        resWeekly = curWeekly + pts;
      } else {
        resWeekly = Math.max(0, curWeekly - pts);
      }
    } else if (adjScope === 'seasonal_only') {
      if (adjAction === 'add') {
        resSeasonal = curSeasonal + pts;
      } else {
        resSeasonal = Math.max(0, curSeasonal - pts);
      }
    } else if (adjScope === 'all_balances') {
      if (adjAction === 'add') {
        resPts = curPts + pts;
        resSeasonal = curSeasonal + pts;
        resWeekly = curWeekly + pts;
      } else {
        resPts = Math.max(0, curPts - pts);
        resSeasonal = Math.max(0, curSeasonal - pts);
        resWeekly = Math.max(0, curWeekly - pts);
      }
    } else {
      // balance_only
      if (adjAction === 'add') {
        resPts = curPts + pts;
      } else {
        resPts = Math.max(0, curPts - pts);
      }
    }

    const peak = Math.max(0, resSeasonal, resPts);
    const newTier = getLevelTier(peak, thresholds, 1);
    const oldTier = getClientTier(activeClient, thresholds);

    return {
      curPts,
      curSeasonal,
      curWeekly,
      resPts,
      resSeasonal,
      resWeekly,
      oldTier,
      newTier
    };
  }, [activeClient, adjScope, adjAction, adjPoints, customDirectPts, customDirectSeasonal, customDirectWeekly, thresholds]);

  // Função para corrigir saldo negativo para 0
  const handleFixNegativeBalance = async () => {
    if (!activeClient?.id) return;
    setIsFixingNegative(true);
    try {
      const clientRef = doc(db, 'clients', activeClient.id);
      const snap = await getDoc(clientRef);
      const data = snap.exists() ? snap.data() : activeClient;
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
        clientId: activeClient.id,
        clientName: data.username || data.firstName || 'Cliente',
        points: Math.abs(prevPoints),
        type: 'correction',
        description: `Correção de auditoria: saldo negativo normalizado de ${prevPoints} para 0 pts`,
        balanceAfter: 0,
        createdAt: new Date().toISOString()
      });

      const updated = {
        ...activeClient,
        ...updatedPayload
      };
      setLiveClient(updated);
      if (onClientUpdated) onClientUpdated(updated);

      toast.success(`Saldo de ${data.username || 'Cliente'} corrigido para 0 pts com sucesso!`);
    } catch (err) {
      console.error('Erro ao corrigir saldo negativo:', err);
      toast.error('Erro ao corrigir saldo negativo.');
    } finally {
      setIsFixingNegative(false);
    }
  };

  // Ajuste manual com opção de Saldo Atual, Reversão Completa de Erro de Sistema ou Ajuste Direto
  const handleManualAdjust = async (e: React.FormEvent) => {
    e.preventDefault();

    if (adjScope === 'custom_direct') {
      if (customDirectPts === '' || customDirectSeasonal === '' || customDirectWeekly === '') {
        toast.error('Informe os valores para todos os saldos.');
        return;
      }
    } else {
      const pts = parseInt(adjPoints);
      if (!pts || pts <= 0) {
        toast.error('Informe uma quantidade válida maior que zero.');
        return;
      }
    }

    setIsSubmittingAdj(true);
    try {
      const clientRef = doc(db, 'clients', activeClient.id);
      const snap = await getDoc(clientRef);
      const data = snap.exists() ? snap.data() : activeClient;

      const currentPts = data.points ?? 0;
      const currentSeasonal = data.seasonalPoints ?? 0;
      const currentWeekly = data.weeklyPoints ?? 0;
      const currentLifetime = data.lifetimePoints ?? Math.max(currentPts, currentSeasonal);

      let newPts = currentPts;
      let newSeasonal = currentSeasonal;
      let newWeekly = currentWeekly;
      let newLifetime = currentLifetime;
      let seasonHighest = Math.max(data.seasonHighestPoints ?? 0, data.highestSeasonalPoints ?? 0, currentSeasonal, currentPts);
      let highestTier = data.seasonHighestTierLevel ?? data.highestTierLevel ?? 1;

      const isReversionAll = adjScope === 'all_balances';
      const isCustomDirect = adjScope === 'custom_direct';

      if (isCustomDirect) {
        newPts = Math.max(0, parseInt(customDirectPts) || 0);
        newSeasonal = Math.max(0, parseInt(customDirectSeasonal) || 0);
        newWeekly = Math.max(0, parseInt(customDirectWeekly) || 0);
        newLifetime = Math.max(currentLifetime, newSeasonal, newPts);
        seasonHighest = Math.max(seasonHighest, newSeasonal, newPts);
        const tierInfo = getLevelTier(seasonHighest, thresholds, 1);
        highestTier = (data.manualTierOverride && typeof data.manualTierLevel === 'number')
          ? data.manualTierLevel
          : tierInfo.tierLevel;
      } else {
        const pts = parseInt(adjPoints);
        if (adjScope === 'weekly_only') {
          if (adjAction === 'add') {
            newWeekly = currentWeekly + pts;
          } else {
            newWeekly = Math.max(0, currentWeekly - pts);
          }
        } else if (adjScope === 'seasonal_only') {
          if (adjAction === 'add') {
            newSeasonal = currentSeasonal + pts;
            newLifetime = Math.max(currentLifetime, newSeasonal);
            seasonHighest = Math.max(seasonHighest, newSeasonal);
          } else {
            newSeasonal = Math.max(0, currentSeasonal - pts);
          }
          const tierInfo = getLevelTier(seasonHighest, thresholds, 1);
          highestTier = (data.manualTierOverride && typeof data.manualTierLevel === 'number')
            ? data.manualTierLevel
            : tierInfo.tierLevel;
        } else if (adjScope === 'balance_only') {
          if (adjAction === 'add') {
            newPts = currentPts + pts;
          } else {
            newPts = Math.max(0, currentPts - pts);
          }
        } else if (adjScope === 'all_balances') {
          if (adjAction === 'add') {
            newPts = currentPts + pts;
            newSeasonal = currentSeasonal + pts;
            newWeekly = currentWeekly + pts;
            newLifetime = currentLifetime + pts;
            seasonHighest = Math.max(seasonHighest, newSeasonal, newPts);
          } else {
            newPts = Math.max(0, currentPts - pts);
            newSeasonal = Math.max(0, currentSeasonal - pts);
            newWeekly = Math.max(0, currentWeekly - pts);
            newLifetime = Math.max(0, currentLifetime - pts);
          }
          const tierInfo = getLevelTier(seasonHighest, thresholds, 1);
          highestTier = (data.manualTierOverride && typeof data.manualTierLevel === 'number')
            ? data.manualTierLevel
            : tierInfo.tierLevel;
        }
      }

      const balanceChange = newPts - currentPts;
      const seasonalChange = newSeasonal - currentSeasonal;
      const weeklyChange = newWeekly - currentWeekly;

      let txPoints = balanceChange;
      if (adjScope === 'weekly_only') {
        txPoints = weeklyChange;
      } else if (adjScope === 'seasonal_only') {
        txPoints = seasonalChange;
      } else if (adjScope === 'custom_direct') {
        if (balanceChange !== 0) txPoints = balanceChange;
        else if (weeklyChange !== 0) txPoints = weeklyChange;
        else if (seasonalChange !== 0) txPoints = seasonalChange;
        else txPoints = 0;
      }

      const nowIso = new Date().toISOString();

      const updateData: any = {
        points: newPts,
        seasonalPoints: newSeasonal,
        seasonHighestPoints: seasonHighest,
        highestSeasonalPoints: seasonHighest,
        seasonHighestTierLevel: highestTier,
        highestTierLevel: highestTier,
        level: highestTier,
        weeklyPoints: newWeekly,
        lifetimePoints: newLifetime,
        lastPointsUpdate: nowIso
      };

      if (isReversionAll || isCustomDirect) {
        updateData.manualTierOverride = false;
        updateData.manualTierLevel = highestTier;

        // Limpeza de bônus indevidos de patentes superiores que o cliente não atinge mais
        let clientBonuses: any[] = Array.isArray(data.bonuses) ? [...data.bonuses] : [];
        clientBonuses = clientBonuses.filter((b: any) => {
          if (b.category === 'rank_level' && !b.isRedeemed) {
            const def = DEFAULT_RANK_BONUSES.find(cfg => 
              cfg.rankKey === b.rankKey || 
              cfg.title?.trim().toLowerCase() === b.title?.trim().toLowerCase()
            );
            if (def && def.level > highestTier) {
              return false; // Remove bônus de patente indevida
            }
          }
          return true;
        });
        updateData.bonuses = clientBonuses;
      }

      await updateDoc(clientRef, updateData);

      let defaultDesc = 'Ajuste de Pontos';
      if (adjScope === 'weekly_only') {
        defaultDesc = weeklyChange >= 0
          ? `Ajuste manual: +${weeklyChange} pts no Ranking Semanal`
          : `Ajuste manual: ${weeklyChange} pts no Ranking Semanal`;
      } else if (adjScope === 'seasonal_only') {
        defaultDesc = seasonalChange >= 0
          ? `Ajuste manual: +${seasonalChange} pts na Temporada`
          : `Ajuste manual: ${seasonalChange} pts na Temporada`;
      } else if (adjScope === 'balance_only') {
        defaultDesc = balanceChange >= 0
          ? `Crédito de Saldo Gastável (+${balanceChange} pts)`
          : `Débito de Saldo Gastável (${balanceChange} pts)`;
      } else if (adjScope === 'all_balances') {
        defaultDesc = balanceChange >= 0
          ? `Ajuste em Todos os Saldos (+${balanceChange} pts)`
          : `Estorno de Erro em Todos os Saldos (${balanceChange} pts)`;
      } else if (adjScope === 'custom_direct') {
        defaultDesc = `Definição direta de saldos (Saldo: ${newPts}, Temp: ${newSeasonal}, Semana: ${newWeekly})`;
      }

      const txDescription = adjReason
        ? (adjScope === 'all_balances' && adjAction === 'remove' ? `[Reversão de Erro] ${adjReason}` : adjReason)
        : defaultDesc;

      const txType = adjScope === 'custom_direct'
        ? 'correction'
        : (adjScope === 'all_balances' && adjAction === 'remove'
            ? 'reverted'
            : (txPoints >= 0 ? 'manual_add' : 'manual_remove'));

      await addDoc(collection(db, 'point_transactions'), {
        clientId: activeClient.id,
        clientName: data.username || data.firstName || 'Cliente',
        points: txPoints,
        type: txType,
        scope: adjScope,
        weeklyPointsChange: weeklyChange,
        seasonalPointsChange: seasonalChange,
        balancePointsChange: balanceChange,
        balanceAfter: newPts,
        seasonalBalanceAfter: newSeasonal,
        weeklyBalanceAfter: newWeekly,
        description: txDescription,
        createdAt: nowIso
      });

      const updated = {
        ...data,
        ...updateData
      };
      setLiveClient(updated);
      setCustomDirectPts(String(newPts));
      setCustomDirectSeasonal(String(newSeasonal));
      setCustomDirectWeekly(String(newWeekly));
      if (onClientUpdated) onClientUpdated(updated);

      if (adjAction === 'add' && (isReversionAll || adjScope === 'seasonal_only')) {
        const bonusRes = await checkAndSyncClientRankBonuses(activeClient.id, updated, thresholds);
        if (bonusRes && bonusRes.awardedBonuses && bonusRes.awardedBonuses.length > 0) {
          const titles = bonusRes.awardedBonuses.map(b => b.title).join(', ');
          toast.success(`🎉 Bônus de patente concedido: ${titles}`, { duration: 5000 });
        }
      }

      toast.success(
        adjScope === 'weekly_only'
          ? `Ranking semanal atualizado para ${newWeekly} pts!`
          : adjScope === 'seasonal_only'
          ? `Pontos de temporada atualizados para ${newSeasonal} pts!`
          : adjScope === 'balance_only'
          ? `Saldo gastável atualizado para ${newPts} pts!`
          : adjScope === 'custom_direct'
          ? `Saldos de ${data.username || 'Cliente'} atualizados com sucesso!`
          : `${adjPoints} pontos ${adjAction === 'add' ? 'adicionados' : 'revertidos'} com sucesso!`
      );
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

  // Ajuste manual de Patente (Nível 1 a 8) com override da trava de não-regressão
  const handleTierOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTierLevel || selectedTierLevel < 1 || selectedTierLevel > 8) {
      toast.error('Selecione uma patente válida (1 a 8).');
      return;
    }

    setIsSubmittingTier(true);
    try {
      const clientRef = doc(db, 'clients', client.id);
      const snap = await getDoc(clientRef);
      const data = snap.exists() ? snap.data() : client;

      const previousTierLevel = data.seasonHighestTierLevel ?? data.highestTierLevel ?? 1;
      const targetTierName = getTierName(selectedTierLevel);
      const previousTierName = getTierName(previousTierLevel);

      const targetThreshold = thresholds[selectedTierLevel - 1] || 0;
      const effectivePts = Math.min(data.points ?? 0, targetThreshold);
      const effectiveSeasonal = Math.min(data.seasonalPoints ?? 0, targetThreshold);

      // Atualiza diretamente no Firestore sobrescrevendo as travas de pico de patente
      // e ajustando os pontos de pico para não forçar a subida de volta caso o cliente esteja acima
      const updatePayload: any = {
        seasonHighestTierLevel: selectedTierLevel,
        highestTierLevel: selectedTierLevel,
        manualTierLevel: selectedTierLevel,
        manualTierOverride: true,
        seasonHighestPoints: effectiveSeasonal,
        highestSeasonalPoints: effectiveSeasonal,
        seasonalPoints: effectiveSeasonal
      };

      // Se o cliente foi rebaixado para um nível abaixo dos pontos atuais, ajusta os pontos para condizer
      if ((data.points ?? 0) > targetThreshold) {
        updatePayload.points = targetThreshold;
      }

      await updateDoc(clientRef, updatePayload);

      // Registra no extrato de auditoria a alteração manual da patente pelo administrador
      await addDoc(collection(db, 'point_transactions'), {
        clientId: client.id,
        clientName: client.username || client.firstName || 'Cliente',
        points: 0,
        type: 'tier_override',
        description: tierOverrideReason || `Patente alterada manualmente pelo Adm: de ${previousTierName} para ${targetTierName}`,
        balanceAfter: updatePayload.points ?? data.points ?? client.points ?? 0,
        createdAt: new Date().toISOString()
      });

      const updated = {
        ...client,
        ...data,
        ...updatePayload
      };
      if (onClientUpdated) onClientUpdated(updated);

      const bonusRes = await checkAndSyncClientRankBonuses(client.id, updated, thresholds);
      if (bonusRes && bonusRes.awardedBonuses && bonusRes.awardedBonuses.length > 0) {
        const titles = bonusRes.awardedBonuses.map(b => b.title).join(', ');
        toast.success(`🎉 Bônus da nova patente concedido: ${titles}`, { duration: 5000 });
      }

      toast.success(`Patente de ${client.username} alterada para ${targetTierName} com sucesso!`);
      setTierOverrideReason('');
      setShowTierForm(false);
    } catch (err) {
      console.error('Erro ao alterar patente:', err);
      toast.error('Erro ao atualizar patente do cliente.');
    } finally {
      setIsSubmittingTier(false);
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

  const getTransactionBadge = (item: PointTransaction) => {
    const pts = item.points ?? 0;
    const type = item.type;
    const scope = (item as any).scope;
    const weeklyPointsChange = (item as any).weeklyPointsChange;
    const seasonalPointsChange = (item as any).seasonalPointsChange;
    const balancePointsChange = (item as any).balancePointsChange;

    if (scope === 'weekly_only' || (typeof weeklyPointsChange === 'number' && weeklyPointsChange !== 0 && !balancePointsChange)) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-md">
          <Trophy className="w-3 h-3" /> Ranking Semanal
        </span>
      );
    }
    if (scope === 'seasonal_only' || (typeof seasonalPointsChange === 'number' && seasonalPointsChange !== 0 && !balancePointsChange)) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-md">
          <Crown className="w-3 h-3" /> Temporada
        </span>
      );
    }
    if (pts < 0 && type !== 'correction') {
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
    if (type === 'tier_override') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-md">
          <Crown className="w-3 h-3" /> Ajuste de Patente
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

          {/* Cards com Resumo do Saldo e Patente */}
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5">
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
                {(activeClient?.seasonalPoints ?? 0).toLocaleString('pt-BR')} pts
              </span>
            </div>

            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10">
              <span className="text-[10px] uppercase tracking-wider text-white/40 font-bold block">
                Semana (Ranking)
              </span>
              <span className="text-base font-mono font-bold text-cyan-400 block mt-1">
                {(activeClient?.weeklyPoints ?? 0).toLocaleString('pt-BR')} pts
              </span>
            </div>

            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10">
              <span className="text-[10px] uppercase tracking-wider text-white/40 font-bold block">
                Patente Atual
              </span>
              <div className="mt-1 flex items-center gap-1.5">
                {(() => {
                  const clientTier = getClientTier(activeClient, thresholds);
                  return (
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${clientTier.bgColor} bg-opacity-20 ${clientTier.colorText} border border-current border-opacity-30 inline-flex items-center gap-1`}>
                      <Crown className="w-3 h-3" />
                      {clientTier.name} ({clientTier.tierLevel})
                    </span>
                  );
                })()}
              </div>
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

          {/* Botões de Ação: Ajuste de Pontos e Ajuste Manual de Patente */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Histórico de Movimentações ({transactions.length})
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowTierForm(!showTierForm);
                  if (!showTierForm) setShowAdjustForm(false);
                }}
                className={`text-xs font-bold flex items-center gap-1.5 py-1 px-2.5 rounded-lg border transition-all ${
                  showTierForm 
                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/40' 
                    : 'text-purple-400 hover:text-purple-300 bg-purple-500/10 border-purple-500/20 hover:bg-purple-500/20'
                }`}
                title="Editar manualmente a patente deste cliente"
              >
                <Crown className="w-3.5 h-3.5" />
                <span>{showTierForm ? 'Fechar Patente' : 'Alterar Patente'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowAdjustForm(!showAdjustForm);
                  if (!showAdjustForm) setShowTierForm(false);
                }}
                className={`text-xs font-bold flex items-center gap-1.5 py-1 px-2.5 rounded-lg border transition-all ${
                  showAdjustForm
                    ? 'bg-gold/20 text-gold-light border-gold/40'
                    : 'text-gold hover:text-gold-light bg-gold/10 border-gold/20 hover:bg-gold/20'
                }`}
              >
                {showAdjustForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                <span>{showAdjustForm ? 'Fechar Pontos' : 'Ajustar Pontos'}</span>
              </button>
            </div>
          </div>

          {/* Formulário de Alteração Manual de Patente */}
          {showTierForm && (
            <form onSubmit={handleTierOverride} className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/30 space-y-3 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                  <Crown className="w-4 h-4 text-purple-400" /> Alteração Manual de Patente (Nível 1 a 8)
                </p>
                <span className="text-[10px] text-white/50 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                  Sobrescreve a trava e recomeça a progressão
                </span>
              </div>
              <p className="text-[11px] text-white/60">
                Selecione a patente correta para este cliente. O sistema começará a contar a progressão a partir desta nova patente (ex: definindo Iniciante, ao atingir os pontos da próxima patente ele avançará naturalmente).
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-white/50 block mb-1">
                    Nova Patente
                  </label>
                  <select
                    value={selectedTierLevel}
                    onChange={(e) => setSelectedTierLevel(Number(e.target.value))}
                    className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-purple-500/60 font-semibold"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((lvl) => (
                      <option key={lvl} value={lvl} className="bg-[#181818] text-white">
                        Nv. {lvl} - {getTierName(lvl)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-white/50 block mb-1">
                    Justificativa / Motivo (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Correção de patente após inconsistência"
                    value={tierOverrideReason}
                    onChange={(e) => setTierOverrideReason(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-purple-500/60"
                  />
                </div>
              </div>

              {/* Pré-visualização da Patente Selecionada */}
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-black/40 border border-white/5">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-white/50">Nova Patente Selecionada:</span>
                  {(() => {
                    const theme = getTierTheme(selectedTierLevel);
                    return (
                      <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${theme.bg} bg-opacity-20 ${theme.text} border border-current border-opacity-30 inline-flex items-center gap-1`}>
                        <Crown className="w-3 h-3" />
                        {getTierName(selectedTierLevel)} (Nível {selectedTierLevel})
                      </span>
                    );
                  })()}
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowTierForm(false)}
                    className="px-3 py-1.5 rounded-lg text-xs text-white/50 hover:text-white"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingTier}
                    className="px-4 py-1.5 rounded-lg text-xs font-bold transition-all shadow-md bg-purple-600 hover:bg-purple-500 text-white flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isSubmittingTier ? (
                      <>
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        <span>Salvando...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Salvar Nova Patente</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Formulário de Ajuste Manual Integrado */}
          {showAdjustForm && (
            <form onSubmit={handleManualAdjust} className="p-4 rounded-xl bg-black/50 border border-gold/30 space-y-4 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                <p className="text-xs font-bold text-gold flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" /> Ajuste e Reversão de Pontos
                </p>
                <span className="text-[10px] text-white/50 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                  Auditado com registro oficial em extrato
                </span>
              </div>

              {/* Seletor de Escopo / Tipo de Ajuste */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-white/50 block">
                  Escolha o Tipo de Ajuste
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjScope('weekly_only')}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      adjScope === 'weekly_only'
                        ? 'bg-cyan-500/20 border-cyan-500/50 text-white shadow-lg shadow-cyan-950/20'
                        : 'bg-white/[0.02] border-white/10 text-white/60 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs text-cyan-300">
                      <Trophy className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Ranking Semanal</span>
                    </div>
                    <p className="text-[10px] text-white/50 mt-1 leading-tight">
                      Altera apenas pontos da semana (ranking). Saldo e Temporada intactos.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdjScope('balance_only')}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      adjScope === 'balance_only'
                        ? 'bg-amber-500/20 border-amber-500/50 text-white shadow-lg shadow-amber-950/20'
                        : 'bg-white/[0.02] border-white/10 text-white/60 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs text-amber-300">
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      <span>Apenas Saldo Atual</span>
                    </div>
                    <p className="text-[10px] text-white/50 mt-1 leading-tight">
                      Altera saldo gastável (resgates). Temporada e ranking da semana intactos.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdjScope('seasonal_only')}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      adjScope === 'seasonal_only'
                        ? 'bg-purple-500/20 border-purple-500/50 text-white shadow-lg shadow-purple-950/20'
                        : 'bg-white/[0.02] border-white/10 text-white/60 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs text-purple-300">
                      <Crown className="w-3.5 h-3.5 text-purple-400" />
                      <span>Apenas Temporada</span>
                    </div>
                    <p className="text-[10px] text-white/50 mt-1 leading-tight">
                      Altera pontos da temporada e patente. Saldo e semana intactos.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdjScope('all_balances')}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      adjScope === 'all_balances'
                        ? 'bg-rose-500/20 border-rose-500/50 text-white shadow-lg shadow-rose-950/20'
                        : 'bg-white/[0.02] border-white/10 text-white/60 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs text-rose-300">
                      <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
                      <span>Reversão Geral</span>
                    </div>
                    <p className="text-[10px] text-white/50 mt-1 leading-tight">
                      Estorno completo: altera Saldo, Temporada, Semana e Patente.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdjScope('custom_direct')}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      adjScope === 'custom_direct'
                        ? 'bg-blue-500/20 border-blue-500/50 text-white shadow-lg shadow-blue-950/20'
                        : 'bg-white/[0.02] border-white/10 text-white/60 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs text-blue-300">
                      <Sliders className="w-3.5 h-3.5 text-blue-400" />
                      <span>Definir Saldos Exatos</span>
                    </div>
                    <p className="text-[10px] text-white/50 mt-1 leading-tight">
                      Edite manualmente os 3 saldos exatos do cliente (Saldo, Temp, Semana).
                    </p>
                  </button>
                </div>
              </div>

              {/* Campos do formulário quando for por Quantidade (all_balances ou balance_only) */}
              {adjScope !== 'custom_direct' ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="flex bg-white/5 border border-white/10 rounded-lg p-0.5 gap-1">
                    <button
                      type="button"
                      onClick={() => setAdjAction('remove')}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
                        adjAction === 'remove' ? 'bg-red-500 text-white' : 'text-white/60 hover:text-white'
                      }`}
                    >
                      Remover / Estornar (-)
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdjAction('add')}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
                        adjAction === 'add' ? 'bg-gold text-carbon' : 'text-white/60 hover:text-white'
                      }`}
                    >
                      Adicionar (+)
                    </button>
                  </div>

                  <div>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder={
                        adjScope === 'weekly_only'
                          ? "Pontos na semana (ex: 500)"
                          : adjScope === 'seasonal_only'
                          ? "Pontos na temporada (ex: 500)"
                          : adjScope === 'balance_only'
                          ? "Pontos no saldo gastável (ex: 500)"
                          : "Quantidade de pontos (ex: 500)"
                      }
                      value={adjPoints}
                      onChange={(e) => setAdjPoints(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg py-1.5 px-3 text-xs text-white font-mono placeholder:text-white/30 focus:outline-none focus:border-gold/50"
                    />
                  </div>

                  <div>
                    <input
                      type="text"
                      required
                      placeholder="Motivo (ex: Estorno de falha de sistema)"
                      value={adjReason}
                      onChange={(e) => setAdjReason(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg py-1.5 px-3 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-gold/50"
                    />
                  </div>
                </div>
              ) : (
                /* Campos quando for Definir Saldos Exatos (custom_direct) */
                <div className="space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-gold block mb-1">
                        Novo Saldo Atual (Gastável)
                      </label>
                      <input
                        type="number"
                        min="0"
                        required
                        value={customDirectPts}
                        onChange={(e) => setCustomDirectPts(e.target.value)}
                        className="w-full bg-white/5 border border-gold/40 rounded-lg py-1.5 px-3 text-xs text-gold font-mono font-bold focus:outline-none focus:border-gold"
                        placeholder="Ex: 0"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-white/50 block mb-1">
                        Novos Pontos da Temporada
                      </label>
                      <input
                        type="number"
                        min="0"
                        required
                        value={customDirectSeasonal}
                        onChange={(e) => setCustomDirectSeasonal(e.target.value)}
                        className="w-full bg-white/5 border border-white/20 rounded-lg py-1.5 px-3 text-xs text-white font-mono font-bold focus:outline-none focus:border-gold"
                        placeholder="Ex: 0"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-cyan-400 block mb-1">
                        Novos Pontos da Semana (Ranking)
                      </label>
                      <input
                        type="number"
                        min="0"
                        required
                        value={customDirectWeekly}
                        onChange={(e) => setCustomDirectWeekly(e.target.value)}
                        className="w-full bg-white/5 border border-cyan-500/40 rounded-lg py-1.5 px-3 text-xs text-cyan-300 font-mono font-bold focus:outline-none focus:border-cyan-400"
                        placeholder="Ex: 0"
                      />
                    </div>
                  </div>
                  <div>
                    <input
                      type="text"
                      required
                      placeholder="Motivo da alteração direta (ex: Correção manual de saldos)"
                      value={adjReason}
                      onChange={(e) => setAdjReason(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg py-1.5 px-3 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-gold/50"
                    />
                  </div>
                </div>
              )}

              {/* Caixa de Pré-Visualização Dinâmica (Antes ➔ Depois) */}
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                    Prévia do Ajuste:
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-white/60">Saldo:</span>
                    <span className="font-mono text-white/40">{previewData.curPts}</span>
                    <span className="text-gold font-bold">➔</span>
                    <span className="font-mono font-bold text-gold">{previewData.resPts} pts</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-white/60">Temporada:</span>
                    <span className="font-mono text-white/40">{previewData.curSeasonal}</span>
                    <span className="text-white font-bold">➔</span>
                    <span className="font-mono font-bold text-white">{previewData.resSeasonal} pts</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-white/60">Semana:</span>
                    <span className="font-mono text-white/40">{previewData.curWeekly}</span>
                    <span className="text-cyan-400 font-bold">➔</span>
                    <span className="font-mono font-bold text-cyan-400">{previewData.resWeekly} pts</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-white/60">Patente:</span>
                    <span className="font-bold text-white/50">{previewData.oldTier.name} ({previewData.oldTier.tierLevel})</span>
                    <span className="text-purple-400 font-bold">➔</span>
                    <span className={`font-bold ${previewData.newTier.colorText}`}>
                      {previewData.newTier.name} (Nv. {previewData.newTier.tierLevel})
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
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
                      adjAction === 'add' && adjScope !== 'custom_direct'
                        ? 'bg-gold text-carbon hover:bg-gold-light'
                        : 'bg-red-500 text-white hover:bg-red-600'
                    }`}
                  >
                    {isSubmittingAdj ? 'Salvando...' : 'Confirmar Ajuste'}
                  </button>
                </div>
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
                const isWeekly = (item as any).scope === 'weekly_only' || (typeof (item as any).weeklyPointsChange === 'number' && (item as any).weeklyPointsChange !== 0 && !(item as any).balancePointsChange);
                const isSeasonal = (item as any).scope === 'seasonal_only' || (typeof (item as any).seasonalPointsChange === 'number' && (item as any).seasonalPointsChange !== 0 && !(item as any).balancePointsChange);
                const displayPts = isWeekly ? ((item as any).weeklyPointsChange ?? pts) : (isSeasonal ? ((item as any).seasonalPointsChange ?? pts) : pts);
                const isPositive = displayPts > 0;

                return (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 flex items-center justify-between gap-3 transition-colors"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {getTransactionBadge(item)}
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
                        isWeekly 
                          ? 'text-cyan-400' 
                          : isSeasonal 
                          ? 'text-purple-400' 
                          : isPositive 
                          ? 'text-emerald-400' 
                          : displayPts === 0 
                          ? 'text-white/60' 
                          : 'text-red-400'
                      }`}>
                        {isPositive ? `+${displayPts.toLocaleString('pt-BR')}` : displayPts.toLocaleString('pt-BR')} pts {isWeekly ? '(Semana)' : isSeasonal ? '(Temp)' : ''}
                      </span>
                      {isWeekly && typeof (item as any).weeklyBalanceAfter === 'number' ? (
                        <span className="text-[10px] text-cyan-400/70 font-mono block">
                          Semana após: {(item as any).weeklyBalanceAfter.toLocaleString('pt-BR')} pts
                        </span>
                      ) : isSeasonal && typeof (item as any).seasonalBalanceAfter === 'number' ? (
                        <span className="text-[10px] text-purple-400/70 font-mono block">
                          Temp após: {(item as any).seasonalBalanceAfter.toLocaleString('pt-BR')} pts
                        </span>
                      ) : typeof item.balanceAfter === 'number' ? (
                        <span className="text-[10px] text-white/30 font-mono block">
                          Saldo após: {item.balanceAfter.toLocaleString('pt-BR')} pts
                        </span>
                      ) : null}
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
