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
import { DollarSign, TrendingUp, Scissors, Calendar, Users, X, Clock, Info, Trash2, Edit2, Save, XCircle, Check, Search, Filter } from 'lucide-react';
import toast from 'react-hot-toast';
import { useServices } from '../hooks/useServices';
import { useBarbers } from '../hooks/useBarbers';
import { formatTime, parsePrice, parseServiceString, stringifyServices } from '../utils';

type PeriodType = 'day' | 'week' | 'month' | 'period';


const getServiceTime = (b: any) => {
  let time = 0;
  if (b.estimatedEndTime) {
     time = typeof b.estimatedEndTime === 'number' ? b.estimatedEndTime : (typeof (b.estimatedEndTime as any).toMillis === 'function' ? (b.estimatedEndTime as any).toMillis() : new Date(b.estimatedEndTime).getTime());
  } else if (b.createdAt) {
     time = typeof b.createdAt === 'number' ? b.createdAt : (typeof (b.createdAt as any).toMillis === 'function' ? (b.createdAt as any).toMillis() : new Date(b.createdAt).getTime());
  }
  return time;
};

const getPaymentTime = (b: any) => {
  if (b.isPaid === false) return 0;
  if (b.paidAt) {
     return typeof b.paidAt === 'number' ? b.paidAt : (typeof (b.paidAt as any).toMillis === 'function' ? (b.paidAt as any).toMillis() : new Date(b.paidAt).getTime());
  }
  return getServiceTime(b);
};


