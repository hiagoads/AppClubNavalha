import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Award, Clock, Star, Gift, Scissors, Gamepad2, History, User, CheckCircle2 } from 'lucide-react';
import { ClientProfile, VipStation } from '../../types';
import { getLevelTier, getClientTier } from '../../utils/tierSystem';
import { useGamificationSettings, RewardItem } from '../../hooks/useGamificationSettings';
import { checkAndSyncClientRankBonuses } from '../../utils/bonusSystem';
import { ClientActiveGameCard } from '../vip/ClientActiveGameCard';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs, addDoc, onSnapshot } from 'firebase/firestore';
import toast from 'react-hot-toast';

interface ClientProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientProfile: ClientProfile | null;
  defaultAvatar?: string;
}

const getIcon = (iconStr: string | undefined) => {
  switch (iconStr) {
    case 'gamepad': return <Gamepad2 className="w-6 h-6" />;
    case 'scissors': return <Scissors className="w-6 h-6" />;
    case 'award': return <Award className="w-6 h-6" />;
    case 'star': return <Star className="w-6 h-6" />;
    case 'gift':
    default: return <Gift className="w-6 h-6" />;
  }
};

export function ClientProfileModal({ isOpen, onClose, clientProfile, defaultAvatar }: ClientProfileModalProps) {
  const [loading, setLoading] = useState(false);
  const [redemptions, setRedemptions] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [confirmReward, setConfirmReward] = useState<RewardItem | null>(null);
  const [confirmBonus, setConfirmBonus] = useState<any | null>(null);
  const [bonusHoursToUse, setBonusHoursToUse] = useState(1);
  const [activeVipStation, setActiveVipStation] = useState<VipStation | null>(null);
  const { thresholds, rewards } = useGamificationSettings();

  useEffect(() => {
    if (!isOpen || !clientProfile) return;

    checkAndSyncClientRankBonuses(clientProfile.id, clientProfile, thresholds);

    const qR = query(collection(db, 'redemptions'), where('clientId', '==', clientProfile.id));
    const unsubR = onSnapshot(qR, (snap) => {
      setRedemptions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const qT = query(collection(db, 'point_transactions'), where('clientId', '==', clientProfile.id));
    const unsubT = onSnapshot(qT, (snap) => {
      setTransactions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Ouvir estações VIP para checar se o cliente tem partida ativa
    const unsubVip = onSnapshot(collection(db, 'vip_stations'), (snap) => {
      let activeStation: VipStation | null = null;
      snap.forEach((d) => {
        const data = d.data();
        if (data.status === 'occupied' && data.currentSession?.clientId === clientProfile.id) {
          activeStation = { id: d.id, ...data } as VipStation;
        }
      });
      setActiveVipStation(activeStation);
    });

    return () => {
      unsubR();
      unsubT();
      unsubVip();
    };
  }, [isOpen, clientProfile?.id]);

  const handleRedeem = (reward: RewardItem, availablePoints: number) => {
    if (!clientProfile) return;

    if (availablePoints < reward.points) {
      toast.error('Você não tem pontos suficientes (ou tem resgates pendentes).');
      return;
    }

    setConfirmReward(reward);
  };

  const confirmAndRedeem = async () => {
    if (!clientProfile || !confirmReward) return;
    const reward = confirmReward;
    setConfirmReward(null);

    setLoading(true);
    try {
      await addDoc(collection(db, 'redemptions'), {
        clientId: clientProfile.id,
        clientName: clientProfile.username,
        rewardTitle: reward.title,
        cost: reward.points,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      toast.success('Resgate solicitado! O barbeiro irá aprovar em breve.');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao solicitar resgate.');
    } finally {
      setLoading(false);
    }
  };

  const confirmAndRedeemBonus = async () => {
    if (!clientProfile || !confirmBonus) return;
    const bonus = confirmBonus;
    setConfirmBonus(null);

    setLoading(true);
    try {
      let rewardTitle = bonus.title;
      if (bonus.type === 'vip_hours') {
        rewardTitle = `Uso VIP: ${bonusHoursToUse}h (${bonus.title})`;
      }

      await addDoc(collection(db, 'redemptions'), {
        clientId: clientProfile.id,
        clientName: clientProfile.username,
        rewardTitle: rewardTitle,
        cost: 0,
        isBonus: true,
        bonusId: bonus.id,
        bonusType: bonus.type,
        hoursToUse: bonus.type === 'vip_hours' ? bonusHoursToUse : 0,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      toast.success('Uso de bônus solicitado! O barbeiro irá aprovar em breve.');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao solicitar bônus.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !clientProfile) return null;

  const safePoints = Math.max(0, clientProfile.points || 0);
  const pendingPoints = redemptions
      .filter(r => r.status === 'pending')
      .reduce((sum, r) => sum + r.cost, 0);
  const availablePoints = Math.max(0, safePoints - pendingPoints);
  
  const timeline = [
    ...transactions.map(t => ({ ...t, _type: 'earn' })),
    ...redemptions.map(r => ({ ...r, _type: 'redeem' }))
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const recentRedemptions = timeline.filter(item => item._type === 'redeem').slice(0, 10);

  const activeBonuses = clientProfile?.bonuses?.filter(bonus => {
    if (bonus.type === 'vip_hours') {
      return (bonus.totalHours || 0) > (bonus.usedHours || 0);
    } else if (bonus.type === 'unlimited_vip') {
      return true;
    } else {
      return !bonus.isRedeemed;
    }
  }) || [];

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
        className="bg-carbon flex-shrink-0 w-full sm:max-w-xl rounded-t-3xl sm:rounded-3xl border-t sm:border border-white/10 max-h-[95vh] flex flex-col overflow-hidden"
      >
        {/* Header Sticky */}
        <div className="flex justify-between items-center p-5 sm:p-6 pb-4 shrink-0 border-b border-white/5 bg-carbon/80 backdrop-blur-md z-20">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-gold" />
            <h2 className="text-xl font-display font-bold text-white">Meu Perfil</h2>
          </div>
          <button 
            onClick={onClose} 
            className="text-white/40 hover:text-white p-2 -mr-2 transition-colors bg-white/5 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto custom-scrollbar flex-1 p-5 sm:p-6 pt-2">
          
          {/* Detailed Player Card */}
          {(() => {
            const tier = getClientTier(clientProfile, thresholds);
            return (
            <div className="relative p-[2px] rounded-3xl bg-gradient-to-b from-white/10 to-white/5 shadow-xl overflow-hidden mb-8 mt-2">
              <div className="rounded-[22px] bg-[#1a1a1a] p-6 sm:p-8 flex flex-col items-center text-center relative z-10 bg-noise">
                
                {/* Avatar Frame */}
                <div className="shrink-0 relative mb-5 w-[112px] h-[112px] flex items-center justify-center">
                  <div className="relative w-[100px] h-[100px] rounded-full flex items-center justify-center bg-carbon overflow-hidden z-10">
                     {clientProfile.avatarUrl || defaultAvatar ? (
                       <img src={clientProfile.avatarUrl || defaultAvatar} alt="Avatar" className="w-full h-full object-cover" />
                     ) : (
                       <User className={`w-12 h-12 ${tier.colorText} opacity-80`} />
                     )}
                  </div>
                  {tier.frameUrl && (
                    <img 
                      src={tier.frameUrl} 
                      alt={tier.name} 
                      className="absolute inset-0 w-[140%] h-[140%] max-w-none max-h-none left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none object-contain" 
                    />
                  )}
                </div>
                
                <p className={`text-[10px] font-bold ${tier.colorText} tracking-widest uppercase mb-1`}>{tier.name}</p>
                <h3 className="text-3xl font-display font-bold text-white mb-6">
                  {clientProfile.username}
                </h3>
                
                <div className="w-full max-w-[280px] mx-auto bg-black/40 p-4 rounded-2xl border border-white/5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white/50 uppercase tracking-widest">Nível:</span>
                        <span className={`text-xl font-bold ${tier.colorText}`}>{tier.level}</span>
                      </div>
                      <div className="flex gap-1.5">
                        <div className={`w-4 h-2 ${tier.bgColor} -skew-x-12`}></div>
                        <div className={`w-4 h-2 ${tier.bgColor} -skew-x-12 opacity-80`}></div>
                        <div className="w-4 h-2 bg-white/10 -skew-x-12"></div>
                      </div>
                    </div>
                    
                    {/* Progress bar */}
                    <div className="h-2.5 w-full bg-white/10 rounded-full overflow-hidden mb-3 relative">
                      <div 
                        className={`absolute top-0 left-0 h-full ${tier.bgColor} rounded-full transition-all duration-1000 `}
                        style={{ width: `${tier.progressPercentage}%` }}
                      />
                    </div>
                    
                    <div className="flex items-center justify-center text-sm">
                      <span className={`font-bold ${tier.colorText} uppercase tracking-widest text-[10px]`}>Pontos: {availablePoints.toLocaleString('pt-BR')} pts</span>
                    </div>
                </div>
              </div>
            </div>
            )
          })()}

          {pendingPoints > 0 && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-8 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-yellow-500" />
                <div>
                  <p className="text-sm font-bold text-yellow-500">Resgates em Análise</p>
                  <p className="text-xs text-yellow-500/70">Aguardando aprovação do barbeiro.</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-mono font-bold text-yellow-500">{pendingPoints}</p>
                <p className="text-[10px] uppercase tracking-widest text-yellow-500/50 font-bold">Pts Retidos</p>
              </div>
            </div>
          )}

          {/* Partida Ativa na Sala VIP */}
          {activeVipStation && (
            <ClientActiveGameCard station={activeVipStation} />
          )}

          {/* Meus Bônus */}
          {activeBonuses.length > 0 ? (
            <div className="mb-8">
              <h3 className="text-xs uppercase tracking-widest text-white/40 font-bold mb-4 ml-1 flex items-center gap-2">
                <Gift className="w-4 h-4 text-gold" /> Meus Bônus Especiais
              </h3>
              <div className="flex overflow-x-auto gap-4 pb-4 -mx-5 px-5 sm:-mx-6 sm:px-6 snap-x snap-mandatory [&::-webkit-scrollbar]:hidden">
                {activeBonuses.map((bonus, idx) => {
                   const pendingRedemptionsForBonus = redemptions.filter(r => r.status === 'pending' && r.isBonus && r.bonusId === bonus.id);
                   let canRedeem = false;
                   let statusText = '';
                   let remainingHours = 0;

                   if (bonus.type === 'vip_hours') {
                      const totalPendingHours = pendingRedemptionsForBonus.reduce((sum, r) => sum + r.hoursToUse, 0);
                      remainingHours = (bonus.totalHours || 0) - (bonus.usedHours || 0) - totalPendingHours;
                      canRedeem = remainingHours > 0;
                      statusText = `Disponível: ${remainingHours}h de ${bonus.totalHours}h`;
                   } else if (bonus.type === 'unlimited_vip') {
                      canRedeem = true;
                      statusText = 'Acesso Ilimitado';
                   } else {
                      canRedeem = !bonus.isRedeemed && pendingRedemptionsForBonus.length === 0;
                      statusText = bonus.isRedeemed ? 'Já Utilizado' : (pendingRedemptionsForBonus.length > 0 ? 'Em Análise' : 'Disponível');
                   }

                   return (
                     <div 
                       key={bonus.id || `bonus-${idx}`} 
                       className={`min-w-[240px] w-[240px] shrink-0 snap-center rounded-2xl border p-5 flex flex-col relative overflow-hidden transition-colors ${canRedeem ? 'bg-gold/5 border-gold/30 hover:border-gold/50' : 'bg-white/5 border-white/10 opacity-60'}`}
                     >
                       <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${canRedeem ? 'bg-gold/10 text-gold' : 'bg-white/10 text-white/40'}`}>
                         <Gift className="w-5 h-5" />
                       </div>
                       
                       <h4 className="font-bold text-lg text-white/90 leading-tight mb-2">{bonus.title}</h4>
                       <p className={`text-xs font-medium mb-5 ${canRedeem ? 'text-gold' : 'text-white/40'}`}>{statusText}</p>
                       
                       <div className="mt-auto">
                         {canRedeem ? (
                           <button 
                             onClick={() => {
                               setConfirmBonus(bonus);
                               setBonusHoursToUse(1);
                             }}
                             className="w-full py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all bg-gold hover:bg-gold/90 text-carbon shadow-lg shadow-gold/20"
                           >
                             Utilizar
                           </button>
                         ) : (
                           <div className="w-full py-3 rounded-xl text-xs font-bold uppercase tracking-wider text-center bg-white/5 text-white/40">
                             {bonus.isRedeemed ? 'Utilizado' : (pendingRedemptionsForBonus.length > 0 ? 'Em Análise' : 'Indisponível')}
                           </div>
                         )}
                       </div>
                     </div>
                   )
                })}
              </div>
            </div>
          ) : (
            <div className="mb-8 p-4 rounded-2xl bg-black/20 border border-white/5">
              <div className="flex items-center gap-2 mb-1.5">
                <Gift className="w-4 h-4 text-gold" />
                <h3 className="text-xs uppercase tracking-widest text-gold font-bold">Bônus por Nível</h3>
              </div>
              <p className="text-[11px] text-white/60 leading-relaxed">
                Ao atingir a pontuação de cada rank (Prata: 1h VIP, Ouro: 1h VIP + 5.000 pts, Platina: 3h VIP, Diamante+: 50% OFF), seus bônus serão liberados aqui automaticamente para uso!
              </p>
            </div>
          )}

          {/* Confirm Bonus Popup Modal */}
          {confirmBonus && (
            <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-sm p-6 border border-gold/30 bg-carbon rounded-2xl shadow-2xl shadow-gold/5"
              >
                <div className="w-12 h-12 bg-gold/10 rounded-full flex items-center justify-center mx-auto mb-4 text-gold">
                  <Gift className="w-6 h-6" />
                </div>
                <p className="text-white text-sm mb-6 text-center">
                  Deseja solicitar o uso do bônus <br/><strong className="text-gold text-lg mt-1 block">{confirmBonus.title}</strong>?
                </p>
                
                {confirmBonus.type === 'vip_hours' && (
                  <div className="flex items-center justify-center gap-4 mb-6">
                    <span className="text-white/50 text-xs uppercase tracking-widest">Horas a usar:</span>
                    <div className="flex items-center bg-black/40 rounded-lg border border-white/10">
                      <button onClick={() => setBonusHoursToUse(Math.max(1, bonusHoursToUse - 1))} className="px-3 py-2 text-gold hover:bg-white/5 rounded-l-lg">-</button>
                      <span className="px-4 font-mono text-white text-lg">{bonusHoursToUse}</span>
                      <button onClick={() => {
                         const pending = redemptions.filter(r => r.status === 'pending' && r.isBonus && r.bonusId === confirmBonus.id).reduce((s, r) => s + r.hoursToUse, 0);
                         const max = (confirmBonus.totalHours || 0) - (confirmBonus.usedHours || 0) - pending;
                         setBonusHoursToUse(Math.min(max, bonusHoursToUse + 1));
                      }} className="px-3 py-2 text-gold hover:bg-white/5 rounded-r-lg">+</button>
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setConfirmBonus(null)}
                    className="flex-1 py-3 rounded-xl bg-white/5 text-white/60 hover:bg-white/10 hover:text-white transition-colors text-sm font-bold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={confirmAndRedeemBonus}
                    disabled={loading}
                    className="flex-1 py-3 rounded-xl bg-gold hover:bg-gold/90 text-carbon transition-all text-sm font-bold shadow-lg shadow-gold/20 disabled:opacity-50 flex items-center justify-center"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-carbon/20 border-t-carbon rounded-full animate-spin" />
                    ) : (
                      'Confirmar Uso'
                    )}
                  </button>
                </div>
              </motion.div>
            </div>
          )}

          {/* Confirm Reward Popup Modal */}
          {confirmReward && (
            <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-sm p-6 border border-gold/30 bg-carbon rounded-2xl shadow-2xl shadow-gold/5"
              >
                <div className="w-12 h-12 bg-gold/10 rounded-full flex items-center justify-center mx-auto mb-4 text-gold">
                  <Gift className="w-6 h-6" />
                </div>
                <p className="text-white text-sm mb-6 text-center">
                  Deseja confirmar o resgate de <br/><strong className="text-gold text-lg mt-1 block">{confirmReward.title}</strong><br/> por <strong>{confirmReward.points} pts</strong>?
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setConfirmReward(null)}
                    className="flex-1 py-3 rounded-xl bg-white/5 text-white/60 hover:bg-white/10 hover:text-white transition-colors text-sm font-bold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={confirmAndRedeem}
                    disabled={loading}
                    className="flex-1 py-3 rounded-xl bg-gold hover:bg-gold/90 text-carbon transition-all text-sm font-bold shadow-lg shadow-gold/20 disabled:opacity-50 flex items-center justify-center"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-carbon/20 border-t-carbon rounded-full animate-spin" />
                    ) : (
                      'Confirmar'
                    )}
                  </button>
                </div>
              </motion.div>
            </div>
          )}

          <div className="mb-8">
            <h3 className="text-xs uppercase tracking-widest text-white/40 font-bold mb-4 ml-1 flex items-center gap-2">
              <Gift className="w-4 h-4 text-gold" /> Prêmios Disponíveis
            </h3>
            
            <div className="flex overflow-x-auto gap-4 pb-4 -mx-5 px-5 sm:-mx-6 sm:px-6 snap-x snap-mandatory [&::-webkit-scrollbar]:hidden">
              {rewards.map((reward) => (
                <div 
                  key={reward.id} 
                  className="min-w-[240px] w-[240px] snap-center bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col relative overflow-hidden group hover:border-gold/30 transition-colors shrink-0"
                >
                  <div className="w-14 h-14 rounded-full bg-gold/10 flex items-center justify-center text-gold mb-4 group-hover:scale-110 transition-transform">
                    {getIcon(reward.icon)}
                  </div>
                  <h4 className="font-bold text-lg text-white/90 leading-tight mb-1">{reward.title}</h4>
                  <p className="text-gold font-mono text-sm font-bold mb-5">{reward.points} pts</p>
                  
                  <div className="mt-auto">
                    <button 
                      disabled={loading || availablePoints < reward.points}
                      onClick={() => handleRedeem(reward, availablePoints)}
                      className="w-full py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all bg-white/5 hover:bg-gold hover:text-carbon text-white/50 disabled:opacity-30 disabled:hover:bg-white/5 disabled:hover:text-white/50"
                    >
                      Resgatar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* History List */}
          <div>
            <h3 className="text-xs uppercase tracking-widest text-white/40 font-bold mb-4 ml-1 flex items-center gap-2 border-t border-white/10 pt-6">
              <History className="w-4 h-4 text-white/40" /> Histórico de Resgates
            </h3>
            
            {recentRedemptions.length === 0 ? (
              <div className="text-center p-8 bg-white/5 rounded-2xl border border-white/10">
                <Gift className="w-8 h-8 text-white/20 mx-auto mb-3" />
                <p className="text-white/40 text-sm">Nenhum resgate recente.</p>
              </div>
            ) : (
              <div className="flex overflow-x-auto gap-4 pb-4 -mx-5 px-5 sm:-mx-6 sm:px-6 snap-x snap-mandatory [&::-webkit-scrollbar]:hidden">
                {recentRedemptions.map((item, idx) => (
                  <div key={item.id || idx} className="min-w-[200px] w-[200px] snap-center bg-white/5 border border-white/5 rounded-2xl p-4 flex flex-col relative overflow-hidden shrink-0">
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center shrink-0">
                        <Gift className="w-4 h-4 text-gold" />
                      </div>
                      <div className="text-right">
                        {item.status === 'pending' && <span className="text-[10px] font-bold text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded-md uppercase tracking-wider">Análise</span>}
                        {item.status === 'approved' && <span className="text-[10px] font-bold text-green-500 bg-green-500/10 px-2 py-0.5 rounded-md uppercase tracking-wider">Aprovado</span>}
                        {item.status === 'rejected' && <span className="text-[10px] font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded-md uppercase tracking-wider">Recusado</span>}
                      </div>
                    </div>
                    
                    <p className="font-bold text-sm text-white/90 leading-tight mb-1 truncate" title={item.rewardTitle}>
                      {item.rewardTitle}
                    </p>
                    
                    <p className="text-base font-display font-bold text-white/60 mb-3">
                      {item.cost > 0 ? `-${item.cost} pts` : 'Bônus'}
                    </p>
                    
                    <div className="mt-auto pt-3 border-t border-white/5 flex items-center gap-2">
                      <Clock className="w-3 h-3 text-white/30" />
                      <span className="text-[10px] text-white/40">{new Date(item.createdAt).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </motion.div>
    </motion.div>
  );
}
