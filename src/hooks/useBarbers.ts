import { useState, useEffect } from 'react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Barber } from '../types';

export function useBarbers() {
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'barbers'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const bData: Barber[] = [];
      snapshot.forEach(doc => {
        bData.push({ id: doc.id, ...doc.data() } as Barber);
      });
      setBarbers(bData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { barbers, loading };
}
