import React, { useState, useEffect, useRef } from 'react';
import { auth, db } from '../lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, sendPasswordResetEmail } from 'firebase/auth';
import { doc, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Lock, User, Phone, Camera, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { formatPhone, parsePhone, sanitizeUsername, validateUsername } from '../utils';
import { compressImage } from '../utils/imageUtils';
import { sendEmailVerification } from 'firebase/auth';

export default function ClientAuth() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{username?: string, whatsapp?: string, email?: string}>({});
  
  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [whatsapp, setWhatsapp] = useState('');

  const navigate = useNavigate();
  const { user, clientProfile } = useAuth();

  useEffect(() => {
    if (user && clientProfile) {
      navigate('/');
    }
  }, [user, clientProfile, navigate]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        const base64 = await compressImage(file);
        setAvatarUrl(base64);
      } catch (err) {
        if (err.code !== 'permission-denied') console.error(err);
        toast.error('Erro ao processar imagem.');
      }
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      toast.error('Digite seu e-mail no campo acima para redefinir a senha.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success('E-mail de redefinição enviado! Verifique sua caixa de entrada.');
    } catch (err: any) {
      if (err.code !== 'permission-denied') console.error(err);
      toast.error('Erro ao enviar e-mail. Verifique se o endereço está correto.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        toast.success('Bem-vindo de volta!');
        navigate('/');
      } else {
        if (!username || !whatsapp || !firstName || !lastName || !dateOfBirth) {
          toast.error('Preencha todos os campos!');
          setLoading(false);
          return;
        }

        // Validação estrita das regras de Nome de Usuário:
        // - Apenas letras minúsculas (sem maiúsculas)
        // - Sem espaços
        // - Sem acentos
        // - Mínimo de 5 caracteres
        // - Único no sistema
        const normalizedUsername = sanitizeUsername(username);
        const usernameCheck = validateUsername(normalizedUsername);
        if (!usernameCheck.isValid) {
          setFieldErrors(prev => ({ ...prev, username: usernameCheck.error }));
          toast.error(usernameCheck.error || 'Nome de usuário inválido.');
          setLoading(false);
          return;
        }

        // Check password length
        if (password.length < 6) {
          toast.error('A senha deve ter pelo menos 6 caracteres.');
          setLoading(false);
          return;
        }

        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const u = userCredential.user;

        // Check availability after creating account (needs auth to read db)
        // Busca com tolerância a dados legados: compara normalizado e em minúsculas
        const allClientsSnap = await getDocs(collection(db, 'clients'));
        let hasError = false;
        const newErrors: any = {};
        
        const usernameTaken = allClientsSnap.docs.some(doc => {
          const raw = doc.data().username;
          return raw && sanitizeUsername(raw) === normalizedUsername;
        });

        if (usernameTaken) {
            newErrors.username = 'Este nome de usuário já está em uso.';
            hasError = true;
        }

        const phoneTaken = allClientsSnap.docs.some(doc => {
          const raw = doc.data().whatsapp;
          return raw && raw.replace(/\D/g, '') === whatsapp.replace(/\D/g, '');
        });

        if (phoneTaken) {
            newErrors.whatsapp = 'Este número de WhatsApp já está em uso.';
            hasError = true;
        }

        if (hasError) {
            await u.delete();
            setFieldErrors(newErrors);
            setLoading(false);
            return;
        }
        await updateProfile(u, { displayName: normalizedUsername });

        // Save client profile in firestore
        await setDoc(doc(db, 'clients', u.uid), {
          username: normalizedUsername,
          firstName,
          lastName,
          dateOfBirth,
          email,
          whatsapp,
          avatarUrl,
          points: 0,
          seasonalPoints: 0,
          weeklyPoints: 0,
          createdAt: new Date().toISOString()
        });

        try { await sendEmailVerification(u); toast.success('Conta criada! Enviamos um link de verificação para o seu e-mail.'); } catch (e) { toast.success('Conta criada com sucesso! (Erro ao enviar e-mail de verificação)'); }
        navigate('/');
      }
    } catch (err: any) {
      if (err.code !== 'auth/invalid-credential' && err.code !== 'auth/email-already-in-use' && err.code !== 'permission-denied') console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        setFieldErrors({ email: 'Este e-mail já está em uso.' });
      } else if (err.code === 'auth/invalid-credential') {
        toast.error('E-mail ou senha incorretos.');
      } else {
        toast.error(isLogin ? 'Erro ao fazer login.' : 'Erro ao criar conta.');
      }
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
        className="glass-card w-full max-w-md p-6 sm:p-10 bg-carbon-light overflow-hidden"
      >
        <div className="text-center mb-8 flex flex-col items-center">
          <img src="/logo192.png" alt="Club Navalha Barbearia" className="w-32 h-32 object-contain drop-shadow-2xl mb-2" />
          <p className="text-gold font-sans text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] mb-4 mt-2">
            • Sistema de Fidelidade •
          </p>
          <p className="text-white/40 text-xs sm:text-sm mt-4 border-t border-white/10 pt-4 w-full">
            {isLogin ? 'Entre para ver seus pontos e resgatar prêmios.' : 'Cadastre-se e ganhe pontos a cada corte.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <AnimatePresence mode="wait">
            {!isLogin && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="space-y-4 overflow-hidden"
              >
                
                {/* Photo Upload */}
                <div className="flex justify-center mb-6">
                  <div className="relative">
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="w-24 h-24 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center cursor-pointer hover:border-gold/50 hover:bg-white/5 transition-all overflow-hidden group"
                    >
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <Camera className="w-8 h-8 text-white/30 group-hover:text-gold/50" />
                      )}
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Camera className="w-6 h-6 text-white" />
                      </div>
                    </div>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleImageChange} 
                      accept="image/*" 
                      className="hidden" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs uppercase tracking-widest text-white/50 mb-2">Nome</label>
                    <input 
                      required={!isLogin}
                      type="text" 
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Primeiro"
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-gold/50 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-widest text-white/50 mb-2">Sobrenome</label>
                    <input 
                      required={!isLogin}
                      type="text" 
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Último"
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-gold/50 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-widest text-white/50 mb-2">Data de Nascimento</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input 
                      required={!isLogin}
                      type="date" 
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-gold/50 text-sm [color-scheme:dark]"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-xs uppercase tracking-widest text-white/50">Nome de Usuário</label>
                    {fieldErrors.username ? (
                      <span className="text-[10px] text-red-400 font-medium">{fieldErrors.username}</span>
                    ) : username && username.length < 5 ? (
                      <span className="text-[10px] text-amber-400 font-medium">Mínimo 5 letras ({username.length}/5)</span>
                    ) : username ? (
                      <span className="text-[10px] text-emerald-400 font-medium font-mono">@{username}</span>
                    ) : null}
                  </div>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input 
                      required={!isLogin}
                      type="text" 
                      value={username}
                      onChange={(e) => {
                        const clean = sanitizeUsername(e.target.value);
                        setUsername(clean);
                        if (fieldErrors.username) {
                          setFieldErrors(prev => ({ ...prev, username: undefined }));
                        }
                      }}
                      placeholder="ex: joaosilva"
                      minLength={5}
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck="false"
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-gold/50 text-sm font-mono lowercase"
                    />
                  </div>
                  <p className="text-[11px] text-white/40 mt-1">
                    Minúsculas, sem espaços ou acentos. Mínimo de 5 caracteres.
                  </p>
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-2"><label className="block text-xs uppercase tracking-widest text-white/50">WhatsApp</label>{fieldErrors.whatsapp && <span className="text-[10px] text-red-500">{fieldErrors.whatsapp}</span>}</div>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input 
                      required={!isLogin}
                      type="tel" 
                      value={formatPhone(whatsapp)}
                      onChange={(e) => setWhatsapp(parsePhone(e.target.value))}
                      placeholder="(11) 99999-9999"
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-gold/50 text-sm font-mono"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div>
            <div className="flex justify-between items-center mb-2"><label className="block text-xs uppercase tracking-widest text-white/50">E-mail</label>{fieldErrors.email && <span className="text-[10px] text-red-500">{fieldErrors.email}</span>}</div>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input 
                required
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-gold/50 text-sm"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-xs uppercase tracking-widest text-white/50">Senha</label>
              {isLogin && (
                <button 
                  type="button" 
                  onClick={handleResetPassword}
                  className="text-[10px] uppercase tracking-widest text-gold hover:text-gold-light transition-colors"
                >
                  Esqueceu a senha?
                </button>
              )}
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input 
                required
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-gold/50 text-sm"
              />
            </div>
          </div>

          <button 
            disabled={loading}
            type="submit"
            className="w-full gold-gradient text-carbon font-bold py-4 rounded-xl shadow-lg transition-transform active:scale-95 disabled:opacity-50 mt-4"
          >
            {loading ? 'Aguarde...' : (isLogin ? 'ENTRAR NO CLUBE' : 'CRIAR CONTA')}
          </button>
        </form>

        <div className="mt-6 text-center border-t border-white/10 pt-6">
          <p className="text-white/40 text-sm">
            {isLogin ? 'Ainda não faz parte do clube?' : 'Já possui uma conta?'}
          </p>
          <button 
            onClick={() => {
              setIsLogin(!isLogin);
              setEmail('');
              setPassword('');
              setUsername('');
              setWhatsapp('');
            }}
            className="text-gold hover:text-gold-light font-bold mt-2 transition-colors uppercase tracking-wider text-sm"
          >
            {isLogin ? 'Cadastre-se agora' : 'Fazer login'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
