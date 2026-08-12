import React, { useState, useEffect } from 'react';
import { useQueue } from '../hooks/useQueue';
import { useAuth } from '../hooks/useAuth';
import { useQueueTimers } from '../hooks/useQueueTimers';
import { useBreaks } from '../hooks/useBreaks';
import { useSettings } from '../hooks/useSettings';
import { motion, AnimatePresence } from 'framer-motion';
import { Scissors, Clock, Users, ChevronRight, User, Phone, CheckCircle2, Menu, LogIn, X, Edit2, MapPin, AlertTriangle, Check } from 'lucide-react';
import { BookingStatus, BookingType, Service } from '../types';
import { addDoc, collection, doc, updateDoc, serverTimestamp, query, onSnapshot, deleteDoc, deleteField } from 'firebase/firestore';
import { db } from '../lib/firebase';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { formatTime, getDistanceFromLatLonInMeters, parsePrice, parseServiceString, stringifyServices } from '../utils';

export const getServicePrice = (s: any) => {
  if (!s) return 0;
  const promo = parsePrice(s.promoPrice);
  const reg = parsePrice(s.price);
  return (promo > 0) ? promo : reg;
};

import { useBarbers } from '../hooks/useBarbers';
import { LoadingOverlay } from '../components/LoadingOverlay';

