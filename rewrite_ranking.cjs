const fs = require('fs');

const code = `import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Trophy, Medal, Star, User } from 'lucide-react';
import { db } from '../../lib/firebase';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';

interface RankingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId?: string;
  defaultAvatar?: string;
}

export function RankingModal({ isOpen, onClose, currentUserId, defaultAvatar }: RankingModalProps) {
  const [loading, setLoading] = useState(true);
  const [ranking, setRanking] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      loadRanking();
    }
  }, [isOpen]);

  const loadRanking = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'clients'),
        orderBy('points', 'desc'),
        limit(10)
      );
      const snap = await getDocs(q);
      const data = snap.docs.map((doc, index) => ({
        id: doc.id,
        position: index + 1,
        ...doc.data()
      }));
      setRanking(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

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
        className="bg-carbon flex-shrink-0 w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 border-t sm:border border-white/10 max-h-[90vh] flex flex-col"
      >
        <div className="flex justify-between items-start mb-6 shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Trophy className="w-6 h-6 text-orange-500" />
              <h2 className="text-2xl font-display font-bold text-white">Top Membros</h2>
            </div>
            <p className="text-white/40 text-sm">Os maiores pontuadores do clube</p>
          </div>
          <button 
            onClick={onClose} 
            className="text-white/40 hover:text-white p-2 -mr-2 -mt-2 transition-colors bg-white/5 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto custom-scrollbar flex-1 -mx-2 px-2 pb-4">
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="w-8 h-8 border-2 border-gold/20 border-t-gold rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-3">
              {ranking.map((client) => {
                const isCurrentUser = client.id === currentUserId;
                const isFirst = client.position === 1;
                const isSecond = client.position === 2;
                const isThird = client.position === 3;
                
                return (
                  <div 
                    key={client.id} 
                    className={\`rounded-xl p-4 flex items-center justify-between border \${
                      isFirst ? 'bg-gradient-to-r from-yellow-500/10 to-yellow-500/5 border-yellow-500/30' :
                      isSecond ? 'bg-gradient-to-r from-gray-300/10 to-gray-300/5 border-gray-300/30' :
                      isThird ? 'bg-gradient-to-r from-amber-700/10 to-amber-700/5 border-amber-700/30' :
                      isCurrentUser ? 'bg-white/10 border-white/20' : 'bg-white/5 border-white/5'
                    }\`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={\`w-6 h-6 rounded-full flex items-center justify-center font-bold font-display text-xs shrink-0 \${
                        isFirst ? 'bg-yellow-500 text-carbon' :
                        isSecond ? 'bg-gray-300 text-carbon' :
                        isThird ? 'bg-amber-700 text-carbon' :
                        'bg-white/5 text-white/50'
                      }\`}>
                        {client.position}
                      </div>

                      <div className={\`w-10 h-10 rounded-full border-2 overflow-hidden flex items-center justify-center shrink-0 \${
                        isFirst ? 'border-yellow-500' :
                        isSecond ? 'border-gray-300' :
                        isThird ? 'border-amber-700' :
                        'border-white/10'
                      }\`}>
                        {client.avatarUrl || defaultAvatar ? (
                          <img src={client.avatarUrl || defaultAvatar} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-5 h-5 text-white/40" />
                        )}
                      </div>

                      <div>
                        <h4 className={\`font-bold text-sm \${isFirst ? 'text-yellow-500' : isSecond ? 'text-gray-300' : isThird ? 'text-amber-700' : 'text-white/90'}\`}>
                          {client.username} {isCurrentUser && '(Você)'}
                        </h4>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Nível {Math.floor(client.points / 500) + 1}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className={\`font-display font-bold \${
                        isFirst ? 'text-yellow-500' : isSecond ? 'text-gray-300' : isThird ? 'text-amber-700' : 'text-gold'
                      }\`}>{client.points}</p>
                      <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold">pts</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
`;

fs.writeFileSync('src/components/modals/RankingModal.tsx', code);
