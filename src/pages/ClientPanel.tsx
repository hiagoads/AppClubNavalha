import React, { useState, useEffect } from 'react';
import { useQueue } from '../hooks/useQueue';
import { useAuth } from '../hooks/useAuth';
import { useQueueTimers } from '../hooks/useQueueTimers';
import { useBreaks } from '../hooks/useBreaks';
import { useSettings } from '../hooks/useSettings';
import { motion, AnimatePresence } from 'framer-motion';
import { Scissors, Clock, Users, ChevronRight, User, Phone, CheckCircle2, Menu, LogIn, X, Edit2, MapPin, AlertTriangle, Check, Coffee, Sparkles, CalendarClock } from 'lucide-react';
import { BookingStatus, BookingType, Service } from '../types';
import { getDoc, addDoc, collection, doc, updateDoc, serverTimestamp, query, onSnapshot, deleteDoc, deleteField } from 'firebase/firestore';
import { db } from '../lib/firebase';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { formatTime, getDistanceFromLatLonInMeters, parsePrice, parseServiceString, stringifyServices, parsePhone } from '../utils';

export const getServicePrice = (s: any) => {
  if (!s) return 0;
  const promo = parsePrice(s.promoPrice);
  const reg = parsePrice(s.price);
  return (promo > 0) ? promo : reg;
};

import { useBarbers } from '../hooks/useBarbers';
import { LoadingOverlay } from '../components/LoadingOverlay';
import { ClientMenuModal } from '../components/modals/ClientMenuModal';
import { JoinQueueModal } from '../components/modals/JoinQueueModal';
import { EditClientServicesModal } from '../components/modals/EditClientServicesModal';
import { ReceiptModal } from '../components/modals/ReceiptModal';
import { ClientProfileModal } from '../components/modals/ClientProfileModal';
import { getLevelTier, getClientTier } from '../utils/tierSystem';
import { useGamificationSettings } from '../hooks/useGamificationSettings';
import { EditClientProfileModal } from '../components/modals/EditClientProfileModal';
import { RankingModal } from '../components/modals/RankingModal';


