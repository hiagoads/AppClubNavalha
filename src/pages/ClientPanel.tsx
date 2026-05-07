import React, { useState, useEffect } from 'react';
import { useQueue } from '../hooks/useQueue';
import { useAuth } from '../hooks/useAuth';
import { useQueueTimers } from '../hooks/useQueueTimers';
import { useBreaks } from '../hooks/useBreaks';
import { useSettings } from '../hooks/useSettings';
import { motion, AnimatePresence } from 'framer-motion';
import { Scissors, Clock, Users, ChevronRight, User, Phone, CheckCircle2, Menu, LogIn, X } from 'lucide-react';
import { BookingStatus, BookingType, Service } from '../types';
import { addDoc, collection, doc, updateDoc, serverTimestamp, query, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

export default function ClientPanel() {
  const { queue, activeBooking, loading } = useQueue();
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [formType, setFormType] = useState<'walk-in' | 'scheduled'>('walk-in');
  const [showMenu, setShowMenu] = useState(false);
  const [myBookingId, setMyBookingId] = useState(localStorage.getItem('myBookingId'));
  const navigate = useNavigate();
  const [services, setServices] = useState<Service[]>([]);
  const { breaks } = useBreaks();
  const { isOpen } = useSettings();
  const { activeRemainingMinutes, queueWaitTimes, sortedQueue, queueIntervals } = useQueueTimers(activeBooking, queue, services, breaks);

  const [formData, setFormData] = useState({
    name: '',
    whatsapp: '',
    serviceIds: [] as string[],
    barberId: 'any',
    scheduledTime: '',
    scheduledDate: new Date().toISOString().split('T')[0],
  });

  const getAvailableSlots = () => {
    if (!queueIntervals) return [];
    let reqDuration = 0;
    if (formData.serviceIds.length) {
      formData.serviceIds.forEach(sName => {
        const s = services.find(x => x.name === sName);
        reqDuration += s?.duration || 30;
      });
    } else {
      reqDuration = 30;
    }
    
    const [year, month, day] = formData.scheduledDate.split('-').map(Number);
    const slots = [];
    for (let h = 9; h <= 20; h++) {
        for (let m = 0; m < 60; m += 30) {
            slots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
        }
    }
    
    const occupied = Object.values(queueIntervals);
    if (activeBooking) {
      occupied.push({ start: Date.now(), end: Date.now() + activeRemainingMinutes * 60000 });
    }
    
    return slots.filter(slotStr => {
        const [h, m] = slotStr.split(':').map(Number);
        const slotDate = new Date();
        slotDate.setFullYear(year, month - 1, day);
        slotDate.setHours(h, m, 0, 0);
        
        const slotStart = slotDate.getTime();
        const slotEnd = slotStart + reqDuration * 60000;
        
        if (slotStart <= Date.now() + 10 * 60000) return false;
        
        for (const {start, end} of occupied) {
            if (slotStart < end && slotEnd > start) return false;
        }
        
        for (const b of breaks) {
            const bStart = b.startTime;
            const bEnd = b.startTime + b.duration * 60000;
            if (slotStart < bEnd && slotEnd > bStart) return false;
        }
        
        return true;
    });
  };

  const availableSlots = formType === 'scheduled' ? getAvailableSlots() : [];

  useEffect(() => {
    if (formType === 'scheduled' && formData.scheduledTime && !availableSlots.includes(formData.scheduledTime)) {
        setFormData(prev => ({...prev, scheduledTime: ''}));
    }
  }, [JSON.stringify(availableSlots), formType, formData.scheduledTime]);

  useEffect(() => {
    const q = query(collection(db, 'services'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const servicesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Service[];
      
      const activeServices = servicesData.filter(s => s.isActive !== false);
      setServices(activeServices);
      
      if (activeServices.length > 0 && formData.serviceIds.length === 0) {
        setFormData(prev => ({ ...prev, serviceIds: [activeServices[0].name] }));
      }
    });
    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isScheduled = formType === 'scheduled';

    if (!isOpen && !isScheduled) {
      toast.error('A barbearia está fechada no momento. Mas você ainda pode agendar um horário.');
      return;
    }
    if (!formData.name || !formData.whatsapp) {
      toast.error('Nome e WhatsApp são obrigatórios');
      return;
    }
    if (formData.serviceIds.length === 0) {
      toast.error('Selecione pelo menos um serviço');
      return;
    }
    
    try {
      const isScheduled = formType === 'scheduled';
      if (isScheduled && !formData.scheduledTime) {
        toast.error('Por favor, informe o horário do agendamento.');
        return;
      }
      const docRef = await addDoc(collection(db, 'bookings'), {
        clientName: formData.name,
        clientWhatsapp: formData.whatsapp,
        serviceId: formData.serviceIds.join(', '),
        barberId: formData.barberId,
        type: isScheduled ? BookingType.SCHEDULED : BookingType.WALK_IN,
        status: BookingStatus.WAITING,
        createdAt: serverTimestamp(),
        ...(isScheduled && { scheduledTime: formData.scheduledTime, scheduledDate: formData.scheduledDate }),
      });
      localStorage.setItem('myBookingId', docRef.id);
      setMyBookingId(docRef.id);
      toast.success(isScheduled ? 'Horário agendado!' : 'Você entrou na fila!');
      setShowJoinForm(false);
      setFormData(prev => ({...prev, name: '', whatsapp: '', scheduledTime: '', scheduledDate: new Date().toISOString().split('T')[0]}));
    } catch (err) {
      toast.error('Erro ao agendar');
    }
  };

  const handleCheckIn = async () => {
    if (!myBookingId) return;
    try {
      // simulate location check
      toast.loading('Verificando localização...');
      setTimeout(async () => {
        const bookingRef = doc(db, 'bookings', myBookingId);
        await updateDoc(bookingRef, {
          status: BookingStatus.CHECKING_IN,
          checkInTime: new Date().toISOString()
        });
        toast.dismiss();
        toast.success('Check-in realizado! Aguarde seu barbeiro.');
      }, 1500);
    } catch (err) {
      toast.error('Erro ao fazer check-in');
    }
  };

  const myBooking = sortedQueue?.find(b => b.id === myBookingId) || 
                  (activeBooking?.id === myBookingId ? activeBooking : null);
  const myPosition = myBooking ? sortedQueue?.findIndex(b => b.id === myBookingId) + 1 : -1;

  return (
    <div className="min-h-screen bg-carbon overflow-x-hidden pt-6 pb-24 px-4 sm:px-6 relative">
      <button 
        onClick={() => setShowMenu(true)}
        className="absolute top-6 left-6 p-2 text-white/70 hover:text-white z-50 cursor-pointer"
      >
        <Menu className="w-8 h-8" />
      </button>

      <header className="mb-6 sm:mb-10 text-center relative z-10">
        <motion.div
           initial={{ opacity: 0, scale: 0.8 }}
           animate={{ opacity: 1, scale: 1 }}
           className="flex flex-col items-center justify-center space-y-1 mt-6 sm:mt-0"
        >
          <h2 className="text-xl sm:text-2xl font-sans font-bold tracking-widest copper-text uppercase">
            Club
          </h2>
          <h1 className="text-4xl sm:text-6xl font-display font-extrabold silver-text-gradient tracking-tight uppercase leading-none">
            Navalha
          </h1>
          <p className="text-gold font-sans text-[10px] sm:text-sm font-bold uppercase tracking-[0.2em] mt-1 sm:mt-2">
            • Barbearia •
          </p>
        </motion.div>
      </header>

      {/* Hamburger Menu Overlay */}
      <AnimatePresence>
        {showMenu && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMenu(false)}
              className="fixed inset-0 bg-black/80 z-40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              className="fixed top-0 left-0 bottom-0 w-64 bg-carbon-light border-r border-white/10 z-50 p-6 flex flex-col"
            >
              <div className="flex justify-between items-center mb-10">
                <div className="flex items-center gap-2">
                  <Scissors className="w-6 h-6 text-gold" />
                  <span className="font-display font-bold gold-text-gradient text-xl">Menu</span>
                </div>
                <button onClick={() => setShowMenu(false)} className="text-white/50 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1">
                <button 
                  onClick={() => navigate('/admin')}
                  className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-xl transition-colors text-left"
                >
                  <span className="font-bold text-white/90">Painel do Barbeiro</span>
                  <LogIn className="w-5 h-5 text-gold" />
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <main className="max-w-md mx-auto space-y-8">
        {/* My Status Card */}
        {myBooking && (
          <section>
            <h2 className="text-xs uppercase tracking-widest text-gold mb-3 font-semibold px-2">Sua Posição</h2>
            <div className="glass-card p-6 border-gold/50 bg-gold/5 relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4">
                  <div className="text-4xl font-display font-bold text-gold">#{myPosition > 0 ? myPosition : '0'}</div>
               </div>
               <div className="mb-4">
                  <h3 className="text-xl font-bold">{myBooking.clientName}</h3>
                  <p className="text-white/40 text-sm">{myBooking.status === BookingStatus.IN_SERVICE ? 'Você está sendo atendido!' : 'Aguardando sua vez'}</p>
               </div>
               
               {myBooking.status === BookingStatus.WAITING && (
                 <button 
                   onClick={handleCheckIn}
                   className="w-full bg-gold/10 hover:bg-gold/20 text-gold border border-gold/30 py-2 sm:py-3 rounded-xl font-bold flex items-center justify-center gap-2 text-xs sm:text-sm"
                 >
                   <Users className="w-4 h-4 shrink-0" />
                   <span className="truncate">MARCAR PRESENÇA</span>
                 </button>
               )}

               {myBooking.status === BookingStatus.CHECKING_IN && (
                 <div className="w-full bg-green-500/10 text-green-500 border border-green-500/30 py-3 rounded-xl font-bold flex items-center justify-center gap-2">
                   <CheckCircle2 className="w-4 h-4" />
                   PRESENÇA CONFIRMADA
                 </div>
               )}
            </div>
          </section>
        )}

        {/* Active Session */}
        {activeBooking && (
          <section>
            <h2 className="text-xs uppercase tracking-widest text-gold mb-3 font-semibold px-2">Agora Atendendo</h2>
            <div className="glass-card p-6 border-gold/30 bg-gold/5 relative overflow-hidden">
               <div className="absolute top-0 right-0 p-2">
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-gold"></span>
                  </span>
               </div>
               <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gold/20 flex items-center justify-center text-gold font-bold text-xl">
                    {activeBooking.clientName[0]}
                  </div>
                  <div>
                    <h3 className="font-display text-xl font-bold">{activeBooking.clientName}</h3>
                    <p className="text-white/40 text-sm flex items-center gap-1">
                      <Clock className="w-3 h-3" /> 
                      {activeBooking.serviceStartTime ? `Restam aprox. ${activeRemainingMinutes} min` : "Iniciando..."}
                    </p>
                  </div>
               </div>
            </div>
          </section>
        )}

        {/* Queue List */}
        <section>
          <div className="flex justify-between items-end mb-4 px-2">
            <h2 className="text-xs uppercase tracking-widest text-white/50 font-semibold">Em Fila ({sortedQueue?.length || 0})</h2>
            <button 
              onClick={() => {
                setFormType('scheduled');
                setShowJoinForm(true);
              }}
              className="text-gold text-sm font-bold flex items-center gap-1 hover:underline"
            >
              Agendar Horário <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3">
            {!sortedQueue || sortedQueue.length === 0 ? (
              <div className="glass-card p-8 text-center text-white/30 italic">
                A fila está vazia. Seja o primeiro!
              </div>
            ) : (
              sortedQueue.map((booking, index) => (
                <motion.div
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  key={booking.id}
                  className="glass-card p-4 sm:p-5 flex flex-col gap-3 group"
                >
                  <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                    <span className="text-white/20 font-mono text-sm sm:text-base w-5 sm:w-6 pt-0.5 sm:pt-0 shrink-0 text-center">
                      {index + 1}
                    </span>
                    <div className="flex flex-col flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <span className="font-bold text-white/90 truncate text-sm sm:text-base max-w-full">
                           {booking.clientName}
                        </span>
                        <span className="text-white/50 text-xs sm:text-sm truncate">
                          {booking.serviceId}
                        </span>
                        <span className={`text-[8px] sm:text-[9px] px-1.5 py-0.5 rounded whitespace-nowrap uppercase font-bold ${booking.type === BookingType.SCHEDULED ? 'bg-gold/20 text-gold border border-gold/30' : 'bg-white/10 text-white/40'}`}>
                          {booking.type === BookingType.WALK_IN ? 'PRESENCIAL' : `AGENDADO ${booking.scheduledDate ? booking.scheduledDate.split('-').reverse().slice(0,2).join('/') + ' ' : ''}${booking.scheduledTime || ''}`}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2 text-[10px] sm:text-xs text-white/40">
                          {booking.barberId !== 'any' && (
                             <span className="truncate">VIP</span>
                          )}
                          <span className="flex items-center gap-1 text-gold/70 font-bold bg-gold/10 px-1.5 py-0.5 rounded whitespace-nowrap">
                            <Clock className="w-3 h-3 shrink-0" />
                            Espera: {queueWaitTimes[booking.id] || 0} min
                          </span>
                        </div>
                        {booking.status === BookingStatus.CHECKING_IN && (
                          <div className="flex items-center gap-1 text-green-500 text-[10px] uppercase font-bold">
                             <CheckCircle2 className="w-3 h-3" />
                             Presente
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </section>
      </main>

      {/* Floating Action / Stats */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-carbon via-carbon to-transparent">
        {isOpen ? (
          <button 
            onClick={() => {
              setFormType('walk-in');
              setShowJoinForm(true);
            }}
            className="w-full max-w-md mx-auto gold-gradient text-carbon font-bold py-4 rounded-xl shadow-xl shadow-gold/20 flex items-center justify-center gap-2"
          >
            <Scissors className="w-5 h-5" />
            ENTRAR NA FILA AGORA
          </button>
        ) : (
          <div className="w-full max-w-md mx-auto bg-red-500/10 border border-red-500/20 text-red-500 font-bold py-4 rounded-xl flex items-center justify-center gap-2">
            BARBEARIA FECHADA
          </div>
        )}
      </div>

      {/* Join Form Modal */}
      <AnimatePresence>
        {showJoinForm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 flex flex-col justify-end sm:justify-center items-center p-4 sm:p-4"
          >
            <motion.div 
              initial={{ y: 200 }}
              animate={{ y: 0 }}
              exit={{ y: 200 }}
              className="bg-carbon-light flex-shrink-0 w-full max-w-[calc(100vw-2rem)] sm:max-w-md rounded-t-3xl sm:rounded-3xl p-4 sm:p-8 border border-white/10 max-h-[90vh] overflow-y-auto overflow-x-hidden"
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-display font-bold gold-text-gradient">
                    {formType === 'scheduled' ? 'Agendar' : 'Entrar na Fila'}
                  </h2>
                  <p className="text-white/40 text-sm">Preencha seus dados para entrar.</p>
                </div>
                <button 
                  onClick={() => setShowJoinForm(false)} 
                  className="text-white/40 hover:text-white p-2 -mr-2 -mt-2 transition-colors"
                  aria-label="Fecar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-xs uppercase tracking-widest text-white/50 mb-2 font-bold">Nome Completo</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input 
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      type="text" 
                      placeholder="Ex: João Silva" 
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-gold/50 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-widest text-white/50 mb-2 font-bold">WhatsApp</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input 
                      required
                      value={formData.whatsapp}
                      onChange={(e) => setFormData({...formData, whatsapp: e.target.value.replace(/\D/g, '')})}
                      type="tel" 
                      placeholder="DDD + Número" 
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-gold/50 text-sm"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  <div>
                    <label className="block text-xs uppercase tracking-widest text-white/50 mb-2 font-bold">Barbeiro</label>
                    <select 
                      value={formData.barberId}
                      onChange={(e) => setFormData({...formData, barberId: e.target.value})}
                      className="w-full bg-carbon border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:ring-1 focus:ring-gold/50 text-white"
                    >
                      <option value="any" className="bg-carbon text-white">Qualquer um</option>
                    </select>
                  </div>
                  {formType === 'scheduled' && (
                    <div className="flex flex-col sm:flex-row gap-4 w-full overflow-hidden">
                      <div className="w-full sm:flex-1 min-w-0">
                        <label className="block text-xs uppercase tracking-widest text-white/50 mb-2 font-bold">Data</label>
                        <div className="relative">
                          <input 
                            type="date" 
                            required
                            value={formData.scheduledDate}
                            onChange={(e) => setFormData({...formData, scheduledDate: e.target.value})}
                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-3 text-white focus:outline-none focus:border-gold/50 text-sm"
                            style={{ colorScheme: 'dark', minWidth: '0', maxWidth: '100%' }}
                          />
                        </div>
                      </div>
                      <div className="w-full sm:flex-1 min-w-0">
                        <label className="block text-xs uppercase tracking-widest text-white/50 mb-2 font-bold">Horário</label>
                        <div className="relative">
                          <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                          <select 
                            required
                            value={formData.scheduledTime}
                            onChange={(e) => setFormData({...formData, scheduledTime: e.target.value})}
                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-gold/50 appearance-none text-sm"
                            style={{ colorScheme: 'dark', minWidth: '0', maxWidth: '100%' }}
                          >
                            <option value="" disabled>Selecione um horário</option>
                            {availableSlots.map(slot => (
                               <option key={slot} value={slot} className="bg-carbon text-white">
                                  {slot}
                               </option>
                            ))}
                            {availableSlots.length === 0 && (
                               <option value="" disabled className="bg-carbon text-white text-red-400">
                                  Nenhum horário disponível
                               </option>
                            )}
                          </select>
                        </div>
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="block text-xs uppercase tracking-widest text-white/50 mb-2 font-bold">Serviços</label>
                    <div className="flex flex-wrap gap-2">
                      {services.length > 0 ? services.map(s => (
                         <button
                           key={s.id}
                           type="button"
                           onClick={() => {
                             setFormData(prev => ({
                               ...prev,
                               serviceIds: prev.serviceIds.includes(s.name)
                                 ? prev.serviceIds.filter(id => id !== s.name)
                                 : [...prev.serviceIds, s.name]
                             }));
                           }}
                           className={`px-3 py-2 rounded-xl text-sm border font-medium transition-colors ${formData.serviceIds.includes(s.name) ? 'bg-gold/20 border-gold/50 text-gold shadow-sm shadow-gold/10' : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10'}`}
                         >
                           {s.name} - R$ {s.price?.toFixed(2)}
                         </button>
                      )) : (
                        ['Corte Padrão', 'Barba', 'Corte + Barba'].map(s => (
                           <button
                             key={s}
                             type="button"
                             onClick={() => {
                               setFormData(prev => ({
                                 ...prev,
                                 serviceIds: prev.serviceIds.includes(s)
                                   ? prev.serviceIds.filter(id => id !== s)
                                   : [...prev.serviceIds, s]
                               }));
                             }}
                             className={`px-3 py-2 rounded-xl text-sm border font-medium transition-colors ${formData.serviceIds.includes(s) ? 'bg-gold/20 border-gold/50 text-gold shadow-sm shadow-gold/10' : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10'}`}
                           >
                             {s}
                           </button>
                         ))
                      )}
                    </div>
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full gold-gradient text-carbon font-bold py-4 rounded-xl shadow-lg mt-4"
                >
                  {formType === 'scheduled' ? 'AGENDAR HORÁRIO' : 'ENTRAR NA FILA'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
