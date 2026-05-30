import React from 'react';
import { Booking } from '../types';
import { updateDoc, doc, writeBatch, deleteField } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ArrowUp, ArrowDown, Clock, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';

interface QueueLogViewProps {
  queue: Booking[];
  sortedQueue: Booking[];
  exactStartTimes: Record<string, number>;
}

export default function QueueLogView({ queue, sortedQueue, exactStartTimes }: QueueLogViewProps) {
  
  const handleResetPriority = async () => {
    try {
      const batch = writeBatch(db);
      queue.forEach(q => {
        if (q.priority !== undefined || q.delayOffset !== undefined) {
           batch.update(doc(db, 'bookings', q.id), { priority: deleteField(), delayOffset: deleteField() });
        }
      });
      await batch.commit();
      toast.success('Ordem restaurada para o padrão cronológico');
    } catch(err) {
      toast.error('Erro ao restaurar ordem');
    }
  };

  const moveUp = async (idx: number) => {
    if (idx === 0) return;
    const newQueue = [...sortedQueue];
    const temp = newQueue[idx];
    newQueue[idx] = newQueue[idx - 1];
    newQueue[idx - 1] = temp;

    try {
      const batch = writeBatch(db);
      const basePriority = Date.now() - (newQueue.length * 1000); 
      newQueue.forEach((booking, i) => {
        const newPriority = basePriority + (i * 1000);
        batch.update(doc(db, 'bookings', booking.id), { 
          priority: newPriority,
          delayOffset: deleteField()
        });
      });
      await batch.commit();
    } catch (err) {
      toast.error('Erro ao reordenar');
    }
  };

  const moveDown = async (idx: number) => {
    if (!sortedQueue || idx === sortedQueue.length - 1) return;
    const newQueue = [...sortedQueue];
    const temp = newQueue[idx];
    newQueue[idx] = newQueue[idx + 1];
    newQueue[idx + 1] = temp;

    try {
      const batch = writeBatch(db);
      const basePriority = Date.now() - (newQueue.length * 1000); 
      newQueue.forEach((booking, i) => {
        const newPriority = basePriority + (i * 1000);
        batch.update(doc(db, 'bookings', booking.id), { 
          priority: newPriority,
          delayOffset: deleteField()
        });
      });
      await batch.commit();
    } catch (err) {
      toast.error('Erro ao reordenar');
    }
  };

  const formatTimeStr = (ms: number) => {
    if (!ms || isNaN(ms)) return '--:--';
    return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getArrivalStr = (item: Booking) => {
    if (item.type === 'scheduled') {
       return `Agendado: ${item.scheduledTime}`;
    }
    const dt = typeof item.createdAt === 'number' ? item.createdAt : 
               (typeof (item.createdAt as any)?.toMillis === 'function' ? (item.createdAt as any).toMillis() : new Date(item.createdAt).getTime());
    return `Chegada: ${formatTimeStr(dt)}`;
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex justify-between items-center sm:items-end bg-white/5 p-4 rounded-xl border border-white/10">
        <div>
          <h2 className="text-xl font-display font-bold gold-text-gradient">Log de Fila (Controle Manual)</h2>
          <p className="text-sm text-white/50 mt-1">
            Aqui você tem controle total sobre a ordem dos clientes. Use as setas para forçar a posição de um cliente.
          </p>
        </div>
        <button 
           onClick={handleResetPriority}
           className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 px-4 py-2 rounded-lg text-sm font-bold transition-colors"
        >
          <RotateCcw className="w-4 h-4" /> Restaurar Ordem Original
        </button>
      </div>

      <div className="bg-[#1A1A1A] border border-white/10 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto min-h-[50vh]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-white/10 text-xs uppercase tracking-widest text-white/50 font-bold">
                <th className="p-4 w-12 text-center">#</th>
                <th className="p-4">Cliente</th>
                <th className="p-4">Serviço/Status</th>
                <th className="p-4">Regra de Entrada</th>
                <th className="p-4">Início Previsto</th>
                <th className="p-4 text-center">Ações (Ordem)</th>
              </tr>
            </thead>
            <tbody>
              {sortedQueue.length === 0 ? (
                 <tr>
                   <td colSpan={6} className="text-center p-8 text-white/40">Nenhum cliente na fila no momento.</td>
                 </tr>
              ) : sortedQueue.map((item, idx) => (
                <tr key={item.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="p-4 text-center text-white/30 font-mono">{idx + 1}</td>
                  <td className="p-4">
                    <div className="font-bold text-white/90">{item.clientName}</div>
                    <div className="text-xs text-white/40 mt-1 uppercase font-bold tracking-wider">
                       {item.type === 'walk-in' ? 'PRESENCIAL' : 'AGENDADO'}
                       {item.priority !== undefined && <span className="text-gold ml-2">- ORDEM MODIFICADA</span>}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="text-sm text-gold font-medium truncate max-w-[150px] sm:max-w-xs">{item.serviceId}</div>
                  </td>
                  <td className="p-4">
                    <div className="text-sm font-mono text-white/70 bg-black/40 inline-flex px-2 py-1 rounded">
                       {getArrivalStr(item)}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2 text-white/90">
                       <Clock className="w-4 h-4 text-gold" /> 
                       {exactStartTimes[item.id] ? formatTimeStr(exactStartTimes[item.id]) : '--'}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-1 bg-black/40 rounded-lg w-max mx-auto overflow-hidden">
                       <button
                         onClick={() => moveUp(idx)}
                         disabled={idx === 0}
                         className="p-2 hover:bg-gold hover:text-carbon disabled:opacity-30 text-white/50 transition-colors"
                       >
                          <ArrowUp className="w-4 h-4" />
                       </button>
                       <div className="w-px h-6 bg-white/10" />
                       <button
                         onClick={() => moveDown(idx)}
                         disabled={idx === sortedQueue.length - 1}
                         className="p-2 hover:bg-gold hover:text-carbon disabled:opacity-30 text-white/50 transition-colors"
                       >
                          <ArrowDown className="w-4 h-4" />
                       </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
