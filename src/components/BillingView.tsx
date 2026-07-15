import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, onSnapshot, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { BookingStatus, Booking } from '../types';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { DollarSign, TrendingUp, Scissors, Calendar, Users, X, Clock, Info, Trash2, Edit2, Save, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useServices } from '../hooks/useServices';
import { formatTime, parsePrice, parseServiceString, stringifyServices } from '../utils';

type PeriodType = 'day' | 'week' | 'month' | 'period';

export default function BillingView() {
  const { services } = useServices();
  const [period, setPeriod] = useState<PeriodType>('day');
  const [customStart, setCustomStart] = useState<string>(new Date().toISOString().split('T')[0]);
  const [customEnd, setCustomEnd] = useState<string>(new Date().toISOString().split('T')[0]);
  
  const [bookings, setBookings] = useState<Booking[]>([]);

  const [selectedClient, setSelectedClient] = useState<Booking | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [isEditingRecord, setIsEditingRecord] = useState(false);
  const [editData, setEditData] = useState<{ clientName: string, serviceId: string, priceOverride: string }>({ clientName: '', serviceId: '', priceOverride: '' });

  useEffect(() => {
    // Listen to completed bookings
    const q = query(collection(db, 'bookings'), where('status', '==', BookingStatus.COMPLETED));
    const unsubscribe = onSnapshot(q, (snap) => {
       const docs = snap.docs.map(d => ({id: d.id, ...d.data()} as Booking));
       setBookings(docs);
    });
    return () => unsubscribe();
  }, []);

  const getBookingPrice = (b: Booking) => {
     if (b.price !== undefined && b.price !== null && parsePrice(b.price) > 0) return parsePrice(b.price);
     if (b.expectedPrice !== undefined && b.expectedPrice !== null && parsePrice(b.expectedPrice) > 0) return parsePrice(b.expectedPrice);
     if (!b.serviceId) return 0;
     const parsedServices = parseServiceString(b.serviceId);
     let total = 0;
     parsedServices.forEach(ps => {
       const s = services.find(srv => 
         srv.name.trim().toLowerCase() === ps.name.trim().toLowerCase() || 
         srv.id === ps.name
       );
       if (s) {
         const promo = parsePrice(s.promoPrice);
         const reg = parsePrice(s.price);
         total += ((promo > 0) ? promo : reg) * ps.quantity;
       }
     });
     return total;
  };

  const recalculatedPrice = (selectedServiceNames: string) => {
     if (!selectedServiceNames) return 0;
     const parsedServices = parseServiceString(selectedServiceNames);
     let total = 0;
     parsedServices.forEach(ps => {
       const s = services.find(srv => srv.name.trim().toLowerCase() === ps.name.trim().toLowerCase() || srv.id === ps.name);
       if (s) {
         const promo = parsePrice(s.promoPrice);
         const reg = parsePrice(s.price);
         total += ((promo > 0) ? promo : reg) * ps.quantity;
       }
     });
     return total;
  };

  const getFilteredBookings = () => {
    const now = new Date();
    
    let start = new Date(now);
    let end = new Date(now);

    if (period === 'day') {
      start.setHours(0,0,0,0);
      end.setHours(23,59,59,999);
    } else if (period === 'week') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
      start.setDate(diff);
      start.setHours(0,0,0,0);
      end.setHours(23,59,59,999);
    } else if (period === 'month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (period === 'period') {
      if (customStart) {
         const [y, m, d] = customStart.split('-');
         start = new Date(Number(y), Number(m) - 1, Number(d), 0, 0, 0);
      }
      if (customEnd) {
         const [y, m, d] = customEnd.split('-');
         end = new Date(Number(y), Number(m) - 1, Number(d), 23, 59, 59, 999);
      }
    }

    return bookings.filter(b => {
      let time = 0;
      if (b.estimatedEndTime) {
         time = typeof b.estimatedEndTime === 'number' ? b.estimatedEndTime : (typeof (b.estimatedEndTime as any).toMillis === 'function' ? (b.estimatedEndTime as any).toMillis() : new Date(b.estimatedEndTime).getTime());
      } else if (b.createdAt) {
         time = typeof b.createdAt === 'number' ? b.createdAt : (typeof (b.createdAt as any).toMillis === 'function' ? (b.createdAt as any).toMillis() : new Date(b.createdAt).getTime());
      }
      return time >= start.getTime() && time <= end.getTime();
    }).sort((a,b) => {
      let timeA = 0;
      let timeB = 0;
      if (a.estimatedEndTime) {
         timeA = typeof a.estimatedEndTime === 'number' ? a.estimatedEndTime : (typeof (a.estimatedEndTime as any).toMillis === 'function' ? (a.estimatedEndTime as any).toMillis() : new Date(a.estimatedEndTime).getTime());
      }
      if (b.estimatedEndTime) {
         timeB = typeof b.estimatedEndTime === 'number' ? b.estimatedEndTime : (typeof (b.estimatedEndTime as any).toMillis === 'function' ? (b.estimatedEndTime as any).toMillis() : new Date(b.estimatedEndTime).getTime());
      }
      return timeB - timeA;
    });
  };

  const filtered = getFilteredBookings();

  let revenue = 0;
  let cuts = filtered.length;
  const serviceCounts: Record<string, number> = {};

  filtered.forEach(b => {
    revenue += getBookingPrice(b);
    if (b.serviceId) {
      const names = b.serviceId.split(',').map(s => s.trim());
      names.forEach(n => {
        serviceCounts[n] = (serviceCounts[n] || 0) + 1;
      });
    }
  });

  const topService = Object.keys(serviceCounts).sort((a,b) => serviceCounts[b] - serviceCounts[a])[0] || 'N/A';

  const getChartData = () => {
    const now = new Date();
    const map: Record<string, number> = {};
    const chartDays: { label: string, dateStr: string, isHighlighted?: boolean }[] = [];

    const toDateStr = (d: Date) => {
        return `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`;
    };

    if (period === 'day' || period === 'week') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
      const monday = new Date(now);
      monday.setDate(diff);
      monday.setHours(0,0,0,0);
      
      const dayNames = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
      
      for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const isToday = d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        chartDays.push({
           label: dayNames[i],
           dateStr: toDateStr(d),
           isHighlighted: period === 'day' ? isToday : (d <= now)
        });
      }
    } else if (period === 'month') {
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      for (let i = 1; i <= daysInMonth; i++) {
        const d = new Date(now.getFullYear(), now.getMonth(), i);
        chartDays.push({
          label: i.toString().padStart(2, '0'),
          dateStr: toDateStr(d),
          isHighlighted: d <= now
        });
      }
    } else if (period === 'period') {
       let start = new Date();
       let end = new Date();
       if (customStart) {
          const [y, m, d] = customStart.split('-');
          start = new Date(Number(y), Number(m) - 1, Number(d), 0, 0, 0);
       }
       if (customEnd) {
          const [y, m, d] = customEnd.split('-');
          end = new Date(Number(y), Number(m) - 1, Number(d), 23, 59, 59, 999);
       }
       for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
         chartDays.push({
            label: `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}`,
            dateStr: toDateStr(d),
            isHighlighted: true
         });
       }
    }

    chartDays.forEach(cd => {
      map[cd.dateStr] = 0;
    });

    bookings.forEach(b => {
      let time = 0;
      if (b.estimatedEndTime) {
         time = typeof b.estimatedEndTime === 'number' ? b.estimatedEndTime : (typeof (b.estimatedEndTime as any).toMillis === 'function' ? (b.estimatedEndTime as any).toMillis() : new Date(b.estimatedEndTime).getTime());
      } else if (b.createdAt) {
         time = typeof b.createdAt === 'number' ? b.createdAt : (typeof (b.createdAt as any).toMillis === 'function' ? (b.createdAt as any).toMillis() : new Date(b.createdAt).getTime());
      }
      if (time > 0) {
        const d = new Date(time);
        const dateStr = toDateStr(d);
        if (map[dateStr] !== undefined) {
           map[dateStr] += getBookingPrice(b);
        }
      }
    });

    return chartDays.map(cd => ({
      name: cd.label,
      total: map[cd.dateStr] || 0,
      isHighlighted: cd.isHighlighted
    }));
  };

  const dailyData = getChartData();

  const parsedServiceNames = parseServiceString(editData.serviceId).map(ps => ps.name.trim().toLowerCase());

  const toggleService = (sName: string, isProduct: boolean | undefined = false) => {
    let parsed = parseServiceString(editData.serviceId);
    let existing = parsed.find(p => p.name.trim().toLowerCase() === sName.trim().toLowerCase());
    
    if (existing) {
       // if it's already there
       if (isProduct) {
          // just let it be handled by a quantity input, or increment if clicked?
          // wait, for products maybe they can change quantity elsewhere.
          // toggle means remove it for simplicity if we handle qty via buttons.
          parsed = parsed.filter(p => p.name.trim().toLowerCase() !== sName.trim().toLowerCase());
       } else {
          parsed = parsed.filter(p => p.name.trim().toLowerCase() !== sName.trim().toLowerCase());
       }
    } else {
       parsed.push({ quantity: 1, name: sName });
    }
    const newStr = stringifyServices(parsed);
    setEditData({ ...editData, serviceId: newStr, priceOverride: recalculatedPrice(newStr).toString() });
  };
  
  const updateProductQuantity = (sName: string, qtyStr: string) => {
    const qty = parseInt(qtyStr, 10);
    let parsed = parseServiceString(editData.serviceId);
    if (isNaN(qty) || qty <= 0) {
      parsed = parsed.filter(p => p.name !== sName);
    } else {
      let existing = parsed.find(p => p.name === sName);
      if (existing) {
        existing.quantity = qty;
      } else {
        parsed.push({ quantity: qty, name: sName });
      }
    }
    const newStr = stringifyServices(parsed);
    setEditData({ ...editData, serviceId: newStr, priceOverride: recalculatedPrice(newStr).toString() });
  };


  const saveEdit = async () => {
    if (!selectedClient) return;
    try {
      const priceVal = parseFloat(editData.priceOverride);
      const updates = {
        clientName: editData.clientName,
        serviceId: editData.serviceId,
        price: isNaN(priceVal) ? null : priceVal
      };
      await updateDoc(doc(db, 'bookings', selectedClient.id), updates);
      
      setSelectedClient({ ...selectedClient, ...updates });
      setIsEditingRecord(false);
      toast.success('Registro atualizado com sucesso!');
    } catch (err) {
      toast.error('Erro ao atualizar registro');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/5 p-4 rounded-2xl border border-white/10">
        <h2 className="text-xl font-display font-bold gold-text-gradient">Relatórios</h2>
        <div className="flex flex-wrap gap-2">
          {['day', 'week', 'month', 'period'].map((p) => (
             <button 
               key={p}
               onClick={() => setPeriod(p as PeriodType)}
               className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${period === p ? 'bg-gold text-carbon' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}
             >
               {p === 'day' ? 'Hoje' : p === 'week' ? 'Semana' : p === 'month' ? 'Mês' : 'Período'}
             </button>
          ))}
        </div>
      </div>

      {period === 'period' && (
        <div className="flex flex-col sm:flex-row gap-4 items-center bg-white/5 p-4 rounded-xl border border-white/10">
          <div className="flex-1 w-full">
            <label className="block text-[10px] uppercase tracking-widest text-white/50 mb-1 font-bold">Data Inicial</label>
            <input 
              type="date" 
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm focus:border-gold/50" 
              value={customStart}
              onChange={e => setCustomStart(e.target.value)}
            />
          </div>
          <div className="flex-1 w-full">
            <label className="block text-[10px] uppercase tracking-widest text-white/50 mb-1 font-bold">Data Final</label>
            <input 
              type="date" 
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm focus:border-gold/50" 
              value={customEnd}
              onChange={e => setCustomEnd(e.target.value)}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Faturamento Total" value={`R$ ${revenue.toFixed(2)}`} icon={<DollarSign className="text-green-500" />} />
        <StatCard title="Cortes Realizados" value={cuts} icon={<Scissors className="text-gold" />} />
        <StatCard title="Serviço Mais Pedido" value={topService} icon={<TrendingUp className="text-blue-500" />} />
      </div>

      <div className="glass-card p-6 min-h-[400px]">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-xl font-display font-bold">Desempenho no Período</h3>
        </div>

        <div className="h-[300px] w-full mb-8">
          {dailyData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }} 
                />
                <YAxis hide />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ backgroundColor: '#1E1E1E', border: 'none', borderRadius: '8px' }}
                  formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Faturamento']}
                />
                <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                  {dailyData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.isHighlighted === false ? '#FFFFFF20' : '#D4AF37'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
             <div className="w-full h-full flex items-center justify-center text-white/30 text-sm">
               Nenhum dado para o período selecionado.
             </div>
          )}
        </div>

        <div className="mt-8">
           <h3 className="text-xl font-display font-bold mb-4">Clientes Atendidos</h3>
           <div className="space-y-3">
             {filtered.length === 0 ? (
               <p className="text-white/40 text-sm">Nenhum cliente atendido neste período.</p>
             ) : (
                filtered.map(b => {
                  let time = 0;
                  if (b.estimatedEndTime) {
                     time = typeof b.estimatedEndTime === 'number' ? b.estimatedEndTime : (typeof (b.estimatedEndTime as any).toMillis === 'function' ? (b.estimatedEndTime as any).toMillis() : new Date(b.estimatedEndTime).getTime());
                  } else if (b.createdAt) {
                     time = typeof b.createdAt === 'number' ? b.createdAt : (typeof (b.createdAt as any).toMillis === 'function' ? (b.createdAt as any).toMillis() : new Date(b.createdAt).getTime());
                  }
                  
                  const d = time > 0 ? new Date(time) : new Date();

                  return (
                    <div 
                      key={b.id} 
                      onClick={() => {
                        setSelectedClient(b);
                        setIsEditingRecord(false);
                      }}
                      className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5 cursor-pointer hover:bg-white/10 transition-colors"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-white">{b.clientName}</p>
                          <Info className="w-4 h-4 text-white/30" />
                        </div>
                        <p className="text-sm text-white/50">{b.serviceId}</p>
                      </div>
                      <div className="text-left sm:text-right mt-2 sm:mt-0">
                        <p className="font-bold text-gold">R$ {getBookingPrice(b).toFixed(2)}</p>
                        <p className="text-xs text-white/30">{d.toLocaleString()}</p>
                      </div>
                    </div>
                  );
                })
             )}
           </div>
        </div>
      </div>

      {selectedClient && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex p-4 pb-20 z-50 overflow-y-auto">
          <div className="m-auto glass-card bg-carbon-light border border-white/10 rounded-2xl w-full max-w-lg p-6 relative">
            <button 
              onClick={() => {
                setSelectedClient(null);
                setIsEditingRecord(false);
              }} 
              className="absolute right-4 top-4 text-white/40 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex justify-between items-center mb-6 pr-8">
              <h3 className="text-xl font-display font-bold gold-text-gradient">Ficha do Cliente</h3>
              {!isEditingRecord && (
                <button
                  onClick={() => {
                    setEditData({ 
                       clientName: selectedClient.clientName, 
                       serviceId: selectedClient.serviceId, 
                       priceOverride: getBookingPrice(selectedClient).toString() 
                    });
                    setIsEditingRecord(true);
                  }}
                  className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors"
                >
                  <Edit2 className="w-4 h-4" /> Editar
                </button>
              )}
            </div>
            
            {isEditingRecord ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-widest text-white/50 font-bold">Nome do Cliente</label>
                  <input
                    type="text"
                    value={editData.clientName}
                    onChange={(e) => setEditData({ ...editData, clientName: e.target.value })}
                    className="w-full bg-carbon border border-white/10 rounded-lg p-3 text-white focus:border-gold outline-none transition-colors"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-widest text-white/50 font-bold">Serviços e Produtos</label>
                  <input
                    type="text"
                    value={editData.serviceId}
                    onChange={(e) => setEditData({ ...editData, serviceId: e.target.value, priceOverride: recalculatedPrice(e.target.value).toString() })}
                    placeholder="Ex: Corte, Barba"
                    className="w-full bg-carbon border border-white/10 rounded-lg p-3 text-sm text-white focus:border-gold outline-none transition-colors mb-2"
                  />
                  <div className="flex flex-col gap-2 max-h-48 overflow-y-auto p-2 bg-black/20 rounded-lg border border-white/10">
                     <div className="flex flex-wrap gap-2">
                     {services.map(s => {
                        const isSelected = parsedServiceNames.includes(s.name.trim().toLowerCase());
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => toggleService(s.name, s.isProduct)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${isSelected ? 'bg-gold/20 border-gold/50 text-gold' : 'bg-carbon border-white/10 text-white/50 hover:border-white/30'} flex items-center gap-2`}
                          >
                            {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-gold"></div>}
                            {s.name} (R$ {(parsePrice(s.promoPrice) > 0 ? parsePrice(s.promoPrice) : parsePrice(s.price)).toFixed(2)})
                          </button>
                        );
                     })}
                     </div>
                     {parseServiceString(editData.serviceId).filter(ps => {
                        const s = services.find(srv => srv.name.trim().toLowerCase() === ps.name.trim().toLowerCase());
                        return s?.isProduct;
                     }).map(ps => (
                        <div key={ps.name} className="flex flex-col gap-1 mt-2 p-2 bg-white/5 rounded-lg border border-white/10">
                          <label className="text-xs text-white/70 font-bold flex justify-between">
                            <span>Quantidade: {ps.name}</span>
                            <span className="text-gold">R$ {
                              ( (parsePrice(services.find(srv => srv.name.trim().toLowerCase() === ps.name.trim().toLowerCase())?.promoPrice) > 0 ? parsePrice(services.find(srv => srv.name.trim().toLowerCase() === ps.name.trim().toLowerCase())?.promoPrice) : parsePrice(services.find(srv => srv.name.trim().toLowerCase() === ps.name.trim().toLowerCase())?.price)) * ps.quantity ).toFixed(2)
                            }</span>
                          </label>
                          <div className="flex items-center gap-3">
                            <button 
                              type="button" 
                              onClick={() => {
                                let parsed = parseServiceString(editData.serviceId);
                                let existing = parsed.find(p => p.name.trim().toLowerCase() === ps.name.trim().toLowerCase());
                                if (existing) {
                                  existing.quantity -= 1;
                                  if (existing.quantity <= 0) {
                                    parsed = parsed.filter(p => p.name.trim().toLowerCase() !== ps.name.trim().toLowerCase());
                                  }
                                }
                                const newStr = stringifyServices(parsed);
                                setEditData({ ...editData, serviceId: newStr, priceOverride: recalculatedPrice(newStr).toString() });
                              }}
                              className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold transition-colors"
                            >
                              -
                            </button>
                            <span className="w-8 text-center text-white font-bold">{ps.quantity}</span>
                            <button 
                              type="button" 
                              onClick={() => {
                                let parsed = parseServiceString(editData.serviceId);
                                let existing = parsed.find(p => p.name.trim().toLowerCase() === ps.name.trim().toLowerCase());
                                if (existing) existing.quantity += 1;
                                const newStr = stringifyServices(parsed);
                                setEditData({ ...editData, serviceId: newStr, priceOverride: recalculatedPrice(newStr).toString() });
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

                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-widest text-white/50 font-bold">Valor Total Final (R$)</label>
                  <input
                    type="number"
                    value={editData.priceOverride}
                    onChange={(e) => setEditData({ ...editData, priceOverride: e.target.value })}
                    className="w-full bg-carbon border border-white/10 rounded-lg p-3 text-white focus:border-gold outline-none transition-colors font-bold text-gold"
                  />
                  <p className="text-[10px] text-white/40">O valor é calculado automaticamente ao selecionar serviços/produtos, mas pode ser alterado manualmente.</p>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                   <button
                     onClick={() => setIsEditingRecord(false)}
                     className="px-4 py-2 rounded-lg text-sm font-bold text-white/40 hover:text-white transition-colors flex items-center gap-2"
                   >
                     <XCircle className="w-4 h-4" /> Cancelar
                   </button>
                   <button
                     onClick={saveEdit}
                     className="px-4 py-2 bg-gold text-carbon rounded-lg text-sm font-bold hover:bg-gold-dark transition-colors flex items-center gap-2"
                   >
                     <Save className="w-4 h-4" /> Salvar Alterações
                   </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-white/10 pb-4">
                  <span className="text-white/50">Nome</span>
                  <span className="font-bold text-white">{selectedClient.clientName}</span>
                </div>
                
                <div className="flex flex-col border-b border-white/10 pb-4">
                  <span className="text-white/50 mb-1">Serviço(s) Registrados</span>
                  <div className="flex flex-wrap gap-1 mt-1 justify-end">
                    {selectedClient.serviceId.split(',').map((s, idx) => (
                      <span key={idx} className="bg-white/10 px-2 py-0.5 rounded text-xs text-white/80">
                        {s.trim()}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div className="flex justify-between items-center border-b border-white/10 pb-4">
                  <span className="text-white/50">Valor Pago</span>
                  <span className="font-bold text-gold text-lg">R$ {getBookingPrice(selectedClient).toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between items-center border-b border-white/10 pb-4">
                  <div className="flex items-center gap-2 text-white/50">
                    <Clock className="w-4 h-4" />
                    <span>Espera na Fila</span>
                  </div>
                  <span className="font-medium text-white">
                    {(() => {
                      if (!selectedClient.createdAt || !selectedClient.serviceStartTime) return 'N/A';
                      const cTime = typeof selectedClient.createdAt === 'number' ? selectedClient.createdAt : (typeof (selectedClient.createdAt as any).toMillis === 'function' ? (selectedClient.createdAt as any).toMillis() : new Date(selectedClient.createdAt).getTime());
                      const sTime = typeof selectedClient.serviceStartTime === 'number' ? selectedClient.serviceStartTime : (typeof (selectedClient.serviceStartTime as any).toMillis === 'function' ? (selectedClient.serviceStartTime as any).toMillis() : new Date(selectedClient.serviceStartTime).getTime());
                      const mins = Math.max(0, Math.floor((sTime - cTime) / 60000));
                      return formatTime(mins);
                    })()}
                  </span>
                </div>
                
                <div className="flex justify-between items-center border-b border-white/10 pb-4">
                  <div className="flex items-center gap-2 text-white/50">
                    <Scissors className="w-4 h-4" />
                    <span>Tempo de Serviço</span>
                  </div>
                  <span className="font-medium text-white">
                    {(() => {
                      if (!selectedClient.serviceStartTime || !selectedClient.estimatedEndTime) return 'N/A';
                      const sTime = typeof selectedClient.serviceStartTime === 'number' ? selectedClient.serviceStartTime : (typeof (selectedClient.serviceStartTime as any).toMillis === 'function' ? (selectedClient.serviceStartTime as any).toMillis() : new Date(selectedClient.serviceStartTime).getTime());
                      const eTime = typeof selectedClient.estimatedEndTime === 'number' ? selectedClient.estimatedEndTime : (typeof (selectedClient.estimatedEndTime as any).toMillis === 'function' ? (selectedClient.estimatedEndTime as any).toMillis() : new Date(selectedClient.estimatedEndTime).getTime());
                      const mins = Math.max(0, Math.floor((eTime - sTime) / 60000));
                      return formatTime(mins);
                    })()}
                  </span>
                </div>
              </div>
            )}
            
            {!isEditingRecord && (
              <div className="mt-8 flex flex-col gap-3">
                <button 
                  onClick={async () => {
                    if (confirmDeleteId === selectedClient.id) {
                      try {
                        await deleteDoc(doc(db, 'bookings', selectedClient.id));
                        toast.success('Registro do cliente excluído com sucesso!');
                        setSelectedClient(null);
                        setConfirmDeleteId(null);
                      } catch (error) {
                        toast.error('Erro ao excluir registro');
                      }
                    } else {
                      setConfirmDeleteId(selectedClient.id);
                      setTimeout(() => setConfirmDeleteId(null), 3000);
                    }
                  }}
                  className={`w-full ${confirmDeleteId === selectedClient.id ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30'} font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2`}
                >
                  <Trash2 className="w-5 h-5" />
                  {confirmDeleteId === selectedClient.id ? 'Confirmar Exclusão' : 'Excluir Registro'}
                </button>
                <button 
                  onClick={() => {
                    setSelectedClient(null);
                    setConfirmDeleteId(null);
                  }} 
                  className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-xl transition-all"
                >
                  Fechar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, icon }: any) {
  return (
    <div className="glass-card p-6 flex flex-col justify-between h-full">
      <div className="flex justify-between items-start mb-4">
        <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold max-w-[70%]">{title}</p>
        <div className="p-3 bg-white/5 rounded-xl">
          {icon}
        </div>
      </div>
      <p className="text-2xl sm:text-3xl font-display font-bold truncate" title={String(value)}>{value}</p>
    </div>
  );
}
