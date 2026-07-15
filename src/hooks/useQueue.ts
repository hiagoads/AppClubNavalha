import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Booking, BookingStatus } from '../types';

export function useQueue() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Only active bookings (waiting, in-service, checking-in)
    const q = query(
      collection(db, 'bookings'),
      where('status', 'in', [BookingStatus.WAITING, BookingStatus.CHECKING_IN, BookingStatus.IN_SERVICE, BookingStatus.PAUSED]),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Booking[];
      setBookings(docs);
      setLoading(false);
    }, (error) => {
      console.error("Queue snap error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const activeBookings = bookings.filter(b => b.status === BookingStatus.IN_SERVICE || b.status === BookingStatus.PAUSED);
  const queue = bookings.filter(b => b.status !== BookingStatus.IN_SERVICE && b.status !== BookingStatus.PAUSED);

  return { bookings, queue, activeBookings, loading };
}
