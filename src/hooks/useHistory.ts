import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Booking, BookingStatus } from '../types';

export function useHistory() {
  const [history, setHistory] = useState<Booking[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    // To avoid requiring a complex composite index immediately, we can just fetch all COMPLETED
    // If the data grows too large, we should add an index and filter by date.
    // For now, let's fetch the most recent completed
    // Since complex queries might require manual index creation from Firebase Console,
    // let's just do a simple query where status == COMPLETED and limit to 50.
    const q = query(
      collection(db, 'bookings'),
      where('status', '==', BookingStatus.COMPLETED),
      // We will sort them below to avoid index issues if we sort by estimatedEndTime (desc) without an index
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Booking[];
      
      // Sort by estimatedEndTime descending on the client
      docs.sort((a, b) => {
        const timeA = a.estimatedEndTime && typeof (a.estimatedEndTime as any).toMillis === 'function' ? (a.estimatedEndTime as any).toMillis() : 0;
        const timeB = b.estimatedEndTime && typeof (b.estimatedEndTime as any).toMillis === 'function' ? (b.estimatedEndTime as any).toMillis() : 0;
        return timeB - timeA;
      });

      setHistory(docs);
      setLoadingHistory(false);
    }, (error) => {
      console.error("History snap error:", error);
      setLoadingHistory(false);
    });

    return () => unsubscribe();
  }, []);

  return { history, loadingHistory };
}
