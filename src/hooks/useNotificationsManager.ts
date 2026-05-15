import { useEffect, useRef } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { BookingStatus, Booking } from '../types';
import { sendWebPush } from '../services/pushManager';
import { formatTime } from '../utils';

export function useNotificationsManager(
  queue: Booking[], 
  queueTimers: any // The object returned by useQueueTimers
) {
  const processingRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!queue || !queueTimers || !queueTimers.sortedQueue) return;

    const checkNotifications = async () => {
      const { sortedQueue, activeBooking, queueWaitTimes } = queueTimers;

      for (let i = 0; i < sortedQueue.length; i++) {
        const booking = sortedQueue[i];
        if (!booking.pushSubscription) continue; // Skip if no subscription
        if (processingRef.current.has(booking.id)) continue;

        const waitMillis = queueWaitTimes[booking.id] || 0;
        const waitMinutes = Math.floor(waitMillis / 60000);
        const position = i + 1;

        // 1. Registered queue position
        if (!booking.notifiedJoined) {
          processingRef.current.add(booking.id);
          const title = 'Você entrou na fila!';
          const body = `Sua posição atual é a #${position}. Tempo estimado: ${formatTime(waitMinutes)}.`;
          const success = await sendWebPush(booking.pushSubscription, title, body);
          
          await updateDoc(doc(db, 'bookings', booking.id), { notifiedJoined: true });
          processingRef.current.delete(booking.id);
        }

        // 2. Position 2 in the queue
        if (!booking.notifiedPos2 && position === 2 && booking.notifiedJoined) {
           processingRef.current.add(booking.id);
           const title = 'Falta pouco!';
           const body = `Você é o número 2 na fila. Comece a se preparar!`;
           await sendWebPush(booking.pushSubscription, title, body);
           
           await updateDoc(doc(db, 'bookings', booking.id), { notifiedPos2: true });
           processingRef.current.delete(booking.id);
        }

        // 3. Approaching in a few minutes (15 min left)
        if (!booking.notifiedApproaching && waitMinutes <= 15 && waitMinutes > 0 && booking.notifiedJoined) {
           processingRef.current.add(booking.id);
           const title = 'Atendimento Próximo';
           const body = `Faltam aproximadamente 15 minutos! Por favor, venha/retorne para a barbearia.`;
           await sendWebPush(booking.pushSubscription, title, body);
           
           await updateDoc(doc(db, 'bookings', booking.id), { notifiedApproaching: true });
           processingRef.current.delete(booking.id);
        }
      }

      // Check Active Booking
      if (activeBooking && activeBooking.pushSubscription && !activeBooking.notifiedTurnArrived) {
         processingRef.current.add(activeBooking.id);
         const title = 'Sua vez chegou!';
         const body = `O barbeiro está pronto para te atender!`;
         await sendWebPush(activeBooking.pushSubscription, title, body);
         
         await updateDoc(doc(db, 'bookings', activeBooking.id), { notifiedTurnArrived: true });
         processingRef.current.delete(activeBooking.id);
      }
    };

    checkNotifications();
  }, [queueTimers]);
}
