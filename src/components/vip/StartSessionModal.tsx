import React, { useState, useEffect } from 'react';
import { 
  X, 
  Search, 
  Gamepad2, 
  Clock, 
  Award, 
  Sparkles, 
  User, 
  Check, 
  AlertCircle,
  Zap,
  Flame
} from 'lucide-react';
import { collection, query, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { VipStation, ClientProfile, ClientBonus } from '../../types';
import toast from 'react-hot-toast';

interface StartSessionModalProps {
  isOpen: boolean;
  station: VipStation | null;
  onClose: () => void;
  onConfirm: (stationId: string, data: {
    clientId: string;
    clientName: string;
    clientAvatar?: string;
    clientWhatsapp?: string;
    totalMinutes: number;
    bonusTypeUsed: 'vip_hours' | 'unlimited_vip' | 'courtesy' | 'manual';
    bonusId?: string;
    hoursToDeduct?: number;
  }) => void;
}

export function StartSessionModal({
  isOpen,
  station,
  onClose,
  onConfirm
}: StartSessionModalProps) {
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<ClientProfile | null>(null);

  const [durationMinutes, setDurationMinutes] = useState<number>(60);
  const [customMinutes, setCustomMinutes] = useState<string>('');
  const [sessionType, setSessionType] = useState<'vip_hours' | 'unlimited_vip' | 'courtesy' | 'manual'>('manual');
  const [selectedBonus, setSelectedBonus] = useState<ClientBonus | null>(null);

  // Carregar clientes do banco
  useEffect(() => {
    if (!isOpen) return;

    const fetchClients = async () => {
      setLoadingClients(true);
      try {
        const q = query(collection(db, 'clients'), orderBy('points', 'desc'), limit(100));
        const snap = await getDocs(q);
        const list: ClientProfile[] = [];
        snap.forEach(d => {
          list.push({ id: d.id, ...d.data() } as ClientProfile);
        });
        setClients(list);
      } catch (e) {
        console.error("Erro ao buscar clientes:", e);
      } finally {
        setLoadingClients(false);
      }
    };

    fetchClients();
  }, [isOpen]);

  // Ao selecionar um cliente, verificar se ele tem bônus de Horas VIP ou Ilimitado
  useEffect(() => {
    if (!selectedClient) {
      setSessionType('manual');
      setSelectedBonus(null);
      return;
    }

    const bonuses = selectedClient.bonuses || [];
    const unlimited = bonuses.find(b => b.type === 'unlimited_vip' && !b.isRedeemed);
    if (unlimited) {
      setSessionType('unlimited_vip');
      setSelectedBonus(unlimited);
      setDurationMinutes(60);
      return;
    }

    const vipHourBonus = bonuses.find(b => b.type === 'vip_hours' && ((b.totalHours || 0) > (b.usedHours || 0)));
    if (vipHourBonus) {
      setSessionType('vip_hours');
      setSelectedBonus(vipHourBonus);
      setDurationMinutes(60);
      return;
    }

    setSessionType('manual');
    setSelectedBonus(null);
  }, [selectedClient]);

  if (!isOpen || !station) return null;

  const filteredClients = clients.filter(c => {
    const q = search.toLowerCase();
    return (
      (c.username && c.username.toLowerCase().includes(q)) ||
      (c.firstName && c.firstName.toLowerCase().includes(q)) ||
      (c.lastName && c.lastName.toLowerCase().includes(q)) ||
      (c.whatsapp && c.whatsapp.includes(q))
    );
  });

  const getAvailableVipHours = (client: ClientProfile) => {
    if (!client.bonuses) return 0;
    return client.bonuses
      .filter(b => b.type === 'vip_hours')
      .reduce((acc, b) => acc + Math.max(0, (b.totalHours || 0) - (b.usedHours || 0)), 0);
  };

  const hasUnlimitedVip = (client: ClientProfile) => {
    return client.bonuses?.some(b => b.type === 'unlimited_vip' && !b.isRedeemed) || false;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) {
      toast.error("Selecione um cliente para jogar");
      return;
    }

    const finalMinutes = customMinutes ? parseInt(customMinutes) || 60 : durationMinutes;
    if (finalMinutes <= 0) {
      toast.error("Informe um tempo válido");
      return;
    }

    const hoursToDeduct = Math.ceil(finalMinutes / 60);

    onConfirm(station.id, {
      clientId: selectedClient.id,
      clientName: selectedClient.firstName 
        ? `${selectedClient.firstName} ${selectedClient.lastName || ''}`.trim() 
        : selectedClient.username || 'Cliente',
      clientAvatar: selectedClient.avatarUrl || '',
      clientWhatsapp: selectedClient.whatsapp || '',
      totalMinutes: finalMinutes,
      bonusTypeUsed: sessionType,
      bonusId: selectedBonus?.id,
      hoursToDeduct: sessionType === 'vip_hours' ? hoursToDeduct : 0
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-carbon border border-white/15 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Topo do Modal */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold/15 border border-gold/30 flex items-center justify-center text-gold">
              <Gamepad2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Iniciar Jogo • {station.name}
              </h2>
              <p className="text-xs text-white/50">{station.consoleModel}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo com Scroll */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Passo 1: Selecionar o Cliente */}
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-white/70 flex items-center justify-between">
              <span>1. Selecione o Jogador (Cliente)</span>
              {selectedClient && (
                <button
                  type="button"
                  onClick={() => setSelectedClient(null)}
                  className="text-gold text-[11px] hover:underline"
                >
                  Trocar Cliente
                </button>
              )}
            </label>

            {!selectedClient ? (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar por nome ou WhatsApp..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-gold/50"
                  />
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1 rounded-xl border border-white/10 p-1 bg-black/40">
                  {loadingClients ? (
                    <div className="p-4 text-center text-white/40 text-xs">Carregando clientes...</div>
                  ) : filteredClients.length === 0 ? (
                    <div className="p-4 text-center text-white/40 text-xs">Nenhum cliente encontrado</div>
                  ) : (
                    filteredClients.map(c => {
                      const vipHours = getAvailableVipHours(c);
                      const isUnlimited = hasUnlimitedVip(c);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setSelectedClient(c)}
                          className="w-full text-left p-2.5 rounded-lg hover:bg-white/10 flex items-center justify-between group transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {c.avatarUrl ? (
                              <img src={c.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover border border-white/10 shrink-0" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/60 text-xs font-bold shrink-0">
                                <User className="w-4 h-4" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-white group-hover:text-gold transition-colors truncate">
                                {c.firstName ? `${c.firstName} ${c.lastName || ''}`.trim() : c.username}
                              </p>
                              <p className="text-[10px] text-white/40">{c.whatsapp}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {isUnlimited && (
                              <span className="bg-gold/20 text-gold border border-gold/40 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                                <Sparkles className="w-3 h-3" /> VIP ILIMITADO
                              </span>
                            )}
                            {!isUnlimited && vipHours > 0 && (
                              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                                <Award className="w-3 h-3" /> {vipHours}h Bônus
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            ) : (
              /* Cliente Selecionado Card */
              <div className="bg-white/5 border border-gold/40 rounded-xl p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  {selectedClient.avatarUrl ? (
                    <img src={selectedClient.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover border border-gold/50 shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/70 text-sm font-bold shrink-0">
                      <User className="w-5 h-5" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white">
                      {selectedClient.firstName ? `${selectedClient.firstName} ${selectedClient.lastName || ''}`.trim() : selectedClient.username}
                    </p>
                    <p className="text-xs text-white/50">{selectedClient.whatsapp}</p>
                  </div>
                </div>

                <div>
                  {hasUnlimitedVip(selectedClient) ? (
                    <span className="bg-gold/20 text-gold border border-gold/40 text-xs font-bold px-2.5 py-1 rounded-lg flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" /> VIP Ilimitado
                    </span>
                  ) : getAvailableVipHours(selectedClient) > 0 ? (
                    <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold px-2.5 py-1 rounded-lg flex items-center gap-1">
                      <Award className="w-3.5 h-3.5" /> {getAvailableVipHours(selectedClient)}h Disponíveis
                    </span>
                  ) : (
                    <span className="text-[11px] text-white/40">Sem bônus VIP</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Passo 2: Duração da Partida */}
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-white/70 flex items-center justify-between">
              <span>2. Duração da Sessão</span>
              <span className="text-gold font-mono font-bold">
                {customMinutes ? `${customMinutes} min` : `${durationMinutes} min (${(durationMinutes / 60).toFixed(1)}h)`}
              </span>
            </label>

            <div className="grid grid-cols-3 gap-2">
              {[15, 30, 45, 60, 90, 120].map(mins => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => {
                    setDurationMinutes(mins);
                    setCustomMinutes('');
                  }}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                    !customMinutes && durationMinutes === mins
                      ? 'bg-gold text-carbon border-gold shadow-lg shadow-gold/20'
                      : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {mins >= 60 ? `${mins / 60} Hora${mins > 60 ? 's' : ''}` : `${mins} min`}
                </button>
              ))}
            </div>

            {/* Custom Minutes */}
            <div className="flex items-center gap-2 pt-1">
              <span className="text-xs text-white/40">Ou personalizado:</span>
              <div className="relative w-28">
                <input
                  type="number"
                  min="5"
                  max="360"
                  placeholder="Minutos"
                  value={customMinutes}
                  onChange={(e) => setCustomMinutes(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg py-1.5 px-3 text-white text-xs font-mono focus:outline-none focus:border-gold/50"
                />
              </div>
            </div>
          </div>

          {/* Passo 3: Tipo de Acesso / Bônus a abater */}
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-white/70">
              3. Origem do Tempo / Bônus
            </label>

            <div className="space-y-2">
              {selectedClient && hasUnlimitedVip(selectedClient) && (
                <label className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors ${
                  sessionType === 'unlimited_vip' ? 'bg-gold/15 border-gold text-white' : 'bg-white/5 border-white/10 text-white/60'
                }`}>
                  <div className="flex items-center gap-2.5">
                    <input
                      type="radio"
                      name="sessionType"
                      checked={sessionType === 'unlimited_vip'}
                      onChange={() => setSessionType('unlimited_vip')}
                      className="accent-gold"
                    />
                    <div>
                      <p className="text-xs font-bold text-gold flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" /> Usar VIP Ilimitado
                      </p>
                      <p className="text-[11px] text-white/50">O cliente possui benefício de tempo livre.</p>
                    </div>
                  </div>
                </label>
              )}

              {selectedClient && getAvailableVipHours(selectedClient) > 0 && (
                <label className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors ${
                  sessionType === 'vip_hours' ? 'bg-emerald-500/15 border-emerald-500 text-white' : 'bg-white/5 border-white/10 text-white/60'
                }`}>
                  <div className="flex items-center gap-2.5">
                    <input
                      type="radio"
                      name="sessionType"
                      checked={sessionType === 'vip_hours'}
                      onChange={() => setSessionType('vip_hours')}
                      className="accent-emerald-400"
                    />
                    <div>
                      <p className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                        <Award className="w-3.5 h-3.5" /> Abater do Saldo de Horas VIP
                      </p>
                      <p className="text-[11px] text-white/50">
                        Debitar 1 hora das {getAvailableVipHours(selectedClient)}h disponíveis no perfil.
                      </p>
                    </div>
                  </div>
                </label>
              )}

              <label className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors ${
                sessionType === 'courtesy' ? 'bg-blue-500/15 border-blue-500 text-white' : 'bg-white/5 border-white/10 text-white/60'
              }`}>
                <div className="flex items-center gap-2.5">
                  <input
                    type="radio"
                    name="sessionType"
                    checked={sessionType === 'courtesy'}
                    onChange={() => setSessionType('courtesy')}
                    className="accent-blue-400"
                  />
                  <div>
                    <p className="text-xs font-bold text-blue-400 flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5" /> Cortesia do Barbeiro / Casa
                    </p>
                    <p className="text-[11px] text-white/50">Não debita nenhum bônus do cliente.</p>
                  </div>
                </div>
              </label>

              <label className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors ${
                sessionType === 'manual' ? 'bg-white/15 border-white/30 text-white' : 'bg-white/5 border-white/10 text-white/60'
              }`}>
                <div className="flex items-center gap-2.5">
                  <input
                    type="radio"
                    name="sessionType"
                    checked={sessionType === 'manual'}
                    onChange={() => setSessionType('manual')}
                    className="accent-white"
                  />
                  <div>
                    <p className="text-xs font-bold text-white">Avulso / Pago no Balcão</p>
                    <p className="text-[11px] text-white/50">Sessão direta de jogo.</p>
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Botões do Rodapé */}
          <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-white/60 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!selectedClient}
              className="btn-primary flex items-center gap-2 text-xs font-bold py-2.5 px-5 disabled:opacity-50"
            >
              <Gamepad2 className="w-4 h-4" /> Iniciar Partida Agora
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
