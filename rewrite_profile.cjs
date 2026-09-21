const fs = require('fs');

const code = `import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Award, Clock, Star, Gift, Scissors, Gamepad2, History, User, CheckCircle2 } from 'lucide-react';
import { ClientProfile } from '../../types';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';

interface ClientProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientProfile: ClientProfile | null;
}

const REWARDS_CATALOG = [
  { id: 'game_30', title: '30 Minutos de Videogame', points: 900, icon: <Gamepad2 className="w-6 h-6" /> },
  { id: 'eyebrow', title: 'Sobrancelha na Faixa', points: 1500, icon: <Scissors className="w-6 h-6" /> },
  { id: 'discount_10', title: '10% OFF no Corte', points: 2000, icon: <Gift className="w-6 h-6" /> },
  { id: 'free_cut', title: 'Corte Grátis', points: 5000, icon: <Award className="w-6 h-6" /> },
];

export function ClientProfileModal({ isOpen, onClose, clientProfile }: ClientProfileModalProps) {
  const [loading, setLoading] = useState(false);
  const [redemptions, setRedemptions] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen && clientProfile) {
      loadData();
    }
  }, [isOpen, clientProfile]);

  const loadData = async () => {
    if (!clientProfile) return;
    try {
      const qR = query(collection(db, 'redemptions'), where('clientId', '==', clientProfile.id));
      const snapR = await getDocs(qR);
      const dataR = snapR.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const qT = query(collection(db, 'point_transactions'), where('clientId', '==', clientProfile.id));
      const snapT = await getDocs(qT);
      const dataT = snapT.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      setRedemptions(dataR);
      setTransactions(dataT);
    } catch (e) {
      console.error(e);
    }
  };

  const handleRedeem = async (reward: typeof REWARDS_CATALOG[0], availablePoints: number) => {
    if (!clientProfile) return;

    if (availablePoints < reward.points) {
      toast.error('Você não tem pontos suficientes (ou tem resgates pendentes).');
      return;
    }

    if (!window.confirm(\`Deseja resgatar "\${reward.title}" por \${reward.points} pontos?\`)) {
      return;
    }

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
      loadData();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao solicitar resgate.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !clientProfile) return null;

  const pendingPoints = redemptions
      .filter(r => r.status === 'pending')
      .reduce((sum, r) => sum + r.cost, 0);
  const availablePoints = clientProfile.points - pendingPoints;
  
  const timeline = [
    ...transactions.map(t => ({ ...t, _type: 'earn' })),
    ...redemptions.map(r => ({ ...r, _type: 'redeem' }))
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

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
          <div className="relative p-[2px] rounded-3xl bg-gradient-to-b from-gold/40 to-white/5 shadow-xl overflow-hidden mb-8 mt-2">
            <div className="rounded-[22px] bg-[#1a1a1a] p-6 sm:p-8 flex flex-col items-center text-center relative z-10 bg-noise">
              
              {/* Avatar Glow */}
              <div className="shrink-0 relative mb-5">
                <div className="absolute inset-0 bg-gold blur-lg opacity-40 rounded-full animate-pulse"></div>
                <div className="relative w-28 h-28 rounded-full border-4 border-gold/80 flex items-center justify-center bg-carbon overflow-hidden z-10 shadow-[0_0_20px_rgba(212,175,55,0.4)]">
                   <User className="w-12 h-12 text-gold/50" />
                </div>
              </div>
              
              <p className="text-[10px] font-bold text-gold tracking-widest uppercase mb-1">Player</p>
              <h3 className="text-3xl font-display font-bold text-white mb-6">
                {clientProfile.username}
              </h3>
              
              <div className="w-full max-w-[280px] mx-auto bg-black/40 p-4 rounded-2xl border border-white/5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white/50 uppercase tracking-widest">Nível:</span>
                      <span className="text-xl font-bold text-gold">{Math.floor(clientProfile.points / 500) + 1}</span>
                    </div>
                    <div className="flex gap-1.5">
                      <div className="w-4 h-2 bg-gold -skew-x-12"></div>
                      <div className="w-4 h-2 bg-gold -skew-x-12"></div>
                      <div className="w-4 h-2 bg-gold/30 -skew-x-12"></div>
                    </div>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="h-2.5 w-full bg-white/10 rounded-full overflow-hidden mb-3 relative">
                    <div 
                      className="absolute top-0 left-0 h-full bg-gold rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(212,175,55,0.8)]" 
                      style={{ width: \`\${(clientProfile.points % 500) / 500 * 100}%\` }}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-bold text-white/40 uppercase tracking-widest text-[10px]">Total: {clientProfile.points}</span>
                    <span className="font-bold text-gold uppercase tracking-widest text-[10px]">Saldo: {availablePoints} pts</span>
                  </div>
              </div>
            </div>
          </div>

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

          {/* Rewards Carousel */}
          <div className="mb-8">
            <h3 className="text-xs uppercase tracking-widest text-white/40 font-bold mb-4 ml-1 flex items-center gap-2">
              <Gift className="w-4 h-4 text-gold" /> Prêmios Disponíveis
            </h3>
            
            <div className="flex overflow-x-auto gap-4 pb-4 -mx-5 px-5 sm:-mx-6 sm:px-6 snap-x snap-mandatory [&::-webkit-scrollbar]:hidden">
              {REWARDS_CATALOG.map((reward) => (
                <div 
                  key={reward.id} 
                  className="min-w-[240px] w-[240px] snap-center bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col relative overflow-hidden group hover:border-gold/30 transition-colors shrink-0"
                >
                  <div className="w-14 h-14 rounded-full bg-gold/10 flex items-center justify-center text-gold mb-4 group-hover:scale-110 transition-transform">
                    {reward.icon}
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
              <History className="w-4 h-4 text-white/40" /> Histórico Recente
            </h3>
            
            {timeline.length === 0 ? (
              <div className="text-center p-8 bg-white/5 rounded-2xl border border-white/10">
                <Star className="w-8 h-8 text-white/20 mx-auto mb-3" />
                <p className="text-white/40 text-sm">Nenhuma atividade recente.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {timeline.slice(0, 15).map((item, idx) => (
                  <div key={item.id || idx} className="bg-white/5 border border-white/5 rounded-xl p-4 flex justify-between items-center hover:bg-white/10 transition-colors">
                    <div className="flex items-center gap-4">
                      {item._type === 'earn' ? (
                        <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                          <Star className="w-4 h-4 text-green-500" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center shrink-0">
                          <Gift className="w-4 h-4 text-gold" />
                        </div>
                      )}
                      
                      <div>
                        <p className="font-bold text-sm text-white/90">
                          {item._type === 'earn' ? (item.description || 'Pontos Ganhos') : item.rewardTitle}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Clock className="w-3 h-3 text-white/30" />
                          <span className="text-xs text-white/40">{new Date(item.createdAt).toLocaleDateString('pt-BR')}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right shrink-0 ml-4">
                      {item._type === 'redeem' && (
                        <div className="mb-1 text-right">
                          {item.status === 'pending' && <span className="text-[10px] font-bold text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded-md uppercase tracking-wider">Análise</span>}
                          {item.status === 'approved' && <span className="text-[10px] font-bold text-green-500 bg-green-500/10 px-2 py-0.5 rounded-md uppercase tracking-wider">Aprovado</span>}
                          {item.status === 'rejected' && <span className="text-[10px] font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded-md uppercase tracking-wider">Recusado</span>}
                        </div>
                      )}
                      <p className={\`text-sm font-display font-bold \${item._type === 'earn' ? 'text-green-400' : 'text-white/60'}\`}>
                        {item._type === 'earn' ? '+' : '-'}{item._type === 'earn' ? item.points : item.cost}
                      </p>
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
`;

fs.writeFileSync('src/components/modals/ClientProfileModal.tsx', code);
console.log("ClientProfileModal fully rewritten");
