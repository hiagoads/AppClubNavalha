import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, User, Phone, Save, Camera, Trash2, Calendar, Lock } from 'lucide-react';
import { auth } from '../../lib/firebase';
import { signOut, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { deleteDoc } from 'firebase/firestore';
import { ClientProfile } from '../../types';
import { formatPhone, parsePhone } from '../../utils';
import { db } from '../../lib/firebase';
import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { compressImage } from '../../utils/imageUtils';

interface EditClientProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientProfile: ClientProfile | null;
}

export function EditClientProfileModal({ isOpen, onClose, clientProfile }: EditClientProfileModalProps) {
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && clientProfile) {
      setUsername(clientProfile.username || '');
      setFirstName(clientProfile.firstName || '');
      setLastName(clientProfile.lastName || '');
      setDateOfBirth(clientProfile.dateOfBirth || '');
      setWhatsapp(clientProfile.whatsapp || '');
      setAvatarUrl(clientProfile.avatarUrl || '');
    }
  }, [isOpen, clientProfile]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        const base64 = await compressImage(file);
        setAvatarUrl(base64);
      } catch (err) {
        toast.error('Erro ao processar imagem.');
      }
    }
  };

  
  const handleDelete = async () => {
    if (!clientProfile || !auth.currentUser || !auth.currentUser.email) return;

    if (!showPasswordConfirm) {
      setShowPasswordConfirm(true);
      return;
    }

    if (!passwordConfirm) {
      toast.error('Por favor, digite sua senha.');
      return;
    }

    setIsDeleting(true);
    try {
      const credential = EmailAuthProvider.credential(auth.currentUser.email, passwordConfirm);
      await reauthenticateWithCredential(auth.currentUser, credential);

      await deleteDoc(doc(db, 'clients', clientProfile.id));
      await auth.currentUser.delete();
      toast.success('Conta deletada com sucesso.');
      onClose();
    } catch (err: any) {
      if (err.code !== 'auth/requires-recent-login' && err.code !== 'permission-denied') console.error(err);
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        toast.error('Senha incorreta.');
      } else if (err.code === 'auth/requires-recent-login') {
        toast.error('Por segurança, faça login novamente para excluir a conta.');
        signOut(auth);
        onClose();
      } else {
        toast.error('Erro ao excluir conta.');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientProfile) return;

    const cleanPhone = whatsapp.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      toast.error('Número de WhatsApp inválido.');
      return;
    }

    setIsSubmitting(true);
    try {
      const qUsername = query(collection(db, 'clients'), where('username', '==', username.trim()));
      const snapUsername = await getDocs(qUsername);
      if (!snapUsername.empty && snapUsername.docs[0].id !== clientProfile.id) {
          toast.error('Este nome de usuário já está em uso por outra pessoa.');
          setIsSubmitting(false);
          return;
      }
  
      const qPhone = query(collection(db, 'clients'), where('whatsapp', '==', cleanPhone));
      const snapPhone = await getDocs(qPhone);
      if (!snapPhone.empty && snapPhone.docs[0].id !== clientProfile.id) {
          toast.error('Este número de WhatsApp já está em uso por outra pessoa.');
          setIsSubmitting(false);
          return;
      }

      await updateDoc(doc(db, 'clients', clientProfile.id), {
        username: username.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        dateOfBirth,
        whatsapp: cleanPhone,
        avatarUrl
      });
      toast.success('Perfil atualizado com sucesso!');
      onClose();
    } catch (err: any) {
      if (err.code !== 'permission-denied') console.error(err);
      toast.error('Erro ao atualizar perfil.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !clientProfile) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/80 flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ y: 200 }}
        animate={{ y: 0 }}
        exit={{ y: 200 }}
        className="bg-carbon flex-shrink-0 w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 border-t sm:border border-white/10"
      >
        <div className="flex justify-between items-start mb-6 shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <User className="w-6 h-6 text-gold" />
              <h2 className="text-2xl font-display font-bold text-white">Editar Perfil</h2>
            </div>
            <p className="text-white/40 text-sm">Atualize seus dados</p>
          </div>
          <button 
            onClick={onClose} 
            className="text-white/40 hover:text-white p-2 -mr-2 -mt-2 transition-colors bg-white/5 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex justify-center mb-6">
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <div className="w-24 h-24 rounded-full border-2 border-white/10 bg-white/5 flex items-center justify-center overflow-hidden">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-10 h-10 text-white/20" />
                )}
              </div>
              <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="w-6 h-6 text-white" />
              </div>
            </div>
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleImageChange}
            />
          </div>

          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-widest text-white/50 font-bold mb-2">Nome</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-white/20 focus:outline-none focus:border-gold/50 transition-colors"
                  placeholder="Nome"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest text-white/50 font-bold mb-2">Sobrenome</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-white/20 focus:outline-none focus:border-gold/50 transition-colors"
                  placeholder="Sobrenome"
                />
              </div>
            </div>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest text-white/50 font-bold mb-2">Data de Nascimento</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calendar className="h-5 w-5 text-gold/50" />
              </div>
              <input
                type="date"
                required
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-white/20 focus:outline-none focus:border-gold/50 transition-colors [color-scheme:dark]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs uppercase tracking-widest text-white/50 font-bold mb-2">Nome de Usuário</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-gold/50" />
              </div>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-white/20 focus:outline-none focus:border-gold/50 transition-colors"
                placeholder="Como gosta de ser chamado?"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-xs uppercase tracking-widest text-white/50 font-bold mb-2">WhatsApp</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Phone className="h-5 w-5 text-gold/50" />
              </div>
              <input
                type="tel"
                required
                value={formatPhone(whatsapp)}
                onChange={(e) => setWhatsapp(parsePhone(e.target.value))}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-white/20 focus:outline-none focus:border-gold/50 transition-colors"
                placeholder="(00) 00000-0000"
              />
            </div>
            <p className="text-[10px] text-white/40 mt-1.5 ml-1">Usado para acumular pontos em seus cortes.</p>
          </div>
          
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-6 bg-gold hover:bg-gold/90 text-carbon font-bold py-3 rounded-xl transition-all shadow-lg shadow-gold/20 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-carbon/20 border-t-carbon rounded-full animate-spin" />
            ) : (
              <>
                <Save className="w-5 h-5" />
                Salvar Alterações
              </>
            )}
          </button>
          
          {showConfirmDelete ? (
            <div className="mt-8 p-4 border border-red-500/20 bg-red-500/10 rounded-xl">
              <p className="text-red-400 text-sm mb-4 text-center">Tem certeza que deseja excluir sua conta permanentemente? Esta ação não pode ser desfeita.</p>
              
              {showPasswordConfirm && (
                <div className="mb-4">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-4 w-4 text-red-400/50" />
                    </div>
                    <input
                      type="password"
                      value={passwordConfirm}
                      onChange={(e) => setPasswordConfirm(e.target.value)}
                      className="w-full bg-black/20 border border-red-500/20 rounded-lg py-2.5 pl-10 pr-4 text-white placeholder:text-white/20 focus:outline-none focus:border-red-500/50 transition-colors text-sm"
                      placeholder="Confirme sua senha atual"
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowConfirmDelete(false);
                    setShowPasswordConfirm(false);
                    setPasswordConfirm('');
                  }}
                  className="flex-1 py-2 rounded-lg bg-white/5 text-white/60 hover:bg-white/10 transition-colors text-sm font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex-1 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors text-sm font-bold flex items-center justify-center gap-2"
                >
                  {isDeleting ? 'Excluindo...' : (showPasswordConfirm ? 'Confirmar Exclusão' : 'Sim, Excluir')}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowConfirmDelete(true)}
              className="w-full mt-4 bg-transparent border border-red-500/30 hover:bg-red-500/10 text-red-500 font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <Trash2 className="w-5 h-5" />
              Deletar Conta
            </button>
          )}

        </form>
      </motion.div>
    </motion.div>
  );
}
