const fs = require('fs');

const code = `import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, User, Phone, Save, Camera } from 'lucide-react';
import { ClientProfile } from '../../types';
import { db } from '../../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { compressImage } from '../../utils/imageUtils';

const formatPhone = (val: string) => {
  const numeric = val.replace(/\\D/g, '');
  if (numeric.length === 0) return '';
  if (numeric.length <= 2) return \`(\${numeric}\`;
  if (numeric.length <= 7) return \`(\${numeric.slice(0, 2)}) \${numeric.slice(2)}\`;
  return \`(\${numeric.slice(0, 2)}) \${numeric.slice(2, 7)}-\${numeric.slice(7, 11)}\`;
};

interface EditClientProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientProfile: ClientProfile | null;
}

export function EditClientProfileModal({ isOpen, onClose, clientProfile }: EditClientProfileModalProps) {
  const [username, setUsername] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && clientProfile) {
      setUsername(clientProfile.username || '');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientProfile) return;

    const cleanPhone = whatsapp.replace(/\\D/g, '');
    if (cleanPhone.length < 10) {
      toast.error('Número de WhatsApp inválido.');
      return;
    }

    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, 'clients', clientProfile.id), {
        username: username.trim(),
        whatsapp: cleanPhone,
        avatarUrl
      });
      toast.success('Perfil atualizado com sucesso!');
      onClose();
    } catch (err) {
      console.error(err);
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

          <div>
            <label className="block text-xs uppercase tracking-widest text-white/50 font-bold mb-2">Seu Nome</label>
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
                onChange={(e) => setWhatsapp(e.target.value)}
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
        </form>
      </motion.div>
    </motion.div>
  );
}
`;

fs.writeFileSync('src/components/modals/EditClientProfileModal.tsx', code);
console.log("EditClientProfileModal updated");