export default function ClientPanel() {
  const { queue, activeBookings, loading } = useQueue();
  const { barbers } = useBarbers();
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [formType, setFormType] = useState<'walk-in' | 'scheduled'>('walk-in');
  const [isProcessing, setIsProcessing] = useState(false);

  const withProcessing = (fn: any) => {
    return async (...args: any[]) => {
      if (args[0] && args[0].preventDefault) args[0].preventDefault();
      if (isProcessing) return;
      setIsProcessing(true);
      try {
        await fn(...args);
      } finally {
        setIsProcessing(false);
      }
    };
  };
  const [showMenu, setShowMenu] = useState(false);
  const [myBookingId, setMyBookingId] = useState(localStorage.getItem('myBookingId'));
  // Receipt state
  const [receipt, setReceipt] = useState<{
    clientName: string;
    services: string;
    total: number;
    fee: number;
    date: string;
    time: string;
  } | null>(null);

  const navigate = useNavigate();
  const [services, setServices] = useState<Service[]>([]);
  const { breaks } = useBreaks();
  const { isOpen, schedulingFee, scheduleHours } = useSettings();
  const { activeRemainingMinutes, queueWaitTimes, sortedQueue, queueIntervals, allOccupiedIntervals } = useQueueTimers(activeBookings, queue, services, breaks, barbers);

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
        const s = services.find(x => x.name.trim().toLowerCase() === sName.trim().toLowerCase() || x.id === sName);
        reqDuration += (s && s.duration !== undefined) ? s.duration : 30;
      });
    } else {
      reqDuration = 30;
    }
    
    const [year, month, day] = formData.scheduledDate.split('-').map(Number);
    // get day of week (0 = Sunday, 1 = Monday ...)
    const jsDate = new Date(year, month - 1, day);
    const dayOfWeek = jsDate.getDay();

    let slots = [];
    if (scheduleHours && scheduleHours[dayOfWeek] && Array.isArray(scheduleHours[dayOfWeek])) {
      slots = [...scheduleHours[dayOfWeek]];
    } else if (scheduleHours && Array.isArray(scheduleHours)) {
      // backward compatibility if it's still a flat array in DB
      slots = [...scheduleHours];
    } else {
      // Default to standard slots if missing
      for (let h = 9; h <= 20; h++) {
          for (let m = 0; m < 60; m += 30) {
              slots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
          }
      }
    }
    
    const occupied = allOccupiedIntervals || [];
    
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
      
      const activeServices = servicesData.filter(s => s.isActive !== false && !s.isProduct);
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
      toast.error('A fila da barbearia está fechada no momento.');
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
      // Set up Web Push subscription
      let subJson = null;
      if (typeof window !== 'undefined' && 'Notification' in window) {
         try {
           let permission = Notification.permission;
           if (permission !== 'granted' && permission !== 'denied') {
             permission = await Notification.requestPermission();
           }
           if (permission === 'granted') {
             const { subscribeToPush } = await import('../services/pushManager');
             const sub = await subscribeToPush();
             if (sub) {
               subJson = JSON.parse(JSON.stringify(sub));
             }
           }
         } catch(pushErr) {
           console.warn('Could not subscribe to push:', pushErr);
         }
      }

      const isScheduled = formType === 'scheduled';
      if (isScheduled && !formData.scheduledTime) {
        toast.error('Por favor, informe o horário do agendamento.');
        return;
      }
      let expectedPrice = formType === 'scheduled' ? schedulingFee : 0;
      formData.serviceIds.forEach(sName => {
        const s = services.find(x => x.name.trim().toLowerCase() === sName.trim().toLowerCase() || x.id === sName);
        if (s) {
          expectedPrice += getServicePrice(s);
        }
      });

      let finalBarberId = formData.barberId;
      const activeBarbers = barbers.filter(b => b.isActive);
      if (finalBarberId === 'any' && activeBarbers.length === 1) {
        finalBarberId = activeBarbers[0].id;
      }

      const docRef = await addDoc(collection(db, 'bookings'), {
        clientName: formData.name,
        clientWhatsapp: formData.whatsapp,
        serviceId: formData.serviceIds.join(', '),
        expectedPrice: expectedPrice,
        barberId: finalBarberId,
        type: isScheduled ? BookingType.SCHEDULED : BookingType.WALK_IN,
        status: BookingStatus.WAITING,
        createdAt: serverTimestamp(),
        ...(isScheduled && { scheduledTime: formData.scheduledTime, scheduledDate: formData.scheduledDate }),
        ...(subJson && { pushSubscription: subJson })
      });
      localStorage.setItem('myBookingId', docRef.id);
      setMyBookingId(docRef.id);
      
      if (isScheduled) {
        setReceipt({
          clientName: formData.name,
          services: formData.serviceIds.join(', '),
          total: expectedPrice,
          fee: schedulingFee,
          date: formData.scheduledDate.split('-').reverse().join('/'),
          time: formData.scheduledTime,
        });
      } else {
        toast.success('Você entrou na fila!');
      }

      setShowJoinForm(false);
      setFormData(prev => ({...prev, name: '', whatsapp: '', scheduledTime: '', scheduledDate: new Date().toISOString().split('T')[0]}));
    } catch (err) {
      toast.error('Erro ao agendar');
    }
  };

  const [editingServices, setEditingServices] = useState<{id: string, serviceId: string} | null>(null);

  const handleUpdateServices = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingServices || editingServices.serviceId.trim() === '') {
      toast.error('Selecione pelo menos um serviço');
      return;
    }
    try {
      let expectedPriceLocal = 0;
      parseServiceString(editingServices.serviceId).forEach(ps => {
         const s = services.find(srv => srv.name.trim().toLowerCase() === ps.name.trim().toLowerCase() || srv.id === ps.name);
         if (s) {
           expectedPriceLocal += getServicePrice(s) * ps.quantity;
         }
      });
      await updateDoc(doc(db, 'bookings', editingServices.id), {
        serviceId: editingServices.serviceId,
        expectedPrice: expectedPriceLocal
      });
      toast.success('Serviços atualizados com sucesso');
      setEditingServices(null);
    } catch (err) {
      console.error("Update error:", err);
      toast.error('Erro ao atualizar serviços');
    }
  };

  const handleCheckIn = async () => {
    if (!myBookingId) return;

    if (!('geolocation' in navigator)) {
      toast.error('Geolocalização não suportada pelo seu navegador.');
      return;
    }

    toast.loading('Verificando localização...', { id: 'location-check' });

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const barbershopLat = -7.403397098886646;
        const barbershopLon = -35.10369207031895;

        const distance = getDistanceFromLatLonInMeters(latitude, longitude, barbershopLat, barbershopLon);
        
        if (distance <= 50) {
          try {
            const bookingRef = doc(db, 'bookings', myBookingId);
            await updateDoc(bookingRef, {
              status: BookingStatus.CHECKING_IN,
              checkInTime: new Date().toISOString()
            });
            toast.dismiss('location-check');
            toast.success('Check-in realizado! Aguarde seu barbeiro.');
          } catch (err) {
            toast.dismiss('location-check');
            toast.error('Erro ao fazer check-in');
          }
        } else {
          toast.dismiss('location-check');
          toast.error(`Você precisa estar na barbearia para marcar presença. (Distância atual: ${Math.round(distance)}m)`);
        }
      },
      (error) => {
        toast.dismiss('location-check');
        if (error.code === error.PERMISSION_DENIED) {
           toast.error('Localização bloqueada. Por favor, libere a permissão nas configurações do seu navegador (clique no cadeado ao lado do endereço) e tente novamente.', { duration: 6000 });
        } else {
           toast.error('Não foi possível obter sua localização.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const handleUndoCheckIn = async () => {
    if (!myBookingId) return;
    try {
      await updateDoc(doc(db, 'bookings', myBookingId), {
        status: BookingStatus.WAITING,
        checkInTime: deleteField()
      });
      toast.success('Presença cancelada.');
    } catch(err) {
      toast.error('Erro ao cancelar presença');
    }
  };

  const [confirmingCancel, setConfirmingCancel] = useState(false);

  const handleWithdraw = async () => {
    if (!myBookingId) return;
    if (!confirmingCancel) {
      setConfirmingCancel(true);
      setTimeout(() => setConfirmingCancel(false), 3000);
      return;
    }
    try {
      await updateDoc(doc(db, 'bookings', myBookingId), {
        status: BookingStatus.CANCELLED
      });
      localStorage.removeItem('myBookingId');
      setMyBookingId(null);
      setConfirmingCancel(false);
      toast.success("Atendimento cancelado.");
    } catch(err) {
      toast.error("Erro ao cancelar o atendimento.");
    }
  };

  const myBooking = sortedQueue?.find(b => b.id === myBookingId) || activeBookings?.find(b => b.id === myBookingId);
  const myPosition = myBooking ? sortedQueue?.findIndex(b => b.id === myBookingId) + 1 : -1;
  const myWaitTime = myBookingId ? (queueWaitTimes[myBookingId] || 0) : 0;

  const getBookingDate = (b: any) => {
    if (b.type === 'scheduled' && b.scheduledDate) {
      return b.scheduledDate;
    }
    let time = Date.now();
    if (b.createdAt) {
      if (typeof (b.createdAt as any).toMillis === 'function') time = (b.createdAt as any).toMillis();
      else if (typeof b.createdAt === 'string') time = new Date(b.createdAt).getTime();
      else if (typeof b.createdAt === 'number') time = b.createdAt;
    }
    const d = new Date(time);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  };

  const formatDateHeader = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-');
    const dateStrObj = new Date(Number(y), Number(m)-1, Number(d));
    
    dateStrObj.setMinutes(dateStrObj.getMinutes() + dateStrObj.getTimezoneOffset());
    
    const today = new Date();
    const todayStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
    
    if (dateStr === todayStr) return 'Hoje';
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tmwStr = tomorrow.getFullYear() + '-' + String(tomorrow.getMonth() + 1).padStart(2, '0') + '-' + String(tomorrow.getDate()).padStart(2, '0');
    if (dateStr === tmwStr) return 'Amanhã';

    let weekday = dateStrObj.toLocaleDateString('pt-BR', { weekday: 'long' }).split('-')[0];
    weekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
    const dateFormatted = dateStrObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

    return `${weekday}, ${dateFormatted}`;
  };

  let lastDateDisplayed = '';

  return (
    <div className="min-h-[100dvh] bg-carbon overflow-x-hidden pt-6 pb-24 px-4 sm:px-6 relative">
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

              <div className="flex-1 space-y-2">
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
                  <div className="flex items-center gap-2 mt-1 mb-1">
                    <p className="text-gold text-sm">{myBooking.serviceId}</p>
                    {myBooking.status !== BookingStatus.IN_SERVICE && (
                      <button onClick={() => setEditingServices({id: myBooking.id, serviceId: myBooking.serviceId})} className="text-white/40 hover:text-white p-1">
                        <Edit2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <p className="text-white/40 text-sm">{myBooking.status === BookingStatus.IN_SERVICE ? 'Você está sendo atendido!' : 'Aguardando sua vez'}</p>
               </div>
               
               <div className="flex flex-col gap-2">
                 {myBooking.status === BookingStatus.WAITING && (
                   <button 
                     onClick={withProcessing(handleCheckIn)}
                     className="w-full bg-gold/10 hover:bg-gold/20 text-gold border border-gold/30 py-2 sm:py-3 rounded-xl font-bold flex items-center justify-center gap-2 text-xs sm:text-sm transition-colors"
                   >
                     <Users className="w-4 h-4 shrink-0" />
                     <span className="truncate">MARCAR PRESENÇA</span>
                   </button>
                 )}

                 {myBooking.status === BookingStatus.CHECKING_IN && (
                   <button 
                     onClick={withProcessing(handleUndoCheckIn)}
                     className="w-full bg-green-500/10 text-green-500 border border-green-500/30 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/30 transition-colors group"
                   >
                     <CheckCircle2 className="w-4 h-4 group-hover:hidden" />
                     <X className="w-4 h-4 hidden group-hover:block" />
                     <span className="group-hover:hidden">PRESENÇA CONFIRMADA</span>
                     <span className="hidden group-hover:block">CANCELAR PRESENÇA</span>
                   </button>
                 )}
                 
                 {myBooking.status !== BookingStatus.IN_SERVICE && (
                   <button 
                     onClick={withProcessing(handleWithdraw)}
                     className={`w-full ${confirmingCancel ? 'bg-red-500 font-bold text-white' : 'bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold'} border border-red-500/30 py-2 rounded-xl flex items-center justify-center transition-colors text-xs`}
                   >
                     {confirmingCancel ? 'TEM CERTEZA? CLIQUE AQUI' : 'CANCELAR ATENDIMENTO'}
                   </button>
                 )}
               </div>

               <div className="mt-4 bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex gap-2.5">
                 <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                 <p className="text-white/60 text-xs leading-relaxed">
                   <span className="text-red-400 font-bold block mb-0.5">Aviso Importante</span>
                   Em caso de atraso e se você não estiver presente na sua vez, você perderá sua posição na fila/agendamento.
                 </p>
               </div>
            </div>
          </section>
        )}

                {/* Active Session */}
        {activeBookings && activeBookings.length > 0 && (
          <section>
            <h2 className="text-xs uppercase tracking-widest text-gold mb-3 font-semibold px-2">Agora Atendendo</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               {activeBookings.map(ab => (
                 <div key={ab.id} className="glass-card p-6 border-gold/30 bg-gold/5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-2">
                       <span className="flex h-2 w-2 relative">
                         <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold opacity-75"></span>
                         <span className="relative inline-flex rounded-full h-2 w-2 bg-gold"></span>
                       </span>
                    </div>
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 rounded-full bg-gold/20 flex items-center justify-center text-gold font-bold text-xl">
                         {ab.clientName[0]}
                       </div>
                       <div className="flex-1 min-w-0">
                         <h3 className="font-display text-xl font-bold truncate">{ab.clientName}</h3>
                         <div className="flex items-center gap-2">
                           <p className="text-white/40 text-sm flex items-center gap-1 truncate">
                             <Clock className="w-3 h-3" /> 
                             {ab.serviceStartTime ? `Restam aprox. ${formatTime(activeRemainingMinutes[ab.id] || 0)}` : "Iniciando..."}
                           </p>
                         </div>
                       </div>
                    </div>
                 </div>
               ))}
            </div>
          </section>
        )}

        {/* Queue List */}
        <section>
          <div className="flex justify-between items-end mb-4 px-2">
            <h2 className="text-xs uppercase tracking-widest text-white/50 font-semibold">Em Fila ({sortedQueue?.length || 0})</h2>
            {!myBooking && (
              <button 
                onClick={() => {
                  setFormType('scheduled');
                  setShowJoinForm(true);
                }}
                className="text-gold text-sm font-bold flex items-center gap-1 hover:underline"
              >
                Agendar Horário <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="space-y-3">
            {!sortedQueue || sortedQueue.length === 0 ? (
              <div className="glass-card p-8 text-center text-white/30 italic">
                A fila está vazia. Seja o primeiro!
              </div>
            ) : (
              sortedQueue.map((booking, index) => {
                const dateStr = getBookingDate(booking);
                const showHeader = dateStr !== lastDateDisplayed;
                lastDateDisplayed = dateStr;

                return (
                  <React.Fragment key={booking.id}>
                    {showHeader && (
                      <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        className="pt-2 pb-1"
                      >
                        <h3 className="text-xs uppercase tracking-widest text-gold font-bold">
                          {formatDateHeader(dateStr)}
                        </h3>
                      </motion.div>
                    )}
                    <motion.div
                      layout
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
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
                             <span className="truncate bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-white/70 font-bold flex items-center gap-1">
                               <Scissors className="w-2.5 h-2.5" />
                               {barbers.find(b => b.id === booking.barberId)?.name || 'Específico'}
                             </span>
                          )}
                          <span className="flex items-center gap-1 text-gold/70 font-bold bg-gold/10 px-1.5 py-0.5 rounded whitespace-nowrap">
                            <Clock className="w-3 h-3 shrink-0" />
                            Espera: {formatTime(queueWaitTimes[booking.id] || 0)}
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
                </React.Fragment>
                );
              })
            )}
          </div>
        </section>
      </main>

      {/* Floating Action / Stats */}
      {!myBooking && (
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
            <div className="w-full max-w-md mx-auto flex flex-col gap-2">
              <div className="bg-red-500/10 border border-red-500/20 text-red-500 font-bold py-2 rounded-xl flex items-center justify-center text-sm">
                Fila presencial fechada hoje.
              </div>
              <button 
                onClick={() => {
                  setFormType('scheduled');
                  setShowJoinForm(true);
                }}
                className="w-full bg-gold hover:bg-gold-light text-carbon font-bold py-4 rounded-xl shadow-xl transition-all"
              >
                AGENDAR HORÁRIO
              </button>
            </div>
          )}
        </div>
      )}

      {/* Join Form Modal */}
      <AnimatePresence>
        {showJoinForm && (
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
                  onClick={() => setShowJoinForm(false)} 
                  className="text-white/40 hover:text-white p-2 -mr-2 -mt-2 transition-colors"
                  aria-label="Fecar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={withProcessing(handleSubmit)} className="space-y-4">
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
                      value={formData.whatsapp}
                      onChange={(e) => setFormData({...formData, whatsapp: e.target.value.replace(/\D/g, '')})}
                      type="tel" 
                      placeholder="DDD + Número" 
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-9 pr-4 focus:outline-none focus:border-gold/50 text-sm"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-white/50 mb-1.5 font-bold">Barbeiro</label>
                    <select 
                      value={formData.barberId}
                      onChange={(e) => setFormData({...formData, barberId: e.target.value})}
                      className="w-full bg-carbon border border-white/10 rounded-xl py-2.5 px-3 focus:outline-none focus:ring-1 focus:ring-gold/50 text-white text-sm"
                    >
                      <option value="any" className="bg-carbon text-white">Qualquer um</option>
                      {barbers.filter(b => b.isActive).map(barber => (
                        <option key={barber.id} value={barber.id} className="bg-carbon text-white">{barber.name}</option>
                      ))}
                    </select>
                  </div>
                  {formType === 'scheduled' && (
                    <div className="flex flex-col sm:flex-row gap-3 w-full overflow-hidden">
                      <div className="w-full sm:flex-1 min-w-0">
                        <label className="block text-[10px] uppercase tracking-widest text-white/50 mb-1.5 font-bold">Data</label>
                        <div className="relative">
                          <input 
                            type="date" 
                            required
                            value={formData.scheduledDate}
                            onChange={(e) => setFormData({...formData, scheduledDate: e.target.value})}
                            className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-3 text-white focus:outline-none focus:border-gold/50 text-sm"
                            style={{ colorScheme: 'dark', minWidth: '0', maxWidth: '100%' }}
                          />
                        </div>
                      </div>
                      <div className="w-full sm:flex-1 min-w-0">
                        <label className="block text-[10px] uppercase tracking-widest text-white/50 mb-1.5 font-bold">Horário</label>
                        <div className="relative">
                          <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                          <select 
                            required
                            value={formData.scheduledTime}
                            onChange={(e) => setFormData({...formData, scheduledTime: e.target.value})}
                            className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-9 pr-4 text-white focus:outline-none focus:border-gold/50 appearance-none text-sm"
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
                           {s.name} - R$ {getServicePrice(s).toFixed(2)}
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

                {formData.serviceIds.length > 0 && (
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4 mt-4 flex flex-col gap-1">
                    <div className="flex justify-between items-center">
                      <span className="text-white/50 text-sm font-bold uppercase tracking-widest">Total Estimado</span>
                      <span className="text-gold font-bold text-xl">
                        R$ {formData.serviceIds.reduce((acc, sName) => {
                          const s = services.find(x => x.name.trim().toLowerCase() === sName.trim().toLowerCase() || x.id === sName);
                          if (!s) return acc;
                          return acc + getServicePrice(s);
                        }, formType === 'scheduled' ? Number(schedulingFee) : 0).toFixed(2)}
                      </span>
                    </div>
                    {formType === 'scheduled' && Number(schedulingFee) > 0 && (
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
                      Em caso de atraso e se você não estiver presente na sua vez, você perderá sua posição na fila/agendamento.
                    </p>
                    {formType === 'scheduled' && Number(schedulingFee) > 0 && (
                      <p className="text-white/70 text-xs mt-2 leading-relaxed font-semibold bg-black/20 p-2 rounded inline-block">
                        Há uma taxa de agendamento de R$ {Number(schedulingFee).toFixed(2)} que será cobrada no momento do serviço.
                      </p>
                    )}
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

      <AnimatePresence>
        {editingServices && (
          <div className="fixed inset-0 bg-carbon/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
             <div className="bg-carbon-light border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
                  <button 
                    onClick={() => setEditingServices(null)}
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

                  <form onSubmit={withProcessing(handleUpdateServices)} className="space-y-4">
                    <div className="space-y-2">
                       <label className="text-xs uppercase tracking-widest text-white/50 font-bold">Serviços Selecionados</label>
                       <div className="flex flex-col gap-2">
                         <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-2 bg-black/20 rounded-lg border border-white/10">
                           {services.map(s => {
                             const parsedNames = parseServiceString(editingServices.serviceId).map(ps => ps.name.trim().toLowerCase());
                             const isSelected = parsedNames.includes(s.name.trim().toLowerCase());
                             return (
                               <button
                                 key={s.id}
                                 type="button"
                                 onClick={() => {
                                   setEditingServices(prev => {
                                     if (!prev) return prev;
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
                       </div>
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setEditingServices(null)}
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
      </AnimatePresence>

      {/* Receipt Modal */}
      <AnimatePresence>
        {receipt && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 flex flex-col justify-center items-center p-4"
          >
            <motion.div 
              initial={{ y: 200, scale: 0.9 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 200, scale: 0.9 }}
              className="bg-carbon-light rounded-2xl p-6 border border-white/10 w-full max-w-sm max-h-[90vh] overflow-y-auto overflow-x-hidden relative"
            >
              <button 
                onClick={() => setReceipt(null)}
                className="absolute top-4 right-4 text-white/40 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="text-center mb-6 mt-2">
                <div className="w-12 h-12 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Check className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-display font-bold text-white">Horário Agendado!</h2>
                <p className="text-white/60 text-sm mt-1">Detalhes da reserva</p>
              </div>

              <div className="bg-carbon border border-white/5 rounded-xl p-4 space-y-3 font-mono text-sm mb-6">
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-white/40">Cliente:</span>
                  <span className="text-white text-right font-medium">{receipt.clientName}</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-white/40">Serviços:</span>
                  <span className="text-white text-right max-w-[150px] truncate">{receipt.services}</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-white/40">Data:</span>
                  <span className="text-gold font-medium">{receipt.date} às {receipt.time}</span>
                </div>
                {receipt.fee > 0 && (
                 <div className="flex justify-between border-b border-white/5 pb-2 items-center">
                    <span className="text-white/60 text-xs">Taxa de Reserva:</span>
                    <span className="text-red-400 font-bold text-xs">R$ {receipt.fee.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2">
                  <span className="text-white/60">Total Estimado*:</span>
                  <span className="text-white font-bold text-lg">R$ {receipt.total.toFixed(2)}</span>
                </div>
              </div>

              <p className="text-[10px] text-white/40 text-center mb-6 leading-relaxed">
                *O valor final pode variar dependendo no local. Uma taxa de agendamento está inclusa (se aplicável), e deverá ser paga junto com o serviço no local. A perda do horário implica no não reembolso de taxas.
              </p>

              <div className="space-y-3">
                <a 
                  href={`https://wa.me/5581992941597?text=${encodeURIComponent(`💇‍♂️ *Novo Agendamento*\n\n*Cliente:* ${receipt.clientName}\n*Serviços:* ${receipt.services}\n*Data:* ${receipt.date} às ${receipt.time}\n*Total Estimado:* R$ ${receipt.total.toFixed(2)}${receipt.fee > 0 ? `\n\n*(Taxa de reserva de R$ ${receipt.fee.toFixed(2)} incluída)*` : ''}\n\nTe vejo lá!`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors"
                  onClick={() => setReceipt(null)}
                >
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.878-.788-1.487-1.761-1.66-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
                  </svg>
                  Compartilhar no WhatsApp
                </a>
                <button 
                  onClick={() => setReceipt(null)}
                  className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-3.5 rounded-xl transition-colors text-sm"
                >
                  Fechar
                </button>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <LoadingOverlay isVisible={isProcessing} />
      {/* Floating WhatsApp Contact Button */}
      <a
        href="https://wa.me/5581992941597"
        target="_blank"
        rel="noreferrer"
        className="fixed bottom-28 sm:bottom-6 right-4 sm:right-6 z-40 bg-[#25D366] hover:bg-[#128C7E] text-white p-3.5 sm:p-4 rounded-full shadow-lg shadow-[#25D366]/20 transition-transform hover:scale-110 flex items-center justify-center animate-bounce-subtle"
        aria-label="Fale conosco no WhatsApp"
        title="Dúvidas? Fale conosco!"
      >
        <svg className="w-6 h-6 sm:w-7 sm:h-7 fill-current" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.878-.788-1.487-1.761-1.66-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
        </svg>
      </a>
    </div>
  );
}
