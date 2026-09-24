import React, { useState } from 'react';
import { useHistory } from '../hooks/useHistory';
import { RefreshCcw, Clock, Trash2, Loader2 } from 'lucide-react';
import { doc, updateDoc, deleteField, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { BookingStatus } from '../types';
import { revertCompletedBookingGamification } from '../utils/revertBookingGamification';
import { useGamificationSettings } from '../hooks/useGamificationSettings';
import toast from 'react-hot-toast';

export function HistoryView() {
  const { history, loadingHistory } = useHistory();
  const { tierThresholds } = useGamificationSettings();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isProcessingId, setIsProcessingId] = useState<string | null>(null);

  const handleRestore = async (booking: any) => {
    setIsProcessingId(booking.id);
    try {
      // Reverte os pontos, XP, nível, patente e bônus que foram ganhos com a finalização desse serviço
      const revertResult = await revertCompletedBookingGamification(
        booking,
        'Atendimento restaurado para a fila',
        tierThresholds
      );

      const bookingRef = doc(db, 'bookings', booking.id);
      await updateDoc(bookingRef, {
        status: BookingStatus.IN_SERVICE,
        estimatedEndTime: deleteField(),
        pointsAwarded: deleteField(),
        isPaid: false,
        paidAt: deleteField()
      });

      if (revertResult.reverted && revertResult.pointsDeducted) {
        toast.success(`Cliente restaurado! ${revertResult.pointsDeducted} pontos/XP foram estornados.`);
      } else {
        toast.success('Cliente restaurado para em atendimento!');
      }
    } catch (err) {
      console.error('Erro ao restaurar cliente:', err);
      toast.error('Erro ao restaurar cliente');
    } finally {
      setIsProcessingId(null);
    }
  };

  const handleDelete = async (booking: any) => {
    setIsProcessingId(booking.id);
    try {
      // Reverte os pontos, XP, nível, patente e bônus concedidos por esse serviço
      const revertResult = await revertCompletedBookingGamification(
        booking,
        'Registro de serviço excluído pelo administrador',
        tierThresholds
      );

      await deleteDoc(doc(db, 'bookings', booking.id));

      if (revertResult.reverted && revertResult.pointsDeducted) {
        toast.success(`Registro excluído! ${revertResult.pointsDeducted} pontos estornados de ${revertResult.clientName || 'cliente'}.`);
      } else {
        toast.success('Registro excluído com sucesso!');
      }
      setConfirmDeleteId(null);
    } catch (error) {
      console.error('Erro ao excluir registro:', error);
      toast.error('Erro ao excluir registro');
    } finally {
      setIsProcessingId(null);
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
        <p className="text-sm text-gray-500 mt-1">
          Ao excluir ou restaurar um registro, todos os pontos, XP, nível, patente e bônus adquiridos pelo cliente são automaticamente subtraídos.
        </p>
      </div>
      <div className="divide-y divide-gray-100">
        {todaysHistory.map((booking) => {
          const isBusy = isProcessingId === booking.id;
          return (
            <div key={booking.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
              <div>
                <div className="font-medium text-gray-800 flex items-center gap-2">
                  <span>{booking.clientName}</span>
                  {typeof booking.pointsAwarded === 'number' && booking.pointsAwarded > 0 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 border border-amber-500/20">
                      +{booking.pointsAwarded} pts
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-500 flex items-center mt-1">
                  <Clock className="w-4 h-4 mr-1" />
                  Finalizado às {getCompletedTime(booking)}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  disabled={isBusy}
                  onClick={() => handleRestore(booking)}
                  className="flex items-center space-x-2 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
                  title="Restaurar atendimento"
                >
                  {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
                  <span className="hidden sm:inline">Restaurar</span>
                </button>
                <button
                  disabled={isBusy}
                  onClick={() => {
                    if (confirmDeleteId === booking.id) {
                      handleDelete(booking);
                    } else {
                      setConfirmDeleteId(booking.id);
                      setTimeout(() => setConfirmDeleteId(null), 3000);
                    }
                  }}
                  className={`flex items-center space-x-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 ${confirmDeleteId === booking.id ? 'text-white bg-red-600 hover:bg-red-700' : 'text-red-600 bg-red-50 hover:bg-red-100'}`}
                  title="Excluir registro"
                >
                  {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  <span className="hidden sm:inline">
                    {confirmDeleteId === booking.id ? 'Confirmar' : 'Excluir'}
                  </span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
