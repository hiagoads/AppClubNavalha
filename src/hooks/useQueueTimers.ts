import { useState, useEffect } from 'react';
import { Booking, Service, BarberBreak } from '../types';

export function useQueueTimers(
  activeBooking: Booking | null | undefined, 
  queue: Booking[], 
  services: Service[],
  breaks: BarberBreak[] = []
) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 60000); // update every minute
    return () => clearInterval(interval);
  }, []);

  // Calculate active booking remaining time
  let activeRemainingMinutes = 0;
  
  if (activeBooking && activeBooking.serviceStartTime) {
    let startTimeMillis = Date.now();
    if (typeof (activeBooking.serviceStartTime as any).toMillis === 'function') {
      startTimeMillis = (activeBooking.serviceStartTime as any).toMillis();
    } else if (typeof activeBooking.serviceStartTime === 'string') {
      startTimeMillis = new Date(activeBooking.serviceStartTime).getTime();
    } else if (typeof activeBooking.serviceStartTime === 'number') {
      startTimeMillis = activeBooking.serviceStartTime;
    }

    const elapsedMinutes = Math.floor((now - startTimeMillis) / 60000);
    
    // Find service duration (handle multiple)
    let baseDuration = 0;
    const activeServiceNames = activeBooking.serviceId.split(',').map(s => s.trim());
    if (activeServiceNames.length > 0) {
      activeServiceNames.forEach(sName => {
        const service = services.find(s => s.name === sName);
        baseDuration += service?.duration || 30;
      });
    } else {
      baseDuration = 30; // Default
    }
    
    // If time running out (elapsed > baseDuration), add 5 mins buffer
    let expectedDuration = baseDuration;
    if (elapsedMinutes >= baseDuration) {
      const overtime = elapsedMinutes - baseDuration;
      expectedDuration = baseDuration + Math.ceil(overtime / 5) * 5;
      if (expectedDuration === elapsedMinutes) {
         expectedDuration += 5; // ensure it is always strictly adding 5 mins
      }
    }
    activeRemainingMinutes = Math.max(0, expectedDuration - elapsedMinutes);
  }

  // Dynamic sorting algorithm based on arrivalTime (scheduledTime)
  const getMillis = (dateObj: any, booking?: any) => {
     let time = Infinity;
     if (dateObj) {
        if (typeof dateObj.toMillis === 'function') time = dateObj.toMillis();
        else if (typeof dateObj === 'string') time = new Date(dateObj).getTime();
        else if (typeof dateObj === 'number') time = dateObj;
     }
     if (time !== Infinity && booking && booking.delayOffset) {
        time += booking.delayOffset * 60000;
     }
     return time;
  };

  const getDuration = (b: Booking) => {
    let d = 0;
    const names = b.serviceId.split(',').map(s => s.trim());
    if (names.length) {
      names.forEach(n => {
        const s = services.find(x => x.name === n);
        d += s?.duration || 30;
      });
    } else d = 30;
    return d;
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
    let time = d.getTime();
    if (b.delayOffset) {
      time += b.delayOffset * 60000;
    }
    return time;
  };

  let currentSimulationTime = now + (activeRemainingMinutes * 60000);
  const queueWaitTimes: Record<string, number> = {};
  const queueIntervals: Record<string, { start: number; end: number }> = {};
  let remainingBreaks = [...breaks].sort((a,b) => a.startTime - b.startTime);

  const scheduled = queue.filter(q => q.type === 'scheduled').sort((a, b) => getSchedTime(a) - getSchedTime(b));
  const walkins = queue.filter(q => q.type !== 'scheduled').sort((a, b) => getMillis(a.createdAt, a) - getMillis(b.createdAt, b));

  let sortedQueue: Booking[] = [];

  while (scheduled.length > 0 || walkins.length > 0) {
    let changed = true;
    while(changed) {
      changed = false;
      for (let i = 0; i < remainingBreaks.length; i++) {
        const b = remainingBreaks[i];
        const breakEnd = b.startTime + (b.duration * 60000);
        if (currentSimulationTime >= b.startTime && currentSimulationTime < breakEnd) {
          currentSimulationTime = breakEnd;
          changed = true;
          remainingBreaks.splice(i, 1);
          break;
        }
      }
    }

    const nextSched = scheduled[0];
    const nextWalkin = walkins[0];
    let picked: Booking;

    if (nextSched && nextWalkin) {
      const schedTime = getSchedTime(nextSched);
      const walkinDuration = getDuration(nextWalkin);
      
      const walkinStartTime = Math.max(currentSimulationTime, getMillis(nextWalkin.createdAt, nextWalkin));
      const walkinEndTime = walkinStartTime + (walkinDuration * 60000);
      const margin = 10 * 60000;
      
      if (currentSimulationTime >= schedTime) {
         picked = scheduled.shift()!;
      } else {
         if (walkinEndTime + margin <= schedTime) {
            picked = walkins.shift()!;
         } else {
            picked = scheduled.shift()!;
         }
      }
    } else if (nextSched) {
      picked = scheduled.shift()!;
    } else {
      picked = walkins.shift()!;
    }

    sortedQueue.push(picked);

    let startTimeForWait: number;
    if (picked.type === 'scheduled') {
      const sTime = getSchedTime(picked);
      startTimeForWait = Math.max(currentSimulationTime, sTime);
    } else {
      startTimeForWait = Math.max(currentSimulationTime, getMillis(picked.createdAt, picked));
    }

    const itemDuration = getDuration(picked) * 60000;
    queueWaitTimes[picked.id] = Math.max(0, Math.floor((startTimeForWait - now) / 60000));
    queueIntervals[picked.id] = { start: startTimeForWait, end: startTimeForWait + itemDuration };
    currentSimulationTime = startTimeForWait + itemDuration;
  }

  return { activeRemainingMinutes, queueWaitTimes, queueIntervals, sortedQueue };
}
