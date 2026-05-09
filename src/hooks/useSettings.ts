import { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export function useSettings() {
  const [isOpen, setIsOpen] = useState(true);
  const [schedulingFee, setSchedulingFee] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'general'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setIsOpen(data.isOpen ?? true);
        setSchedulingFee(data.schedulingFee ?? 0);
      } else {
        // Init if doesn't exist
        setDoc(doc(db, 'settings', 'general'), { isOpen: true, schedulingFee: 0 }, { merge: true }).catch(() => {
          console.warn("Could not write initial settings, using defaults.");
        });
        setIsOpen(true);
        setSchedulingFee(0);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const toggleOpenStatus = async (currentStatus: boolean) => {
    try {
      await setDoc(doc(db, 'settings', 'general'), { isOpen: !currentStatus }, { merge: true });
    } catch (err) {
      console.error("Error toggling shop status", err);
    }
  };

  const updateSchedulingFee = async (fee: number) => {
    try {
      await setDoc(doc(db, 'settings', 'general'), { schedulingFee: fee }, { merge: true });
    } catch (err) {
      console.error("Error updating scheduling fee", err);
      throw err;
    }
  };

  return { isOpen, schedulingFee, loading, toggleOpenStatus, updateSchedulingFee };
}
