import { useState, useEffect } from 'react';
import { Booking, Service, BarberBreak, Barber } from '../types';
import { parseServiceString } from '../utils';

export function useQueueTimers(
  activeBookings: Booking[], 
  queue: Booking[], 
  services: Service[],
  breaks: BarberBreak[] = [],
  barbers: Barber[] = []
) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 60000); // update every minute
    return () => clearInterval(interval);
  }, []);

  const getDuration = (b: Booking) => {
    let d = 0;
    const parsedServices = parseServiceString(b.serviceId);
    let foundAny = false;
    parsedServices.forEach(ps => {
      const s = services.find(srv => srv.name.trim().toLowerCase() === ps.name.toLowerCase() || ps.name.toLowerCase().includes(srv.name.toLowerCase()));
      if (s) {
        d += (s.duration || 30) * ps.quantity;
        foundAny = true;
      }
    });
    if (!foundAny) d = 30;
    return d;
  };

  const getMillis = (dateObj: any) => {
     let time = Date.now(); 
     if (dateObj) {
        if (typeof dateObj.toMillis === 'function') time = dateObj.toMillis();
        else if (typeof dateObj === 'string') time = new Date(dateObj).getTime();
        else if (typeof dateObj === 'number') time = dateObj;
     }
     return time;
  };

  const getSchedTime = (b: any) => {
    if (!b.scheduledTime) return Infinity;
    const [h, m] = b.scheduledTime.split(':').map(Number);
    const d = new Date(now);
    if (b.scheduledDate) {
      const [year, month, day] = b.scheduledDate.split('-').map(Number);
      d.setFullYear(year, month - 1, day);
    }
    d.setHours(h, m, 0, 0);
    return d.getTime();
  };

  const activeRemainingMinutes: Record<string, number> = {};
  const barberAvailability: Record<string, number> = {};

  // Initialize barber availability
  barbers.filter(b => b.isActive).forEach(barber => {
     barberAvailability[barber.id] = now;
  });

  // Process active bookings
  activeBookings.forEach(ab => {
    if (!ab.serviceStartTime) return;
    let startTimeMillis = getMillis(ab.serviceStartTime);
    
    let calculationNow = now;
    if (ab.status === 'paused' && ab.pausedAt) {
      calculationNow = getMillis(ab.pausedAt);
    }

    let elapsedMillis = calculationNow - startTimeMillis;
    if (ab.totalPausedDuration) {
      elapsedMillis -= ab.totalPausedDuration;
    }

    const elapsedMinutes = Math.floor(elapsedMillis / 60000);
    const baseDuration = getDuration(ab);
    
    let expectedDuration = baseDuration;
    if (elapsedMinutes >= baseDuration) {
      const overtime = elapsedMinutes - baseDuration;
      expectedDuration = baseDuration + Math.ceil(overtime / 5) * 5;
      if (expectedDuration === elapsedMinutes) {
         expectedDuration += 5;
      }
    }

    const remainingMins = Math.max(0, expectedDuration - elapsedMinutes);
    activeRemainingMinutes[ab.id] = remainingMins;
    
    if (ab.barberId && barberAvailability[ab.barberId] !== undefined) {
      barberAvailability[ab.barberId] = now + (remainingMins * 60000);
    } else {
      // If a barber is disabled or deleted but has an active booking, 
      // we could add it back, but let's just ignore for queue calculation.
    }
  });

  const queueWaitTimes: Record<string, number> = {};
  const queueIntervals: Record<string, { start: number; end: number }> = {};
  const exactStartTimes: Record<string, number> = {};
  
  const barberOccupiedIntervals: Record<string, { start: number; end: number; id: string }[]> = {};
  barbers.filter(b => b.isActive).forEach(barber => {
     barberOccupiedIntervals[barber.id] = [];
  });

  // Assign breaks to corresponding barbers
  for (const b of breaks) {
     if (barberOccupiedIntervals[b.barberId]) {
        barberOccupiedIntervals[b.barberId].push({ start: b.startTime, end: b.startTime + (b.duration * 60000), id: b.id });
     }
  }

  const findNextGap = (start: number, duration: number, existingIntervals: {start: number, end: number}[]) => {
      let current = start;
      let changed = true;
      while (changed) {
          changed = false;
          for (const inv of existingIntervals) {
              if (current < inv.end && current + duration > inv.start) {
                  current = inv.end;
                  changed = true;
              }
          }
      }
      return current;
  };

  const sortedQueue = [...queue].sort((a, b) => {
      if (a.priority !== undefined && b.priority !== undefined) return a.priority - b.priority;
      if (a.priority !== undefined && b.priority === undefined) return -1;
      if (a.priority === undefined && b.priority !== undefined) return 1;
      
      const aTime = a.type === 'scheduled' ? getSchedTime(a) : getMillis(a.createdAt);
      const bTime = b.type === 'scheduled' ? getSchedTime(b) : getMillis(b.createdAt);
      if (aTime !== bTime) return aTime - bTime;
            
      if (a.type === 'scheduled' && b.type !== 'scheduled') return -1;
      if (a.type !== 'scheduled' && b.type === 'scheduled') return 1;
      return 0;
  });

  for (const item of sortedQueue) {
      const durationMs = getDuration(item) * 60000;
      let targetBarberId = item.barberId;
      
      let actualStart = Infinity;
      let assignedBarberId = targetBarberId;
      
      // If it's a specific barber, calculate only for them
      if (targetBarberId && targetBarberId !== 'any' && barberAvailability[targetBarberId] !== undefined) {
          let proposedStart = barberAvailability[targetBarberId];
          if (item.type === 'scheduled') {
              proposedStart = Math.max(proposedStart, getSchedTime(item));
          }
          actualStart = findNextGap(proposedStart, durationMs, barberOccupiedIntervals[targetBarberId]);
      } else {
          // If 'any' or barber not found, find the earliest available gap among ALL active barbers
          const activeBarberIds = Object.keys(barberAvailability);
          if (activeBarberIds.length > 0) {
             for (const bId of activeBarberIds) {
                 let proposedStart = barberAvailability[bId];
                 if (item.type === 'scheduled') {
                     proposedStart = Math.max(proposedStart, getSchedTime(item));
                 }
                 const possibleStart = findNextGap(proposedStart, durationMs, barberOccupiedIntervals[bId]);
                 if (possibleStart < actualStart) {
                     actualStart = possibleStart;
                     assignedBarberId = bId;
                 }
             }
          } else {
             // Fallback if no barbers active
             actualStart = now;
             assignedBarberId = 'any';
          }
      }

      const actualEnd = actualStart + durationMs;
      if (barberOccupiedIntervals[assignedBarberId]) {
         barberOccupiedIntervals[assignedBarberId].push({ start: actualStart, end: actualEnd, id: item.id });
         barberAvailability[assignedBarberId] = actualEnd;
      }
      
      exactStartTimes[item.id] = actualStart;
      queueWaitTimes[item.id] = Math.max(0, Math.floor((actualStart - now) / 60000));
      queueIntervals[item.id] = { start: actualStart, end: actualEnd };
  }

  const allOccupiedIntervals = Object.values(barberOccupiedIntervals).flat();
  return { activeRemainingMinutes, queueWaitTimes, queueIntervals, sortedQueue, exactStartTimes, allOccupiedIntervals };
}
