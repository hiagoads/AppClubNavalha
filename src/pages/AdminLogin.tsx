import React, { useState, useEffect } from 'react';
import { auth } from '../lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { motion } from 'framer-motion';
import { Scissors, Lock, Mail, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();

  useEffect(() => {
    if (user && isAdmin) {
      navigate('/admin');
    }
  }, [user, isAdmin, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success('Bem-vindo, Barbeiro!');
      navigate('/admin');
    } catch (err) {
      toast.error('Acesso negado. Verifique suas credenciais.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-carbon flex items-center justify-center p-4 relative">
      <button 
        onClick={() => navigate('/')}
        className="absolute top-6 right-6 p-2 text-white/50 hover:text-white hover:bg-white/10 z-50 transition-colors rounded-full"
      >
        <X className="w-8 h-8" />
      </button>

      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card w-full max-w-md p-6 sm:p-10 bg-carbon-light"
      >
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-lg sm:text-xl font-sans font-bold tracking-widest copper-text uppercase mb-1">
            Club
          </h2>
          <h1 className="text-3xl sm:text-4xl font-display font-extrabold silver-text-gradient tracking-tight uppercase leading-none mb-2">
            Navalha
          </h1>
          <p className="text-gold font-sans text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] mb-4 mt-2">
            • Barbearia •
          </p>
          <p className="text-white/40 text-xs sm:text-sm mt-4 uppercase tracking-widest border-t border-white/10 pt-4">Acesso Administrativo</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-xs uppercase tracking-widest text-white/50 mb-2">E-mail</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input 
                required
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@barbearia.com"
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-gold/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs uppercase tracking-widest text-white/50 mb-2">Senha</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input 
                required
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-gold/50"
              />
            </div>
          </div>

          <button 
            disabled={loading}
            type="submit"
            className="w-full gold-gradient text-carbon font-bold py-4 rounded-xl shadow-lg transition-transform active:scale-95 disabled:opacity-50"
          >
            {loading ? 'Entrando...' : 'ACESSAR PAINEL'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