export default function ClientPanel() {
  const { clientProfile, user } = useAuth();
  const { queue, activeBookings, loading } = useQueue();
  const { thresholds } = useGamificationSettings();
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
  const [showRewards, setShowRewards] = useState(false);
  const [defaultAvatar, setDefaultAvatar] = useState('');
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showRanking, setShowRanking] = useState(false);
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
  const { breaks, activeBreaks, upcomingBreaks, afterCurrentBreaks, now: clockNow } = useBreaks();
  const { isOpen, schedulingFee, scheduleHours } = useSettings();
  const { activeRemainingMinutes, queueWaitTimes, sortedQueue, queueIntervals, allOccupiedIntervals } = useQueueTimers(activeBookings, queue, services, breaks, barbers);

  
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const snap = await getDoc(doc(db, 'settings', 'gamification'));
        if (snap.exists()) {
          setDefaultAvatar(snap.data().defaultAvatarUrl || '');
        }
      } catch (e: any) {
        if (e.code !== 'permission-denied') console.error(e);
      }
    };
    loadSettings();
  }, []);

  useEffect(() => {
    if (clientProfile) {
      setFormData(prev => ({ ...prev, name: clientProfile.username, whatsapp: parsePhone(clientProfile.whatsapp || '') }));
    }
  }, [clientProfile]);

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
        clientWhatsapp: parsePhone(formData.whatsapp),
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
      if (err.code !== "permission-denied") console.error("Update error:", err);
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
      <div className="absolute top-6 left-0 right-0 px-4 sm:px-6 flex justify-between items-center z-50 pointer-events-none">
        <button 
          onClick={() => setShowMenu(true)}
          className="p-2 -ml-2 text-white/70 hover:text-white cursor-pointer pointer-events-auto"
        >
          <Menu className="w-8 h-8" />
        </button>

        {/* Login / Sign-up Button for unauthenticated users */}
        {(!user || !clientProfile) && (
          <button
            onClick={() => navigate('/clube')}
            className="px-4 py-2 bg-gradient-to-r from-gold/20 to-gold/5 text-gold border border-gold/30 rounded-full font-bold text-xs sm:text-sm hover:bg-gold/20 transition-all flex items-center gap-1.5 shadow-lg shadow-gold/5 pointer-events-auto"
          >
            <LogIn className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Fazer Login</span>
          </button>
        )}
      </div>

      <header className="mb-6 sm:mb-10 text-center relative z-10">
        <motion.div
           initial={{ opacity: 0, scale: 0.8 }}
           animate={{ opacity: 1, scale: 1 }}
           className="flex flex-col items-center justify-center space-y-1 mt-6 sm:mt-0"
        >
          <img src="/logo192.png" alt="Club Navalha Barbearia" className="w-32 h-32 sm:w-40 sm:h-40 object-contain drop-shadow-2xl" />
        </motion.div>
      </header>

      {/* Hamburger Menu Overlay */}
      <AnimatePresence>
        <ClientMenuModal isOpen={showMenu} onClose={() => setShowMenu(false)} onNavigateToAdmin={() => navigate('/admin')} onNavigateToAuth={() => navigate('/clube')} onOpenProfile={() => setShowRewards(true)} onOpenEditProfile={() => setShowEditProfile(true)} onOpenRanking={() => setShowRanking(true)} clientProfile={clientProfile} />
      </AnimatePresence>

      <AnimatePresence>
        <ClientProfileModal isOpen={showRewards} onClose={() => setShowRewards(false)} clientProfile={clientProfile} defaultAvatar={defaultAvatar} />
      </AnimatePresence>
      <AnimatePresence>
        <EditClientProfileModal isOpen={showEditProfile} onClose={() => setShowEditProfile(false)} clientProfile={clientProfile} />
      </AnimatePresence>
      <AnimatePresence>
        <RankingModal isOpen={showRanking} onClose={() => setShowRanking(false)} currentUserId={clientProfile?.id} />
      </AnimatePresence>


      <main className="max-w-md mx-auto space-y-8">
        {/* Player Card (Gamification) */}
        {clientProfile && user && (() => {
          const tier = getClientTier(clientProfile, thresholds);
          return (
          <div 
            onClick={() => setShowRewards(true)}
            className="relative p-[2px] rounded-2xl bg-gradient-to-b from-white/10 to-white/5 shadow-lg overflow-hidden cursor-pointer transition-transform hover:scale-[1.02] active:scale-95 mx-2 sm:mx-0"
          >
            {/* Dynamic border gradient based on tier for outer card? Just use white/10 is fine, or we can use tier.glowBg */}
            <div className="rounded-[14px] bg-[#1a1a1a] p-4 sm:p-5 flex items-center gap-4 sm:gap-5 relative z-10 bg-noise">
              {/* Avatar Frame */}
              <div className="shrink-0 relative w-[72px] h-[72px] flex items-center justify-center">
                <div className="relative w-[64px] h-[64px] rounded-full flex items-center justify-center bg-carbon overflow-hidden z-10">
                   {clientProfile.avatarUrl || defaultAvatar ? (
                     <img src={clientProfile.avatarUrl || defaultAvatar} alt="Avatar" className="w-full h-full object-cover" />
                   ) : (
                     <User className={`w-8 h-8 ${tier.colorText} opacity-80`} />
                   )}
                </div>
                {tier.frameUrl && (
                  <img 
                    src={tier.frameUrl} 
                    alt={tier.name} 
                    className="absolute inset-0 w-[140%] h-[140%] max-w-none max-h-none left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none object-contain" 
                  />
                )}
              </div>
              
              {/* Player Info */}
              <div className="flex-1 min-w-0">
                <p className={`text-[10px] font-bold ${tier.colorText} tracking-widest uppercase mb-0.5`}>{tier.name}</p>
                <h3 className="text-lg sm:text-xl font-display font-bold text-white truncate mb-2 leading-tight">
                  {clientProfile.username}
                </h3>
                
                <div className="flex items-center justify-between mb-1.5 border-t border-white/10 pt-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-white/70 uppercase tracking-widest">Nível:</span>
                    <span className={`text-sm font-bold ${tier.colorText}`}>{tier.level}</span>
                  </div>
                  <div className="flex gap-1">
                    <div className={`w-3 h-1.5 ${tier.bgColor} -skew-x-12`}></div>
                    <div className={`w-3 h-1.5 ${tier.bgColor} -skew-x-12 opacity-80`}></div>
                    <div className="w-3 h-1.5 bg-white/10 -skew-x-12"></div>
                  </div>
                </div>
                
                {/* Progress bar */}
                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden mb-2 relative">
                  <div 
                    className={`absolute top-0 left-0 h-full ${tier.bgColor} rounded-full transition-all duration-1000 `} 
                    style={{ width: `${tier.progressPercentage}%` }}
                  />
                </div>
                
                <div className="flex items-center mt-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-white/70 uppercase tracking-widest">Pontos:</span>
                    <span className={`text-sm font-bold text-gold`}>{clientProfile.points.toLocaleString('pt-BR')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )})()}

        {/* Active Breaks Card (Intervalo / Pausa em tempo real) */}
        {activeBreaks && activeBreaks.length > 0 && (
          <section className="animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex items-center justify-between px-2 mb-2">
              <h2 className="text-xs uppercase tracking-widest text-amber-400 font-bold flex items-center gap-1.5">
                <Coffee className="w-3.5 h-3.5 animate-bounce" /> Intervalo / Pausa em Andamento
              </h2>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400"></span>
              </span>
            </div>

            <div className="space-y-3">
              {activeBreaks.map(b => {
                const start = b.startTime || clockNow;
                const end = start + (b.duration || 0) * 60000;
                const totalDurationMs = Math.max(1, (b.duration || 0) * 60000);
                const elapsedMs = Math.max(0, clockNow - start);
                const remainingMs = Math.max(0, end - clockNow);
                const remainingSecs = Math.ceil(remainingMs / 1000);
                const mins = Math.floor(remainingSecs / 60);
                const secs = remainingSecs % 60;
                const progressPercent = Math.min(100, Math.max(0, (elapsedMs / totalDurationMs) * 100));
                const barberObj = barbers.find(barber => barber.id === b.barberId);
                const barberLabel = barberObj ? `Barbeiro: ${barberObj.name}` : 'Toda a Barbearia';

                return (
                  <div 
                    key={b.id}
                    className="glass-card p-5 sm:p-6 border-amber-500/40 bg-gradient-to-br from-amber-500/10 via-[#1c1c1c] to-[#141414] relative overflow-hidden shadow-xl rounded-2xl"
                  >
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
                          <Coffee className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-display text-lg sm:text-xl font-bold text-white leading-tight">
                              {b.reason || 'Pausa / Intervalo'}
                            </h3>
                            <span className="text-[10px] uppercase font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full">
                              {barberLabel}
                            </span>
                          </div>
                          <p className="text-xs text-white/60 mt-0.5">
                            Previsão de retorno às <strong className="text-amber-300 font-mono font-bold">{new Date(end).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</strong>
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-[10px] uppercase tracking-wider text-white/40 font-bold">Tempo Restante</p>
                        <p className="text-xl sm:text-2xl font-mono font-black text-amber-400 leading-tight">
                          {mins > 0 ? `${mins}m ${String(secs).padStart(2, '0')}s` : `${secs}s`}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden relative">
                        <div 
                          className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-300 rounded-full transition-all duration-1000"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-white/40 font-mono">
                        <span>Iniciado às {new Date(start).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        <span>Duração: {b.duration} min</span>
                      </div>
                    </div>

                    <p className="text-[11px] text-white/50 mt-3 pt-3 border-t border-white/10 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>A fila e os tempos de espera foram atualizados com a pausa. Retornaremos em instantes!</span>
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Pending After Current Break Alert */}
        {afterCurrentBreaks && afterCurrentBreaks.length > 0 && activeBreaks.length === 0 && (
          <section className="animate-in fade-in duration-200">
            {afterCurrentBreaks.map(b => (
              <div key={b.id} className="glass-card p-3.5 border-amber-500/30 bg-amber-500/10 rounded-xl flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 shrink-0">
                  <Coffee className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white/90 font-bold">
                    Pausa programada: {b.reason || 'Intervalo'} ({b.duration} min)
                  </p>
                  <p className="text-[11px] text-white/50">
                    Iniciará logo após a conclusão do atendimento que está em andamento agora.
                  </p>
                </div>
              </div>
            ))}
          </section>
        )}

        {/* Upcoming Scheduled Breaks */}
        {upcomingBreaks && upcomingBreaks.length > 0 && activeBreaks.length === 0 && (
          <section className="animate-in fade-in duration-200">
            {upcomingBreaks.map(b => {
              const start = b.startTime || 0;
              const barberObj = barbers.find(barber => barber.id === b.barberId);
              const barberLabel = barberObj ? `(${barberObj.name})` : '';

              return (
                <div key={b.id} className="glass-card p-3 border-blue-500/30 bg-blue-500/5 rounded-xl flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 shrink-0">
                    <CalendarClock className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white/90 font-bold">
                      Intervalo programado às {new Date(start).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} {barberLabel}
                    </p>
                    <p className="text-[11px] text-white/50">
                      Duração de {b.duration} min • A fila já ajustou a estimativa para este horário.
                    </p>
                  </div>
                </div>
              );
            })}
          </section>
        )}

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
        <JoinQueueModal
          isOpen={showJoinForm}
          onClose={() => setShowJoinForm(false)}
          formType={formType}
          setFormType={setFormType}
          formData={formData}
          setFormData={setFormData}
          services={services}
          onSubmit={withProcessing(handleSubmit)}
          schedulingFee={schedulingFee}
        />
      </AnimatePresence>


      
      <AnimatePresence>
        <EditClientServicesModal
          isOpen={!!editingServices}
          editingServices={editingServices}
          setEditingServices={setEditingServices}
          services={services}
          onSubmit={withProcessing(handleUpdateServices)}
        />
      </AnimatePresence>


      {/* Receipt Modal */}
      
      <AnimatePresence>
        <ReceiptModal
          isOpen={!!receipt}
          receipt={receipt}
          onClose={() => setReceipt(null)}
        />
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
