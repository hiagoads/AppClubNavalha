import { useQueue } from '../hooks/useQueue';
import { useNotifications } from '../hooks/useNotifications';
import { useQueueTimers } from '../hooks/useQueueTimers';
import { useServices } from '../hooks/useServices';
import { useBreaks } from '../hooks/useBreaks';
import { useSettings } from '../hooks/useSettings';
import { db, auth } from '../lib/firebase';
import { doc, getDoc, updateDoc, deleteDoc, serverTimestamp, addDoc, collection, setDoc, writeBatch, deleteField, query, where, getDocs, increment } from 'firebase/firestore';
import { BookingStatus, Booking } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import React, { useState } from 'react';
import BillingView from '../components/BillingView';
import { BarbersManager } from '../components/BarbersManager';
import ServicesManager from '../components/ServicesManager';
import { GlobalSettings } from '../components/GlobalSettings';
import QueueLogView from '../components/QueueLogView';
import { formatTime, parsePrice, parseServiceString, stringifyServices, parsePhone } from '../utils';
import { checkAndSyncClientRankBonuses } from '../utils/bonusSystem';
import { getClientTier, DEFAULT_THRESHOLDS } from '../utils/tierSystem';
import { useGamificationSettings } from '../hooks/useGamificationSettings';
import { 
  Play, 
  Pause,
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
  Edit2,
  History,
  AlertTriangle,
  ArrowLeft,
  Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';

import { useHistory } from '../hooks/useHistory';
import { HistoryView } from '../components/HistoryView';
import { GamificationManager } from '../components/GamificationManager';
import { VipRoomManager } from '../components/VipRoomManager';
import { VipQueueQuickBar } from '../components/vip/VipQueueQuickBar';
import { AdminSidebar } from '../components/AdminSidebar';
import { AddClientModal } from '../components/modals/AddClientModal';
import { AddBreakModal } from '../components/modals/AddBreakModal';
import { CallingBookingModal } from '../components/modals/CallingBookingModal';
import { CancelingBookingModal } from '../components/modals/CancelingBookingModal';
import { CompletingBookingModal } from '../components/modals/CompletingBookingModal';
import { EditServicesModal } from '../components/modals/EditServicesModal';

import { useBarbers } from '../hooks/useBarbers';
import { useProcessing } from '../hooks/useProcessing';
import { LoadingOverlay } from '../components/LoadingOverlay';

export default function AdminDashboard() {
  const { queue, activeBookings, loading } = useQueue();
  const { services } = useServices();
  const { barbers } = useBarbers();
  const { breaks } = useBreaks();
  const { isOpen, toggleOpenStatus, schedulingFee } = useSettings();
  const { thresholds } = useGamificationSettings();
  const queueTimers = useQueueTimers(activeBookings, queue, services, breaks, barbers);
  const { isProcessing, withProcessing } = useProcessing();
  const { activeRemainingMinutes, queueWaitTimes, queueIntervals, sortedQueue, exactStartTimes } = queueTimers;
  useNotifications(queue, activeBookings[0] || null);

  const getServicePrice = (s: any) => {
    return parsePrice(s.promoPrice) > 0 ? parsePrice(s.promoPrice) : parsePrice(s.price);
  };
  const [activeTab, setActiveTab] = useState<'queue' | 'billing' | 'services' | 'barbers' | 'history' | 'settings' | 'log' | 'gamification' | 'vip_room'>('queue');
  const [callingBooking, setCallingBooking] = useState<any>(null);
  const [cancelingBooking, setCancelingBooking] = useState<any>(null);
  const [completingBooking, setCompletingBooking] = useState<any>(null);
  const [completionBarberId, setCompletionBarberId] = useState<string>('');

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAddingClient, setIsAddingClient] = useState(false);
  const [isAddingBreak, setIsAddingBreak] = useState(false);
  const [newBreakData, setNewBreakData] = useState({
    timeStr: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
    durationStr: '60'
  });
  const [newClientData, setNewClientData] = useState<{
    name: string;
    whatsapp: string;
    serviceId: string;
    barberId: string;
    type: string;
    scheduledTime: string;
    scheduledDate: string;
    clientId?: string;
  }>({
    name: '',
    whatsapp: '',
    serviceId: '',
    barberId: 'any',
    type: 'walk-in',
    scheduledTime: '',
    scheduledDate: new Date().toISOString().split('T')[0],
    clientId: '',
  });

  const [editingServicesBooking, setEditingServicesBooking] = useState<{id: string, serviceId: string, expectedPrice: number | string} | null>(null);

  const handleUpdateServices = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingServicesBooking || editingServicesBooking.serviceId.trim() === '') {
      toast.error('Selecione pelo menos um serviço');
      return;
    }
    try {
      await updateDoc(doc(db, 'bookings', editingServicesBooking.id), {
        serviceId: editingServicesBooking.serviceId,
        expectedPrice: Number(editingServicesBooking.expectedPrice)
      });
      toast.success('Serviços e valor atualizados com sucesso');
      setEditingServicesBooking(null);
    } catch (err) {
      toast.error('Erro ao atualizar serviços');
    }
  };

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientData.name || !newClientData.whatsapp) return;
    if (newClientData.serviceId.trim() === '') {
      toast.error("Selecione pelo menos um serviço");
      return;
    }
    const isScheduled = newClientData.type === 'scheduled';
    if (isScheduled && !newClientData.scheduledTime) {
      toast.error('Por favor, informe o horário do agendamento.');
      return;
    }

    let expectedPrice = isScheduled ? Number(schedulingFee) : 0;
    const parsedServices = parseServiceString(newClientData.serviceId);
    parsedServices.forEach(ps => {
      const s = services.find(x => x.name.trim().toLowerCase() === ps.name.trim().toLowerCase() || x.id === ps.name);
      if (s) {
        expectedPrice += getServicePrice(s) * ps.quantity;
      }
    });

    let finalBarberId = newClientData.barberId;
    const activeBarbers = barbers.filter(b => b.isActive);
    if (finalBarberId === 'any' && activeBarbers.length === 1) {
      finalBarberId = activeBarbers[0].id;
    }

    try {
      await addDoc(collection(db, 'bookings'), {
        clientName: newClientData.name,
        clientWhatsapp: parsePhone(newClientData.whatsapp),
        serviceId: newClientData.serviceId,
        barberId: finalBarberId,
        type: newClientData.type,
        status: BookingStatus.WAITING,
        createdAt: serverTimestamp(),
        expectedPrice: expectedPrice,
        ...(newClientData.clientId ? { clientId: newClientData.clientId } : {}),
        ...(isScheduled && { scheduledTime: newClientData.scheduledTime, scheduledDate: newClientData.scheduledDate }),
      });
      toast.success(isScheduled ? 'Cliente agendado com sucesso' : 'Cliente adicionado à fila');
      setIsAddingClient(false);
      setNewClientData({ 
        name: '', 
        whatsapp: '', 
        serviceId: '', 
        barberId: 'any', 
        type: 'walk-in', 
        scheduledTime: '', 
        scheduledDate: new Date().toISOString().split('T')[0],
        clientId: '' 
      });
    } catch(err) {
      toast.error('Erro ao adicionar cliente');
    }
  };

  
  const getNextForBarber = (barberId: string) => {
    return sortedQueue.find(b => b.barberId === 'any' || b.barberId === barberId);
  };

  const activeBarbersList = barbers.filter(b => b.isActive);

  const startService = async (bookingId: string, assignedBarberId: string) => {
    const bookingToUpdate = queue.find(b => b.id === bookingId) || activeBookings.find(b => b.id === bookingId);
    try {
      const bookingRef = doc(db, 'bookings', bookingId);
      await updateDoc(bookingRef, {
        status: BookingStatus.IN_SERVICE,
        serviceStartTime: serverTimestamp(),
        barberId: assignedBarberId,
        originalBarberId: bookingToUpdate?.originalBarberId || bookingToUpdate?.barberId || 'any'
      });
      toast.success('Serviço iniciado');
    } catch (err) {
      toast.error('Erro ao iniciar serviço');
    }
  };

  const handleAddBreak = async (breakData: any) => {
    try {
       let startTime = Date.now();

       if (breakData.type === 'scheduled') {
         const [h, m] = breakData.scheduledTime.split(':').map(Number);
         const date = new Date();
         date.setHours(h, m, 0, 0);
         startTime = date.getTime();
       } else if (breakData.type === 'after_current') {
         const target = (breakData.barberId && breakData.barberId !== 'any')
           ? activeBookings.find(ab => ab.barberId === breakData.barberId)
           : activeBookings[0];
         const remMins = target ? (activeRemainingMinutes[target.id] || 0) : 0;
         startTime = Date.now() + (remMins * 60000);
       } else {
         startTime = Date.now();
       }

       await addDoc(collection(db, 'breaks'), {
         startTime,
         duration: Number(breakData.duration),
         barberId: breakData.barberId || 'any',
         type: breakData.type,
         reason: breakData.reason || 'Pausa',
         targetBookingId: breakData.type === 'after_current' ? (activeBookings[0]?.id || '') : '',
         createdAt: Date.now()
       });

       toast.success('Pausa configurada com sucesso!');
       setIsAddingBreak(false);
    } catch (err) {
       console.error("Erro ao agendar pausa:", err);
       toast.error('Erro ao agendar pausa');
    }
  };

  const startBreakNow = async (breakId: string) => {
    try {
      await updateDoc(doc(db, 'breaks', breakId), {
        startTime: Date.now(),
        type: 'now'
      });
      toast.success('Pausa iniciada agora!');
    } catch (err) {
      toast.error('Erro ao iniciar pausa');
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

  const openCompleteModal = (booking: any) => {
    setCompletingBooking(booking);
    setCompletionBarberId(booking.barberId && booking.barberId !== 'any' ? booking.barberId : '');
  };

  const confirmCompleteService = async () => {
    if (!completingBooking) return;
    if (!completionBarberId || completionBarberId === 'any') {
      toast.error('Por favor, selecione o barbeiro que realizou o serviço.');
      return;
    }
    
    try {
      const activeInfo = completingBooking;
      
      // Calculate final actual price to snapshot it, and separate services-only price for Clube Navalha points
      let finalPrice = 0;
      let servicesOnlyPrice = 0;
      let totalCalculated = 0;

      if (activeInfo && activeInfo.serviceId) {
        const parsedServices = parseServiceString(activeInfo.serviceId);
        parsedServices.forEach(ps => {
           const s = services.find(srv => srv.name.trim().toLowerCase() === ps.name.trim().toLowerCase() || srv.id === ps.name);
           if (s) {
              const promo = parsePrice(s.promoPrice);
              const reg = parsePrice(s.price);
              const itemTotal = ((promo > 0) ? promo : reg) * ps.quantity;
              totalCalculated += itemTotal;
              // Regra de negócio: Apenas serviços geram pontos. Produtos não acumulam pontos!
              if (!s.isProduct) {
                servicesOnlyPrice += itemTotal;
              }
           }
        });
      }

      if (activeInfo && activeInfo.expectedPrice !== undefined && activeInfo.expectedPrice !== null) {
        finalPrice = Number(activeInfo.expectedPrice);
        if (totalCalculated > 0) {
          if (servicesOnlyPrice === 0) {
            servicesOnlyPrice = 0;
          } else if (servicesOnlyPrice < totalCalculated) {
            const ratio = servicesOnlyPrice / totalCalculated;
            servicesOnlyPrice = finalPrice * ratio;
          } else {
            servicesOnlyPrice = finalPrice;
          }
        } else {
          servicesOnlyPrice = finalPrice;
        }
      } else {
        finalPrice = totalCalculated;
      }

      const bookingRef = doc(db, 'bookings', completingBooking.id);
      const pointsToGive = Math.floor(servicesOnlyPrice * 100);

      let clientDoc: any = null;
      let clientData: any = null;

      if (pointsToGive > 0 && activeInfo) {
        try {
          // 1. Prioritize lookup by linked clientId directly
          if (activeInfo.clientId) {
            const clientSnap = await getDoc(doc(db, 'clients', activeInfo.clientId));
            if (clientSnap.exists()) {
              clientDoc = clientSnap;
              clientData = clientSnap.data();
            }
          }

          // 2. Fallback to phone number query if not matched by clientId
          if (!clientDoc && activeInfo.clientWhatsapp) {
            const cleanPhone = activeInfo.clientWhatsapp.replace(/\D/g, '');
            if (cleanPhone) {
              const clientsRef = collection(db, 'clients');
              const q = query(clientsRef, where('whatsapp', '==', cleanPhone));
              const snapshot = await getDocs(q);
              if (!snapshot.empty) {
                clientDoc = snapshot.docs[0];
                clientData = clientDoc.data();
              }
            }
          }
        } catch (e) {
          console.error("Error looking up client for points:", e);
        }
      }

      await updateDoc(bookingRef, {
        status: BookingStatus.COMPLETED,
        estimatedEndTime: serverTimestamp(),
        price: finalPrice > 0 ? finalPrice : null, // Save price snapshot
        barberId: completionBarberId, // Assign actual barber
        isPaid: true,
        paidAt: serverTimestamp(),
        pointsAwarded: (clientDoc && pointsToGive > 0) ? pointsToGive : 0,
        awardedClientId: clientDoc ? clientDoc.id : null
      });

      // Gamification: Give points to client if registered (Apenas serviços pontuam, produtos NÃO pontuam)
      if (pointsToGive > 0 && clientDoc && clientData) {
        try {
          // Client found! Add points for services
          const existingLifetime = clientData.lifetimePoints ?? Math.max(clientData.points || 0, clientData.seasonalPoints || 0);
          const newLifetime = existingLifetime + pointsToGive;
          const newSeasonal = (clientData.seasonalPoints || 0) + pointsToGive;
          const newSeasonHighest = Math.max(
            clientData.seasonHighestPoints ?? 0,
            clientData.highestSeasonalPoints ?? 0,
            newSeasonal,
            (clientData.points || 0) + pointsToGive
          );

          const updatedTier = getClientTier({ 
            ...clientData, 
            points: (clientData.points || 0) + pointsToGive,
            seasonalPoints: newSeasonal,
            seasonHighestPoints: newSeasonHighest,
            lifetimePoints: newLifetime 
          }, thresholds);

          const newHighestTier = Math.max(clientData.seasonHighestTierLevel ?? 1, updatedTier.tierLevel);

          const nowIso = new Date().toISOString();

          await updateDoc(doc(db, 'clients', clientDoc.id), {
            points: increment(pointsToGive),
            seasonalPoints: increment(pointsToGive),
            seasonHighestPoints: newSeasonHighest,
            highestSeasonalPoints: newSeasonHighest,
            seasonHighestTierLevel: newHighestTier,
            highestTierLevel: newHighestTier,
            weeklyPoints: increment(pointsToGive),
            lifetimePoints: increment(pointsToGive),
            level: updatedTier.level,
            manualTierOverride: false,
            manualTierLevel: newHighestTier,
            lastPointsUpdate: nowIso
          });
          
          // Register point transaction
          await addDoc(collection(db, 'point_transactions'), {
            clientId: clientDoc.id,
            clientName: clientData.username || clientData.firstName || activeInfo.clientName,
            points: pointsToGive,
            type: 'earned',
            description: 'Pontos por serviços realizados',
            bookingId: completingBooking.id,
            balanceAfter: (clientData.points || 0) + pointsToGive,
            createdAt: nowIso
          });

          // Automatically check and award any rank bonuses if client reached new rank score
          const updatedClient = {
            ...clientData,
            points: (clientData.points || 0) + pointsToGive,
            seasonalPoints: newSeasonal,
            seasonHighestPoints: newSeasonHighest,
            highestSeasonalPoints: newSeasonHighest,
            seasonHighestTierLevel: newHighestTier,
            highestTierLevel: newHighestTier,
            weeklyPoints: (clientData.weeklyPoints || 0) + pointsToGive,
            lifetimePoints: newLifetime,
            level: updatedTier.level
          };
          await checkAndSyncClientRankBonuses(clientDoc.id, updatedClient);
          
          toast.success(`${pointsToGive} pontos de serviços creditados para ${clientData.username || clientData.firstName || 'o cliente'}!`);
        } catch (e) {
          console.error("Error giving points:", e);
        }
      } else if (finalPrice > 0 && activeInfo && (activeInfo.clientId || activeInfo.clientWhatsapp) && servicesOnlyPrice === 0) {
        toast('Atendimento finalizado. (Produtos físicos não acumulam pontos no Clube)', { icon: 'ℹ️' });
      }
      
      if (activeInfo && activeInfo.pushSubscription) {
        import('../services/pushManager').then(({ sendWebPush }) => {
          sendWebPush(
            activeInfo.pushSubscription, 
            'Serviço Concluído', 
            `Seu atendimento foi concluído. Obrigado por escolher a Barbearia!`
          ).catch(err => { if(err.code !== 'permission-denied') console.error(err); });
        });
      }

      // Check if there are any 'after_current' breaks waiting for this barber or all barbers
      const afterBreaks = breaks.filter(b => 
        b.type === 'after_current' && 
        (!b.barberId || b.barberId === 'any' || b.barberId === completionBarberId || (completingBooking && b.targetBookingId === completingBooking.id))
      );
      for (const ab of afterBreaks) {
        try {
          await updateDoc(doc(db, 'breaks', ab.id), {
            startTime: Date.now(),
            type: 'now'
          });
          toast.success(`Pausa de ${ab.duration} min iniciada automaticamente!`);
        } catch (e) {
          console.error("Error activating pending break:", e);
        }
      }

      toast.success('Serviço concluído!');
      setCompletingBooking(null);
      setCompletionBarberId('');
    } catch (err) {
      toast.error('Erro ao concluir');
    }
  };

  const pauseService = async (booking: any) => {
    try {
      const bookingRef = doc(db, 'bookings', booking.id);
      await updateDoc(bookingRef, {
        status: BookingStatus.PAUSED,
        pausedAt: Date.now()
      });
      toast.success('Serviço pausado. O tempo de espera parou.');
    } catch (err) {
      toast.error('Erro ao pausar');
    }
  };

  const resumeService = async (booking: any) => {
    try {
      let calcPausedAt = Date.now();
      if (booking.pausedAt) {
        if (typeof booking.pausedAt.toMillis === 'function') {
          calcPausedAt = booking.pausedAt.toMillis();
        } else if (typeof booking.pausedAt === 'string') {
          calcPausedAt = new Date(booking.pausedAt).getTime();
        } else if (typeof booking.pausedAt === 'number') {
          calcPausedAt = booking.pausedAt;
        }
      }
      const pauseDuration = Date.now() - calcPausedAt;
      const totalPausedDuration = (booking.totalPausedDuration || 0) + pauseDuration;

      const bookingRef = doc(db, 'bookings', booking.id);
      await updateDoc(bookingRef, {
        status: BookingStatus.IN_SERVICE,
        pausedAt: deleteField(),
        totalPausedDuration
      });
      toast.success('Serviço retomado.');
    } catch (err) {
      toast.error('Erro ao retomar');
    }
  };

  
  const returnToQueue = async (bookingId: string) => {
    try {
      const bookingToUndo = queue.find(b => b.id === bookingId) || activeBookings.find(b => b.id === bookingId);
      const updateData: any = {
        status: BookingStatus.WAITING,
        serviceStartTime: null,
        pausedAt: null
      };
      
      if (bookingToUndo && bookingToUndo.originalBarberId) {
        updateData.barberId = bookingToUndo.originalBarberId;
      }

      await updateDoc(doc(db, 'bookings', bookingId), updateData);
      toast.success('Retornado para a fila');
      setCancelingBooking(null);
    } catch (err) {
      toast.error('Erro ao retornar');
    }
  };

  const removeBooking = async (bookingId: string) => {
    setCancelingBooking(null);
    const bookingToUndo = queue.find(b => b.id === bookingId) || activeBookings.find(b => b.id === bookingId);
    if (!bookingToUndo) return;

    try {
      await updateDoc(doc(db, 'bookings', bookingId), {
        status: BookingStatus.CANCELLED
      });

      if (bookingToUndo.pushSubscription) {
        import('../services/pushManager').then(({ sendWebPush }) => {
          sendWebPush(
            bookingToUndo.pushSubscription, 
            'Atendimento Cancelado', 
            `Seu atendimento foi cancelado ou você perdeu sua vez.`
          ).catch(err => { if(err.code !== 'permission-denied') console.error(err); });
        });
      }

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

  const moveUp = async (idx: number) => {
    if (idx === 0) return;
    
    // Create a new array with the swapped elements
    const newQueue = [...sortedQueue];
    const temp = newQueue[idx];
    newQueue[idx] = newQueue[idx - 1];
    newQueue[idx - 1] = temp;

    try {
      const batch = writeBatch(db);
      
      // Re-index the entire queue's priorities based on the new visual order
      // We use base time to ensure newly added items (e.g. walkins arriving now) 
      // will naturally fall at the end of the current rearranged group.
      const basePriority = Date.now() - (newQueue.length * 1000); 
      
      newQueue.forEach((booking, i) => {
        const newPriority = basePriority + (i * 1000);
        batch.update(doc(db, 'bookings', booking.id), { 
          priority: newPriority,
          delayOffset: deleteField() // Support legacy data cleanup
        });
      });

      await batch.commit();
      toast.success('Fila atualizada');
    } catch(err) {
      toast.error('Erro ao reordenar');
    }
  };

  const moveDown = async (idx: number) => {
    if (!sortedQueue || idx === sortedQueue.length - 1) return;
    
    // Create a new array with the swapped elements
    const newQueue = [...sortedQueue];
    const temp = newQueue[idx];
    newQueue[idx] = newQueue[idx + 1];
    newQueue[idx + 1] = temp;

    try {
      const batch = writeBatch(db);

      const basePriority = Date.now() - (newQueue.length * 1000); 
      
      newQueue.forEach((booking, i) => {
        const newPriority = basePriority + (i * 1000);
        batch.update(doc(db, 'bookings', booking.id), { 
          priority: newPriority,
          delayOffset: deleteField()
        });
      });

      await batch.commit();
      toast.success('Fila atualizada');
    } catch(err) {
      toast.error('Erro ao reordenar');
    }
  };

  const getBookingDate = (b: Booking) => {
    if (b.type === 'scheduled' && b.scheduledDate) {
      return b.scheduledDate; // YYYY-MM-DD
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
    
    // adjust for local timezone offset so it doesn't shift
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

  const todayDate = new Date();
  const todayDateStr = todayDate.getFullYear() + '-' + String(todayDate.getMonth() + 1).padStart(2, '0') + '-' + String(todayDate.getDate()).padStart(2, '0');
  const todayQueueCount = queue.filter(b => getBookingDate(b) === todayDateStr).length;

  return (
    <>
      <LoadingOverlay isVisible={isProcessing} />
      <div className="min-h-[100dvh] bg-carbon flex flex-col font-sans">
      {/* Top Bar (Always visible now) */}
      <div className="bg-carbon-light border-b border-white/10 p-4 flex items-center justify-between z-20 sticky top-0">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <img src="/logo192.png" alt="Club Navalha Barbearia" className="w-10 h-10 object-contain drop-shadow-lg" />
            <button
              onClick={withProcessing(() => toggleOpenStatus(isOpen))}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border ${isOpen ? 'bg-green-500/10 border-green-500/30 text-green-500' : 'bg-red-500/10 border-red-500/30 text-red-500'}`}
            >
              <div className={`w-1.5 h-1.5 rounded-full ${isOpen ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]'}`}></div>
              <span className="text-[10px] font-bold uppercase tracking-wider">{isOpen ? 'ABERTO' : 'FECHADO'}</span>
            </button>
          </div>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="text-white bg-white/5 p-2 rounded-lg"
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar - Now a fixed overlay on all sizes */}
      <AdminSidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isMobileMenuOpen={isMobileMenuOpen} 
        setIsMobileMenuOpen={setIsMobileMenuOpen} 
      />

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
                    <p className="text-lg sm:text-xl font-mono font-bold text-gold leading-none mt-0.5">{todayQueueCount}</p>
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

            {/* Painel de Visualização Rápida da Sala VIP na Fila */}
            <VipQueueQuickBar onGoToVipRoom={() => setActiveTab('vip_room')} />

            {breaks.length > 0 && (
              <div className="mb-6 flex flex-col gap-2.5">
                {breaks.map(b => {
                  const now = Date.now();
                  const startTime = b.startTime || now;
                  const endTime = startTime + (b.duration || 0) * 60000;
                  const isActive = b.type === 'now' || (now >= startTime && now < endTime);
                  const isAfterCurrent = b.type === 'after_current';
                  const isScheduled = b.type === 'scheduled' || (!isActive && !isAfterCurrent && startTime > now);
                  const remMinutes = Math.max(1, Math.ceil((endTime - now) / 60000));
                  const barberObj = barbers.find(barber => barber.id === b.barberId);
                  const barberLabel = barberObj ? `Barbeiro: ${barberObj.name}` : 'Toda a Barbearia';

                  return (
                    <div 
                      key={b.id} 
                      className={`glass-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border transition-all ${
                        isActive 
                          ? 'bg-gold/10 border-gold shadow-lg shadow-gold/10' 
                          : 'bg-white/5 border-white/10'
                      }`}
                    >
                      <div className="flex items-start sm:items-center gap-3.5">
                        <div className={`p-2.5 rounded-xl mt-0.5 sm:mt-0 shrink-0 ${
                          isActive 
                            ? 'bg-gold text-carbon animate-pulse' 
                            : 'bg-white/10 text-white/60'
                        }`}>
                          <Clock className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <span className="font-bold text-sm text-white">
                              {b.reason || 'Pausa / Intervalo'}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/70 font-semibold">
                              {barberLabel}
                            </span>
                            {isActive && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-gold text-carbon font-extrabold uppercase tracking-wider animate-pulse">
                                Em Andamento ({remMinutes} min restantes)
                              </span>
                            )}
                            {isAfterCurrent && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold uppercase tracking-wider">
                                Após Atendimento Atual
                              </span>
                            )}
                            {isScheduled && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40 font-bold uppercase tracking-wider">
                                Programada: {new Date(startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-white/50">
                            Duração: <strong className="text-white/80">{b.duration} min</strong>
                            {isActive && ` • Término previsto às ${new Date(endTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`}
                            {isAfterCurrent && ` • Inicia assim que o cliente em atendimento terminar`}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        {!isActive && (
                          <button
                            onClick={withProcessing(() => startBreakNow(b.id))}
                            className="bg-gold/20 hover:bg-gold/30 text-gold border border-gold/40 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                          >
                            Iniciar Agora
                          </button>
                        )}
                        <button 
                          onClick={withProcessing(() => removeBreak(b.id))} 
                          className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors"
                        >
                          {isActive ? 'Encerrar Pausa' : 'Cancelar'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <AddBreakModal
              isOpen={isAddingBreak}
              onClose={() => setIsAddingBreak(false)}
              onConfirm={withProcessing(handleAddBreak)}
              activeBookings={activeBookings}
              barbers={barbers}
              isProcessing={isProcessing}
            />


            <AddClientModal
              isOpen={isAddingClient}
              onClose={() => setIsAddingClient(false)}
              newClientData={newClientData}
              setNewClientData={setNewClientData}
              onSubmit={withProcessing(handleAddClient)}
              barbers={barbers}
              services={services}
              schedulingFee={schedulingFee}
            />

            {/* Edit Services Modal */}
            
      <CallingBookingModal
        booking={callingBooking}
        onClose={() => setCallingBooking(null)}
        barbers={barbers}
        onSelectBarber={startService}
      />

      <CancelingBookingModal
        booking={cancelingBooking}
        onClose={() => setCancelingBooking(null)}
        onReturnToQueue={withProcessing(returnToQueue)}
        onCancelBooking={withProcessing(removeBooking)}
      />
      <CompletingBookingModal
        booking={completingBooking}
        onClose={() => { setCompletingBooking(null); setCompletionBarberId(""); }}
        barbers={barbers}
        completionBarberId={completionBarberId}
        setCompletionBarberId={setCompletionBarberId}
        onConfirm={withProcessing(confirmCompleteService)}
      />


      <EditServicesModal
        booking={editingServicesBooking}
        setBooking={setEditingServicesBooking}
        services={services}
        onSubmit={withProcessing(handleUpdateServices)}
      />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Active Booking Column */}
              <div className="lg:col-span-1 flex flex-col gap-6">
                <h2 className="text-xs uppercase tracking-widest text-white/30 font-bold mb-4">Em Atendimento</h2>
                {activeBarbersList.map(barber => {
                  const activeB = activeBookings.find(b => b.barberId === barber.id);
                  const nextB = getNextForBarber(barber.id);
                  
                  return (
                    <div key={barber.id} className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <Scissors className="w-4 h-4 text-gold" />
                        <h3 className="text-sm font-bold text-white">{barber.name}</h3>
                      </div>
                      
                      {activeB ? (
                        <motion.div 
                          layoutId={`active-${activeB.id}`}
                          className="glass-card p-6 border-gold/40 bg-gold/5 ring-1 ring-gold/20"
                        >
                          <div className="flex items-center gap-4 mb-6">
                            <div className="w-16 h-16 rounded-full bg-gold/20 flex items-center justify-center text-gold text-2xl font-bold">
                              {activeB.clientName[0]}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <h3 className="text-2xl font-display font-bold truncate">{activeB.clientName}</h3>
                                {activeB.clientId && (
                                  <span 
                                    className="inline-flex items-center gap-1 bg-gold/15 text-gold border border-gold/30 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider"
                                    title="Cliente cadastrado no Clube Navalha (Pontuará ao finalizar)"
                                  >
                                    <Sparkles className="w-2.5 h-2.5" />
                                    Clube Navalha
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-gold text-sm font-medium truncate">{activeB.serviceId}</p>
                                <span className="text-green-400 font-bold text-sm bg-green-400/10 px-2 py-0.5 rounded ml-2">
                                  R$ {Number(activeB.expectedPrice || 0).toFixed(2)}
                                </span>
                                <button onClick={() => setEditingServicesBooking({id: activeB.id, serviceId: activeB.serviceId, expectedPrice: activeB.expectedPrice})} className="text-white/40 hover:text-white p-1 shrink-0">
                                  <Edit2 className="w-3 h-3" />
                                </button>
                              </div>
                              <div className="flex items-center gap-1 mt-1 text-white/40">
                                <Clock className="w-3 h-3" />
                                <p className="text-xs truncate">
                                  {activeB.status === BookingStatus.PAUSED ? (
                                    <span className="text-yellow-500 font-bold">Pausado</span>
                                  ) : activeB.serviceStartTime ? `Restam aprox. ${formatTime(activeRemainingMinutes[activeB.id] || 0)}` : "Iniciando..."}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2 sm:space-y-3">
                            {activeB.status === BookingStatus.PAUSED ? (
                              <button 
                                onClick={withProcessing(() => resumeService(activeB))}
                                className="w-full bg-gold/20 hover:bg-gold/30 text-gold border border-gold/40 py-3 rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-all"
                              >
                                <Play className="w-4 h-4" />
                                RETOMAR
                              </button>
                            ) : (
                              <>
                                <button
                                 onClick={() => openCompleteModal(activeB)}
                                className="w-full bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30 py-3 rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-all"
                              >
                                <CheckCircle className="w-4 h-4" />
                                CONCLUIR
                              </button>

                            
                            <div className="flex gap-2">
                              {activeB.status === BookingStatus.IN_SERVICE && (
                                <button 
                                   onClick={withProcessing(() => pauseService(activeB))}
                                   className="flex-1 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 py-2 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-colors"
                                >
                                  <Pause className="w-3 h-3" />
                                  Pausar
                                </button>
                              )}
                              <button
                                  onClick={() => setCancelingBooking(activeB)}
                                 className="flex-1 bg-white/5 hover:bg-white/10 text-white/40 border border-white/10 py-2 rounded-xl flex items-center justify-center gap-2 text-xs transition-colors font-bold"
                              >
                                <XCircle className="w-3 h-3" />
                                Cancelar
                              </button>
                            </div>
                            </>
                          )}
                          </div>
                        </motion.div>
                      ) : (
                        <div className="glass-card p-6 border-dashed border-white/10 flex flex-col items-center justify-center text-center">
                          <p className="text-white/40 italic mb-4">Livre</p>
                          {nextB ? (
                            <button 
                              onClick={withProcessing(() => startService(nextB.id, barber.id))}
                              className="w-full bg-gold/10 hover:bg-gold text-gold hover:text-carbon border border-gold/20 py-3 rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-all"
                            >
                              <Play className="w-4 h-4 fill-current" />
                              CHAMAR PRÓXIMO
                            </button>
                          ) : (
                            <p className="text-xs text-white/30">Nenhum cliente na fila</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Queue Column */}
              <div className="lg:col-span-2">
                <h2 className="text-xs uppercase tracking-widest text-white/30 font-bold mb-4">Fila de Espera</h2>
                <div className="space-y-3">
                  <AnimatePresence>
                    {(sortedQueue || []).map((item, idx) => {
                      const dateStr = getBookingDate(item);
                      const showHeader = dateStr !== lastDateDisplayed;
                      lastDateDisplayed = dateStr;

                      return (
                        <React.Fragment key={item.id}>
                          {showHeader && (
                            <motion.div 
                              initial={{ opacity: 0 }} 
                              animate={{ opacity: 1 }} 
                              className="pt-4 pb-2 first:pt-0"
                            >
                              <h3 className="text-sm uppercase tracking-widest text-gold font-bold">
                                {formatDateHeader(dateStr)}
                              </h3>
                            </motion.div>
                          )}
                          <motion.div
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
                            {item.clientId && (
                              <span 
                                className="inline-flex items-center gap-1 bg-gold/15 text-gold border border-gold/30 text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0" 
                                title="Cliente cadastrado no Clube Navalha (Pontuará ao finalizar)"
                              >
                                <Sparkles className="w-2.5 h-2.5" />
                                Clube Navalha
                              </span>
                            )}
                            <span className="flex items-center text-white/50 text-xs sm:text-sm max-w-[150px] sm:max-w-xs">
                              <span className="truncate">{item.serviceId}</span>
                              <button onClick={() => setEditingServicesBooking({id: item.id, serviceId: item.serviceId, expectedPrice: item.expectedPrice})} className="text-white/40 hover:text-white shrink-0 ml-1 p-1">
                                <Edit2 className="w-3 h-3" />
                              </button>
                            </span>
                            <span className={`text-[8px] sm:text-[9px] px-1.5 py-0.5 rounded whitespace-nowrap ${item.type === 'scheduled' ? 'bg-gold/20 text-gold' : 'bg-white/10 text-white/40'} uppercase font-bold`}>
                              {item.type === 'walk-in' ? 'PRESENCIAL' : `AGENDADO ${item.scheduledDate ? item.scheduledDate.split('-').reverse().slice(0,2).join('/') + ' ' : ''}${item.scheduledTime || ''}`}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col gap-3 pl-7 sm:pl-10">
                          <div className="flex items-center gap-2 text-[10px] sm:text-xs text-white/40 flex-wrap">
                            {item.barberId !== 'any' && (
                              <span className="truncate bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-white/70 font-bold flex items-center gap-1">
                                <Scissors className="w-2.5 h-2.5" />
                                {barbers.find(b => b.id === item.barberId)?.name || 'Específico'}
                              </span>
                            )}
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
                                 onClick={withProcessing(() => moveUp(idx))}
                                 disabled={idx === 0}
                                 className="p-1.5 sm:p-2 hover:bg-gold hover:text-carbon disabled:opacity-30 text-white/50 transition-colors"
                               >
                                  <ArrowUp className="w-3 h-3 sm:w-4 sm:h-4" />
                               </button>
                               <button
                                 onClick={withProcessing(() => moveDown(idx))}
                                 disabled={idx === queue.length - 1}
                                 className="p-1.5 sm:p-2 hover:bg-gold hover:text-carbon disabled:opacity-30 text-white/50 transition-colors border-l border-white/5"
                               >
                                  <ArrowDown className="w-3 h-3 sm:w-4 sm:h-4" />
                               </button>
                             </div>
                             <button 
                               onClick={withProcessing(() => removeBooking(item.id))}
                               className="p-1.5 sm:p-2 text-white/20 hover:text-red-400 transition-colors shrink-0"
                               title="Remover da fila"
                             >
                               <XCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                             </button>

                             {item.status === 'checking-in' ? (
                               <button
                                 onClick={withProcessing(() => undoPresent(item.id))}
                                 className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2.5 rounded-lg font-bold text-[10px] sm:text-sm bg-green-500/10 text-green-500 hover:bg-red-500/10 hover:text-red-500 transition-all shrink-0 group"
                               >
                                 <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 group-hover:hidden" />
                                 <XCircle className="w-3 h-3 sm:w-4 sm:h-4 hidden group-hover:block" />
                                 <span className="group-hover:hidden">PRESENTE</span>
                                 <span className="hidden group-hover:block">CANCELAR</span>
                               </button>
                             ) : (
                               <button 
                                 onClick={withProcessing(() => markPresent(item.id))}
                                 className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2.5 rounded-lg font-bold text-[10px] sm:text-sm bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all shrink-0"
                               >
                                 <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                                 PRESENÇA
                               </button>
                             )}
                             <button
                                onClick={() => setCallingBooking(item)}
                               className="flex items-center gap-1.5 sm:gap-2 whitespace-nowrap bg-gold/10 hover:bg-gold text-gold hover:text-carbon px-3 py-1.5 sm:px-4 sm:py-2.5 rounded-lg font-bold text-[10px] sm:text-sm transition-all shrink-0"
                             >
                               <Play className="w-3 h-3 sm:w-4 sm:h-4 fill-current" />
                               CHAMAR
                             </button>
                          </div>
                        </div>
                      </motion.div>
                    </React.Fragment>
                    );
                    })}
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
        
        {activeTab === 'log' && <QueueLogView queue={queue} sortedQueue={sortedQueue} exactStartTimes={exactStartTimes} />}

        {activeTab === 'history' && <HistoryView />}
        {activeTab === 'gamification' && <GamificationManager />}
        {activeTab === 'vip_room' && <VipRoomManager />}

        {activeTab === 'settings' && <GlobalSettings />}

        {activeTab === 'services' && <ServicesManager />}

        {activeTab === 'barbers' && <BarbersManager />}
      </main>
    </div>
    </>
  );
}

