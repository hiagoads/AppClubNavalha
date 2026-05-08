import { useQueue } from '../hooks/useQueue';
import { useNotifications } from '../hooks/useNotifications';
import { useQueueTimers } from '../hooks/useQueueTimers';
import { useServices } from '../hooks/useServices';
import { useBreaks } from '../hooks/useBreaks';
import { useSettings } from '../hooks/useSettings';
import { db, auth } from '../lib/firebase';
import { doc, updateDoc, deleteDoc, serverTimestamp, addDoc, collection, setDoc, writeBatch, deleteField } from 'firebase/firestore';
import { BookingStatus } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import React, { useState } from 'react';
import BillingView from '../components/BillingView';
import ServicesManager from '../components/ServicesManager';
import { formatTime } from '../utils';
import { 
  Play, 
  CheckCircle, 
  XCircle, 
  BarChart3, 
  Users, 
  Settings, 
  LogOut, 
  Scissors,
  ArrowUp,
  ArrowDown,
  Clock,
  MessageSquare,
  Menu,
  X,
  Edit2
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminDashboard() {
  const { queue, activeBooking, loading } = useQueue();
  const { services } = useServices();
  const { breaks } = useBreaks();
  const { isOpen, toggleOpenStatus } = useSettings();
  const { activeRemainingMinutes, queueWaitTimes, queueIntervals, sortedQueue } = useQueueTimers(activeBooking, queue, services, breaks);
  useNotifications(queue, activeBooking);
  const [activeTab, setActiveTab] = useState<'queue' | 'billing' | 'services' | 'barbers'>('queue');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAddingClient, setIsAddingClient] = useState(false);
  const [isAddingBreak, setIsAddingBreak] = useState(false);
  const [newBreakData, setNewBreakData] = useState({
    timeStr: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
    durationStr: '60'
  });
  const [newClientData, setNewClientData] = useState({
    name: '',
    whatsapp: '',
    serviceIds: [] as string[],
    type: 'walk-in',
    scheduledTime: '',
    scheduledDate: new Date().toISOString().split('T')[0],
  });

  const [editingServicesBooking, setEditingServicesBooking] = useState<{id: string, services: string[]} | null>(null);

  const handleUpdateServices = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingServicesBooking || editingServicesBooking.services.length === 0) {
      toast.error('Selecione pelo menos um serviço');
      return;
    }
    try {
      await updateDoc(doc(db, 'bookings', editingServicesBooking.id), {
        serviceId: editingServicesBooking.services.join(', ')
      });
      toast.success('Serviços atualizados com sucesso');
      setEditingServicesBooking(null);
    } catch (err) {
      toast.error('Erro ao atualizar serviços');
    }
  };

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientData.name || !newClientData.whatsapp) return;
    if (newClientData.serviceIds.length === 0) {
      toast.error("Selecione pelo menos um serviço");
      return;
    }
    const isScheduled = newClientData.type === 'scheduled';
    if (isScheduled && !newClientData.scheduledTime) {
      toast.error('Por favor, informe o horário do agendamento.');
      return;
    }

    try {
      await addDoc(collection(db, 'bookings'), {
        clientName: newClientData.name,
        clientWhatsapp: newClientData.whatsapp,
        serviceId: newClientData.serviceIds.join(', '),
        barberId: 'any',
        type: newClientData.type,
        status: BookingStatus.WAITING,
        createdAt: serverTimestamp(),
        ...(isScheduled && { scheduledTime: newClientData.scheduledTime, scheduledDate: newClientData.scheduledDate }),
      });
      toast.success(isScheduled ? 'Cliente agendado com sucesso' : 'Cliente adicionado à fila');
      setIsAddingClient(false);
      setNewClientData({ name: '', whatsapp: '', serviceIds: [], type: 'walk-in', scheduledTime: '', scheduledDate: new Date().toISOString().split('T')[0] });
    } catch(err) {
      toast.error('Erro ao adicionar cliente');
    }
  };

  const startService = async (bookingId: string) => {
    try {
      const bookingRef = doc(db, 'bookings', bookingId);
      await updateDoc(bookingRef, {
        status: BookingStatus.IN_SERVICE,
        serviceStartTime: serverTimestamp()
      });
      toast.success('Serviço iniciado');
    } catch (err) {
      toast.error('Erro ao iniciar serviço');
    }
  };

  const handleAddBreak = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
       const [h, m] = newBreakData.timeStr.split(':').map(Number);
       const date = new Date();
       date.setHours(h, m, 0, 0);

       await addDoc(collection(db, 'breaks'), {
         startTime: date.getTime(),
         duration: Number(newBreakData.durationStr),
         barberId: 'any'
       });
       toast.success('Pausa agendada!');
       setIsAddingBreak(false);
    } catch (err) {
       toast.error('Erro ao agendar pausa');
    }
  };

  const removeBreak = async (breakId: string) => {
    try {
      await deleteDoc(doc(db, 'breaks', breakId));
      toast.success('Pausa removida');
    } catch(err) {
      toast.error('Erro ao remover');
    }
  };

  const completeService = async (bookingId: string) => {
    try {
      const bookingRef = doc(db, 'bookings', bookingId);
      await updateDoc(bookingRef, {
        status: BookingStatus.COMPLETED,
        estimatedEndTime: serverTimestamp()
      });
      toast.success('Serviço concluído!');
    } catch (err) {
      toast.error('Erro ao concluir');
    }
  };

  const removeBooking = async (bookingId: string) => {
    const bookingToUndo = queue.find(b => b.id === bookingId) || (activeBooking?.id === bookingId ? activeBooking : null);
    if (!bookingToUndo) return;

    try {
      await updateDoc(doc(db, 'bookings', bookingId), {
        status: BookingStatus.CANCELLED
      });
      toast((t) => (
        <div className="flex items-center gap-3">
          <span className="text-sm">Cliente removido</span>
          <button
            onClick={async () => {
              toast.dismiss(t.id);
              await updateDoc(doc(db, 'bookings', bookingToUndo.id), {
                status: bookingToUndo.status
              });
              toast.success('Ação desfeita');
            }}
            className="text-gold font-bold px-3 py-1 rounded bg-white/10 hover:bg-white/20 transition-colors text-xs uppercase"
          >
            Desfazer
          </button>
        </div>
      ), { duration: 5000 });
    } catch (err) {
      toast.error('Erro ao remover');
    }
  };

  const markPresent = async (bookingId: string) => {
    try {
      await updateDoc(doc(db, 'bookings', bookingId), {
        status: BookingStatus.CHECKING_IN
      });
      toast.success('Presença confirmada');
    } catch(err) {
      toast.error('Erro ao confirmar presença');
    }
  };

  const undoPresent = async (bookingId: string) => {
    try {
      await updateDoc(doc(db, 'bookings', bookingId), {
        status: BookingStatus.WAITING,
        checkInTime: deleteField()
      });
      toast.success('Presença cancelada');
    } catch(err) {
      toast.error('Erro ao cancelar presença');
    }
  };

  const getBaseTime = (b: any) => {
    let time = Infinity;
    if (b.type === 'scheduled') {
      if (!b.scheduledTime) return Infinity;
      const [h, m] = b.scheduledTime.split(':').map(Number);
      const d = new Date();
      if (b.scheduledDate) {
        const [year, month, day] = b.scheduledDate.split('-').map(Number);
        d.setFullYear(year, month - 1, day);
      }
      d.setHours(h, m, 0, 0);
      time = d.getTime();
    } else {
      if (b.createdAt) {
         if (typeof b.createdAt.toMillis === 'function') time = b.createdAt.toMillis();
         else if (typeof b.createdAt === 'string') time = new Date(b.createdAt).getTime();
         else if (typeof b.createdAt === 'number') time = b.createdAt;
      }
    }
    return time;
  };

  const moveUp = async (idx: number) => {
    if (idx === 0) return;
    const current = sortedQueue[idx];
    const prev = sortedQueue[idx - 1];

    try {
      const batch = writeBatch(db);
      
      const targetTimeCurrent = queueIntervals[prev.id].start;
      const durationCurrent = queueIntervals[current.id].end - queueIntervals[current.id].start;
      const targetTimePrev = targetTimeCurrent + durationCurrent + (15 * 60000); // 15 mins buffer

      const baseA = getBaseTime(current);
      const baseB = getBaseTime(prev);
      
      const newDelayA = (targetTimeCurrent - baseA) / 60000;
      const newDelayB = (targetTimePrev - baseB) / 60000;

      batch.update(doc(db, 'bookings', current.id), { delayOffset: newDelayA });
      batch.update(doc(db, 'bookings', prev.id), { delayOffset: newDelayB });

      await batch.commit();
      toast.success('Fila atualizada');
    } catch(err) {
      toast.error('Erro ao reordenar');
    }
  };

  const moveDown = async (idx: number) => {
    if (!sortedQueue || idx === sortedQueue.length - 1) return;
    const current = sortedQueue[idx];
    const next = sortedQueue[idx + 1];

    try {
      const batch = writeBatch(db);

      const targetTimeNext = queueIntervals[current.id].start;
      const durationNext = queueIntervals[next.id].end - queueIntervals[next.id].start;
      const targetTimeCurrent = targetTimeNext + durationNext + (15 * 60000); // 15 mins buffer

      const baseA = getBaseTime(current);
      const baseB = getBaseTime(next);

      const newDelayA = (targetTimeCurrent - baseA) / 60000;
      const newDelayB = (targetTimeNext - baseB) / 60000;

      batch.update(doc(db, 'bookings', current.id), { delayOffset: newDelayA });
      batch.update(doc(db, 'bookings', next.id), { delayOffset: newDelayB });

      await batch.commit();
      toast.success('Fila atualizada');
    } catch(err) {
      toast.error('Erro ao reordenar');
    }
  };

  return (
    <div className="min-h-screen bg-carbon flex flex-col md:flex-row font-sans">
      {/* Mobile Top Bar */}
      <div className="md:hidden bg-carbon-light border-b border-white/10 p-4 flex items-center justify-between z-20 sticky top-0">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-sm font-sans font-bold tracking-widest copper-text uppercase">Club</h2>
            <button
              onClick={() => toggleOpenStatus(isOpen)}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border ${isOpen ? 'bg-green-500/10 border-green-500/30 text-green-500' : 'bg-red-500/10 border-red-500/30 text-red-500'}`}
            >
              <div className={`w-1.5 h-1.5 rounded-full ${isOpen ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]'}`}></div>
              <span className="text-[10px] font-bold uppercase tracking-wider">{isOpen ? 'Aberta' : 'Fechada'}</span>
            </button>
          </div>
          <h1 className="text-xl font-display font-extrabold silver-text-gradient tracking-tight uppercase leading-none">
            Navalha
          </h1>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="text-white bg-white/5 p-2 rounded-lg"
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`${
        isMobileMenuOpen ? 'flex' : 'hidden'
      } md:flex w-full md:w-64 bg-carbon-light border-b md:border-b-0 md:border-r border-white/10 p-4 sm:p-6 flex-col shrink-0 overflow-y-auto fixed md:relative h-[calc(100vh-80px)] md:h-auto z-10 top-[80px] md:top-0`}>
        <div className="hidden md:flex flex-col mb-6 sm:mb-10">
          <div className="flex items-center gap-2 mb-1 sm:mb-2">
            <h2 className="text-base sm:text-lg font-sans font-bold tracking-widest copper-text uppercase">Club</h2>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-extrabold silver-text-gradient tracking-tight uppercase leading-none">
            Navalha
          </h1>
          <p className="text-gold font-sans text-[10px] font-bold uppercase tracking-[0.2em] mt-1">
            • Barbearia •
          </p>

          <div className="mt-4 flex items-center justify-between bg-white/5 border border-white/10 rounded-lg p-2.5">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isOpen ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'}`}></div>
              <span className="text-xs font-bold uppercase tracking-wider text-white/70">
                {isOpen ? 'Aberta' : 'Fechada'}
              </span>
            </div>
            <button
              onClick={() => toggleOpenStatus(isOpen)}
              className={`text-[9px] px-2 py-1 rounded tracking-wider uppercase font-bold transition-colors ${isOpen ? 'bg-white/10 text-white hover:bg-red-500/20 hover:text-red-400' : 'bg-gold/20 text-gold hover:bg-green-500/20 hover:text-green-400'}`}
            >
              {isOpen ? 'Fechar' : 'Abrir'}
            </button>
          </div>
        </div>

        <nav className="flex-1 space-y-2">
          <button onClick={() => { setActiveTab('queue'); setIsMobileMenuOpen(false); }} className={`w-full text-left`}>
            <NavItem icon={<Users />} label="Fila" active={activeTab === 'queue'} />
          </button>
          <button onClick={() => { setActiveTab('billing'); setIsMobileMenuOpen(false); }} className={`w-full text-left`}>
            <NavItem icon={<BarChart3 />} label="Faturamento" active={activeTab === 'billing'} />
          </button>
          <button onClick={() => { setActiveTab('barbers'); setIsMobileMenuOpen(false); }} className={`w-full text-left`}>
            <NavItem icon={<Scissors />} label="Barbeiros" active={activeTab === 'barbers'} />
          </button>
          <button onClick={() => { setActiveTab('services'); setIsMobileMenuOpen(false); }} className={`w-full text-left`}>
            <NavItem icon={<Settings />} label="Serviços" active={activeTab === 'services'} />
          </button>
        </nav>

        <button 
          onClick={() => auth.signOut()}
          className="mt-6 md:mt-auto flex items-center gap-3 p-3 text-white/40 hover:text-red-400 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span>Sair</span>
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 sm:p-6 md:p-10 overflow-y-auto">
        {activeTab === 'queue' && (
          <>
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 sm:mb-10">
              <div>
                <h1 className="text-xl sm:text-2xl font-display font-bold tracking-wide">Gestão da Fila</h1>
                <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 text-white/40 mt-1">
                   <p className="text-[10px] sm:text-xs md:text-sm">Gerencie os atendimentos em tempo real</p>
                   <span className="hidden sm:block w-1 h-1 rounded-full bg-white/20"></span>
                   <div className="flex items-center gap-1 sm:gap-1.5 text-[9px] sm:text-[10px] uppercase tracking-tighter font-bold text-green-500">
                      <MessageSquare className="w-3 h-3" /> WhatsApp Ativo
                   </div>
                </div>
              </div>
              
              <div className="flex gap-4 mt-2 sm:mt-0 w-full sm:w-auto">
                <div className="glass-card px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between sm:justify-start gap-4 bg-white/5 w-full sm:w-auto">
                  <div className="text-left sm:text-right flex flex-col justify-center">
                    <p className="text-[9px] sm:text-[10px] uppercase text-white/40 font-bold tracking-wider">Clientes na Fila</p>
                    <p className="text-lg sm:text-xl font-mono font-bold text-gold leading-none mt-0.5">{queue.length}</p>
                  </div>
                  <div className="p-2 sm:p-2.5 bg-gold/10 rounded-lg shrink-0">
                    <Users className="w-4 h-4 sm:w-5 sm:h-5 text-gold" />
                  </div>
                </div>
                <button
                  onClick={() => setIsAddingBreak(true)}
                  className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 sm:py-3 rounded-xl font-bold transition-colors w-full sm:w-auto"
                >
                  Pausa
                </button>
                <button
                  onClick={() => setIsAddingClient(true)}
                  className="bg-gold hover:bg-gold-dark text-carbon px-4 py-2 sm:py-3 rounded-xl font-bold transition-colors w-full sm:w-auto"
                >
                  Novo Cliente
                </button>
              </div>
            </header>

            {breaks.length > 0 && (
              <div className="mb-6 flex flex-col gap-2">
                {breaks.map(b => (
                  <div key={b.id} className="glass-card px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/5 border-gold/30">
                    <div className="flex items-center gap-3 text-gold/80">
                      <Clock className="w-5 h-5" />
                      <div>
                        <p className="font-bold text-sm">Pausa Agendada</p>
                        <p className="text-xs text-white/50">{new Date(b.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} • Duração de {formatTime(b.duration)}</p>
                      </div>
                    </div>
                    <button onClick={() => removeBreak(b.id)} className="text-white/40 hover:text-red-400 text-xs uppercase font-bold tracking-wider">
                      Cancelar
                    </button>
                  </div>
                ))}
              </div>
            )}

            {isAddingBreak && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <div className="glass-card p-6 sm:p-8 bg-carbon-light border border-white/10 rounded-2xl w-full max-w-sm relative animate-in fade-in zoom-in duration-200">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold font-display silver-text-gradient">
                      Agendar Pausa
                    </h3>
                    <button
                      onClick={() => setIsAddingBreak(false)}
                      className="text-white/40 hover:text-white transition-colors"
                    >
                      <XCircle className="w-6 h-6" />
                    </button>
                  </div>

                  <form onSubmit={handleAddBreak} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs uppercase tracking-widest text-white/50 font-bold">Horário de Início</label>
                      <input
                        type="time"
                        value={newBreakData.timeStr}
                        onChange={(e) => setNewBreakData({ ...newBreakData, timeStr: e.target.value })}
                        className="w-full bg-carbon border border-white/10 rounded-lg p-3 text-white focus:border-gold outline-none transition-colors"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs uppercase tracking-widest text-white/50 font-bold">Duração (Minutos)</label>
                      <input
                        type="number"
                        min="1"
                        value={newBreakData.durationStr}
                        onChange={(e) => setNewBreakData({ ...newBreakData, durationStr: e.target.value })}
                        className="w-full bg-carbon border border-white/10 rounded-lg p-3 text-white focus:border-gold outline-none transition-colors"
                        required
                        placeholder="Ex: 60"
                      />
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setIsAddingBreak(false)}
                        className="px-4 py-2 text-white/60 hover:text-white font-bold transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="bg-gold text-carbon px-6 py-2 rounded-xl font-bold hover:bg-gold-dark transition-colors"
                      >
                        Confirmar
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {isAddingClient && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <div className="glass-card p-6 sm:p-8 bg-carbon-light border border-white/10 rounded-2xl w-full max-w-md relative animate-in fade-in zoom-in duration-200">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold font-display silver-text-gradient">
                      Novo Cliente na Fila
                    </h3>
                    <button
                      onClick={() => setIsAddingClient(false)}
                      className="text-white/40 hover:text-white transition-colors"
                    >
                      <XCircle className="w-6 h-6" />
                    </button>
                  </div>

                  <form onSubmit={handleAddClient} className="space-y-4">
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
                        value={newClientData.whatsapp}
                        onChange={(e) => setNewClientData({ ...newClientData, whatsapp: e.target.value })}
                        className="w-full bg-carbon border border-white/10 rounded-lg p-3 text-white focus:border-gold outline-none transition-colors"
                        placeholder="(00) 00000-0000"
                        required
                      />
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
                      <label className="text-xs uppercase tracking-widest text-white/50 font-bold">Serviços</label>
                      <div className="flex flex-wrap gap-2">
                         {services.map(s => (
                           <button
                             key={s.id}
                             type="button"
                             onClick={() => {
                               setNewClientData(prev => ({
                                 ...prev,
                                 serviceIds: prev.serviceIds.includes(s.name)
                                   ? prev.serviceIds.filter(id => id !== s.name)
                                   : [...prev.serviceIds, s.name]
                               }));
                             }}
                             className={`px-3 py-2 rounded-xl text-sm border font-medium transition-colors ${newClientData.serviceIds.includes(s.name) ? 'bg-gold/20 border-gold/50 text-gold shadow-sm shadow-gold/10' : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10'}`}
                           >
                             {s.name}
                           </button>
                         ))}
                      </div>
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setIsAddingClient(false)}
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
            )}

            {/* Edit Services Modal */}
            {editingServicesBooking && (
              <div className="fixed inset-0 bg-carbon/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-carbon-light border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
                  <button 
                    onClick={() => setEditingServicesBooking(null)}
                    className="absolute top-4 right-4 text-white/40 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center text-gold">
                      <Scissors className="w-5 h-5" />
                    </div>
                    <h2 className="text-xl font-display font-bold">Editar Serviços</h2>
                  </div>

                  <form onSubmit={handleUpdateServices} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs uppercase tracking-widest text-white/50 font-bold">Serviços Selecionados</label>
                      <div className="flex flex-wrap gap-2">
                         {services.map(s => (
                           <button
                             key={s.id}
                             type="button"
                             onClick={() => {
                               setEditingServicesBooking(prev => {
                                 if (!prev) return prev;
                                 return {
                                   ...prev,
                                   services: prev.services.includes(s.name)
                                     ? prev.services.filter(id => id !== s.name)
                                     : [...prev.services, s.name]
                                 };
                               });
                             }}
                             className={`px-3 py-2 rounded-xl text-sm border font-medium transition-colors ${editingServicesBooking.services.includes(s.name) ? 'bg-gold/20 border-gold/50 text-gold shadow-sm shadow-gold/10' : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10'}`}
                           >
                             {s.name}
                           </button>
                         ))}
                      </div>
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setEditingServicesBooking(null)}
                        className="px-6 py-3 rounded-lg font-bold text-white/40 hover:text-white transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="bg-gold text-carbon px-6 py-3 rounded-lg font-bold hover:bg-gold-dark transition-colors"
                      >
                        Atualizar
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Active Booking Column */}
              <div className="lg:col-span-1">
                <h2 className="text-xs uppercase tracking-widest text-white/30 font-bold mb-4">Cadeira Atual</h2>
                {activeBooking ? (
                  <motion.div 
                    layoutId="active"
                    className="glass-card p-6 border-gold/40 bg-gold/5 ring-1 ring-gold/20"
                  >
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-16 h-16 rounded-full bg-gold/20 flex items-center justify-center text-gold text-2xl font-bold">
                        {activeBooking.clientName[0]}
                      </div>
                      <div>
                        <h3 className="text-2xl font-display font-bold">{activeBooking.clientName}</h3>
                        <div className="flex items-center gap-2">
                          <p className="text-gold text-sm font-medium">{activeBooking.serviceId}</p>
                          <button onClick={() => setEditingServicesBooking({id: activeBooking.id, services: activeBooking.serviceId.split(', ')})} className="text-white/40 hover:text-white p-1">
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="flex items-center gap-1 mt-1 text-white/40">
                          <Clock className="w-3 h-3" />
                          <p className="text-xs">
                            {activeBooking.serviceStartTime ? `Restam aprox. ${formatTime(activeRemainingMinutes)}` : "Iniciando..."}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 sm:space-y-3">
                      <button 
                        onClick={() => completeService(activeBooking.id)}
                        className="w-full bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30 py-3 sm:py-4 rounded-xl flex items-center justify-center gap-1.5 sm:gap-2 font-bold text-xs sm:text-base md:text-sm lg:text-base transition-all"
                      >
                        <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                        CONCLUIR ATENDIMENTO
                      </button>
                      <button 
                         onClick={() => removeBooking(activeBooking.id)}
                         className="w-full bg-white/5 hover:bg-white/10 text-white/40 border border-white/10 py-2 sm:py-3 rounded-xl flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm"
                      >
                        <XCircle className="w-4 h-4" />
                        Cancelar
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <div className="glass-card p-12 border-dashed border-white/10 flex flex-col items-center justify-center text-center opacity-50">
                    <Clock className="w-8 h-8 mb-4 text-white/20" />
                    <p className="text-white/40 italic">Nenhum cliente sendo atendido</p>
                    {queue.length > 0 && (
                      <p className="text-xs mt-2">Chame o próximo da fila abaixo</p>
                    )}
                  </div>
                )}
              </div>

              {/* Queue Column */}
              <div className="lg:col-span-2">
                <h2 className="text-xs uppercase tracking-widest text-white/30 font-bold mb-4">Fila de Espera</h2>
                <div className="space-y-3">
                  <AnimatePresence>
                    {(sortedQueue || []).map((item, idx) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="glass-card p-3 sm:p-4 flex flex-col gap-3 sm:gap-4 group transition-all hover:border-gold/30"
                      >
                        {/* Top Line: Number, Name, Service, Type */}
                        <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                          <div className="text-white/20 font-mono text-xs sm:text-sm w-4 sm:w-6 pt-0.5 sm:pt-0 shrink-0">{idx + 1}</div>
                          <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
                            <h4 className="font-bold text-white/90 truncate text-sm sm:text-base max-w-full">{item.clientName}</h4>
                            <span className="flex items-center text-white/50 text-xs sm:text-sm max-w-[150px] sm:max-w-xs">
                              <span className="truncate">{item.serviceId}</span>
                              <button onClick={() => setEditingServicesBooking({id: item.id, services: item.serviceId.split(', ')})} className="text-white/40 hover:text-white shrink-0 ml-1 p-1">
                                <Edit2 className="w-3 h-3" />
                              </button>
                            </span>
                            <span className={`text-[8px] sm:text-[9px] px-1.5 py-0.5 rounded whitespace-nowrap ${item.type === 'scheduled' ? 'bg-gold/20 text-gold' : 'bg-white/10 text-white/40'} uppercase font-bold`}>
                              {item.type === 'walk-in' ? 'PRESENCIAL' : `AGENDADO ${item.scheduledDate ? item.scheduledDate.split('-').reverse().slice(0,2).join('/') + ' ' : ''}${item.scheduledTime || ''}`}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col gap-3 pl-7 sm:pl-10">
                          <div className="flex items-center gap-2 text-[10px] sm:text-xs text-white/40">
                            <span className="truncate">{item.clientWhatsapp}</span>
                            <span className="hidden sm:inline">•</span>
                            <span className="flex items-center gap-1 text-gold/70 font-bold bg-gold/10 px-1.5 py-0.5 rounded whitespace-nowrap">
                              <Clock className="w-3 h-3 shrink-0" />
                              Espera: {formatTime(queueWaitTimes[item.id] || 0)}
                            </span>
                          </div>

                          <div className="flex items-center justify-center sm:justify-start gap-2 sm:gap-3 shrink-0 w-full sm:w-auto mt-2">
                             <div className="flex flex-row bg-white/5 rounded-lg overflow-hidden shrink-0">
                               <button
                                 onClick={() => moveUp(idx)}
                                 disabled={idx === 0}
                                 className="p-1.5 sm:p-2 hover:bg-gold hover:text-carbon disabled:opacity-30 text-white/50 transition-colors"
                               >
                                  <ArrowUp className="w-3 h-3 sm:w-4 sm:h-4" />
                               </button>
                               <button
                                 onClick={() => moveDown(idx)}
                                 disabled={idx === queue.length - 1}
                                 className="p-1.5 sm:p-2 hover:bg-gold hover:text-carbon disabled:opacity-30 text-white/50 transition-colors border-l border-white/5"
                               >
                                  <ArrowDown className="w-3 h-3 sm:w-4 sm:h-4" />
                               </button>
                             </div>
                             <button 
                               onClick={() => removeBooking(item.id)}
                               className="p-1.5 sm:p-2 text-white/20 hover:text-red-400 transition-colors shrink-0"
                               title="Remover da fila"
                             >
                               <XCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                             </button>

                             {item.status === 'checking-in' ? (
                               <button
                                 onClick={() => undoPresent(item.id)}
                                 className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2.5 rounded-lg font-bold text-[10px] sm:text-sm bg-green-500/10 text-green-500 hover:bg-red-500/10 hover:text-red-500 transition-all shrink-0 group"
                               >
                                 <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 group-hover:hidden" />
                                 <XCircle className="w-3 h-3 sm:w-4 sm:h-4 hidden group-hover:block" />
                                 <span className="group-hover:hidden">PRESENTE</span>
                                 <span className="hidden group-hover:block">CANCELAR</span>
                               </button>
                             ) : (
                               <button 
                                 onClick={() => markPresent(item.id)}
                                 className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2.5 rounded-lg font-bold text-[10px] sm:text-sm bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all shrink-0"
                               >
                                 <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                                 PRESENÇA
                               </button>
                             )}

                             <button 
                               onClick={() => startService(item.id)}
                               className="flex items-center gap-1.5 sm:gap-2 whitespace-nowrap bg-gold/10 hover:bg-gold text-gold hover:text-carbon px-3 py-1.5 sm:px-4 sm:py-2.5 rounded-lg font-bold text-[10px] sm:text-sm transition-all shrink-0"
                             >
                               <Play className="w-3 h-3 sm:w-4 sm:h-4 fill-current" />
                               CHAMAR
                             </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  
                  {queue.length === 0 && (
                    <div className="py-20 text-center opacity-30">
                      <Users className="w-12 h-12 mx-auto mb-4" />
                      <p>Sem clientes aguardando</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'billing' && <BillingView />}
        
        {activeTab === 'services' && <ServicesManager />}

        {activeTab === 'barbers' && (
          <div className="py-20 text-center opacity-30">
            <Scissors className="w-12 h-12 mx-auto mb-4" />
            <p>Módulo de gestão de barbeiros em breve</p>
          </div>
        )}
      </main>
    </div>
  );
}

function NavItem({ icon, label, active = false }: { icon: React.ReactNode, label: string, active?: boolean }) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
        active 
          ? 'bg-gold text-carbon font-bold shadow-lg shadow-gold/20' 
          : 'text-white/60 hover:bg-white/5 hover:text-white'
      }`}>
      {icon}
      <span>{label}</span>
    </div>
  );
}
