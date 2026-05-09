import React from 'react';
import { useHistory } from '../hooks/useHistory';
import { RefreshCcw, Clock } from 'lucide-react';
import { doc, updateDoc, deleteField } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { BookingStatus } from '../types';
import toast from 'react-hot-toast';

export function HistoryView() {
  const { history, loadingHistory } = useHistory();

  const handleRestore = async (bookingId: string) => {
    try {
      const bookingRef = doc(db, 'bookings', bookingId);
      // Change status back to IN_SERVICE. 
      // Also maybe we need to clear estimatedEndTime if we are restoring?
      // Since it is restored, it continues. If we want it to just go to waiting, we can set WAITING.
      // But the user said "he continues the time that was missing". If we set to IN_SERVICE,
      // it handles it. 
      await updateDoc(bookingRef, {
        status: BookingStatus.IN_SERVICE,
        estimatedEndTime: deleteField() // remove the estimated end time since it's no longer completed
      });
      toast.success('Cliente restaurado para em atendimento!');
    } catch (err) {
      toast.error('Erro ao restaurar cliente');
    }
  };

  const getCompletedTime = (booking: any) => {
    if (!booking.estimatedEndTime) return '';
    let time = 0;
    if (typeof booking.estimatedEndTime.toMillis === 'function') {
      time = booking.estimatedEndTime.toMillis();
    } else if (typeof booking.estimatedEndTime === 'string') {
      time = new Date(booking.estimatedEndTime).getTime();
    } else if (typeof booking.estimatedEndTime === 'number') {
      time = booking.estimatedEndTime;
    }
    
    if (time === 0) return '';
    return new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loadingHistory) {
    return <div className="p-8 text-center text-gray-500">Carregando histórico...</div>;
  }

  if (history.length === 0) {
    return <div className="p-8 text-center text-gray-500 bg-white rounded-xl shadow-sm border border-gray-100">Nenhum corte finalizado recentemente.</div>;
  }

  // Filter to only show today's history to avoid clutter if there's no index
  const todayBegin = new Date();
  todayBegin.setHours(0,0,0,0);
  const todayEnd = new Date();
  todayEnd.setHours(23,59,59,999);

  const todaysHistory = history.filter(h => {
    if (!h.estimatedEndTime) return true;
    let time = 0;
    if (typeof (h.estimatedEndTime as any).toMillis === 'function') time = (h.estimatedEndTime as any).toMillis();
    else if (typeof h.estimatedEndTime === 'string') time = new Date(h.estimatedEndTime).getTime();
    else if (typeof h.estimatedEndTime === 'number') time = h.estimatedEndTime as number;
    return time >= todayBegin.getTime() && time <= todayEnd.getTime();
  });

  if (todaysHistory.length === 0) {
    return <div className="p-8 text-center text-gray-500 bg-white rounded-xl shadow-sm border border-gray-100">Nenhum corte finalizado hoje.</div>;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-800">Cortes Finalizados Hoje</h2>
        <p className="text-sm text-gray-500 mt-1">Aqui você pode ver os clientes finalizados e restaurá-los se necessário.</p>
      </div>
      <div className="divide-y divide-gray-100">
        {todaysHistory.map((booking) => (
          <div key={booking.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
            <div>
              <div className="font-medium text-gray-800">{booking.clientName}</div>
              <div className="text-sm text-gray-500 flex items-center mt-1">
                <Clock className="w-4 h-4 mr-1" />
                Finalizado às {getCompletedTime(booking)}
              </div>
            </div>
            <button
              onClick={() => handleRestore(booking.id)}
              className="flex items-center space-x-2 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <RefreshCcw className="w-4 h-4" />
              <span>Restaurar</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
