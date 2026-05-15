import { useEffect, useRef } from 'react';
import { Booking, BookingStatus } from '../types';

export function useNotifications(queue: Booking[], activeBooking: Booking | null) {
  const lastNextId = useRef<string | null>(null);

  useEffect(() => {
    if (queue.length > 0) {
      const nextClient = queue[0];
      if (nextClient.id !== lastNextId.current) {
        lastNextId.current = nextClient.id;
        console.log(`[Admin] Próximo da fila é: ${nextClient.clientName}`);
      }
    }
  }, [queue, activeBooking]);
}
