import { useEffect, useRef } from 'react';
import { Booking, BookingStatus } from '../types';

export function useNotifications(queue: Booking[], activeBooking: Booking | null) {
  const lastNextId = useRef<string | null>(null);

  useEffect(() => {
    // 1. Next in line notification
    if (queue.length > 0) {
      const nextClient = queue[0];
      if (nextClient.id !== lastNextId.current) {
        lastNextId.current = nextClient.id;
        console.log(`[WhatsApp Sim] Para: ${nextClient.clientWhatsapp} - "Prepare-se, você é o próximo da fila na Barbearia Premium!"`);
      }
    }

    // 2. 20 mins left simulation
    if (activeBooking && activeBooking.serviceStartTime) {
       // Typically, we'd check against estimated duration.
       // Let's just log when a service starts.
       console.log(`[WhatsApp Sim] Para: ${activeBooking.clientWhatsapp} - "Seu atendimento começou!"`);
    }
  }, [queue, activeBooking]);
}
