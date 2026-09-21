import { useState, useEffect } from 'react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { BarberBreak } from '../types';

export function useBreaks() {
  const [breaks, setBreaks] = useState<BarberBreak[]>([]);
  const [now, setNow] = useState(Date.now());

  // Update clock every second for smooth countdowns and status transitions
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'breaks'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const currentNow = Date.now();
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as BarberBreak[];
      
      // Filter breaks that have not finished yet (within reasonable bounds, e.g. ended less than 1 hour ago)
      const validBreaks = docs.filter(b => {
        const endTime = (b.startTime || currentNow) + (b.duration || 0) * 60000;
        return endTime > currentNow - 60000; // keep until 1 min after ending
      });

      // Sort: active first, then by startTime
      validBreaks.sort((a, b) => (a.startTime || 0) - (b.startTime || 0));
      setBreaks(validBreaks);
    }, (err) => { 
      if(err.code !== "permission-denied") console.error("Error loading breaks:", err); 
    });

    return () => unsubscribe();
  }, []);

  // Compute active breaks (currently happening)
  const activeBreaks = breaks.filter(b => {
    const start = b.startTime || 0;
    const end = start + (b.duration || 0) * 60000;
    return b.type === 'now' || (now >= start && now < end);
  });

  // Compute upcoming scheduled breaks
  const upcomingBreaks = breaks.filter(b => {
    const start = b.startTime || 0;
    return b.type !== 'now' && start > now;
  });

  // Compute after-current breaks
  const afterCurrentBreaks = breaks.filter(b => b.type === 'after_current');

  return { 
    breaks, 
    activeBreaks, 
    upcomingBreaks, 
    afterCurrentBreaks,
    now 
  };
}
