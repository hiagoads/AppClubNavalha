const fs = require('fs');

const code = `import React, { useState, useEffect, useRef } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, increment, addDoc, getDocs, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Award, Check, X, Clock, Search, Plus, UserPlus, Star, Camera } from 'lucide-react';
import toast from 'react-hot-toast';
import { compressImage } from '../utils/imageUtils';

export function GamificationManager() {
  const [redemptions, setRedemptions] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [defaultAvatarUrl, setDefaultAvatarUrl] = useState('');
  const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Add Points State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  const [pointsToAdd, setPointsToAdd] = useState('');
  const [addDescription, setAddDescription] = useState('Bônus Manual');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    // Listen to redemptions
    const q = query(collection(db, 'redemptions'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any));
      data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setRedemptions(data);
    });

    // Load clients for search
    const loadClients = async () => {
      try {
        const snap = await getDocs(collection(db, 'clients'));
        const clientsData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setClients(clientsData);
      } catch (e) {
        console.error('Error loading clients:', e);
      }
    };
    loadClients();

    // Load settings
    const loadSettings = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'settings', 'gamification'));
        if (docSnap.exists()) {
          setDefaultAvatarUrl(docSnap.data().defaultAvatarUrl || '');
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadSettings();

    return () => unsubscribe();
  }, []);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        setIsUpdatingAvatar(true);
        const base64 = await compressImage(file);
        
        await setDoc(doc(db, 'settings', 'gamification'), {
          defaultAvatarUrl: base64
        }, { merge: true });
        
        setDefaultAvatarUrl(base64);
        toast.success('Avatar padrão atualizado!');
      } catch (err) {
        toast.error('Erro ao atualizar imagem.');
      } finally {
        setIsUpdatingAvatar(false);
      }
    }
  };

  const handleApprove = async (redemption: any) => {
    if (!window.confirm(\`Aprovar o resgate de "\${redemption.rewardTitle}" para \${redemption.clientName}?\`)) return;
    try {
      await updateDoc(doc(db, 'clients', redemption.clientId), {
        points: increment(-redemption.cost)
      });
      await updateDoc(doc(db, 'redemptions', redemption.id), {
        status: 'approved'
      });
      toast.success('Resgate aprovado! Pontos debitados.');
    } catch (e) {
      console.error(e);
      toast.error('Erro ao aprovar.');
    }
  };

  const handleReject = async (redemption: any) => {
    if (!window.confirm(\`Recusar o resgate de "\${redemption.rewardTitle}" para \${redemption.clientName}? Os pontos não serão debitados.\`)) return;
    try {
      await updateDoc(doc(db, 'redemptions', redemption.id), {
        status: 'rejected'
      });
      toast.success('Resgate recusado.');
    } catch (e) {
      console.error(e);
      toast.error('Erro ao recusar.');
    }
  };

  const handleAddPoints = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient || !pointsToAdd || isNaN(Number(pointsToAdd))) {
      toast.error('Preencha os dados corretamente.');
      return;
    }

    const pts = parseInt(pointsToAdd);
    if (pts <= 0) {
      toast.error('O valor deve ser maior que zero.');
      return;
    }

    setIsAdding(true);
    try {
      await addDoc(collection(db, 'point_transactions'), {
        clientId: selectedClient.id,
        points: pts,
        description: addDescription || 'Bônus Manual',
        createdAt: new Date().toISOString()
      });

      await updateDoc(doc(db, 'clients', selectedClient.id), {
        points: increment(pts)
      });

      toast.success(\`\${pts} pontos adicionados para \${selectedClient.username}!\`);
      
      setClients(prev => prev.map(c => 
        c.id === selectedClient.id ? { ...c, points: (c.points || 0) + pts } : c
      ));
      
      setPointsToAdd('');
      setAddDescription('Bônus Manual');
      setSelectedClient(null);
      setSearchTerm('');
    } catch (e) {
      console.error(e);
      toast.error('Erro ao adicionar pontos.');
    } finally {
      setIsAdding(false);
    }
  };

  const pending = redemptions.filter(r => r.status === 'pending');
  const history = redemptions.filter(r => r.status !== 'pending');

  const filteredClients = searchTerm.length > 1 
    ? clients.filter(c => 
        (c.username || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
        (c.whatsapp || '').includes(searchTerm) || 
        (c.email || '').toLowerCase().includes(searchTerm.toLowerCase())
      ).slice(0, 5) 
    : [];

  if (loading) {
    return <div className="p-8 text-center text-white/50 animate-pulse">Carregando dados...</div>;
  }

  return (
    <div className="space-y-6">
      
      {/* Header with Avatar Settings */}
      <div className="glass-card p-6 border-gold/50 mb-6 flex flex-col sm:flex-row justify-between sm:items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center">
            <Award className="w-5 h-5 text-gold" />
          </div>
          <div>
            <h2 className="text-xl font-bold font-display text-white">Clube Navalha</h2>
            <p className="text-white/50 text-sm mt-1">Gerencie pontos e configurações do clube</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4 bg-white/5 p-3 rounded-2xl border border-white/5">
          <div className="text-right">
            <p className="text-xs font-bold text-white uppercase tracking-widest">Avatar Padrão</p>
            <p className="text-[10px] text-white/40">Exibido p/ usuários sem foto</p>
          </div>
          <div className="relative group cursor-pointer" onClick={() => !isUpdatingAvatar && fileInputRef.current?.click()}>
            <div className="w-12 h-12 rounded-full border-2 border-white/10 bg-black overflow-hidden flex items-center justify-center">
              {isUpdatingAvatar ? (
                <div className="w-4 h-4 border-2 border-gold/20 border-t-gold rounded-full animate-spin" />
              ) : defaultAvatarUrl ? (
                <img src={defaultAvatarUrl} alt="Default" className="w-full h-full object-cover" />
              ) : (
                <Camera className="w-5 h-5 text-white/20" />
              )}
            </div>
            {!isUpdatingAvatar && (
              <div className="absolute inset-0 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <Camera className="w-5 h-5 text-white" />
              </div>
            )}
            <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageChange} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Col 1: Pending Redemptions */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-bold uppercase tracking-widest text-gold mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4" /> Solicitações Pendentes ({pending.length})
          </h3>
          
          {pending.length === 0 ? (
            <div className="bg-white/5 rounded-xl p-6 text-center border border-white/5">
              <p className="text-white/40 text-sm">Nenhuma solicitação pendente no momento.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pending.map(req => (
                <div key={req.id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                  <div>
                    <h4 className="font-bold text-white text-base">{req.clientName}</h4>
                    <p className="text-gold font-bold text-sm mb-1">{req.rewardTitle} <span className="text-white/40 font-mono">({req.cost} pts)</span></p>
                    <div className="flex items-center gap-2">
                      <Clock className="w-3 h-3 text-white/30" />
                      <span className="text-xs text-white/30">{new Date(req.createdAt).toLocaleString('pt-BR')}</span>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                    <button
                      onClick={() => handleReject(req)}
                      className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 font-bold text-xs transition-colors"
                    >
                      <X className="w-4 h-4" /> Recusar
                    </button>
                    <button
                      onClick={() => handleApprove(req)}
                      className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30 font-bold text-xs transition-colors"
                    >
                      <Check className="w-4 h-4" /> Aprovar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Col 2: Add Points Manual */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-bold uppercase tracking-widest text-gold mb-4 flex items-center gap-2">
            <Plus className="w-4 h-4" /> Adicionar Pontos Manuais
          </h3>

          <div className="space-y-4">
            {!selectedClient ? (
              <div>
                <label className="block text-xs uppercase tracking-widest text-white/50 font-bold mb-2">Buscar Cliente</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-white/40" />
                  </div>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-white/30 focus:outline-none focus:border-gold/50 transition-colors"
                    placeholder="Nome, e-mail ou WhatsApp..."
                  />
                </div>

                {searchTerm.length > 1 && (
                  <div className="mt-2 bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden shadow-xl max-h-60 overflow-y-auto custom-scrollbar">
                    {filteredClients.length > 0 ? (
                      filteredClients.map(client => (
                        <button
                          key={client.id}
                          onClick={() => setSelectedClient(client)}
                          className="w-full text-left p-3 hover:bg-white/5 border-b border-white/5 last:border-0 transition-colors flex justify-between items-center group"
                        >
                          <div>
                            <p className="font-bold text-sm text-white group-hover:text-gold transition-colors">{client.username}</p>
                            <p className="text-xs text-white/40 font-mono mt-0.5">{client.whatsapp || client.email}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-bold text-gold">{client.points || 0} pts</p>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="p-4 text-center text-white/40 text-sm">
                        Nenhum cliente encontrado.
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleAddPoints} className="bg-white/5 border border-white/10 rounded-xl p-5">
                <div className="flex justify-between items-start mb-4 border-b border-white/5 pb-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-white/50 font-bold mb-1">Cliente Selecionado</p>
                    <p className="font-bold text-white text-lg">{selectedClient.username}</p>
                    <p className="text-xs text-white/40 font-mono mt-0.5">{selectedClient.whatsapp || selectedClient.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setSelectedClient(null); setSearchTerm(''); }}
                    className="text-white/40 hover:text-white p-1 rounded-md bg-white/5"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs uppercase tracking-widest text-white/50 font-bold mb-2">Quantidade de Pontos</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Star className="h-4 w-4 text-gold" />
                      </div>
                      <input
                        type="number"
                        required
                        min="1"
                        value={pointsToAdd}
                        onChange={(e) => setPointsToAdd(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-white font-mono font-bold focus:outline-none focus:border-gold/50"
                        placeholder="Ex: 500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-widest text-white/50 font-bold mb-2">Motivo / Descrição</label>
                    <input
                      type="text"
                      required
                      value={addDescription}
                      onChange={(e) => setAddDescription(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl py-2 px-4 text-white focus:outline-none focus:border-gold/50 text-sm"
                      placeholder="Ex: Bônus de aniversário"
                    />
                  </div>
                  
                  <button
                    type="submit"
                    disabled={isAdding}
                    className="w-full flex justify-center items-center gap-2 bg-gold text-carbon font-bold py-3 rounded-xl hover:bg-gold/90 transition-colors shadow-lg shadow-gold/20"
                  >
                    {isAdding ? (
                      <div className="w-5 h-5 border-2 border-carbon/20 border-t-carbon rounded-full animate-spin" />
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        Adicionar Pontos
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="glass-card p-6">
          <h3 className="text-sm font-bold uppercase tracking-widest text-white/40 mb-4">Histórico de Resgates</h3>
          <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar pr-2">
            {history.map(req => (
              <div key={req.id} className="bg-white/5 border border-white/5 rounded-xl p-3 flex justify-between items-center hover:bg-white/10 transition-colors">
                <div>
                  <p className="font-bold text-sm text-white/80">{req.clientName}</p>
                  <p className="text-xs text-white/50">{req.rewardTitle}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Clock className="w-3 h-3 text-white/30" />
                    <span className="text-[10px] text-white/40">{new Date(req.createdAt).toLocaleString('pt-BR')}</span>
                  </div>
                </div>
                <div className="text-right">
                  {req.status === 'approved' ? (
                    <span className="text-[10px] font-bold text-green-500 bg-green-500/10 px-2 py-1 rounded-md uppercase tracking-wider">Aprovado</span>
                  ) : (
                    <span className="text-[10px] font-bold text-red-500 bg-red-500/10 px-2 py-1 rounded-md uppercase tracking-wider">Recusado</span>
                  )}
                  <p className="text-xs text-gold font-mono mt-1 font-bold">{req.cost} pts</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
`;

fs.writeFileSync('src/components/GamificationManager.tsx', code);
console.log("GamificationManager updated");
