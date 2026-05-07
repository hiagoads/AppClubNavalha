import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { BarberBreak } from '../types';

export function useBreaks() {
  const [breaks, setBreaks] = useState<BarberBreak[]>([]);

  useEffect(() => {
    // We only need future breaks or currently active breaks. We'll just fetch all for today and filter.
    // For simplicity, we just fetch all and filter in memory, or use a where clause if start times are indexed.
    // We will just fetch all breaks that have not ended yet.
    // Since we store startTime as number
    const q = query(
      collection(db, 'breaks'),
      where('startTime', '>=', Date.now() - 24 * 60 * 60 * 1000) // from up to 24h ago
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const now = Date.now();
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as BarberBreak[];
      
      const activeOrFutureBreaks = docs.filter(b => (b.startTime + b.duration * 60000) > now);
      setBreaks(activeOrFutureBreaks);
    });

    return () => unsubscribe();
  }, []);

  return { breaks };
}
