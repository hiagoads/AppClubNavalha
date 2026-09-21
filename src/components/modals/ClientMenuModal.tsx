import React from 'react';
import { motion } from 'framer-motion';
import { Scissors, X, LogIn, Star, LogOut, Award, User, Edit3, Trophy } from 'lucide-react';
import { ClientProfile } from '../../types';
import { auth } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';

import { getClientTier } from '../../utils/tierSystem';
import { useGamificationSettings } from '../../hooks/useGamificationSettings';

interface ClientMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToAdmin: () => void;
  onNavigateToAuth: () => void;
  onOpenProfile: () => void;
  onOpenEditProfile: () => void;
  onOpenRanking: () => void;
  clientProfile: ClientProfile | null;
}

export function ClientMenuModal({ isOpen, onClose, onNavigateToAdmin, onNavigateToAuth, onOpenProfile, onOpenEditProfile, onOpenRanking, clientProfile }: ClientMenuModalProps) {
  const { user } = useAuth();
  const { thresholds } = useGamificationSettings();

  const tier = clientProfile ? getClientTier(clientProfile, thresholds) : null;
  
  if (!isOpen) return null;

  return (
    <>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/80 z-40 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ x: '-100%' }}
        animate={{ x: 0 }}
        exit={{ x: '-100%' }}
        className="fixed top-0 left-0 bottom-0 w-72 bg-carbon-light border-r border-white/10 z-50 p-6 flex flex-col overflow-y-auto"
      >
        <div className="flex justify-between items-center mb-10">
          <div className="flex items-center gap-2">
            <Scissors className="w-6 h-6 text-gold" />
            <span className="font-display font-bold gold-text-gradient text-xl">Menu</span>
          </div>
          <button onClick={onClose} className="text-white/50 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        {clientProfile ? (
          <div className="flex-1 space-y-2 mb-8">
            <div className="px-3 pb-4 mb-4 border-b border-white/10">
               <h3 className="font-bold text-white text-lg">Olá, {clientProfile.username}!</h3>
               <p className="text-xs text-gold uppercase tracking-widest font-bold mt-1">Nível {tier?.level || 1}</p>
            </div>
            
            <button 
              onClick={() => { onClose(); onOpenProfile(); }}
              className="w-full flex items-center p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors text-left group"
            >
              <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center mr-3 group-hover:bg-gold/20 transition-colors">
                <User className="w-4 h-4 text-gold" />
              </div>
              <span className="font-bold text-white/80 text-sm">Meu Perfil & Prêmios</span>
            </button>

            <button 
              onClick={() => { onClose(); onOpenEditProfile(); }}
              className="w-full flex items-center p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors text-left group"
            >
              <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center mr-3 group-hover:bg-white/10 transition-colors">
                <Edit3 className="w-4 h-4 text-white/50" />
              </div>
              <span className="font-bold text-white/80 text-sm">Editar Perfil</span>
            </button>

            <button 
              onClick={() => { onClose(); onOpenRanking(); }}
              className="w-full flex items-center p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors text-left group"
            >
              <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center mr-3 group-hover:bg-orange-500/20 transition-colors">
                <Trophy className="w-4 h-4 text-orange-500" />
              </div>
              <span className="font-bold text-white/80 text-sm">Ranking do Clube</span>
            </button>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <button 
                onClick={() => {
                  onClose();
                  onNavigateToAuth();
                }}
                className="w-full gold-gradient p-4 rounded-xl text-carbon font-bold flex flex-col items-center justify-center gap-2 transition-transform active:scale-95 shadow-lg"
              >
                <Star className="w-6 h-6" />
                <span>Entrar no Clube Navalha</span>
                <span className="text-[10px] uppercase tracking-widest opacity-80">Ganhe pontos e prêmios</span>
              </button>
            </div>
            <div className="flex-1 space-y-2"></div>
          </>
        )}

        <div className="mt-auto space-y-2 pt-6 border-t border-white/10">
          <button 
            onClick={() => {
              onClose();
              onNavigateToAdmin();
            }}
            className="w-full flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors text-left"
          >
            <span className="font-bold text-white/60 text-sm">Acesso Restrito</span>
            <LogIn className="w-4 h-4 text-white/40" />
          </button>

          {(clientProfile || user) && (
            <button 
              onClick={() => {
                auth.signOut();
                toast.success('Deslogado com sucesso');
                onClose();
              }}
              className="w-full flex items-center justify-between p-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl transition-colors text-left"
            >
              <span className="font-bold text-sm">Sair da Conta</span>
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </motion.div>
    </>
  );
}
