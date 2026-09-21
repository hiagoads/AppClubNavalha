import React from 'react';
import { motion } from 'framer-motion';
import { X, User, Phone, CheckCircle2 } from 'lucide-react';
import { Service } from '../../types';
import { formatPhone, parsePhone } from '../../utils';

interface FormData {
  name: string;
  whatsapp: string;
  serviceIds: string[];
  scheduledTime: string;
}

interface JoinQueueModalProps {
  isOpen: boolean;
  onClose: () => void;
  formType: 'walk-in' | 'scheduled';
  setFormType: (type: 'walk-in' | 'scheduled') => void;
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  services: Service[];
  onSubmit: (e: React.FormEvent) => void;
  schedulingFee: number;
}

export function JoinQueueModal({
  isOpen,
  onClose,
  formType,
  setFormType,
  formData,
  setFormData,
  services,
  onSubmit,
  schedulingFee
}: JoinQueueModalProps) {
  if (!isOpen) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/80 flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4"
    >
      <motion.div 
        initial={{ y: 200 }}
        animate={{ y: 0 }}
        exit={{ y: 200 }}
        className="bg-carbon-light flex-shrink-0 w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 border-t sm:border border-white/10 max-h-[85vh] overflow-y-auto overflow-x-hidden"
      >
        <div className="flex justify-between items-start mb-5">
          <div>
            <h2 className="text-2xl font-display font-bold gold-text-gradient">
              {formType === 'scheduled' ? 'Agendar' : 'Entrar na Fila'}
            </h2>
            <p className="text-white/40 text-sm">Preencha seus dados para entrar.</p>
          </div>
          <button 
            onClick={onClose} 
            className="text-white/40 hover:text-white p-2 -mr-2 -mt-2 transition-colors"
            aria-label="Fecar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-white/50 mb-1.5 font-bold">Nome Completo</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input 
                required
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                type="text" 
                placeholder="Ex: João Silva" 
                className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-9 pr-4 focus:outline-none focus:border-gold/50 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-widest text-white/50 mb-1.5 font-bold">WhatsApp</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input 
                required
                value={formatPhone(formData.whatsapp)}
                onChange={(e) => setFormData({...formData, whatsapp: parsePhone(e.target.value)})}
                type="tel" 
                placeholder="(11) 99999-9999" 
                className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-9 pr-4 focus:outline-none focus:border-gold/50 text-sm font-mono"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setFormType('walk-in')}
              className={`flex-1 py-2.5 rounded-xl border text-sm font-bold transition-all ${formType === 'walk-in' ? 'bg-gold/20 border-gold/50 text-gold' : 'bg-white/5 border-white/10 text-white/40 hover:text-white'}`}
            >
              Presencial
            </button>
            <button
              type="button"
              onClick={() => setFormType('scheduled')}
              className={`flex-1 py-2.5 rounded-xl border text-sm font-bold transition-all ${formType === 'scheduled' ? 'bg-gold/20 border-gold/50 text-gold' : 'bg-white/5 border-white/10 text-white/40 hover:text-white'}`}
            >
              Agendado
            </button>
          </div>

          {formType === 'scheduled' && (
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-white/50 mb-1.5 font-bold text-gold">Horário do Agendamento (R$ {schedulingFee.toFixed(2)} Taxa)</label>
              <input 
                required
                value={formData.scheduledTime}
                onChange={(e) => setFormData({...formData, scheduledTime: e.target.value})}
                type="time" 
                className="w-full bg-gold/10 border border-gold/30 rounded-xl py-2.5 px-4 focus:outline-none focus:border-gold text-sm text-gold font-bold"
              />
              <p className="text-[10px] text-white/40 mt-2">A taxa de agendamento é somada ao valor final dos serviços.</p>
            </div>
          )}

          <div>
            <label className="block text-[10px] uppercase tracking-widest text-white/50 mb-1.5 font-bold">Serviços Desejados</label>
            <div className="grid grid-cols-2 gap-2 max-h-[30vh] overflow-y-auto pr-1 custom-scrollbar">
              {services.map(s => {
                const isSelected = formData.serviceIds.includes(s.name);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        serviceIds: isSelected 
                          ? prev.serviceIds.filter(id => id !== s.name)
                          : [...prev.serviceIds, s.name]
                      }));
                    }}
                    className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden group ${
                      isSelected 
                        ? 'bg-gold/10 border-gold/50 ring-1 ring-gold/20' 
                        : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className={`font-bold text-sm ${isSelected ? 'text-gold' : 'text-white'}`}>
                        {s.name}
                      </span>
                      {isSelected && (
                        <CheckCircle2 className="w-4 h-4 text-gold shrink-0" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <button 
            type="submit"
            className="w-full bg-gold hover:bg-gold-light text-carbon font-bold py-3 sm:py-3.5 rounded-xl transition-colors mt-2"
          >
            Confirmar e Entrar
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}
