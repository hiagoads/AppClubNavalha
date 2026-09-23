import React, { useState, useEffect, useRef } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, increment, addDoc, getDocs, setDoc, getDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  Award, Check, X, Clock, Search, Plus, UserPlus, Star, Camera, Users, Trophy, Target, Gift, 
  Gamepad2, Scissors, Edit2, Save, Trash2, Sparkles, RefreshCw, Calendar, Crown, Zap, 
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight, History, AlertTriangle, ShieldAlert, FileText, ArrowUpRight, ArrowDownRight, ExternalLink 
} from 'lucide-react';
import { DEFAULT_THRESHOLDS, getLevelTier, getClientTier, compareClientsForRanking } from '../utils/tierSystem';
import { checkAndSyncClientRankBonuses, RANK_BONUSES_CONFIG } from '../utils/bonusSystem';
import { DEFAULT_REWARDS, RewardItem, calculateSeasonDates } from '../hooks/useGamificationSettings';
import toast from 'react-hot-toast';
import { compressImage } from '../utils/imageUtils';
import { PastSeason, PointTransaction } from '../types';
import { ClientPointsAuditModal } from './modals/ClientPointsAuditModal';
import { GlobalPointsAuditLog } from './gamification/GlobalPointsAuditLog';

export function GamificationManager() {
  const [redemptions, setRedemptions] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [defaultAvatarUrl, setDefaultAvatarUrl] = useState('');
  const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tab State
  const [activeTab, setActiveTab] = useState<'overview' | 'audit' | 'redemptions' | 'clients'>('overview');

  // Audit and Transactions State
  const [pointTransactions, setPointTransactions] = useState<PointTransaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [auditClient, setAuditClient] = useState<any | null>(null);
  const [isAuditingOpen, setIsAuditingOpen] = useState(false);
  const [fixingClientId, setFixingClientId] = useState<string | null>(null);

  // Add Points State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  const [pointsToAdd, setPointsToAdd] = useState('');
  const [addDescription, setAddDescription] = useState('Bônus Manual');
  const [clientListSearchTerm, setClientListSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const [pointAction, setPointAction] = useState<'add'|'remove'>('add');

  // Season State
  const [seasonStart, setSeasonStart] = useState('');
  const [seasonDuration, setSeasonDuration] = useState('3');
  const [currentSeasonNumber, setCurrentSeasonNumber] = useState<number>(1);
  
  const [weekStart, setWeekStart] = useState('');
  const [currentWeekNumber, setCurrentWeekNumber] = useState<number>(1);
  const [tierThresholds, setTierThresholds] = useState<number[]>(DEFAULT_THRESHOLDS);
  const [isResetting, setIsResetting] = useState(false);
  const [isSavingSeason, setIsSavingSeason] = useState(false);
  const [isSyncingRankBonuses, setIsSyncingRankBonuses] = useState(false);

  // Past Seasons State
  const [pastSeasons, setPastSeasons] = useState<PastSeason[]>([]);
  const [expandedSeasonAdmin, setExpandedSeasonAdmin] = useState<string | null>(null);

  // Rewards State
  const [rewards, setRewards] = useState<RewardItem[]>(DEFAULT_REWARDS);
  const [isSavingRewards, setIsSavingRewards] = useState(false);
  const rewardsCarouselRef = useRef<HTMLDivElement>(null);

  const scrollRewards = (direction: 'left' | 'right') => {
    if (rewardsCarouselRef.current) {
      const scrollAmount = direction === 'left' ? -320 : 320;
      rewardsCarouselRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const getRewardIcon = (iconName?: string) => {
    switch (iconName) {
      case 'award': return <Award className="w-5 h-5 text-gold" />;
      case 'scissors': return <Scissors className="w-5 h-5 text-gold" />;
      case 'gamepad': return <Gamepad2 className="w-5 h-5 text-gold" />;
      case 'star': return <Star className="w-5 h-5 text-gold" />;
      case 'gift':
      default: return <Gift className="w-5 h-5 text-gold" />;
    }
  };

  useEffect(() => {
    // Listen to redemptions
    const q = query(collection(db, 'redemptions'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any));
      data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setRedemptions(data);
    });

    // Real-time listener for clients to keep balances updated immediately
    const unsubClients = onSnapshot(collection(db, 'clients'), (snap) => {
      const clientsData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setClients(clientsData);
    }, (e) => {
      if (e.code !== 'permission-denied') console.error('Error listening to clients:', e);
    });

    // Real-time listener for point transactions (audit log)
    const unsubTx = onSnapshot(collection(db, 'point_transactions'), (snapshot) => {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as PointTransaction));
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setPointTransactions(list);
      setLoadingTransactions(false);
    }, (err) => {
      if (err.code !== 'permission-denied') console.error('Error loading point transactions:', err);
      setLoadingTransactions(false);
    });

    // Load settings
    const loadSettings = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'settings', 'gamification'));
        if (docSnap.exists()) {
          const data = docSnap.data();
          setDefaultAvatarUrl(data.defaultAvatarUrl || '');
          setSeasonStart(data.seasonStartDate || '');
          setSeasonDuration(data.seasonDurationMonths?.toString() || '3');
          if (data.currentSeasonNumber) setCurrentSeasonNumber(Number(data.currentSeasonNumber));
          if (data.tierThresholds) setTierThresholds(data.tierThresholds);
          if (data.rewards && Array.isArray(data.rewards)) setRewards(data.rewards);
        }
      } catch (e: any) {
        if (e.code !== 'permission-denied') console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadSettings();

    // Listen to past seasons
    const qPast = query(collection(db, 'past_seasons'), orderBy('seasonNumber', 'desc'));
    const unsubPast = onSnapshot(qPast, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as PastSeason));
      setPastSeasons(data);
    }, (err) => {
      if (err.code !== 'permission-denied') console.error('Error loading past seasons:', err);
    });

    return () => {
      unsubscribe();
      unsubClients();
      unsubTx();
      unsubPast();
    };
  }, []);

  const handleSaveSeason = async () => {
    setIsSavingSeason(true);
    try {
      await setDoc(doc(db, 'settings', 'gamification'), {
        seasonStartDate: seasonStart,
        seasonDurationMonths: parseInt(seasonDuration),
        currentSeasonNumber: Number(currentSeasonNumber),
        tierThresholds
      }, { merge: true });

      // Atualiza também os clientes existentes cujas patentes salvas estejam desalinhadas com os novos limites
      try {
        const snap = await getDocs(collection(db, 'clients'));
        for (const d of snap.docs) {
          const clientData = d.data();
          const peak = Math.max(
            0,
            clientData.seasonHighestPoints ?? 0,
            clientData.highestSeasonalPoints ?? 0,
            clientData.seasonalPoints ?? 0,
            clientData.points ?? 0
          );
          const calculatedTier = getLevelTier(peak, tierThresholds, 1);
          // Se a patente salva estava maior que a pontuação real permite pelas novas regras
          if (clientData.seasonHighestTierLevel && clientData.seasonHighestTierLevel > calculatedTier.tierLevel) {
            await updateDoc(doc(db, 'clients', d.id), {
              seasonHighestTierLevel: calculatedTier.tierLevel,
              highestTierLevel: calculatedTier.tierLevel
            });
          }
        }
      } catch (clientErr) {
        console.warn('Erro ao atualizar patentes dos clientes com novos limites:', clientErr);
      }

      toast.success('Configuração da Temporada salva!');
    } catch (e: any) {
      if (e.code !== 'permission-denied') console.error(e);
      toast.error('Erro ao salvar temporada.');
    } finally {
      setIsSavingSeason(false);
    }
  };

  const handleSaveRewards = async (newRewards: RewardItem[]) => {
    setIsSavingRewards(true);
    try {
      await setDoc(doc(db, 'settings', 'gamification'), {
        rewards: newRewards
      }, { merge: true });
      setRewards(newRewards);
      toast.success('Catálogo de prêmios atualizado!');
    } catch (e) {
      if ((e as any).code !== 'permission-denied') console.error(e);
      toast.error('Erro ao salvar prêmios.');
    } finally {
      setIsSavingRewards(false);
    }
  };

  const handleAddReward = () => {
    const newReward: RewardItem = {
      id: `rew_${Date.now()}`,
      title: 'Novo Prêmio',
      points: 1000,
      icon: 'gift'
    };
    handleSaveRewards([...rewards, newReward]);
  };

  const handleRemoveReward = (id: string) => {
    handleSaveRewards(rewards.filter(r => r.id !== id));
  };

  const handleUpdateReward = (id: string, field: keyof RewardItem, value: any) => {
    const updated = rewards.map(r => r.id === id ? { ...r, [field]: value } : r);
    setRewards(updated); // Update local state for fast UI feedback
  };

  const handleConfirmRewardUpdates = () => {
    handleSaveRewards(rewards);
  };

  const handleResetWeek = async () => {
    setIsResetting(true);
    try {
      const snap = await getDocs(collection(db, 'clients'));
      const allClients: any[] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Ordena com os 3 critérios oficiais de desempate
      const sortedClients = [...allClients].sort(compareClientsForRanking);

      const now = new Date();
      // O bônus fica disponível por exatamente 7 dias (até o próximo fechamento semanal no domingo seguinte)
      const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const createdAt = now.toISOString();

      for (let i = 0; i < sortedClients.length; i++) {
        const c = sortedClients[i];
        const rank = i + 1;
        
        let clientBonuses: any[] = c.bonuses || [];

        // 1. Limpar bônus semanais anteriores expirados ou não resgatados da semana que passou
        // Bônus do tipo 'weekly_podium' ou com título contendo 'da Semana' são removidos no novo fechamento semanal
        clientBonuses = clientBonuses.filter((b: any) => {
          const isWeeklyBonus = b.category === 'weekly_podium' || 
            (b.title && (b.title.includes('da Semana') || b.title.includes('Semanal')));
          
          // Se não é bônus semanal (ex: bônus permanente de patente/nível), preserva intacto
          if (!isWeeklyBonus) return true;

          // Se já expirou ou se é da semana anterior, não permanece
          return false;
        });

        const addBonusWithoutStacking = (bonusDef: any) => {
          // Remove qualquer outro ativo do mesmo tipo para garantir que prevaleça o novo
          clientBonuses = clientBonuses.filter((b: any) => {
            if (b.type === bonusDef.type) {
              if (b.type === 'vip_hours') return (b.usedHours || 0) >= (b.totalHours || 1);
              return b.isRedeemed === true;
            }
            return true;
          });
          // Adiciona o novo bônus semanal com a data de validade de 1 semana
          clientBonuses.push(bonusDef);
        };

        const hasWeeklyPoints = (c.weeklyPoints || 0) > 0;
        
        if (hasWeeklyPoints) {
          if (rank === 1) {
            addBonusWithoutStacking({ 
              id: crypto.randomUUID(), 
              title: 'Acesso Livre VIP (1º da Semana)', 
              type: 'unlimited_vip', 
              category: 'weekly_podium',
              isRedeemed: false, 
              createdAt, 
              expiresAt 
            });
          } else if (rank === 2) {
            addBonusWithoutStacking({ 
              id: crypto.randomUUID(), 
              title: '1 Hora VIP (2º da Semana)', 
              type: 'vip_hours', 
              category: 'weekly_podium',
              totalHours: 1, 
              usedHours: 0, 
              createdAt, 
              expiresAt 
            });
            addBonusWithoutStacking({ 
              id: crypto.randomUUID(), 
              title: 'Picolé Grátis (2º da Semana)', 
              type: 'popsicle', 
              category: 'weekly_podium',
              isRedeemed: false, 
              createdAt, 
              expiresAt 
            });
          } else if (rank === 3) {
            addBonusWithoutStacking({ 
              id: crypto.randomUUID(), 
              title: 'Picolé Grátis (3º da Semana)', 
              type: 'popsicle', 
              category: 'weekly_podium',
              isRedeemed: false, 
              createdAt, 
              expiresAt 
            });
          }
        }

        await updateDoc(doc(db, 'clients', c.id), {
           weeklyPoints: 0,
           bonuses: clientBonuses
        });
      }

      toast.success(`Semana encerrada! Prêmios do pódio concedidos com validade de 1 semana e ranking reiniciado.`);
    } catch (e: any) {
      console.error(e);
      toast.error('Erro ao encerrar a semana.');
    } finally {
      setIsResetting(false);
    }
  };

  const handleResetSeason = async () => {
    setIsResetting(true);
    try {
      const snap = await getDocs(collection(db, 'clients'));
      const allClients: any[] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      const sortedClients = [...allClients].sort((a, b) => {
        const ptsA = Math.max(a.seasonHighestPoints ?? 0, a.highestSeasonalPoints ?? 0, a.seasonalPoints ?? 0, a.points ?? 0);
        const ptsB = Math.max(b.seasonHighestPoints ?? 0, b.highestSeasonalPoints ?? 0, b.seasonalPoints ?? 0, b.points ?? 0);
        if (ptsB !== ptsA) return ptsB - ptsA;
        return compareClientsForRanking(a, b);
      });

      const todayStr = new Date().toISOString().split('T')[0];

      // Build Podium snapshot
      const topPodium = sortedClients.slice(0, 3).map((c, idx) => {
        const pos = idx + 1;
        const pts = Math.max(c.seasonHighestPoints ?? 0, c.highestSeasonalPoints ?? 0, c.seasonalPoints ?? 0, c.points ?? 0);
        const tier = getClientTier(c, tierThresholds);
        let reward = '';
        if (pos === 1) reward = 'Ouro da Temporada';
        else if (pos === 2) reward = 'Prata da Temporada';
        else if (pos === 3) reward = 'Bronze da Temporada';

        return {
          position: pos,
          username: c.username || 'Cliente',
          avatarUrl: c.avatarUrl || '',
          points: pts,
          reward,
          tierName: tier.name
        };
      });

      // Build Top 10 Ranking snapshot
      const seasonRanking = sortedClients.slice(0, 10).map((c, idx) => {
        const pts = Math.max(c.seasonHighestPoints ?? 0, c.highestSeasonalPoints ?? 0, c.seasonalPoints ?? 0, c.points ?? 0);
        const tier = getClientTier(c, tierThresholds);
        return {
          position: idx + 1,
          username: c.username || 'Cliente',
          avatarUrl: c.avatarUrl || '',
          points: pts,
          tierName: tier.name
        };
      });

      const totalSeasonalPoints = sortedClients.reduce((acc, c) => acc + Math.max(c.seasonHighestPoints ?? 0, c.highestSeasonalPoints ?? 0, c.seasonalPoints ?? 0, c.points ?? 0), 0);
      const totalParticipants = sortedClients.filter(c => Math.max(c.seasonHighestPoints ?? 0, c.highestSeasonalPoints ?? 0, c.seasonalPoints ?? 0, c.points ?? 0) > 0).length;

      // 1. Save past season archive to Firestore
      await addDoc(collection(db, 'past_seasons'), {
        seasonNumber: currentSeasonNumber,
        title: `Temporada ${currentSeasonNumber}`,
        startDate: seasonStart || todayStr,
        endDate: todayStr,
        durationMonths: parseInt(seasonDuration) || 3,
        totalParticipants,
        totalSeasonalPoints,
        topPodium,
        ranking: seasonRanking,
        createdAt: new Date().toISOString()
      });

      // 2. Reset points & seasonalPoints, PRESERVING account level and lifetimePoints
      let count = 0;
      for (let i = 0; i < sortedClients.length; i++) {
        const c = sortedClients[i];
        
        // Lock in permanent account level and cumulative lifetime XP
        const existingLifetime = c.lifetimePoints ?? Math.max(c.points || 0, c.seasonalPoints || 0);
        const permanentLevel = Math.max(c.level || 1, Math.floor(existingLifetime / 10000) + 1);

        await updateDoc(doc(db, 'clients', c.id), {
           points: 0,
           seasonalPoints: 0,
           seasonHighestPoints: 0,
           highestSeasonalPoints: 0,
           seasonHighestTierLevel: 1,
           highestTierLevel: 1,
           level: permanentLevel,
           lifetimePoints: existingLifetime
        });
        count++;
      }

      // 3. Increment season number and start fresh from today
      const nextSeason = currentSeasonNumber + 1;
      await setDoc(doc(db, 'settings', 'gamification'), {
        currentSeasonNumber: nextSeason,
        seasonStartDate: todayStr
      }, { merge: true });

      setCurrentSeasonNumber(nextSeason);
      setSeasonStart(todayStr);

      toast.success(`Temporada ${currentSeasonNumber} encerrada e arquivada! Nova Temporada #${nextSeason} iniciada.`);
    } catch (e: any) {
      console.error(e);
      toast.error('Erro ao encerrar a temporada.');
    } finally {
      setIsResetting(false);
    }
  };

  const handleDeletePastSeason = async (seasonId: string, seasonTitle: string) => {
    try {
      await deleteDoc(doc(db, 'past_seasons', seasonId));
      toast.success(`${seasonTitle} removida do histórico.`);
    } catch (e) {
      console.error(e);
      toast.error('Erro ao remover temporada.');
    }
  };

  const handleSyncAllRankBonuses = async () => {
    setIsSyncingRankBonuses(true);
    try {
      const snap = await getDocs(collection(db, 'clients'));
      let awardedClientsCount = 0;
      let totalBonusesAwarded = 0;

      for (const d of snap.docs) {
        const clientData = d.data();
        const res = await checkAndSyncClientRankBonuses(d.id, clientData, tierThresholds);
        if (res && res.awardedBonuses && res.awardedBonuses.length > 0) {
          awardedClientsCount++;
          totalBonusesAwarded += res.awardedBonuses.length;
        }
      }

      if (awardedClientsCount > 0) {
        toast.success(`${totalBonusesAwarded} bônus creditados para ${awardedClientsCount} cliente(s)!`);
      } else {
        toast.success('Todos os clientes já estão com seus bônus de rank em dia!');
      }
    } catch (err) {
      console.error('Error syncing all rank bonuses:', err);
      toast.error('Erro ao sincronizar bônus de rank.');
    } finally {
      setIsSyncingRankBonuses(false);
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        setIsUpdatingAvatar(true);
        const base64 = await compressImage(file);
        
        await setDoc(doc(db, 'settings', 'gamification'), {
          defaultAvatarUrl: base64
        }, { merge: true });
        
        setDefaultAvatarUrl(base64);
        toast.success('Avatar padrão atualizado!');
      } catch (err) {
        toast.error('Erro ao atualizar imagem.');
      } finally {
        setIsUpdatingAvatar(false);
      }
    }
  };

  const handleFixNegativeBalance = async (targetClient: any) => {
    if (!targetClient?.id) return;
    setFixingClientId(targetClient.id);
    try {
      const clientRef = doc(db, 'clients', targetClient.id);
      const snap = await getDoc(clientRef);
      const data = snap.exists() ? snap.data() : targetClient;
      const prevPoints = data.points ?? 0;

      await updateDoc(clientRef, {
        points: 0,
        seasonalPoints: Math.max(0, data.seasonalPoints ?? 0),
        weeklyPoints: Math.max(0, data.weeklyPoints ?? 0)
      });

      await addDoc(collection(db, 'point_transactions'), {
        clientId: targetClient.id,
        clientName: targetClient.username || targetClient.firstName || 'Cliente',
        points: Math.abs(prevPoints),
        type: 'correction',
        description: `Ajuste corretivo: normalização de saldo negativo de ${prevPoints} para 0 pts`,
        balanceAfter: 0,
        createdAt: new Date().toISOString()
      });

      toast.success(`Saldo de ${targetClient.username} corrigido para 0 pts com sucesso!`);
    } catch (e: any) {
      console.error('Erro ao normalizar saldo:', e);
      toast.error('Erro ao normalizar saldo.');
    } finally {
      setFixingClientId(null);
    }
  };

  const handleFixAllNegative = async () => {
    const list = clients.filter(c => (c.points ?? 0) < 0 || (c.seasonalPoints ?? 0) < 0 || (c.weeklyPoints ?? 0) < 0);
    if (list.length === 0) return;
    try {
      for (const nc of list) {
        await handleFixNegativeBalance(nc);
      }
      toast.success('Todos os saldos negativos foram normalizados para 0 pts!');
    } catch (e) {
      console.error(e);
      toast.error('Erro ao normalizar todos os saldos.');
    }
  };

  const handleApprove = async (redemption: any) => {
    // Bypass confirm to avoid iframe blocking
    try {
      if (redemption.isBonus) {
         const clientDoc = await getDoc(doc(db, 'clients', redemption.clientId));
         if (clientDoc.exists()) {
             const data = clientDoc.data();
             let bonuses = data.bonuses || [];
             bonuses = bonuses.map((b: any) => {
                 if (b.id === redemption.bonusId) {
                     if (b.type === 'vip_hours') {
                         return { ...b, usedHours: (b.usedHours || 0) + (redemption.hoursToUse || 1) };
                     } else {
                         return { ...b, isRedeemed: true };
                     }
                 }
                 return b;
             });
             await updateDoc(doc(db, 'clients', redemption.clientId), { bonuses });
         }
      } else {
        const clientRef = doc(db, 'clients', redemption.clientId);
        const clientDoc = await getDoc(clientRef);
        let newPoints = 0;
        const cost = Math.abs(redemption.cost || 0);

        if (clientDoc.exists()) {
          const currentPoints = Math.max(0, clientDoc.data().points ?? 0);
          newPoints = Math.max(0, currentPoints - cost);
          await updateDoc(clientRef, { points: newPoints });
        }

        // Registra a transação de resgate no extrato de auditoria
        await addDoc(collection(db, 'point_transactions'), {
          clientId: redemption.clientId,
          clientName: redemption.clientName || 'Cliente',
          points: -cost,
          type: 'redeem',
          description: `Resgate aprovado: ${redemption.rewardTitle || 'Recompensa'}`,
          balanceAfter: newPoints,
          createdAt: new Date().toISOString()
        });
      }
      
      await updateDoc(doc(db, 'redemptions', redemption.id), {
        status: 'approved'
      });
      toast.success('Resgate aprovado com sucesso!');
    } catch (e: any) {
      if (e.code !== 'permission-denied') console.error(e);
      toast.error('Erro ao aprovar resgate.');
    }
  };

  const handleReject = async (redemption: any) => {
    // Bypass confirm to avoid iframe blocking
    try {
      await updateDoc(doc(db, 'redemptions', redemption.id), {
        status: 'rejected'
      });
      toast.success('Resgate recusado.');
    } catch (e) {
      if (e.code !== 'permission-denied') console.error(e);
      toast.error('Erro ao recusar.');
    }
  };

  const handleAddPoints = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient || !pointsToAdd || isNaN(Number(pointsToAdd))) {
      toast.error('Preencha os dados corretamente.');
      return;
    }

    const pts = parseInt(pointsToAdd);
    if (pts <= 0) {
      toast.error('O valor deve ser maior que zero.');
      return;
    }

    setIsAdding(true);
    try {
      const clientRef = doc(db, 'clients', selectedClient.id);
      const clientSnap = await getDoc(clientRef);
      const clientData = clientSnap.exists() ? clientSnap.data() : selectedClient;

      const currentPts = Math.max(0, clientData.points ?? 0);
      const currentSeasonal = Math.max(0, clientData.seasonalPoints ?? 0);
      const currentWeekly = Math.max(0, clientData.weeklyPoints ?? 0);

      let newPts = 0;
      let newSeasonal = 0;
      let newWeekly = 0;
      let deltaPoints = 0;

      if (pointAction === 'add') {
        newPts = currentPts + pts;
        newSeasonal = currentSeasonal + pts;
        newWeekly = currentWeekly + pts;
        deltaPoints = pts;

        const clientLifetime = Math.max(0, clientData.lifetimePoints ?? Math.max(currentPts, currentSeasonal));
        const newLifetime = clientLifetime + pts;
        const newLevel = Math.max(clientData.level || 1, Math.floor(newLifetime / 10000) + 1);

        const currentHighest = Math.max(
          clientData.seasonHighestPoints ?? 0,
          clientData.highestSeasonalPoints ?? 0,
          newSeasonal,
          newPts
        );
        const tierInfo = getLevelTier(currentHighest, tierThresholds, clientData.seasonHighestTierLevel ?? 1);
        const newHighestTier = Math.max(clientData.seasonHighestTierLevel ?? 1, tierInfo.tierLevel);

        const nowIso = new Date().toISOString();

        await updateDoc(clientRef, {
          points: newPts,
          seasonalPoints: newSeasonal,
          seasonHighestPoints: currentHighest,
          highestSeasonalPoints: currentHighest,
          seasonHighestTierLevel: newHighestTier,
          highestTierLevel: newHighestTier,
          weeklyPoints: newWeekly,
          lifetimePoints: newLifetime,
          level: newLevel,
          lastPointsUpdate: nowIso
        });

        const updatedClient = {
          ...clientData,
          id: selectedClient.id,
          points: newPts,
          seasonalPoints: newSeasonal,
          seasonHighestPoints: currentHighest,
          highestSeasonalPoints: currentHighest,
          seasonHighestTierLevel: newHighestTier,
          highestTierLevel: newHighestTier,
          weeklyPoints: newWeekly,
          lifetimePoints: newLifetime,
          level: newLevel,
          lastPointsUpdate: nowIso
        };
        await checkAndSyncClientRankBonuses(selectedClient.id, updatedClient, tierThresholds);
      } else {
        // Remoção com piso zero estrito (NUNCA permite saldo negativo!)
        newPts = Math.max(0, currentPts - pts);
        deltaPoints = -(currentPts - newPts); // valor exato debitado do saldo
        // Regra de não-regressão: a patente e os pontos sazonais nunca regridem ao debitar saldo gastável!
        await updateDoc(clientRef, {
          points: newPts
        });
      }

      const txDateIso = new Date().toISOString();

      // Registra transação no extrato oficial
      await addDoc(collection(db, 'point_transactions'), {
        clientId: selectedClient.id,
        clientName: selectedClient.username || selectedClient.firstName || 'Cliente',
        points: deltaPoints,
        type: pointAction === 'add' ? 'manual_add' : 'manual_remove',
        description: addDescription || (pointAction === 'add' ? 'Bônus Manual' : 'Remoção Manual'),
        balanceAfter: newPts,
        createdAt: txDateIso
      });

      toast.success(`${pts} pontos ${pointAction === 'add' ? 'adicionados' : 'removidos'} para ${selectedClient.username}!`);
      
      setPointsToAdd('');
      setAddDescription(pointAction === 'add' ? 'Bônus Manual' : 'Remoção Manual');
      setSelectedClient(null);
      setSearchTerm('');
    } catch (e) {
      if (e.code !== 'permission-denied') console.error(e);
      toast.error(`Erro ao ${pointAction === 'add' ? 'adicionar' : 'remover'} pontos.`);
    } finally {
      setIsAdding(false);
    }
  };

  const pending = redemptions.filter(r => r.status === 'pending');
  const history = redemptions.filter(r => r.status !== 'pending');
  const negativeClients = clients.filter(c => (c.points ?? 0) < 0 || (c.seasonalPoints ?? 0) < 0 || (c.weeklyPoints ?? 0) < 0);

  const filteredClientList = clients.filter(c => 
    (c.username || '').toLowerCase().includes(clientListSearchTerm.toLowerCase()) || 
    (c.whatsapp || '').includes(clientListSearchTerm) || 
    (c.email || '').toLowerCase().includes(clientListSearchTerm.toLowerCase()) ||
    (c.firstName || '').toLowerCase().includes(clientListSearchTerm.toLowerCase()) ||
    (c.lastName || '').toLowerCase().includes(clientListSearchTerm.toLowerCase())
  ).sort((a, b) => (b.points || 0) - (a.points || 0));

  const filteredClients = searchTerm.length > 1 
    ? clients.filter(c => 
        (c.username || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
        (c.whatsapp || '').includes(searchTerm) || 
        (c.email || '').toLowerCase().includes(searchTerm.toLowerCase())
      ).slice(0, 5) 
    : [];

  if (loading) {
    return <div className="p-8 text-center text-white/50 animate-pulse">Carregando dados...</div>;
  }

  return (
    <div className="space-y-6">
      
      {/* Header with Avatar Settings */}
      <div className="glass-card p-6 border-gold/50 mb-6 flex flex-col sm:flex-row justify-between sm:items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center">
            <Award className="w-5 h-5 text-gold" />
          </div>
          <div>
            <h2 className="text-xl font-bold font-display text-white">Clube Navalha</h2>
            <p className="text-white/50 text-sm mt-1">Gerencie pontos e configurações do clube</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4 bg-white/5 p-3 rounded-2xl border border-white/5">
          <div className="text-right">
            <p className="text-xs font-bold text-white uppercase tracking-widest">Avatar Padrão</p>
            <p className="text-[10px] text-white/40">Exibido p/ usuários sem foto</p>
          </div>
          <div className="relative group cursor-pointer" onClick={() => !isUpdatingAvatar && fileInputRef.current?.click()}>
            <div className="w-12 h-12 rounded-full border-2 border-white/10 bg-black overflow-hidden flex items-center justify-center">
              {isUpdatingAvatar ? (
                <div className="w-4 h-4 border-2 border-gold/20 border-t-gold rounded-full animate-spin" />
              ) : defaultAvatarUrl ? (
                <img src={defaultAvatarUrl} alt="Default" className="w-full h-full object-cover" />
              ) : (
                <Camera className="w-5 h-5 text-white/20" />
              )}
            </div>
            {!isUpdatingAvatar && (
              <div className="absolute inset-0 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <Camera className="w-5 h-5 text-white" />
              </div>
            )}
            <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageChange} />
          </div>
        </div>
      </div>

      {/* Alerta de Saldo Negativo - Sempre visível se houver conta afetada */}
      {negativeClients.length > 0 && (
        <div className="p-5 rounded-2xl bg-red-950/60 border-2 border-red-500/80 shadow-2xl shadow-red-950/60 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0">
                <AlertTriangle className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-bold text-white">
                    Saldo Negativo Detectado em Conta ({negativeClients.length} cliente{negativeClients.length > 1 ? 's' : ''})
                  </h3>
                  <span className="bg-red-500 text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded-full uppercase">
                    Piso Zero Corrigido
                  </span>
                </div>
                <p className="text-xs text-red-200/80 mt-1 max-w-2xl leading-relaxed">
                  Identificamos saldo negativo decorrente de deduções ou resgates anteriores sem trava de piso. O sistema já foi blindado para <strong>impedir qualquer saldo negativo daqui em diante</strong>. Utilize o botão abaixo para normalizar para 0 pontos imediatamente e registrar no extrato de auditoria.
                </p>
              </div>
            </div>

            {negativeClients.length > 1 && (
              <button
                onClick={handleFixAllNegative}
                className="bg-red-500 hover:bg-red-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-red-500/30 shrink-0 flex items-center gap-2 self-start sm:self-auto"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Corrigir Todas ({negativeClients.length})</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-3 border-t border-red-500/30">
            {negativeClients.map(nc => (
              <div key={nc.id} className="p-3 rounded-xl bg-black/50 border border-red-500/40 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold text-xs text-white truncate">
                    {nc.firstName ? `${nc.firstName} ${nc.lastName || ''}` : nc.username}
                  </p>
                  <p className="text-[11px] text-white/50 truncate font-mono">@{nc.username}</p>
                  <span className="inline-block mt-1 text-xs font-mono font-bold text-red-400 bg-red-500/15 px-2 py-0.5 rounded border border-red-500/30">
                    {nc.points ?? 0} pts
                  </span>
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  <button
                    onClick={() => {
                      setAuditClient(nc);
                      setIsAuditingOpen(true);
                    }}
                    className="text-[10px] font-bold text-white/80 hover:text-white bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-lg transition-colors flex items-center justify-center gap-1"
                  >
                    <History className="w-3 h-3" />
                    <span>Extrato</span>
                  </button>
                  <button
                    onClick={() => handleFixNegativeBalance(nc)}
                    disabled={fixingClientId === nc.id}
                    className="text-[10px] font-bold text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 px-2.5 py-1 rounded-lg transition-colors flex items-center justify-center gap-1 shadow"
                  >
                    {fixingClientId === nc.id ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : (
                      <Check className="w-3 h-3" />
                    )}
                    <span>Zerar (0)</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs de Navegação do Clube Navalha */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar border-b border-white/10">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'overview'
              ? 'bg-gold text-carbon shadow-lg shadow-gold/10'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <Crown className="w-4 h-4" />
          <span>Temporada & Prêmios</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'audit'
              ? 'bg-gold text-carbon shadow-lg shadow-gold/10'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Extrato & Logs de Auditoria</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
            activeTab === 'audit' ? 'bg-carbon/20 text-carbon' : 'bg-white/10 text-white/70'
          }`}>
            {pointTransactions.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('redemptions')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'redemptions'
              ? 'bg-gold text-carbon shadow-lg shadow-gold/10'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <Gift className="w-4 h-4" />
          <span>Resgates & Pontos Manuais</span>
          {pending.length > 0 && (
            <span className="text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded-full font-bold">
              {pending.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('clients')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'clients'
              ? 'bg-gold text-carbon shadow-lg shadow-gold/10'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Clientes & Saldos</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
            activeTab === 'clients' ? 'bg-carbon/20 text-carbon' : 'bg-white/10 text-white/70'
          }`}>
            {clients.length}
          </span>
          {negativeClients.length > 0 && (
            <span className="text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded-full font-bold animate-pulse">
              {negativeClients.length} neg
            </span>
          )}
        </button>
      </div>

      {/* Conteúdo da Aba: Extrato & Auditoria Geral */}
      {activeTab === 'audit' && (
        <div className="glass-card p-6 border-gold/40">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-6">
            <div>
              <h3 className="text-base font-bold uppercase tracking-wider text-gold flex items-center gap-2">
                <History className="w-5 h-5" /> Auditoria & Extrato Completo de Pontos
              </h3>
              <p className="text-xs text-white/50 mt-0.5">
                Registro detalhado de todas as movimentações, créditos de serviços, bônus, resgates e correções de saldo.
              </p>
            </div>
          </div>

          <GlobalPointsAuditLog
            transactions={pointTransactions}
            loading={loadingTransactions}
            clients={clients}
            onOpenClientAudit={(c) => {
              setAuditClient(c);
              setIsAuditingOpen(true);
            }}
          />
        </div>
      )}

      {/* Conteúdo da Aba: Temporadas & Prêmios */}
      {activeTab === 'overview' && (
        <>
          {/* Season Config */}
          <div className="glass-card p-6 border-gold/50 mb-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-widest text-gold flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-gold" /> Configuração de Temporada
                </h3>
                <p className="text-sm text-white/60 mt-1">A temporada define o ranking atual dos clientes. Ao encerrar, um snapshot com o ranking final é salvo no Histórico e os prêmios do Top 3 são distribuídos.</p>
              </div>
              <span className="text-xs font-bold text-gold px-3 py-1 bg-gold/10 rounded-xl border border-gold/30">
                Temporada #{currentSeasonNumber}
              </span>
            </div>

        {/* Resumo da Temporada Atual */}
        {(() => {
          const dates = calculateSeasonDates(seasonStart, parseInt(seasonDuration) || 3);
          const activeCount = clients.filter(c => (c.seasonalPoints || c.points || 0) > 0).length;
          const totalXP = clients.reduce((acc, c) => acc + (c.seasonalPoints || c.points || 0), 0);

          return (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-black/40 rounded-2xl border border-white/5 mb-6 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-white/40 block">Início</span>
                <span className="font-semibold text-white/90 flex items-center gap-1.5 mt-1">
                  <Calendar className="w-3.5 h-3.5 text-gold" />
                  {dates.startDateFormatted}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-white/40 block">Término Previsto</span>
                <span className="font-semibold text-white/90 flex items-center gap-1.5 mt-1">
                  <Calendar className="w-3.5 h-3.5 text-gold" />
                  {dates.endDateFormatted}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-white/40 block">Tempo Restante</span>
                <span className="font-bold text-gold flex items-center gap-1.5 mt-1">
                  <Clock className="w-3.5 h-3.5 text-gold" />
                  {dates.daysRemaining} dias
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-white/40 block">Membros / XP</span>
                <span className="font-bold text-white flex items-center gap-1.5 mt-1">
                  <Users className="w-3.5 h-3.5 text-gold" />
                  {activeCount} ({totalXP.toLocaleString('pt-BR')} pts)
                </span>
              </div>
            </div>
          );
        })()}

        {/* Form: Configuração dos Parâmetros */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end mb-6">
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase text-white/50 tracking-wider block">
              Nº Temporada
            </label>
            <input 
              type="number" 
              min="1"
              value={currentSeasonNumber}
              onChange={(e) => setCurrentSeasonNumber(parseInt(e.target.value) || 1)}
              className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 px-3 text-white focus:outline-none focus:border-gold/50 font-medium" 
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase text-white/50 tracking-wider block">
              Início da Temporada
            </label>
            <input 
              type="date" 
              value={seasonStart}
              onChange={(e) => setSeasonStart(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 px-3 text-white focus:outline-none focus:border-gold/50 font-medium [color-scheme:dark]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase text-white/50 tracking-wider block">
              Duração (Meses)
            </label>
            <input 
              type="number" 
              min="1"
              max="12"
              value={seasonDuration}
              onChange={(e) => setSeasonDuration(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 px-3 text-white focus:outline-none focus:border-gold/50 font-medium" 
            />
          </div>

          <div>
            <button 
              onClick={handleSaveSeason}
              disabled={isSavingSeason}
              className="w-full py-2.5 px-4 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 border border-white/10 hover:border-white/20"
            >
              <Save className="w-4 h-4 text-gold" />
              <span>{isSavingSeason ? 'Salvando...' : 'Salvar Configuração'}</span>
            </button>
          </div>
        </div>

        {/* Ações de Ciclo & Encerramento */}
        <div className="border-t border-white/10 pt-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-0.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white/70 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-gold" />
                Ações de Ciclo & Premiação
              </h4>
              <p className="text-xs text-white/40">
                Encerre a semana para premiar o pódio semanal ou encerre a temporada completa para arquivar o ranking.
              </p>
            </div>

            {isResetting ? (
              <div className="flex items-center gap-2.5 py-2.5 px-5 bg-white/5 border border-white/10 rounded-xl text-white/60 text-xs font-semibold">
                <RefreshCw className="w-4 h-4 animate-spin text-gold" />
                <span>Processando encerramento...</span>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-3">
                <button 
                  onClick={() => handleResetWeek()}
                  className="px-4 py-2.5 bg-gold/15 hover:bg-gold/25 text-gold border border-gold/30 hover:border-gold/50 rounded-xl font-bold transition-all text-xs flex items-center justify-center gap-2 shadow-sm"
                  title="Distribui os prêmios da semana e reinicia o ranking semanal"
                >
                  <Award className="w-4 h-4 text-gold shrink-0" />
                  <span>Encerrar Semana</span>
                  <span className="text-[10px] opacity-80 font-normal bg-gold/10 px-1.5 py-0.5 rounded border border-gold/20">
                    Premiar Pódio & Zerar
                  </span>
                </button>
                <button 
                  onClick={() => handleResetSeason()}
                  className="px-4 py-2.5 bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30 hover:border-red-500/50 rounded-xl font-bold transition-all text-xs flex items-center justify-center gap-2 shadow-sm"
                  title="Arquiva a temporada no histórico e reinicia a pontuação geral"
                >
                  <Trophy className="w-4 h-4 text-red-400 shrink-0" />
                  <span>Encerrar Temporada</span>
                  <span className="text-[10px] opacity-80 font-normal bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20">
                    Arquivar & Zerar XP
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Histórico de Temporadas Encerradas */}
      <div className="glass-card p-6 border-white/10 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-widest text-white flex items-center gap-2">
              <History className="w-4 h-4 text-gold" /> Histórico de Temporadas Encerradas
            </h3>
            <p className="text-sm text-white/60 mt-1">Temporadas finalizadas com seus respectivos pódios e classificações arquivadas.</p>
          </div>
          <span className="text-xs text-white/40">
            {pastSeasons.length} {pastSeasons.length === 1 ? 'temporada arquivada' : 'temporadas arquivadas'}
          </span>
        </div>

        {pastSeasons.length === 0 ? (
          <div className="p-8 rounded-2xl bg-white/[0.02] border border-white/5 text-center">
            <History className="w-8 h-8 text-white/20 mx-auto mb-2" />
            <p className="text-sm text-white/60 font-medium">Nenhuma temporada arquivada ainda.</p>
            <p className="text-xs text-white/40 mt-1">Ao clicar em "Encerrar Temporada", a temporada atual será salva aqui automaticamente com o Top 3 e ranking.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pastSeasons.map((season) => {
              const isExpanded = expandedSeasonAdmin === season.id;
              const top1 = season.topPodium?.find(p => p.position === 1);
              const top2 = season.topPodium?.find(p => p.position === 2);
              const top3 = season.topPodium?.find(p => p.position === 3);

              return (
                <div key={season.id} className="p-4 rounded-2xl bg-black/30 border border-white/10 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-white text-base">{season.title || `Temporada ${season.seasonNumber}`}</h4>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-white/60">Encerrada</span>
                      </div>
                      <p className="text-xs text-white/40 flex items-center gap-1.5 mt-0.5">
                        <Calendar className="w-3.5 h-3.5 text-gold/70" />
                        {season.startDate} até {season.endDate}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-xs text-white/60 bg-white/5 px-3 py-1.5 rounded-xl border border-white/5 flex items-center gap-2">
                        <span>{season.totalParticipants || 0} competidores</span>
                        <span>•</span>
                        <span className="font-bold text-gold">{(season.totalSeasonalPoints || 0).toLocaleString('pt-BR')} XP</span>
                      </div>

                      <button
                        onClick={() => handleDeletePastSeason(season.id, season.title || `Temporada ${season.seasonNumber}`)}
                        className="p-2 text-white/30 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
                        title="Remover do Histórico"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Pódio dos Campeões */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-yellow-500 text-carbon font-bold flex items-center justify-center text-[10px] shrink-0">1º</span>
                      <div className="min-w-0">
                        <p className="font-bold text-white truncate">{top1?.username || '—'}</p>
                        <p className="text-[10px] text-yellow-400 font-mono">{(top1?.points || 0).toLocaleString('pt-BR')} pts • {top1?.reward || 'Acesso VIP'}</p>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-gray-300/10 border border-gray-300/20 flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-gray-300 text-carbon font-bold flex items-center justify-center text-[10px] shrink-0">2º</span>
                      <div className="min-w-0">
                        <p className="font-bold text-white truncate">{top2?.username || '—'}</p>
                        <p className="text-[10px] text-gray-300 font-mono">{(top2?.points || 0).toLocaleString('pt-BR')} pts • {top2?.reward || '1h VIP + Picolé'}</p>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-amber-700/10 border border-amber-700/20 flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-amber-700 text-white font-bold flex items-center justify-center text-[10px] shrink-0">3º</span>
                      <div className="min-w-0">
                        <p className="font-bold text-white truncate">{top3?.username || '—'}</p>
                        <p className="text-[10px] text-amber-500 font-mono">{(top3?.points || 0).toLocaleString('pt-BR')} pts • {top3?.reward || 'Picolé'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Detalhes expansíveis */}
                  {season.ranking && season.ranking.length > 0 && (
                    <div>
                      <button
                        onClick={() => setExpandedSeasonAdmin(isExpanded ? null : season.id)}
                        className="w-full flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-medium text-white/60 hover:text-white transition-colors"
                      >
                        <span>{isExpanded ? 'Ocultar Classificação' : 'Ver Classificação Gravada'}</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>

                      {isExpanded && (
                        <div className="mt-2 space-y-1.5 pt-2 border-t border-white/5">
                          {season.ranking.map((member, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-black/40 text-xs">
                              <div className="flex items-center gap-2">
                                <span className="text-white/40 w-4 font-mono font-bold">{member.position}º</span>
                                <span className="text-white font-medium">{member.username}</span>
                                {member.tierName && <span className="text-[10px] text-white/40">({member.tierName})</span>}
                              </div>
                              <span className="font-mono font-bold text-gold">{member.points.toLocaleString('pt-BR')} pts</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Tier Configuration */}
      <div className="glass-card p-6 border-gold/50 mb-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-4">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-widest text-gold flex items-center gap-2">
              <Target className="w-4 h-4 text-gold" /> Requisitos de Pontos (Níveis)
            </h3>
            <p className="text-sm text-white/60 mt-1">Configure a quantidade de pontos necessários para atingir cada nível.</p>
          </div>
          <button
            onClick={handleSyncAllRankBonuses}
            disabled={isSyncingRankBonuses}
            className="flex items-center gap-2 bg-gold/15 hover:bg-gold/25 text-gold border border-gold/30 px-4 py-2 rounded-xl font-bold transition-all text-sm shrink-0"
            title="Verifica todos os clientes e concede os bônus dos níveis que já alcançaram"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncingRankBonuses ? 'animate-spin' : ''}`} />
            {isSyncingRankBonuses ? 'Sincronizando...' : 'Sincronizar Bônus por Nível'}
          </button>
        </div>

        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3.5 mb-6 flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-gold shrink-0 mt-0.5" />
          <div className="text-xs text-white/80 leading-relaxed">
            <strong className="text-gold">Bônus Concedidos por Meta Atingida:</strong> Os bônus agora são creditados no perfil do cliente imediatamente no momento em que ele atinge a pontuação de cada rank (não mais apenas no fim da temporada).
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[ 
            { name: 'Iniciante', bonus: 'Sem bônus' },
            { name: 'Bronze', bonus: 'Sem bônus' },
            { name: 'Prata', bonus: '1h VIP' },
            { name: 'Ouro', bonus: '1h VIP + 5k pts' },
            { name: 'Platina', bonus: '3h VIP' },
            { name: 'Diamante', bonus: '50% OFF' },
            { name: 'Elite', bonus: '50% OFF' },
            { name: 'Lenda', bonus: '50% OFF' }
          ].map((item, idx) => (
            <div key={idx} className="space-y-1.5 p-3 rounded-xl bg-black/20 border border-white/5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold uppercase text-white/50 tracking-widest">{item.name}</label>
                <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${
                  item.bonus.includes('OFF') ? 'bg-purple-500/20 text-purple-300' :
                  item.bonus.includes('VIP') ? 'bg-gold/20 text-gold' :
                  'bg-white/5 text-white/40'
                }`}>
                  {item.bonus}
                </span>
              </div>
              <input 
                type="number" 
                value={tierThresholds[idx] ?? 0}
                disabled={idx === 0}
                onChange={(e) => {
                  const newThresholds = [...tierThresholds];
                  newThresholds[idx] = parseInt(e.target.value) || 0;
                  setTierThresholds(newThresholds);
                }}
                className={`w-full bg-black/40 border ${idx === 0 ? 'border-white/5 opacity-50' : 'border-white/10'} rounded-xl py-2.5 px-3 text-white focus:outline-none focus:border-gold/50 text-sm`}
              />
            </div>
          ))}
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button 
            onClick={handleSaveSeason}
            disabled={isSavingSeason}
            className="btn-primary"
          >
            {isSavingSeason ? 'Salvando...' : 'Salvar Níveis'}
          </button>
        </div>
      </div>

      {/* Rewards Configuration */}
      <div className="glass-card p-6 border-gold/50 mb-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-widest text-gold flex items-center gap-2">
              <Gift className="w-4 h-4 text-gold" /> Catálogo de Prêmios (Cartões de Troca)
            </h3>
            <p className="text-sm text-white/60 mt-1">Defina os prêmios disponíveis para resgate e seus respectivos valores em pontos.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Controles de Navegação do Carrossel */}
            <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10">
              <button 
                type="button"
                onClick={() => scrollRewards('left')}
                className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title="Rolar para a esquerda"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button 
                type="button"
                onClick={() => scrollRewards('right')}
                className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title="Rolar para a direita"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button 
              type="button"
              onClick={handleAddReward}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-3.5 py-2 rounded-xl font-bold transition-colors text-xs shrink-0"
            >
              <Plus className="w-4 h-4 text-gold" /> Novo Prêmio
            </button>
            
            <button 
              type="button"
              onClick={handleConfirmRewardUpdates}
              disabled={isSavingRewards}
              className="btn-primary flex items-center gap-2 py-2 px-4 text-xs font-bold shrink-0"
            >
              {isSavingRewards ? (
                <div className="w-3.5 h-3.5 border-2 border-carbon/20 border-t-carbon rounded-full animate-spin" />
              ) : <Save className="w-3.5 h-3.5" />}
              {isSavingRewards ? 'Salvando...' : 'Salvar Catálogo'}
            </button>
          </div>
        </div>

        {/* Carrossel de Prêmios */}
        <div 
          ref={rewardsCarouselRef}
          className="flex overflow-x-auto gap-4 pb-4 -mx-2 px-2 snap-x snap-mandatory scroll-smooth [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full"
        >
          {rewards.map((reward) => (
            <div 
              key={reward.id} 
              className="min-w-[280px] w-[280px] sm:min-w-[300px] sm:w-[300px] snap-start bg-black/40 border border-white/10 rounded-2xl p-5 flex flex-col justify-between shrink-0 relative overflow-hidden group hover:border-gold/40 transition-all shadow-lg shadow-black/20"
            >
              {/* Topo do Card: Ícone & Remover */}
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  {getRewardIcon(reward.icon)}
                </div>
                <button 
                  onClick={() => handleRemoveReward(reward.id)}
                  className="p-2 text-white/30 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-colors"
                  title="Remover Prêmio"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Formulário do Cartão */}
              <div className="space-y-3 mb-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-white/50 tracking-wider block">
                    Título do Prêmio
                  </label>
                  <input 
                    type="text" 
                    value={reward.title}
                    onChange={(e) => handleUpdateReward(reward.id, 'title', e.target.value)}
                    placeholder="Ex: Corte Grátis"
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-white text-sm font-semibold focus:outline-none focus:border-gold/50"
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-white/50 tracking-wider block">
                    Pontos (Custo de Resgate)
                  </label>
                  <div className="relative">
                    <input 
                      type="number" 
                      min="1"
                      value={reward.points}
                      onChange={(e) => handleUpdateReward(reward.id, 'points', parseInt(e.target.value) || 0)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-gold font-mono font-bold focus:outline-none focus:border-gold/50"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gold/60 font-mono font-bold pointer-events-none">
                      pts
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-white/50 tracking-wider block">
                    Ícone do Cartão
                  </label>
                  <select 
                    value={reward.icon || 'gift'}
                    onChange={(e) => handleUpdateReward(reward.id, 'icon', e.target.value)}
                    className="w-full bg-carbon-light border border-white/10 rounded-xl py-2 px-3 text-white text-xs focus:outline-none focus:border-gold/50 appearance-none cursor-pointer"
                  >
                    <option value="gift">Presente</option>
                    <option value="award">Troféu / Medalha</option>
                    <option value="scissors">Tesoura</option>
                    <option value="gamepad">Videogame</option>
                    <option value="star">Estrela</option>
                  </select>
                </div>
              </div>

              {/* Rodapé do Card com Preview */}
              <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-white/40">
                <span>Resgate por:</span>
                <span className="font-bold text-gold font-mono text-xs">
                  {reward.points.toLocaleString('pt-BR')} pts
                </span>
              </div>
            </div>
          ))}

          {/* Card de Adicionar Novo Prêmio */}
          <button 
            type="button"
            onClick={handleAddReward}
            className="min-w-[200px] w-[200px] sm:min-w-[220px] sm:w-[220px] snap-start bg-white/[0.02] hover:bg-white/[0.05] border-2 border-dashed border-white/10 hover:border-gold/40 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 shrink-0 cursor-pointer transition-all group"
          >
            <div className="w-12 h-12 rounded-full bg-white/5 group-hover:bg-gold/10 border border-white/10 group-hover:border-gold/30 flex items-center justify-center transition-colors">
              <Plus className="w-6 h-6 text-white/40 group-hover:text-gold group-hover:scale-110 transition-all" />
            </div>
            <div className="text-center">
              <p className="text-xs font-bold text-white/80 group-hover:text-white uppercase tracking-wider">
                Novo Prêmio
              </p>
              <p className="text-[10px] text-white/40 mt-0.5">
                Adicionar outro cartão
              </p>
            </div>
          </button>

          {rewards.length === 0 && (
            <div className="min-w-[300px] text-center p-8 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center">
              <p className="text-white/40 text-sm">Nenhum prêmio cadastrado.</p>
            </div>
          )}
        </div>

        <div className="mt-4 flex justify-between items-center pt-4 border-t border-white/10">
          <p className="text-xs text-white/40">
            {rewards.length} {rewards.length === 1 ? 'prêmio cadastrado' : 'prêmios cadastrados'} no catálogo.
          </p>
          <button 
            type="button"
            onClick={handleConfirmRewardUpdates}
            disabled={isSavingRewards}
            className="btn-primary flex items-center gap-2"
          >
            {isSavingRewards ? (
              <div className="w-4 h-4 border-2 border-carbon/20 border-t-carbon rounded-full animate-spin" />
            ) : <Save className="w-4 h-4" />}
            {isSavingRewards ? 'Salvando...' : 'Salvar Catálogo'}
          </button>
        </div>
      </div>
    </>
  )}

  {/* Conteúdo da Aba: Resgates & Pontos Manuais */}
  {activeTab === 'redemptions' && (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Col 1: Pending Redemptions */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-bold uppercase tracking-widest text-gold mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4" /> Solicitações Pendentes ({pending.length})
          </h3>
          
          {pending.length === 0 ? (
            <div className="bg-white/5 rounded-xl p-6 text-center border border-white/5">
              <p className="text-white/40 text-sm">Nenhuma solicitação pendente no momento.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pending.map(req => (
                <div key={req.id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                  <div>
                    <h4 className="font-bold text-white text-base">{req.clientName}</h4>
                    <p className="text-gold font-bold text-sm mb-1">{req.rewardTitle} <span className="text-white/40 font-mono">({req.cost} pts)</span></p>
                    <div className="flex items-center gap-2">
                      <Clock className="w-3 h-3 text-white/30" />
                      <span className="text-xs text-white/30">{new Date(req.createdAt).toLocaleString('pt-BR')}</span>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                    <button
                      onClick={() => handleReject(req)}
                      className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 font-bold text-xs transition-colors"
                    >
                      <X className="w-4 h-4" /> Recusar
                    </button>
                    <button
                      onClick={() => handleApprove(req)}
                      className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30 font-bold text-xs transition-colors"
                    >
                      <Check className="w-4 h-4" /> Aprovar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Col 2: Add Points Manual */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-bold uppercase tracking-widest text-gold mb-4 flex items-center gap-2">
            <Plus className="w-4 h-4" /> Adicionar / Remover Pontos
          </h3>

          <div className="space-y-4">
            {!selectedClient ? (
              <div>
                <label className="block text-xs uppercase tracking-widest text-white/50 font-bold mb-2">Buscar Cliente</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-white/40" />
                  </div>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-white/30 focus:outline-none focus:border-gold/50 transition-colors"
                    placeholder="Nome, e-mail ou WhatsApp..."
                  />
                </div>

                {searchTerm.length > 1 && (
                  <div className="mt-2 bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden shadow-xl max-h-60 overflow-y-auto custom-scrollbar">
                    {filteredClients.length > 0 ? (
                      filteredClients.map(client => (
                        <button
                          key={client.id}
                          onClick={() => setSelectedClient(client)}
                          className="w-full text-left p-3 hover:bg-white/5 border-b border-white/5 last:border-0 transition-colors flex justify-between items-center group"
                        >
                          <div>
                            <p className="font-bold text-sm text-white group-hover:text-gold transition-colors">{client.username}</p>
                            <p className="text-xs text-white/40 font-mono mt-0.5">{client.whatsapp || client.email}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-bold text-gold">{client.points || 0} pts</p>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="p-4 text-center text-white/40 text-sm">
                        Nenhum cliente encontrado.
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleAddPoints} className="bg-white/5 border border-white/10 rounded-xl p-5">
                <div className="flex justify-between items-start mb-4 border-b border-white/5 pb-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-white/50 font-bold mb-1">Cliente Selecionado</p>
                    <p className="font-bold text-white text-lg">{selectedClient.username}</p>
                    <p className="text-xs text-white/40 font-mono mt-0.5">{selectedClient.whatsapp || selectedClient.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setSelectedClient(null); setSearchTerm(''); }}
                    className="text-white/40 hover:text-white p-1 rounded-md bg-white/5"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="flex bg-black/40 border border-white/10 rounded-xl p-1 gap-1">
                    <button
                      type="button"
                      onClick={() => setPointAction('add')}
                      className={`flex-1 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${pointAction === 'add' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70'}`}
                    >
                      Adicionar
                    </button>
                    <button
                      type="button"
                      onClick={() => setPointAction('remove')}
                      className={`flex-1 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${pointAction === 'remove' ? 'bg-red-500/20 text-red-400' : 'text-white/40 hover:text-white/70'}`}
                    >
                      Remover
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-widest text-white/50 font-bold mb-2">Quantidade de Pontos</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Star className="h-4 w-4 text-gold" />
                      </div>
                      <input
                        type="number"
                        required
                        min="1"
                        value={pointsToAdd}
                        onChange={(e) => setPointsToAdd(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-white font-mono font-bold focus:outline-none focus:border-gold/50"
                        placeholder="Ex: 500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-widest text-white/50 font-bold mb-2">Motivo / Descrição</label>
                    <input
                      type="text"
                      required
                      value={addDescription}
                      onChange={(e) => setAddDescription(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl py-2 px-4 text-white focus:outline-none focus:border-gold/50 text-sm"
                      placeholder="Ex: Bônus de aniversário"
                    />
                  </div>
                  
                  <button
                    type="submit"
                    disabled={isAdding}
                    className={`w-full flex justify-center items-center gap-2 font-bold py-3 rounded-xl transition-colors shadow-lg ${pointAction === 'add' ? 'bg-gold text-carbon hover:bg-gold/90 shadow-gold/20' : 'bg-red-500 text-white hover:bg-red-600 shadow-red-500/20'}`}
                  >
                    {isAdding ? (
                      <div className={`w-5 h-5 border-2 ${pointAction === 'add' ? 'border-carbon/20 border-t-carbon' : 'border-white/20 border-t-white'} rounded-full animate-spin`} />
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        {pointAction === 'add' ? 'Adicionar Pontos' : 'Remover Pontos'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="glass-card p-6">
          <h3 className="text-sm font-bold uppercase tracking-widest text-white/40 mb-4">Histórico de Resgates</h3>
          <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar pr-2">
            {history.map(req => (
              <div key={req.id} className="bg-white/5 border border-white/5 rounded-xl p-3 flex justify-between items-center hover:bg-white/10 transition-colors">
                <div>
                  <p className="font-bold text-sm text-white/80">{req.clientName}</p>
                  <p className="text-xs text-white/50">{req.rewardTitle}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Clock className="w-3 h-3 text-white/30" />
                    <span className="text-[10px] text-white/40">{new Date(req.createdAt).toLocaleString('pt-BR')}</span>
                  </div>
                </div>
                <div className="text-right">
                  {req.status === 'approved' ? (
                    <span className="text-[10px] font-bold text-green-500 bg-green-500/10 px-2 py-1 rounded-md uppercase tracking-wider">Aprovado</span>
                  ) : (
                    <span className="text-[10px] font-bold text-red-500 bg-red-500/10 px-2 py-1 rounded-md uppercase tracking-wider">Recusado</span>
                  )}
                  <p className="text-xs text-gold font-mono mt-1 font-bold">{req.cost} pts</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )}
    
  {/* Conteúdo da Aba: Clientes Registrados */}
  {activeTab === 'clients' && (
    <div className="glass-card p-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-widest text-gold flex items-center gap-2">
            <Users className="w-4 h-4" /> Clientes Registrados ({clients.length})
          </h3>
          <p className="text-xs text-white/50 mt-0.5">
            Visualize o saldo de cada cliente, audite o histórico completo de pontos ou corrija anomalias de pontuação.
          </p>
        </div>
        <div className="relative max-w-sm w-full">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-white/40" />
          </div>
          <input
            type="text"
            value={clientListSearchTerm}
            onChange={(e) => setClientListSearchTerm(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-gold/50 transition-colors"
            placeholder="Buscar por nome, @username, WhatsApp ou e-mail..."
          />
        </div>
      </div>
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left text-sm text-white/70 min-w-[650px]">
          <thead className="text-xs uppercase bg-white/5 text-white/50 border-b border-white/10">
            <tr>
              <th className="px-4 py-3 rounded-tl-lg font-bold">Cliente</th>
              <th className="px-4 py-3 font-bold">Patente</th>
              <th className="px-4 py-3 font-bold">Contato</th>
              <th className="px-4 py-3 font-bold">Nascimento</th>
              <th className="px-4 py-3 font-bold">Cadastro</th>
              <th className="px-4 py-3 text-right font-bold">Pontos</th>
              <th className="px-4 py-3 text-center rounded-tr-lg font-bold">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredClientList.map(client => {
              const tier = getClientTier(client, tierThresholds);
              return (
              <tr key={client.id} className={`hover:bg-white/5 transition-colors ${(client.points ?? 0) < 0 ? 'bg-red-950/20' : ''}`}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-black/50 overflow-hidden shrink-0 border border-white/10">
                      {client.avatarUrl || defaultAvatarUrl ? (
                        <img src={client.avatarUrl || defaultAvatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white/20"><Users className="w-4 h-4"/></div>
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-white">{client.firstName ? `${client.firstName} ${client.lastName || ''}` : client.username}</p>
                      {client.firstName && <p className="text-[10px] text-white/40">@{client.username}</p>}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${tier.bgColor} bg-opacity-20 ${tier.colorText} border border-current border-opacity-30`}>
                    {tier.name} (Nv. {tier.tierLevel})
                  </span>
                </td>
                <td className="px-4 py-3">
                  <p className="font-mono text-xs text-white/90">{client.whatsapp}</p>
                  <p className="text-[10px] text-white/40">{client.email}</p>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs">
                    {client.dateOfBirth ? new Date(client.dateOfBirth).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-[10px] text-white/40">
                    {client.createdAt ? new Date(client.createdAt).toLocaleDateString('pt-BR') : '-'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {(client.points ?? 0) < 0 ? (
                    <span className="inline-flex items-center gap-1 font-bold text-red-400 bg-red-500/15 border border-red-500/30 px-2 py-0.5 rounded-md font-mono text-xs">
                      {client.points} pts
                    </span>
                  ) : (
                    <span className="font-bold text-gold font-mono">{client.points || 0} pts</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <button
                      onClick={() => {
                        setAuditClient(client);
                        setIsAuditingOpen(true);
                      }}
                      className="text-xs font-bold text-white/70 hover:text-gold bg-white/5 hover:bg-gold/10 border border-white/10 hover:border-gold/30 px-2.5 py-1 rounded-lg transition-all flex items-center gap-1"
                      title="Ver extrato, ajustar saldo ou alterar patente"
                    >
                      <History className="w-3.5 h-3.5 text-gold" />
                      <span>Extrato</span>
                    </button>

                    <button
                      onClick={() => {
                        setAuditClient(client);
                        setIsAuditingOpen(true);
                      }}
                      className="text-xs font-bold text-purple-300 hover:text-purple-200 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 hover:border-purple-500/40 px-2.5 py-1 rounded-lg transition-all flex items-center gap-1"
                      title="Editar manualmente a patente deste cliente"
                    >
                      <Crown className="w-3.5 h-3.5 text-purple-400" />
                      <span>Patente</span>
                    </button>

                    {(client.points ?? 0) < 0 && (
                      <button
                        onClick={() => handleFixNegativeBalance(client)}
                        disabled={fixingClientId === client.id}
                        className="text-xs font-bold text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 shadow-md shadow-red-500/20"
                        title="Zerar saldo negativo"
                      >
                        {fixingClientId === client.id ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                        <span>Corrigir (0)</span>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
            })}
            {filteredClientList.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-white/40">
                  Nenhum cliente encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )}

  {/* Modal de Auditoria e Extrato Detalhado do Cliente */}
  {auditClient && (
    <ClientPointsAuditModal
      isOpen={isAuditingOpen}
      onClose={() => {
        setIsAuditingOpen(false);
        setAuditClient(null);
      }}
      client={auditClient}
      onClientUpdated={(updated) => {
        setClients(prev => prev.map(c => c.id === updated.id ? { ...c, ...updated } : c));
      }}
    />
  )}
</div>
  );
}
