import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Trophy, Calendar, Clock, Crown, Users, Zap, 
  ChevronDown, ChevronUp, History, Sparkles, Gift, User 
} from 'lucide-react';
import { db } from '../../lib/firebase';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { getLevelTier, getClientTier } from '../../utils/tierSystem';
import { useGamificationSettings } from '../../hooks/useGamificationSettings';
import { PastSeason } from '../../types';

interface RankingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId?: string;
  defaultAvatar?: string;
}

export function RankingModal({ isOpen, onClose, currentUserId, defaultAvatar }: RankingModalProps) {
  const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');
  const [loading, setLoading] = useState(true);
  const [ranking, setRanking] = useState<any[]>([]);
  const [pastSeasons, setPastSeasons] = useState<PastSeason[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [expandedSeasonId, setExpandedSeasonId] = useState<string | null>(null);

  const { thresholds, seasonDates, currentSeasonNumber } = useGamificationSettings();

  useEffect(() => {
    if (isOpen) {
      loadCurrentRanking();
      loadPastSeasons();
    }
  }, [isOpen]);

  const loadCurrentRanking = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'clients'),
        orderBy('weeklyPoints', 'desc'),
        limit(25)
      );
      const snap = await getDocs(q);
      const data = snap.docs.map((doc, index) => ({
        id: doc.id,
        position: index + 1,
        ...doc.data()
      }));
      setRanking(data.filter((c: any) => (c.weeklyPoints || 0) > 0 || (c.seasonalPoints || 0) > 0));
    } catch (e: any) {
      if (e.code !== 'permission-denied') console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadPastSeasons = async () => {
    setLoadingHistory(true);
    try {
      const q = query(
        collection(db, 'past_seasons'),
        orderBy('seasonNumber', 'desc'),
        limit(10)
      );
      const snap = await getDocs(q);
      const data = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as PastSeason));
      setPastSeasons(data);
    } catch (e: any) {
      if (e.code !== 'permission-denied') console.error(e);
    } finally {
      setLoadingHistory(false);
    }
  };

  if (!isOpen) return null;

  const totalSeasonalXP = ranking.reduce((acc, curr) => acc + (curr.weeklyPoints || curr.seasonalPoints || curr.points || 0), 0);
  const leader = ranking.length > 0 ? ranking[0] : null;

  // Calculate timeline progress
  const startMs = new Date(seasonDates.startDateRaw).getTime();
  const endMs = new Date(seasonDates.endDateRaw).getTime();
  const nowMs = Date.now();
  const totalDurationMs = Math.max(1, endMs - startMs);
  const elapsedMs = Math.max(0, nowMs - startMs);
  const progressPercent = Math.min(100, Math.max(0, Math.round((elapsedMs / totalDurationMs) * 100)));

  // Current user ranking if outside top 3
  const currentUserEntry = currentUserId ? ranking.find(c => c.id === currentUserId) : null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/90 flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4 backdrop-blur-md"
    >
      <motion.div 
        initial={{ y: 200 }}
        animate={{ y: 0 }}
        exit={{ y: 200 }}
        className="bg-carbon flex-shrink-0 w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl p-4 sm:p-6 border-t sm:border border-white/10 max-h-[92vh] flex flex-col shadow-2xl"
      >
        {/* Modal Header */}
        <div className="flex justify-between items-start mb-4 shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Trophy className="w-6 h-6 text-gold" />
              <h2 className="text-xl sm:text-2xl font-display font-bold text-white">Temporada & Ranking</h2>
            </div>
            <p className="text-white/40 text-xs sm:text-sm">Acompanhe a corrida pelo topo e o legado dos campeões</p>
          </div>
          <button 
            onClick={onClose} 
            className="text-white/40 hover:text-white p-2 -mr-1 -mt-1 transition-colors bg-white/5 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex p-1 bg-black/40 rounded-2xl border border-white/10 mb-4 shrink-0">
          <button
            onClick={() => setActiveTab('current')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'current'
                ? 'bg-gradient-to-r from-gold/30 via-gold/20 to-gold/10 text-gold border border-gold/40 shadow-lg shadow-gold/5'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span>Temporada Atual</span>
            <span className="text-[10px] px-1.5 py-0.2 bg-gold/20 text-gold rounded-full border border-gold/30">
              #{currentSeasonNumber}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'history'
                ? 'bg-gradient-to-r from-gold/30 via-gold/20 to-gold/10 text-gold border border-gold/40 shadow-lg shadow-gold/5'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Histórico de Temporadas</span>
            {pastSeasons.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 bg-white/10 text-white/80 rounded-full">
                {pastSeasons.length}
              </span>
            )}
          </button>
        </div>

        {/* Tab Content Container */}
        <div className="overflow-y-auto custom-scrollbar flex-1 -mx-2 px-2 pb-2 space-y-4">
          {activeTab === 'current' ? (
            <>
              {/* Resumo da Temporada Atual */}
              <div className="rounded-2xl p-4 sm:p-5 bg-gradient-to-br from-white/[0.08] via-white/[0.04] to-transparent border border-white/10 relative overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase font-bold tracking-widest text-gold bg-gold/10 px-2.5 py-1 rounded-lg border border-gold/30">
                      Temporada {currentSeasonNumber}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                      seasonDates.daysRemaining <= 10 && seasonDates.daysRemaining > 0
                        ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                        : seasonDates.isExpired
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    }`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                      {seasonDates.isExpired ? 'Encerramento Iminente' : seasonDates.daysRemaining <= 10 ? 'Reta Final' : 'Em Andamento'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-white/60 bg-black/30 px-3 py-1 rounded-xl border border-white/5">
                    <Clock className="w-3.5 h-3.5 text-gold" />
                    <span className="font-bold text-white">{seasonDates.daysRemaining}</span> dias restantes
                  </div>
                </div>

                {/* Timeline Progress Bar */}
                <div className="space-y-1 mb-3.5">
                  <div className="flex justify-between text-[10px] text-white/40 font-semibold">
                    <span>Progresso da Temporada</span>
                    <span className="text-gold font-bold">{progressPercent}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-gold/60 to-gold rounded-full transition-all duration-500"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Prêmios do Pódio da Semana */}
                <div className="p-3 bg-gold/5 rounded-xl border border-gold/20">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <Gift className="w-3.5 h-3.5 text-gold" />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-gold">
                        Prêmios do Top 3 da Semana
                      </span>
                    </div>
                    <span className="text-[10px] font-semibold text-amber-400/90 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
                      Validade: 1 semana
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] mb-2">
                    <div className="flex items-center gap-2 p-1.5 rounded-lg bg-black/30 border border-yellow-500/20">
                      <span className="w-5 h-5 rounded-full bg-yellow-500 text-carbon font-bold flex items-center justify-center text-[10px] shrink-0">1º</span>
                      <span className="text-white/80 font-medium">Acesso Livre Sala VIP</span>
                    </div>
                    <div className="flex items-center gap-2 p-1.5 rounded-lg bg-black/30 border border-gray-300/20">
                      <span className="w-5 h-5 rounded-full bg-gray-300 text-carbon font-bold flex items-center justify-center text-[10px] shrink-0">2º</span>
                      <span className="text-white/80 font-medium">1h VIP + Picolé</span>
                    </div>
                    <div className="flex items-center gap-2 p-1.5 rounded-lg bg-black/30 border border-amber-700/20">
                      <span className="w-5 h-5 rounded-full bg-amber-700 text-white font-bold flex items-center justify-center text-[10px] shrink-0">3º</span>
                      <span className="text-white/80 font-medium">Picolé Grátis</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-white/50 leading-tight">
                    * Os bônus do pódio ficam disponíveis para resgate durante toda a semana seguinte (de segunda até o próximo fechamento semanal).
                  </p>
                </div>
              </div>

              {/* Título do Ranking */}
              <div className="flex items-center justify-between px-1 pt-1">
                <h3 className="text-xs font-bold uppercase tracking-widest text-white/50 flex items-center gap-2">
                  <Crown className="w-4 h-4 text-gold" /> Classificação Geral
                </h3>
                <span className="text-xs text-white/40">{ranking.length} competidores</span>
              </div>

              {/* Lista do Ranking */}
              {loading ? (
                <div className="flex justify-center py-10">
                  <div className="w-8 h-8 border-2 border-gold/20 border-t-gold rounded-full animate-spin" />
                </div>
              ) : ranking.length === 0 ? (
                <div className="text-center py-10 p-6 rounded-2xl bg-white/5 border border-white/5">
                  <Trophy className="w-10 h-10 text-white/20 mx-auto mb-2" />
                  <p className="text-white/70 text-sm font-bold">Semana Recém-Iniciada</p>
                  <p className="text-xs text-white/40 mt-1">Conclua serviços ou cortes para pontuar e assumir a liderança semanal!</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {ranking.map((client) => {
                    const isCurrentUser = client.id === currentUserId;
                    const isFirst = client.position === 1;
                    const isSecond = client.position === 2;
                    const isThird = client.position === 3;
                    const displayPoints = client.weeklyPoints ?? client.seasonalPoints ?? client.points ?? 0;
                    const tier = getClientTier(client, thresholds);
                    
                    return (
                      <div 
                        key={client.id} 
                        className={`rounded-2xl p-3.5 sm:p-4 flex items-center justify-between border transition-all ${
                          isFirst ? 'bg-gradient-to-r from-yellow-500/15 via-yellow-500/5 to-transparent border-yellow-500/40 shadow-md shadow-yellow-500/5' :
                          isSecond ? 'bg-gradient-to-r from-gray-300/15 via-gray-300/5 to-transparent border-gray-300/30' :
                          isThird ? 'bg-gradient-to-r from-amber-700/15 via-amber-700/5 to-transparent border-amber-700/30' :
                          isCurrentUser ? 'bg-gold/10 border-gold/30' : 'bg-white/5 border-white/5 hover:border-white/15'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold font-display text-xs shrink-0 ${
                            isFirst ? 'bg-yellow-500 text-carbon shadow-lg shadow-yellow-500/30' :
                            isSecond ? 'bg-gray-300 text-carbon' :
                            isThird ? 'bg-amber-700 text-white' :
                            'bg-white/10 text-white/60'
                          }`}>
                            {isFirst ? <Crown className="w-4 h-4 text-carbon" /> : client.position}
                          </div>

                          {/* Avatar with Frame */}
                          <div className="relative w-10 h-10 flex items-center justify-center shrink-0">
                            <div className="w-full h-full rounded-full flex items-center justify-center bg-carbon overflow-hidden z-10 border border-white/10">
                              {client.avatarUrl || defaultAvatar ? (
                                <img src={client.avatarUrl || defaultAvatar} alt="Avatar" className="w-full h-full object-cover" />
                              ) : (
                                <User className={`w-5 h-5 ${tier.colorText} opacity-80`} />
                              )}
                            </div>
                            {tier.frameUrl && (
                              <img 
                                src={tier.frameUrl} 
                                alt={tier.name} 
                                className="absolute inset-0 w-[125%] h-[125%] max-w-none max-h-none left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none object-contain" 
                              />
                            )}
                          </div>

                          <div>
                            <div className="flex items-center gap-1.5">
                              <h4 className={`font-bold text-sm ${
                                isFirst ? 'text-yellow-400' : isSecond ? 'text-gray-200' : isThird ? 'text-amber-500' : 'text-white'
                              }`}>
                                {client.username}
                              </h4>
                              {isCurrentUser && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-gold/20 text-gold font-bold">
                                  Você
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-white/50">
                              <span className={`font-bold ${tier.colorText}`}>{tier.name}</span>
                              <span>•</span>
                              <span>Nível {tier.level}</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className={`font-display font-bold text-base ${
                            isFirst ? 'text-yellow-400' : isSecond ? 'text-gray-200' : isThird ? 'text-amber-500' : 'text-gold'
                          }`}>{displayPoints.toLocaleString('pt-BR')}</p>
                          <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold">XP</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            /* Tab: Histórico de Temporadas */
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 flex items-start gap-3">
                <History className="w-5 h-5 text-gold shrink-0 mt-0.5" />
                <div className="text-xs text-white/80 leading-relaxed">
                  <strong className="text-gold">Hall da Fama das Temporadas:</strong> Registro histórico dos campeões e resultados de cada ciclo encerrado no Clube Navalha Barbearia.
                </div>
              </div>

              {loadingHistory ? (
                <div className="flex justify-center py-12">
                  <div className="w-8 h-8 border-2 border-gold/20 border-t-gold rounded-full animate-spin" />
                </div>
              ) : pastSeasons.length === 0 ? (
                <div className="text-center py-12 px-6 rounded-2xl bg-black/20 border border-white/5">
                  <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-3 text-gold">
                    <History className="w-7 h-7 opacity-60" />
                  </div>
                  <h4 className="text-white font-bold text-base mb-1">Nenhuma Temporada Encerrada Ainda</h4>
                  <p className="text-xs text-white/50 max-w-sm mx-auto leading-relaxed">
                    A primeira temporada está ativa! Quando for finalizada pelo barbeiro, os campeões do pódio e o ranking final serão imortalizados aqui.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pastSeasons.map((season) => {
                    const isExpanded = expandedSeasonId === season.id;
                    const top1 = season.topPodium?.find(p => p.position === 1);
                    const top2 = season.topPodium?.find(p => p.position === 2);
                    const top3 = season.topPodium?.find(p => p.position === 3);

                    return (
                      <div 
                        key={season.id} 
                        className="rounded-2xl p-4 sm:p-5 bg-gradient-to-b from-white/[0.07] to-white/[0.02] border border-white/10 relative overflow-hidden"
                      >
                        {/* Header da Temporada Passada */}
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-3.5">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-base font-bold font-display text-white">
                                {season.title || `Temporada ${season.seasonNumber}`}
                              </h4>
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/10 text-white/60">
                                Encerrada
                              </span>
                            </div>
                            <p className="text-xs text-white/40 flex items-center gap-1.5 mt-0.5">
                              <Calendar className="w-3.5 h-3.5 text-gold/70" />
                              {season.startDate} até {season.endDate}
                            </p>
                          </div>

                          <div className="flex items-center gap-3 text-xs text-white/60 bg-black/40 px-3 py-1.5 rounded-xl border border-white/5">
                            <div className="flex items-center gap-1">
                              <Users className="w-3.5 h-3.5 text-gold" />
                              <span>{season.totalParticipants || 0} competidores</span>
                            </div>
                            <span>•</span>
                            <div className="flex items-center gap-1 font-bold text-gold">
                              <Zap className="w-3.5 h-3.5" />
                              <span>{(season.totalSeasonalPoints || 0).toLocaleString('pt-BR')} XP</span>
                            </div>
                          </div>
                        </div>

                        {/* Pódio dos Campeões */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-3">
                          {/* 1º Lugar */}
                          <div className="p-3 rounded-xl bg-gradient-to-b from-yellow-500/20 to-yellow-500/5 border border-yellow-500/30 flex items-center sm:flex-col sm:text-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-yellow-500/20 border-2 border-yellow-500 flex items-center justify-center text-yellow-400 font-bold shrink-0 relative">
                              <Crown className="w-5 h-5 text-yellow-400" />
                              <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-yellow-500 text-carbon text-[9px] font-black flex items-center justify-center">1</span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[10px] font-bold uppercase text-yellow-400 tracking-wider">Campeão</p>
                              <p className="font-bold text-sm text-white truncate">{top1?.username || '—'}</p>
                              <p className="text-xs font-mono font-bold text-yellow-400">{(top1?.points || 0).toLocaleString('pt-BR')} pts</p>
                              <p className="text-[10px] text-white/50 truncate mt-0.5">{top1?.reward || 'Ouro da Temporada'}</p>
                            </div>
                          </div>

                          {/* 2º Lugar */}
                          <div className="p-3 rounded-xl bg-gradient-to-b from-gray-300/15 to-gray-300/5 border border-gray-300/20 flex items-center sm:flex-col sm:text-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gray-300/20 border-2 border-gray-300 flex items-center justify-center text-gray-300 font-bold shrink-0 relative">
                              <Trophy className="w-5 h-5 text-gray-300" />
                              <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-gray-300 text-carbon text-[9px] font-black flex items-center justify-center">2</span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[10px] font-bold uppercase text-gray-300 tracking-wider">Vice-Campeão</p>
                              <p className="font-bold text-sm text-white truncate">{top2?.username || '—'}</p>
                              <p className="text-xs font-mono font-bold text-gray-300">{(top2?.points || 0).toLocaleString('pt-BR')} pts</p>
                              <p className="text-[10px] text-white/50 truncate mt-0.5">{top2?.reward || 'Prata da Temporada'}</p>
                            </div>
                          </div>

                          {/* 3º Lugar */}
                          <div className="p-3 rounded-xl bg-gradient-to-b from-amber-700/15 to-amber-700/5 border border-amber-700/20 flex items-center sm:flex-col sm:text-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-amber-700/20 border-2 border-amber-700 flex items-center justify-center text-amber-500 font-bold shrink-0 relative">
                              <Trophy className="w-5 h-5 text-amber-500" />
                              <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-amber-700 text-white text-[9px] font-black flex items-center justify-center">3</span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[10px] font-bold uppercase text-amber-500 tracking-wider">3º Colocado</p>
                              <p className="font-bold text-sm text-white truncate">{top3?.username || '—'}</p>
                              <p className="text-xs font-mono font-bold text-amber-500">{(top3?.points || 0).toLocaleString('pt-BR')} pts</p>
                              <p className="text-[10px] text-white/50 truncate mt-0.5">{top3?.reward || 'Bronze da Temporada'}</p>
                            </div>
                          </div>
                        </div>

                        {/* Botão de Expandir Ranking Completo */}
                        {season.ranking && season.ranking.length > 0 && (
                          <div className="pt-2">
                            <button
                              onClick={() => setExpandedSeasonId(isExpanded ? null : season.id)}
                              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-black/30 hover:bg-black/50 text-xs font-bold text-white/70 hover:text-white transition-colors border border-white/5"
                            >
                              <span>{isExpanded ? 'Ocultar Classificação' : 'Ver Classificação Completa'}</span>
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>

                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  className="mt-3 space-y-2 pt-2 border-t border-white/5"
                                >
                                  {season.ranking.map((member, idx) => (
                                    <div 
                                      key={idx} 
                                      className="flex items-center justify-between p-2.5 rounded-xl bg-black/20 border border-white/5 text-xs"
                                    >
                                      <div className="flex items-center gap-2.5">
                                        <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                                          member.position === 1 ? 'bg-yellow-500 text-carbon' :
                                          member.position === 2 ? 'bg-gray-300 text-carbon' :
                                          member.position === 3 ? 'bg-amber-700 text-white' :
                                          'bg-white/10 text-white/60'
                                        }`}>
                                          {member.position}
                                        </span>
                                        <span className="font-bold text-white/90">{member.username}</span>
                                        {member.tierName && (
                                          <span className="text-[10px] text-white/40 font-medium">({member.tierName})</span>
                                        )}
                                      </div>
                                      <span className="font-mono font-bold text-gold">
                                        {member.points.toLocaleString('pt-BR')} pts
                                      </span>
                                    </div>
                                  ))}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
