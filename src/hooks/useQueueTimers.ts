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

    let calculationNow = now;
    if (activeBooking.status === 'paused' && activeBooking.pausedAt) {
      if (typeof (activeBooking.pausedAt as any).toMillis === 'function') {
        calculationNow = (activeBooking.pausedAt as any).toMillis();
      } else if (typeof activeBooking.pausedAt === 'string') {
        calculationNow = new Date(activeBooking.pausedAt).getTime();
      } else if (typeof activeBooking.pausedAt === 'number') {
        calculationNow = activeBooking.pausedAt;
      }
    }

    let elapsedMillis = calculationNow - startTimeMillis;
    if (activeBooking.totalPausedDuration) {
      elapsedMillis -= activeBooking.totalPausedDuration;
    }

    const elapsedMinutes = Math.floor(elapsedMillis / 60000);
    
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

  // Dynamic sorting algorithm
  const getMillis = (dateObj: any) => {
     let time = Date.now(); // Default to now for pending serverTimestamp()
     if (dateObj) {
        if (typeof dateObj.toMillis === 'function') time = dateObj.toMillis();
        else if (typeof dateObj === 'string') time = new Date(dateObj).getTime();
        else if (typeof dateObj === 'number') time = dateObj;
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
    return d.getTime();
  };

  const getPriority = (b: any) => {
     if (b.priority) return b.priority;
     if (b.type === 'scheduled') return getSchedTime(b);
     return getMillis(b.createdAt);
  };

  let currentSimTime = now + (activeRemainingMinutes * 60000);
  const queueWaitTimes: Record<string, number> = {};
  const queueIntervals: Record<string, { start: number; end: number }> = {};
  const exactStartTimes: Record<string, number> = {};
  const occupiedIntervals: { start: number; end: number; id: string }[] = [];
  
  for (const b of breaks) {
      occupiedIntervals.push({ start: b.startTime, end: b.startTime + (b.duration * 60000), id: b.id });
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

  // 1. Process scheduled items first so they anchor to their times
  const scheduledItems = queue.filter(b => b.type === 'scheduled').sort((a,b) => {
      // If manually reordered among themselves, respect that
      if (a.priority !== undefined && b.priority !== undefined) return a.priority - b.priority;
      return getSchedTime(a) - getSchedTime(b);
  });
  
  for (const sb of scheduledItems) {
      const durationMs = getDuration(sb) * 60000;
      let proposedStart = Math.max(currentSimTime, getSchedTime(sb));
      
      const actualStart = findNextGap(proposedStart, durationMs, occupiedIntervals);
      const actualEnd = actualStart + durationMs;

      occupiedIntervals.push({ start: actualStart, end: actualEnd, id: sb.id });
      exactStartTimes[sb.id] = actualStart;
      queueWaitTimes[sb.id] = Math.max(0, Math.floor((actualStart - now) / 60000));
      queueIntervals[sb.id] = { start: actualStart, end: actualEnd };
  }

  // 2. Process walk-ins, filling the gaps
  const walkinItems = queue.filter(b => b.type !== 'scheduled').sort((a,b) => {
      // Respect manual reordering priority for walkins
      if (a.priority !== undefined && b.priority !== undefined) return a.priority - b.priority;
      if (a.priority !== undefined) return -1;
      if (b.priority !== undefined) return 1;
      
      return getMillis(a.createdAt) - getMillis(b.createdAt);
  });

  for (const wk of walkinItems) {
      const durationMs = getDuration(wk) * 60000;
      // Walk-ins always look for the earliest possible gap from currentSimTime!
      let proposedStart = currentSimTime;
      
      const actualStart = findNextGap(proposedStart, durationMs, occupiedIntervals);
      const actualEnd = actualStart + durationMs;

      occupiedIntervals.push({ start: actualStart, end: actualEnd, id: wk.id });
      exactStartTimes[wk.id] = actualStart;
      queueWaitTimes[wk.id] = Math.max(0, Math.floor((actualStart - now) / 60000));
      queueIntervals[wk.id] = { start: actualStart, end: actualEnd };
  }

  const sortedQueue = [...queue].sort((a, b) => {
      // Sort purely by their effectively calculated start times!
      const timeDiff = exactStartTimes[a.id] - exactStartTimes[b.id];
      if (timeDiff !== 0) return timeDiff;
      
      // Fallback
      if (a.type === 'scheduled' && b.type !== 'scheduled') return -1;
      if (a.type !== 'scheduled' && b.type === 'scheduled') return 1;
      return 0;
  });

  return { activeRemainingMinutes, queueWaitTimes, queueIntervals, sortedQueue };
}