export default function BillingView() {
  const { services } = useServices();
  const { barbers } = useBarbers();
  const [period, setPeriod] = useState<PeriodType>('day');
  const [customStart, setCustomStart] = useState<string>(new Date().toISOString().split('T')[0]);
  const [customEnd, setCustomEnd] = useState<string>(new Date().toISOString().split('T')[0]);
  
  const [bookings, setBookings] = useState<Booking[]>([]);

  const [selectedClient, setSelectedClient] = useState<Booking | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [isEditingRecord, setIsEditingRecord] = useState(false);
  const [editData, setEditData] = useState<{ clientName: string, serviceId: string, priceOverride: string, isPaid: boolean, barberId: string }>({ clientName: '', serviceId: '', priceOverride: '', isPaid: true, barberId: '' });
  const [metricsViewMode, setMetricsViewMode] = useState<'compact' | 'comprehensive'>('compact');

  const [listSearch, setListSearch] = useState('');
  const [listPaymentFilter, setListPaymentFilter] = useState<'all' | 'paid' | 'credit'>('all');
  const [listServiceFilter, setListServiceFilter] = useState('');

  useEffect(() => {
    // Listen to completed bookings
    const q = query(collection(db, 'bookings'), where('status', '==', BookingStatus.COMPLETED));
    const unsubscribe = onSnapshot(q, (snap) => {
       const docs = snap.docs.map(d => ({id: d.id, ...d.data()} as Booking));
       setBookings(docs);
    }, (err) => { if(err.code !== "permission-denied") console.error(err); });
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

  
  const getPeriodBounds = () => {
    let start = new Date();
    let end = new Date();
    const now = new Date();
    if (period === 'day') {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (period === 'week') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      start = new Date(now.setDate(diff));
      start.setHours(0, 0, 0, 0);
      end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
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
    return { start, end };
  };

  const getFilteredBookings = () => {
    const { start, end } = getPeriodBounds();
    return bookings.filter(b => {
      const time = getServiceTime(b);
      return time >= start.getTime() && time <= end.getTime();
    }).sort((a,b) => getServiceTime(b) - getServiceTime(a));
  };

  const { start, end } = getPeriodBounds();
  const filtered = getFilteredBookings();

  let revenue = 0;
  let fiado = 0;
  let cuts = filtered.length;
  const serviceCounts: Record<string, number> = {};
  const barberBreakdown: Record<string, { revenue: number, fiado: number, cuts: number }> = {};
  let totalDurationMins = 0;
  let totalServiceValue = 0;

  // Global revenue: calculated based on payment date
  bookings.forEach(b => {
    if (b.isPaid !== false) {
      const pt = getPaymentTime(b);
      if (pt >= start.getTime() && pt <= end.getTime()) {
        revenue += getBookingPrice(b);
      }
    }
  });

  // Services done in this period (fiado, cuts, serviceCounts)
  filtered.forEach(b => {
    const bookingRevenue = getBookingPrice(b);
    totalServiceValue += bookingRevenue;
    const isPaid = b.isPaid !== false;
    
    if (!isPaid) {
      fiado += bookingRevenue;
    }
    
    const bId = b.barberId || 'unknown';
    if (bId !== 'any' && bId !== 'unknown') {
      if (!barberBreakdown[bId]) {
        barberBreakdown[bId] = { revenue: 0, fiado: 0, cuts: 0 };
      }
      
      if (!isPaid) {
        barberBreakdown[bId].fiado += bookingRevenue;
      }
      barberBreakdown[bId].cuts += 1;
    }

    if (b.serviceId) {
      const names = b.serviceId.split(',').map(s => s.trim());
      names.forEach(n => {
        serviceCounts[n] = (serviceCounts[n] || 0) + 1;
        const sDef = services.find(s => s.name.toLowerCase() === n.toLowerCase());
        if (sDef) totalDurationMins += (sDef.duration !== undefined ? sDef.duration : 30);
      });
    }
  });
  
  // Barber revenue: calculated based on payment date
  bookings.forEach(b => {
    if (b.isPaid !== false) {
      const pt = getPaymentTime(b);
      if (pt >= start.getTime() && pt <= end.getTime()) {
        const bId = b.barberId || 'unknown';
        if (bId !== 'any' && bId !== 'unknown') {
          if (!barberBreakdown[bId]) {
             barberBreakdown[bId] = { revenue: 0, fiado: 0, cuts: 0 };
          }
          barberBreakdown[bId].revenue += getBookingPrice(b);
        }
      }
    }
  });

  // Calculate advanced metrics
  const now = new Date();
  const currentMonthBookings = bookings.filter(b => {
     const time = getPaymentTime(b);
     if (time === 0) return false;
     const d = new Date(time);
     return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const currentMonthPaidRevenue = currentMonthBookings.filter(b => b.isPaid !== false).reduce((acc, b) => acc + getBookingPrice(b), 0);
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysPassed = now.getDate() || 1;
  const projectedMRR = (currentMonthPaidRevenue / daysPassed) * daysInMonth;

  const clientRevenue: Record<string, number> = {};
  let totalPaidRevenueAllTime = 0;
  bookings.forEach(b => {
     if (b.isPaid !== false) {
         const rev = getBookingPrice(b);
         totalPaidRevenueAllTime += rev;
         const key = b.clientName.trim().toLowerCase();
         clientRevenue[key] = (clientRevenue[key] || 0) + rev;
     }
  });
  const uniqueClients = Object.keys(clientRevenue).length;
  const ltv = uniqueClients > 0 ? totalPaidRevenueAllTime / uniqueClients : 0;
  
  const ticketMedio = revenue / (cuts > 0 ? cuts : 1);
  const ESTIMATED_CAC = 15.00;
  
  const ESTIMATED_COGS_RATE = 0.30;
  const estimatedCogs = revenue * ESTIMATED_COGS_RATE;
  const contributionMargin = revenue > 0 ? ((revenue - estimatedCogs) / revenue) * 100 : 0;
  
  const totalBillableHours = totalDurationMins / 60;
  const revenuePerHour = totalBillableHours > 0 ? (totalServiceValue / totalBillableHours) : 0;


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
      if (b.isPaid !== false) {
        const time = getPaymentTime(b);
        if (time > 0) {
          const d = new Date(time);
          const dateStr = toDateStr(d);
          if (map[dateStr] !== undefined) {
             map[dateStr] += getBookingPrice(b);
          }
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
    if (editData.barberId === 'any') {
      toast.error('Por favor, selecione um barbeiro válido.');
      return;
    }
    try {
      const priceVal = parseFloat(editData.priceOverride);
      const updates: any = {
        clientName: editData.clientName,
        serviceId: editData.serviceId,
        price: isNaN(priceVal) ? null : priceVal,
        isPaid: editData.isPaid,
        barberId: editData.barberId
      };
      
      if (editData.isPaid && selectedClient.isPaid === false) {
         updates.paidAt = Date.now();
      } else if (!editData.isPaid && selectedClient.isPaid !== false) {
         updates.paidAt = null;
      }
      
      await updateDoc(doc(db, 'bookings', selectedClient.id), updates);
      
      setSelectedClient({ ...selectedClient, ...updates });
      setIsEditingRecord(false);
      toast.success('Registro atualizado com sucesso!');
    } catch (err) {
      toast.error('Erro ao atualizar registro');
    }
  };

  const displayBookings = filtered.filter(b => {
    if (listSearch && !b.clientName.toLowerCase().includes(listSearch.toLowerCase())) {
      return false;
    }
    if (listPaymentFilter === 'paid' && b.isPaid === false) return false;
    if (listPaymentFilter === 'credit' && b.isPaid !== false) return false;
    if (listServiceFilter && (!b.serviceId || !b.serviceId.toLowerCase().includes(listServiceFilter.trim().toLowerCase()))) {
      return false;
    }
    return true;
  });

  let totalServiceFilteredQty = 0;
  if (listServiceFilter) {
     const filterTrimmed = listServiceFilter.trim().toLowerCase();
     displayBookings.forEach(b => {
         const parsed = parseServiceString(b.serviceId);
         const matching = parsed.filter(p => p.name.toLowerCase().includes(filterTrimmed));
         matching.forEach(m => {
             totalServiceFilteredQty += m.quantity;
         });
     });
  }

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

      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-display font-bold">Métricas</h3>
        <div className="flex bg-white/5 p-1 rounded-lg">
          <button
            onClick={() => setMetricsViewMode('compact')}
            className={`px-4 py-2 rounded-md text-sm font-bold transition-colors ${metricsViewMode === 'compact' ? 'bg-gold text-carbon' : 'text-white/50 hover:text-white'}`}
          >
            Visão Resumida
          </button>
          <button
            onClick={() => setMetricsViewMode('comprehensive')}
            className={`px-4 py-2 rounded-md text-sm font-bold transition-colors ${metricsViewMode === 'comprehensive' ? 'bg-gold text-carbon' : 'text-white/50 hover:text-white'}`}
          >
            Visão Completa
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
        <StatCard title="Faturamento" value={`R$ ${revenue.toFixed(2)}`} icon={<DollarSign className="text-green-500" />} />
        <StatCard title="Fiado (A Receber)" value={`R$ ${fiado.toFixed(2)}`} icon={<Clock className="text-red-500" />} />
        <StatCard title="Cortes" value={cuts} icon={<Scissors className="text-gold" />} />
        <StatCard title="Mais Pedido" value={topService} icon={<TrendingUp className="text-blue-500" />} />
      </div>

      {metricsViewMode === 'comprehensive' && (
        <>
          <div className="mt-8">
             <h3 className="text-xl font-display font-bold mb-4">Saúde Financeira e Previsibilidade</h3>
         <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
           <div className="glass-card p-5 border-l-4 border-l-gold">
              <p className="text-[10px] uppercase tracking-widest text-white/50 font-bold mb-1">MRR Projetado</p>
              <p className="text-2xl font-bold text-white">R$ {projectedMRR.toFixed(2)}</p>
              <p className="text-xs text-white/40 mt-1">Estimativa mensal (Baseado em {daysPassed} dias)</p>
           </div>
           <div className="glass-card p-5 border-l-4 border-l-green-500">
              <p className="text-[10px] uppercase tracking-widest text-white/50 font-bold mb-1">Ticket Médio</p>
              <p className="text-2xl font-bold text-white">R$ {ticketMedio.toFixed(2)}</p>
              <p className="text-xs text-white/40 mt-1">Por atendimento no período</p>
           </div>
           <div className="glass-card p-5 border-l-4 border-l-blue-500">
              <p className="text-[10px] uppercase tracking-widest text-white/50 font-bold mb-1">LTV (Lifetime Value)</p>
              <p className="text-2xl font-bold text-white">R$ {ltv.toFixed(2)}</p>
              <p className="text-xs text-white/40 mt-1">Média de gasto histórico por cliente</p>
           </div>
           <div className="glass-card p-5 border-l-4 border-l-purple-500 relative group">
              <p className="text-[10px] uppercase tracking-widest text-white/50 font-bold mb-1 flex items-center gap-1">CAC Estimado <Info className="w-3 h-3 text-white/30 cursor-pointer" /></p>
              <p className="text-2xl font-bold text-white">R$ {ESTIMATED_CAC.toFixed(2)}</p>
              <p className="text-xs text-white/40 mt-1">Custo de aquisição de cliente</p>
              <div className="absolute top-10 left-1/2 -translate-x-1/2 w-48 bg-[#111] text-xs text-white/80 p-2 rounded border border-white/10 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10 text-center">
                Valor placeholder estimado para custos de marketing.
              </div>
           </div>
         </div>
      </div>

      <div className="mt-8">
         <h3 className="text-xl font-display font-bold mb-4">Eficiência e Margem Operacional</h3>
         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
           <div className="glass-card p-5 border-l-4 border-l-red-500">
              <p className="text-[10px] uppercase tracking-widest text-white/50 font-bold mb-1">COGS (Custo de Serviços)</p>
              <p className="text-2xl font-bold text-white">R$ {estimatedCogs.toFixed(2)}</p>
              <p className="text-xs text-white/40 mt-1">Est. 30% do Faturamento</p>
           </div>
           <div className="glass-card p-5 border-l-4 border-l-green-400">
              <p className="text-[10px] uppercase tracking-widest text-white/50 font-bold mb-1">Margem de Contribuição</p>
              <p className="text-2xl font-bold text-white">{contributionMargin.toFixed(1)}%</p>
              <p className="text-xs text-white/40 mt-1">Após COGS estimado</p>
           </div>
           <div className="glass-card p-5 border-l-4 border-l-cyan-500">
              <p className="text-[10px] uppercase tracking-widest text-white/50 font-bold mb-1">Faturamento por Hora Faturável</p>
              <p className="text-2xl font-bold text-white">R$ {revenuePerHour.toFixed(2)} / h</p>
              <p className="text-xs text-white/40 mt-1">Baseado no valor total dos serviços</p>
           </div>
           <div className="glass-card p-5 border-l-4 border-l-indigo-500">
              <p className="text-[10px] uppercase tracking-widest text-white/50 font-bold mb-1">Horas Trabalhadas</p>
              <p className="text-2xl font-bold text-white">{totalBillableHours.toFixed(1)} h</p>
              <p className="text-xs text-white/40 mt-1">Horas faturáveis no período</p>
           </div>
         </div>
      </div>
        </>
      )}

      {metricsViewMode === 'comprehensive' && Object.keys(barberBreakdown).length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.entries(barberBreakdown).map(([bId, data]) => {
             const b = barbers.find(x => x.id === bId);
             const name = b ? b.name : (bId === 'any' ? 'Não Atribuído' : 'Outro');
             return (
               <div key={bId} className="glass-card p-6 flex flex-col justify-between h-full">
                 <div className="flex justify-between items-start mb-4">
                   <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold max-w-[70%]">Faturamento: {name}</p>
                   <div className="p-3 bg-white/5 rounded-xl">
                     <Users className="text-purple-400 w-5 h-5" />
                   </div>
                 </div>
                 <div>
                   <p className="text-2xl font-display font-bold text-green-400 truncate">R$ {data.revenue.toFixed(2)}</p>
                   {data.fiado > 0 && <p className="text-sm font-bold text-red-500 mt-1">Fiado: R$ {data.fiado.toFixed(2)}</p>}
                   <p className="text-xs text-white/50 mt-1">{data.cuts} atendimentos</p>
                 </div>
               </div>
             )
          })}
        </div>
      )}

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
           <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
             <h3 className="text-xl font-display font-bold">Clientes Atendidos</h3>
             
             <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
               <div className="relative">
                 <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 transform -translate-y-1/2" />
                 <input
                   type="text"
                   placeholder="Buscar cliente..."
                   value={listSearch}
                   onChange={(e) => setListSearch(e.target.value)}
                   className="pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-gold/50 w-full"
                 />
               </div>
               
               <select
                 value={listPaymentFilter}
                 onChange={(e) => setListPaymentFilter(e.target.value as any)}
                 className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-gold/50 appearance-none w-full sm:w-auto"
               >
                 <option value="all" className="bg-[#121212] text-white">Status de Pagamento</option>
                 <option value="paid" className="bg-[#121212] text-white">Pagos</option>
                 <option value="credit" className="bg-[#121212] text-white">Fiado</option>
               </select>

               <select
                 value={listServiceFilter}
                 onChange={(e) => setListServiceFilter(e.target.value)}
                 className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-gold/50 appearance-none w-full sm:w-auto"
               >
                 <option value="" className="bg-[#121212] text-white">Todos os Serviços</option>
                 {services.map(s => (
                   <option key={s.id} value={s.name} className="bg-[#121212] text-white">{s.name}</option>
                 ))}
               </select>
             </div>
           </div>

           {(listSearch || listPaymentFilter !== 'all' || listServiceFilter) && (
             <div className="mb-4 p-3 bg-gold/10 border border-gold/20 text-gold rounded-xl text-sm font-medium flex flex-col sm:flex-row sm:items-center justify-between gap-2">
               <div className="flex flex-col sm:flex-row gap-2 sm:gap-6">
                 <span>Resultados: {displayBookings.length} {displayBookings.length === 1 ? 'atendimento encontrado' : 'atendimentos encontrados'}</span>
                 {listServiceFilter && (
                   <span className="opacity-80 border-l border-gold/30 pl-0 sm:pl-6">
                     Quantidade vendida: {totalServiceFilteredQty}x {listServiceFilter}
                   </span>
                 )}
               </div>
               <span>Total nestes filtros: R$ {displayBookings.reduce((sum, b) => sum + getBookingPrice(b), 0).toFixed(2)}</span>
             </div>
           )}

           <div className="space-y-3">
             {displayBookings.length === 0 ? (
               <p className="text-white/40 text-sm">Nenhum cliente encontrado com os filtros atuais.</p>
             ) : (
                displayBookings.map(b => {
                  const time = getServiceTime(b);
                  
                  const d = time > 0 ? new Date(time) : new Date();
                  const bId = b.barberId || 'any';
                  const barberObj = barbers.find(x => x.id === bId);
                  const barberName = barberObj ? barberObj.name : (bId === 'any' ? 'Não Atribuído' : 'Outro');

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
                        <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${bId === 'any' ? 'text-red-400' : 'text-gold'}`}>{barberName}</p>
                      </div>
                      <div className="text-left sm:text-right mt-2 sm:mt-0 flex flex-col items-start sm:items-end gap-2">
                        <div>
                          <p className="font-bold text-gold">R$ {getBookingPrice(b).toFixed(2)}</p>
                          <p className="text-xs text-white/30">{d.toLocaleString()}</p>
                        </div>
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              const newIsPaid = b.isPaid === false;
                              await updateDoc(doc(db, 'bookings', b.id), {
                                isPaid: newIsPaid,
                                ...(newIsPaid ? { paidAt: Date.now() } : { paidAt: null })
                              });
                              toast.success(b.isPaid === false ? 'Marcado como pago' : 'Marcado como fiado');
                            } catch (err) {
                              toast.error('Erro ao atualizar');
                            }
                          }}
                          className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded ${b.isPaid !== false ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}
                        >
                          {b.isPaid !== false ? 'Pago' : 'Fiado'}
                        </button>
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
                       priceOverride: getBookingPrice(selectedClient).toString(),
                       isPaid: selectedClient.isPaid !== false,
                       barberId: selectedClient.barberId || 'any'
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
                  <label className="text-xs uppercase tracking-widest text-white/50 font-bold">Barbeiro</label>
                  <select
                    value={editData.barberId}
                    onChange={(e) => setEditData({ ...editData, barberId: e.target.value })}
                    className="w-full bg-carbon border border-white/10 rounded-lg p-3 text-white focus:border-gold outline-none transition-colors appearance-none"
                  >
                    {editData.barberId === 'any' && <option value="any">Não Atribuído</option>}
                    {barbers.map(b => (
                       <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-widest text-white/50 font-bold">Valor Total Final (R$)</label>
                  <input
                    type="number"
                    value={editData.priceOverride}
                    onChange={(e) => setEditData({ ...editData, priceOverride: e.target.value })}
                    className="w-full bg-carbon border border-white/10 rounded-lg p-3 text-white focus:border-gold outline-none transition-colors font-bold text-gold"
                  />
                  <p className="text-[10px] text-white/40 mb-4">O valor é calculado automaticamente ao selecionar serviços/produtos, mas pode ser alterado manualmente.</p>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button 
                    type="button"
                    onClick={() => setEditData({ ...editData, isPaid: !editData.isPaid })}
                    className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${editData.isPaid ? 'bg-gold text-carbon' : 'bg-white/10 border border-white/20'}`}
                  >
                    {editData.isPaid && <Check className="w-4 h-4" />}
                  </button>
                  <span className="text-sm font-bold text-white/80">Marcar como Pago</span>
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
                  <span className="text-white/50">Valor Total</span>
                  <div className="flex items-center gap-3">
                    {selectedClient.isPaid === false ? (
                      <span className="bg-red-500/20 text-red-500 text-xs px-2 py-1 rounded font-bold uppercase tracking-widest">Fiado</span>
                    ) : (
                      <span className="bg-green-500/20 text-green-500 text-xs px-2 py-1 rounded font-bold uppercase tracking-widest">Pago</span>
                    )}
                    <span className="font-bold text-gold text-lg">R$ {getBookingPrice(selectedClient).toFixed(2)}</span>
                  </div>
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
