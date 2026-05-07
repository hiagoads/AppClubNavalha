import { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export function useSettings() {
  const [isOpen, setIsOpen] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'general'), (docSnap) => {
      if (docSnap.exists()) {
        setIsOpen(docSnap.data().isOpen ?? true);
      } else {
        // Init if doesn't exist
        setDoc(doc(db, 'settings', 'general'), { isOpen: true }, { merge: true }).catch(() => {
          console.warn("Could not write initial settings, using defaults.");
        });
        setIsOpen(true);
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

  return { isOpen, loading, toggleOpenStatus };
}
