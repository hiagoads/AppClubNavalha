import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  XCircle, 
  AlertTriangle, 
  Search, 
  UserCheck, 
  Award, 
  X, 
  Sparkles, 
  User, 
  Check, 
  RefreshCw,
  Phone
} from 'lucide-react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Barber, Service, ClientProfile } from '../../types';
import { getClientTier } from '../../utils/tierSystem';
import { useGamificationSettings } from '../../hooks/useGamificationSettings';
import { parsePrice, parseServiceString, stringifyServices, formatPhone, parsePhone } from '../../utils';

export interface NewClientData {
  name: string;
  whatsapp: string;
  serviceId: string;
  barberId: string;
  type: string;
  scheduledTime: string;
  scheduledDate: string;
  clientId?: string;
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
  const { thresholds } = useGamificationSettings();
  const [registeredClients, setRegisteredClients] = useState<ClientProfile[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientProfile | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Fetch clients from Firestore when modal is opened
  useEffect(() => {
    if (!isOpen) return;

    const fetchRegisteredClients = async () => {
      setLoadingClients(true);
      try {
        const q = query(collection(db, 'clients'), orderBy('points', 'desc'), limit(150));
        const snap = await getDocs(q);
        const list: ClientProfile[] = [];
        snap.forEach(d => {
          list.push({ id: d.id, ...d.data() } as ClientProfile);
        });
        setRegisteredClients(list);

        // If newClientData already has a clientId, link it
        if (newClientData.clientId) {
          const matched = list.find(c => c.id === newClientData.clientId);
          if (matched) setSelectedClient(matched);
        }
      } catch (err) {
        console.error("Erro ao carregar clientes cadastrados:", err);
      } finally {
        setLoadingClients(false);
      }
    };

    fetchRegisteredClients();
  }, [isOpen]);

  // Click outside listener for search results dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter clients by search query
  const filteredClients = useMemo(() => {
    if (!clientSearch.trim()) return [];
    const q = clientSearch.toLowerCase().trim();
    const cleanQ = q.replace(/\D/g, '');

    return registeredClients.filter(c => {
      const matchUsername = c.username?.toLowerCase().includes(q);
      const matchFirstName = c.firstName?.toLowerCase().includes(q);
      const matchLastName = c.lastName?.toLowerCase().includes(q);
      const matchEmail = c.email?.toLowerCase().includes(q);
      const cleanWhatsapp = (c.whatsapp || '').replace(/\D/g, '');
      const matchPhone = cleanQ.length > 0 && cleanWhatsapp.includes(cleanQ);

      return matchUsername || matchFirstName || matchLastName || matchEmail || matchPhone;
    }).slice(0, 8);
  }, [clientSearch, registeredClients]);

  // Auto-detect matching registered client by the entered WhatsApp phone number (if not selected yet)
  const matchedClientByPhone = useMemo(() => {
    if (selectedClient || !newClientData.whatsapp) return null;
    const cleanEntered = newClientData.whatsapp.replace(/\D/g, '');
    if (cleanEntered.length < 8) return null;

    return registeredClients.find(c => {
      const cleanClientPhone = (c.whatsapp || '').replace(/\D/g, '');
      return cleanClientPhone.length >= 8 && (cleanClientPhone === cleanEntered || cleanClientPhone.endsWith(cleanEntered) || cleanEntered.endsWith(cleanClientPhone));
    }) || null;
  }, [selectedClient, newClientData.whatsapp, registeredClients]);

  if (!isOpen) return null;

  const getServicePrice = (s: Service) => {
    const promo = parsePrice(s.promoPrice);
    const regular = parsePrice(s.price);
    return promo > 0 ? promo : regular;
  };

  const handleSelectClient = (client: ClientProfile) => {
    const fullName = client.firstName 
      ? `${client.firstName} ${client.lastName || ''}`.trim() 
      : client.username;

    setNewClientData(prev => ({
      ...prev,
      name: fullName,
      whatsapp: client.whatsapp || prev.whatsapp,
      clientId: client.id
    }));
    setSelectedClient(client);
    setClientSearch('');
    setShowSearchResults(false);
  };

  const handleUnlinkClient = () => {
    setSelectedClient(null);
    setNewClientData(prev => ({
      ...prev,
      clientId: ''
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex p-4 pb-20 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="m-auto glass-card p-6 sm:p-8 bg-carbon-light border border-white/10 rounded-2xl w-full max-w-lg relative animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-bold font-display silver-text-gradient">
              Novo Cliente na Fila
            </h3>
            <p className="text-xs text-white/50 mt-0.5">
              Adicione um cliente presencial ou com horário agendado
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white transition-colors p-1"
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {/* Tipo de Atendimento: Walk-in vs Agendado */}
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

          {/* Seção: Cliente Cadastrado (Clube Navalha) */}
          <div className="bg-black/40 border border-white/10 rounded-2xl p-3.5 sm:p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gold">
                <Sparkles className="w-3.5 h-3.5 text-gold" />
                <span>Cliente Clube Navalha (Pontuação)</span>
              </div>
              {selectedClient && (
                <span className="text-[10px] bg-gold/15 text-gold border border-gold/30 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1">
                  <Check className="w-3 h-3 text-gold" />
                  Vinculado
                </span>
              )}
            </div>

            {selectedClient ? (
              /* Card de Conta Vinculada */
              <div className="bg-gold/10 border border-gold/40 rounded-xl p-3 flex items-center justify-between gap-3 relative">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-full bg-carbon border border-gold/50 overflow-hidden shrink-0 flex items-center justify-center">
                    {selectedClient.avatarUrl ? (
                      <img src={selectedClient.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-5 h-5 text-gold" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="font-bold text-sm text-white truncate">
                        {selectedClient.firstName 
                          ? `${selectedClient.firstName} ${selectedClient.lastName || ''}`.trim() 
                          : selectedClient.username}
                      </p>
                      <span className="text-xs text-white/50">@{selectedClient.username}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-white/70 flex-wrap">
                      <span className="font-mono text-white/90">{formatPhone(selectedClient.whatsapp)}</span>
                      <span>•</span>
                      <span className="font-bold text-gold font-mono">{selectedClient.points || 0} pts</span>
                      <span>•</span>
                      <span className="text-[10px] text-white/50 uppercase font-semibold">
                        {getClientTier(selectedClient, thresholds).name}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleUnlinkClient}
                  className="shrink-0 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-red-500/20 text-white/60 hover:text-red-400 border border-white/10 hover:border-red-500/30 transition-all text-xs flex items-center gap-1 font-semibold"
                  title="Desvincular conta e cadastrar como avulso"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Desvincular</span>
                </button>
              </div>
            ) : (
              /* Campo de Busca de Clientes */
              <div ref={searchContainerRef} className="relative space-y-1.5">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-white/40">
                    <Search className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={clientSearch}
                    onChange={(e) => {
                      setClientSearch(e.target.value);
                      setShowSearchResults(true);
                    }}
                    onFocus={() => setShowSearchResults(true)}
                    placeholder="Buscar por nome, @username ou WhatsApp..."
                    className="w-full bg-carbon border border-white/10 rounded-xl py-2.5 pl-9 pr-8 text-sm text-white placeholder:text-white/30 focus:border-gold outline-none transition-colors"
                  />
                  {clientSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setClientSearch('');
                        setShowSearchResults(false);
                      }}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-white/40 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Dropdown com os Resultados */}
                {showSearchResults && clientSearch.trim().length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 bg-carbon border border-gold/30 rounded-xl max-h-56 overflow-y-auto shadow-2xl z-30 divide-y divide-white/5 custom-scrollbar">
                    {filteredClients.length > 0 ? (
                      filteredClients.map(c => {
                        const tier = getClientTier(c);
                        const fullName = c.firstName 
                          ? `${c.firstName} ${c.lastName || ''}`.trim() 
                          : c.username;

                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => handleSelectClient(c)}
                            className="w-full text-left p-3 hover:bg-white/10 transition-colors flex items-center justify-between gap-3 group"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-8 h-8 rounded-full bg-black/60 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center">
                                {c.avatarUrl ? (
                                  <img src={c.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                  <User className="w-4 h-4 text-white/40" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-sm text-white truncate group-hover:text-gold transition-colors">
                                  {fullName}
                                </p>
                                <div className="flex items-center gap-1.5 text-xs text-white/50">
                                  <span>@{c.username}</span>
                                  <span>•</span>
                                  <span className="font-mono">{formatPhone(c.whatsapp)}</span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="font-bold text-xs text-gold font-mono block">
                                {c.points || 0} pts
                              </span>
                              <span className="text-[10px] text-white/40 uppercase">{tier.name}</span>
                            </div>
                          </button>
                        );
                      })
                    ) : (
                      <div className="p-3 text-center text-xs text-white/40">
                        Nenhum cliente cadastrado encontrado com "{clientSearch}".
                      </div>
                    )}
                  </div>
                )}

                <p className="text-[11px] text-white/40">
                  Vincule a conta de um cliente cadastrado para creditar pontos automaticamente na conclusão do serviço. Se o cliente for novo ou avulso, basta preencher abaixo.
                </p>
              </div>
            )}
          </div>

          {/* Sugestão de Vínculo caso o WhatsApp digitado coincida com algum cliente cadastrado */}
          {!selectedClient && matchedClientByPhone && (
            <div className="bg-gold/15 border border-gold/40 rounded-xl p-3 flex items-center justify-between gap-2 animate-in fade-in">
              <div className="flex items-center gap-2 min-w-0 text-xs text-white/90">
                <UserCheck className="w-4 h-4 text-gold shrink-0" />
                <span className="truncate">
                  Cadastro encontrado: <strong className="text-gold">@{matchedClientByPhone.username}</strong> ({matchedClientByPhone.points || 0} pts)
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleSelectClient(matchedClientByPhone)}
                className="bg-gold hover:bg-gold-light text-carbon font-bold text-xs px-3 py-1.5 rounded-lg transition-colors shrink-0 shadow-sm shadow-gold/20"
              >
                Vincular Conta
              </button>
            </div>
          )}

          {/* Dados do Cliente: Nome e WhatsApp */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-widest text-white/50 font-bold block">
                Nome do Cliente
              </label>
              <input
                type="text"
                value={newClientData.name}
                onChange={(e) => setNewClientData({ ...newClientData, name: e.target.value })}
                className="w-full bg-carbon border border-white/10 rounded-xl p-3 text-white text-sm focus:border-gold outline-none transition-colors"
                placeholder="Ex: João Silva"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-widest text-white/50 font-bold block">
                WhatsApp
              </label>
              <input
                type="tel"
                value={formatPhone(newClientData.whatsapp)}
                onChange={(e) => setNewClientData({ ...newClientData, whatsapp: parsePhone(e.target.value) })}
                className="w-full bg-carbon border border-white/10 rounded-xl p-3 text-white text-sm focus:border-gold outline-none transition-colors"
                placeholder="(00) 00000-0000"
                required
              />
            </div>
          </div>
          
          {/* Barbeiro */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-widest text-white/50 font-bold block">Barbeiro</label>
            <select
              value={newClientData.barberId}
              onChange={(e) => setNewClientData({ ...newClientData, barberId: e.target.value })}
              className="w-full bg-carbon border border-white/10 rounded-xl p-3 text-white text-sm focus:border-gold outline-none transition-colors"
            >
              <option value="any">Qualquer barbeiro disponível</option>
              {barbers.filter(b => b.isActive).map(barber => (
                <option key={barber.id} value={barber.id}>{barber.name}</option>
              ))}
            </select>
          </div>

          {/* Campos de Agendamento */}
          {newClientData.type === 'scheduled' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-widest text-white/50 font-bold block">Data</label>
                <input 
                  type="date" 
                  required
                  value={newClientData.scheduledDate}
                  onChange={(e) => setNewClientData({...newClientData, scheduledDate: e.target.value})}
                  className="w-full bg-carbon border border-white/10 rounded-xl p-3 text-white text-sm focus:border-gold outline-none transition-colors"
                  style={{ colorScheme: 'dark' }}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-widest text-white/50 font-bold block">Horário</label>
                <input 
                  type="time" 
                  required
                  value={newClientData.scheduledTime}
                  onChange={(e) => setNewClientData({...newClientData, scheduledTime: e.target.value})}
                  className="w-full bg-carbon border border-white/10 rounded-xl p-3 text-white text-sm focus:border-gold outline-none transition-colors"
                  style={{ colorScheme: 'dark' }}
                />
              </div>
            </div>
          )}

          {/* Serviços e Produtos */}
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest text-white/50 font-bold block">
              Serviços e Produtos
            </label>
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-2 bg-black/20 rounded-xl border border-white/10 custom-scrollbar">
                 {services.map(s => {
                   const parsedNames = parseServiceString(newClientData.serviceId).map(ps => ps.name.trim().toLowerCase());
                   const isSelected = parsedNames.includes(s.name.trim().toLowerCase());
                   const price = getServicePrice(s);

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
                       className={`px-3 py-2 rounded-xl text-xs sm:text-sm border font-medium transition-all flex items-center gap-2 ${isSelected ? 'bg-gold/20 border-gold/50 text-gold shadow-sm shadow-gold/10' : 'bg-white/5 border-white/10 text-white/70 hover:text-white hover:bg-white/10'}`}
                     >
                       {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-gold"></div>}
                       <span>{s.name}</span>
                       {s.isProduct && (
                         <span className="text-[10px] bg-white/10 text-white/50 px-1 py-0.5 rounded font-normal">
                           Produto
                         </span>
                       )}
                       <span className="text-xs font-mono opacity-60">R$ {price.toFixed(2)}</span>
                     </button>
                   );
                 })}
              </div>

              {parseServiceString(newClientData.serviceId).filter(ps => {
                 const s = services.find(srv => srv.name.trim().toLowerCase() === ps.name.trim().toLowerCase());
                 return s?.isProduct;
              }).map(ps => (
                 <div key={ps.name} className="flex flex-col gap-1 mt-1 p-2.5 bg-white/5 rounded-xl border border-white/10">
                   <label className="text-xs text-white/80 font-bold flex justify-between">
                     <span>Quantidade: {ps.name}</span>
                     <span className="text-gold font-mono">R$ {
                       ( getServicePrice(services.find(srv => srv.name.trim().toLowerCase() === ps.name.trim().toLowerCase())!) * ps.quantity ).toFixed(2)
                     }</span>
                   </label>
                   <div className="flex items-center gap-3 mt-1">
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
                     <span className="w-8 text-center text-white font-bold font-mono">{ps.quantity}</span>
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

          {/* Total Estimado */}
          {newClientData.serviceId.length > 0 && (() => {
            const parsed = parseServiceString(newClientData.serviceId);
            let servicesSum = 0;
            let productsSum = 0;
            parsed.forEach(ps => {
              const s = services.find(x => x.name.trim().toLowerCase() === ps.name.trim().toLowerCase() || x.id === ps.name);
              if (!s) return;
              const cost = getServicePrice(s) * ps.quantity;
              if (s.isProduct) {
                productsSum += cost;
              } else {
                servicesSum += cost;
              }
            });
            const schedFee = newClientData.type === 'scheduled' ? Number(schedulingFee) : 0;
            const grandTotal = servicesSum + productsSum + schedFee;
            const pointsEstimated = Math.floor(servicesSum * 100);

            return (
              <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <span className="text-white/50 text-xs font-bold uppercase tracking-widest">Total Previsto</span>
                  <span className="text-gold font-bold text-xl font-mono">
                    R$ {grandTotal.toFixed(2)}
                  </span>
                </div>

                {productsSum > 0 && (
                  <div className="flex justify-between items-center text-[11px] text-white/50 pt-1 border-t border-white/5">
                    <span>Serviços: R$ {servicesSum.toFixed(2)}</span>
                    <span>Produtos: R$ {productsSum.toFixed(2)}</span>
                  </div>
                )}

                {selectedClient && (
                  <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs">
                    <span className="text-white/60 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-gold" />
                      Pontuação no Clube (apenas serviços):
                    </span>
                    <span className="font-bold text-gold font-mono">
                      +{pointsEstimated} pts
                    </span>
                  </div>
                )}

                {productsSum > 0 && selectedClient && (
                  <p className="text-[10px] text-white/40 italic">
                    * Produtos físicos não pontuam no Clube Navalha, apenas os serviços.
                  </p>
                )}

                {newClientData.type === 'scheduled' && schedFee > 0 && (
                  <span className="text-white/40 text-[11px] text-right">
                    Inclui taxa de agendamento (R$ {schedFee.toFixed(2)})
                  </span>
                )}
              </div>
            );
          })()}

          {/* Aviso se houver agendamento */}
          {newClientData.type === 'scheduled' && Number(schedulingFee) > 0 && (
            <div className="bg-gold/10 border border-gold/20 rounded-xl p-3 flex gap-2.5">
              <AlertTriangle className="w-4 h-4 text-gold shrink-0 mt-0.5" />
              <p className="text-white/70 text-xs leading-relaxed">
                Taxa de agendamento de <strong className="text-gold">R$ {Number(schedulingFee).toFixed(2)}</strong> inclusa no total e cobrada no local.
              </p>
            </div>
          )}

          <div className="pt-3 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl font-bold text-white/50 hover:text-white transition-colors text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="bg-gold hover:bg-gold-light text-carbon px-6 py-2.5 rounded-xl font-bold transition-all text-sm shadow-lg shadow-gold/20 flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Adicionar à Fila</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
