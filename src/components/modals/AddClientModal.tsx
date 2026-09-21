import React from 'react';
import { XCircle, AlertTriangle } from 'lucide-react';
import { Barber, Service } from '../../types';
import { parsePrice, parseServiceString, stringifyServices, formatPhone, parsePhone } from '../../utils';

interface NewClientData {
  name: string;
  whatsapp: string;
  serviceId: string;
  barberId: string;
  type: string;
  scheduledTime: string;
  scheduledDate: string;
}

interface AddClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  newClientData: NewClientData;
  setNewClientData: React.Dispatch<React.SetStateAction<NewClientData>>;
  onSubmit: (e: React.FormEvent) => void;
  barbers: Barber[];
  services: Service[];
  schedulingFee: number | string;
}

export function AddClientModal({
  isOpen,
  onClose,
  newClientData,
  setNewClientData,
  onSubmit,
  barbers,
  services,
  schedulingFee
}: AddClientModalProps) {
  if (!isOpen) return null;

  const getServicePrice = (s: Service) => {
    const promo = parsePrice(s.promoPrice);
    const regular = parsePrice(s.price);
    return promo > 0 ? promo : regular;
  };

  return (
    <div className="fixed inset-0 z-50 flex p-4 pb-20 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="m-auto glass-card p-6 sm:p-8 bg-carbon-light border border-white/10 rounded-2xl w-full max-w-md relative animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold font-display silver-text-gradient">
            Novo Cliente na Fila
          </h3>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white transition-colors"
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-2 mb-4 p-1 bg-black/40 rounded-xl">
            <button
              type="button"
              onClick={() => setNewClientData({ ...newClientData, type: 'walk-in' })}
              className={`py-2 rounded-lg text-sm font-bold transition-all ${newClientData.type === 'walk-in' ? 'bg-carbon shadow-md text-gold' : 'text-white/40 hover:text-white'}`}
            >
              Entrar na Fila
            </button>
            <button
              type="button"
              onClick={() => setNewClientData({ ...newClientData, type: 'scheduled' })}
              className={`py-2 rounded-lg text-sm font-bold transition-all ${newClientData.type === 'scheduled' ? 'bg-carbon shadow-md text-gold' : 'text-white/40 hover:text-white'}`}
            >
              Agendar Horário
            </button>
          </div>

          <div className="space-y-2">
            <label className="text-xs uppercase tracking-widest text-white/50 font-bold">Nome do Cliente</label>
            <input
              type="text"
              value={newClientData.name}
              onChange={(e) => setNewClientData({ ...newClientData, name: e.target.value })}
              className="w-full bg-carbon border border-white/10 rounded-lg p-3 text-white focus:border-gold outline-none transition-colors"
              placeholder="Ex: João"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-widest text-white/50 font-bold">WhatsApp</label>
            <input
              type="tel"
              value={formatPhone(newClientData.whatsapp)}
              onChange={(e) => setNewClientData({ ...newClientData, whatsapp: parsePhone(e.target.value) })}
              className="w-full bg-carbon border border-white/10 rounded-lg p-3 text-white focus:border-gold outline-none transition-colors"
              placeholder="(00) 00000-0000"
              required
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-widest text-white/50 font-bold">Barbeiro</label>
            <select
              value={newClientData.barberId}
              onChange={(e) => setNewClientData({ ...newClientData, barberId: e.target.value })}
              className="w-full bg-carbon border border-white/10 rounded-lg p-3 text-white focus:border-gold outline-none transition-colors"
            >
              <option value="any">Qualquer um</option>
              {barbers.filter(b => b.isActive).map(barber => (
                <option key={barber.id} value={barber.id}>{barber.name}</option>
              ))}
            </select>
          </div>

          {newClientData.type === 'scheduled' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-widest text-white/50 font-bold">Data</label>
                <input 
                  type="date" 
                  required
                  value={newClientData.scheduledDate}
                  onChange={(e) => setNewClientData({...newClientData, scheduledDate: e.target.value})}
                  className="w-full bg-carbon border border-white/10 rounded-lg p-3 text-white focus:border-gold outline-none transition-colors"
                  style={{ colorScheme: 'dark' }}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-widest text-white/50 font-bold">Horário</label>
                <input 
                  type="time" 
                  required
                  value={newClientData.scheduledTime}
                  onChange={(e) => setNewClientData({...newClientData, scheduledTime: e.target.value})}
                  className="w-full bg-carbon border border-white/10 rounded-lg p-3 text-white focus:border-gold outline-none transition-colors"
                  style={{ colorScheme: 'dark' }}
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs uppercase tracking-widest text-white/50 font-bold">Serviços e Produtos</label>
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-2 bg-black/20 rounded-lg border border-white/10">
                 {services.map(s => {
                   const parsedNames = parseServiceString(newClientData.serviceId).map(ps => ps.name.trim().toLowerCase());
                   const isSelected = parsedNames.includes(s.name.trim().toLowerCase());
                   return (
                     <button
                       key={s.id}
                       type="button"
                       onClick={() => {
                         setNewClientData(prev => {
                           let parsed = parseServiceString(prev.serviceId);
                           if (isSelected) {
                             parsed = parsed.filter(p => p.name.trim().toLowerCase() !== s.name.trim().toLowerCase());
                           } else {
                             parsed.push({ quantity: 1, name: s.name });
                           }
                           return { ...prev, serviceId: stringifyServices(parsed) };
                         });
                       }}
                       className={`px-3 py-2 rounded-xl text-sm border font-medium transition-colors flex items-center gap-2 ${isSelected ? 'bg-gold/20 border-gold/50 text-gold shadow-sm shadow-gold/10' : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10'}`}
                     >
                       {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-gold"></div>}
                       {s.name}
                     </button>
                   );
                 })}
              </div>
              {parseServiceString(newClientData.serviceId).filter(ps => {
                 const s = services.find(srv => srv.name.trim().toLowerCase() === ps.name.trim().toLowerCase());
                 return s?.isProduct;
              }).map(ps => (
                 <div key={ps.name} className="flex flex-col gap-1 mt-2 p-2 bg-white/5 rounded-lg border border-white/10">
                   <label className="text-xs text-white/70 font-bold flex justify-between">
                     <span>Quantidade: {ps.name}</span>
                     <span className="text-gold">R$ {
                       ( getServicePrice(services.find(srv => srv.name.trim().toLowerCase() === ps.name.trim().toLowerCase())!) * ps.quantity ).toFixed(2)
                     }</span>
                   </label>
                   <div className="flex items-center gap-3">
                     <button 
                       type="button" 
                       onClick={() => {
                         setNewClientData(prev => {
                           let parsed = parseServiceString(prev.serviceId);
                           let existing = parsed.find(p => p.name.trim().toLowerCase() === ps.name.trim().toLowerCase());
                           if (existing) {
                             existing.quantity -= 1;
                             if (existing.quantity <= 0) {
                               parsed = parsed.filter(p => p.name.trim().toLowerCase() !== ps.name.trim().toLowerCase());
                             }
                           }
                           return { ...prev, serviceId: stringifyServices(parsed) };
                         });
                       }}
                       className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold transition-colors"
                     >
                       -
                     </button>
                     <span className="w-8 text-center text-white font-bold">{ps.quantity}</span>
                     <button 
                       type="button" 
                       onClick={() => {
                         setNewClientData(prev => {
                           let parsed = parseServiceString(prev.serviceId);
                           let existing = parsed.find(p => p.name.trim().toLowerCase() === ps.name.trim().toLowerCase());
                           if (existing) existing.quantity += 1;
                           return { ...prev, serviceId: stringifyServices(parsed) };
                         });
                       }}
                       className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold transition-colors"
                     >
                       +
                     </button>
                   </div>
                 </div>
              ))}
            </div>
          </div>

          {newClientData.serviceId.length > 0 && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 mt-4 flex flex-col gap-1">
              <div className="flex justify-between items-center">
                <span className="text-white/50 text-sm font-bold uppercase tracking-widest">Total Estimado</span>
                <span className="text-gold font-bold text-xl">
                  R$ {parseServiceString(newClientData.serviceId).reduce((acc, ps) => {
                    const s = services.find(x => x.name.trim().toLowerCase() === ps.name.trim().toLowerCase() || x.id === ps.name);
                    if (!s) return acc;
                    return acc + (getServicePrice(s) * ps.quantity);
                  }, newClientData.type === 'scheduled' ? Number(schedulingFee) : 0).toFixed(2)}
                </span>
              </div>
              {newClientData.type === 'scheduled' && Number(schedulingFee) > 0 && (
                <span className="text-white/40 text-xs text-right">
                  Inclui taxa de agendamento (R$ {Number(schedulingFee).toFixed(2)})
                </span>
              )}
            </div>
          )}

          <div className="bg-gold/10 border border-gold/20 rounded-xl p-4 mt-4 flex gap-3">
            <AlertTriangle className="w-5 h-5 text-gold shrink-0 mt-0.5" />
            <div>
              <p className="text-gold text-sm font-bold">Aviso Importante</p>
              <p className="text-white/70 text-xs mt-1 leading-relaxed">
                Uma taxa de agendamento está inclusa (se aplicável), e deverá ser paga junto com o serviço no local. A perda do horário implica no não reembolso de taxas.
              </p>
              {newClientData.type === 'scheduled' && Number(schedulingFee) > 0 && (
                <p className="text-white/70 text-xs mt-2 leading-relaxed font-semibold bg-black/20 p-2 rounded inline-block">
                  Há uma taxa de agendamento de R$ {Number(schedulingFee).toFixed(2)} que será cobrada no momento do serviço.
                </p>
              )}
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 rounded-lg font-bold text-white/40 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="bg-gold text-carbon px-6 py-3 rounded-lg font-bold hover:bg-gold-dark transition-colors"
            >
              Adicionar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
