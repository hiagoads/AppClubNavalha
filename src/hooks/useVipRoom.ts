import { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  doc, 
  updateDoc, 
  addDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  limit, 
  getDocs,
  getDoc,
  setDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { VipStation, VipSessionHistory, VipConsoleType, VipStationStatus, VipActiveSession } from '../types';
import toast from 'react-hot-toast';

export const INITIAL_STATIONS: Omit<VipStation, 'id'>[] = [
  {
    name: 'Estação 1',
    consoleModel: 'Fliperama The King of Fighters',
    consoleType: 'arcade',
    status: 'available',
    order: 1,
    currentSession: null,
    createdAt: new Date().toISOString()
  },
  {
    name: 'Estação 2',
    consoleModel: 'PlayStation 2 (PS2)',
    consoleType: 'ps2',
    status: 'available',
    order: 2,
    currentSession: null,
    createdAt: new Date().toISOString()
  },
  {
    name: 'Estação 3',
    consoleModel: 'PlayStation 3 (PS3)',
    consoleType: 'ps3',
    status: 'available',
    order: 3,
    currentSession: null,
    createdAt: new Date().toISOString()
  },
  {
    name: 'Estação 4',
    consoleModel: 'Fliperama Arcade Retrô',
    consoleType: 'retro',
    status: 'available',
    order: 4,
    currentSession: null,
    createdAt: new Date().toISOString()
  },
  {
    name: 'Estação 5',
    consoleModel: 'Console Convidado / Livre',
    consoleType: 'other',
    status: 'available',
    order: 5,
    currentSession: null,
    createdAt: new Date().toISOString()
  }
];

export function useVipRoom() {
  const [stations, setStations] = useState<VipStation[]>([]);
  const [recentHistory, setRecentHistory] = useState<VipSessionHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);

  // 1. Ouvir as estações em tempo real
  useEffect(() => {
    const q = query(collection(db, 'vip_stations'), orderBy('order', 'asc'));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      if (snapshot.empty && !isSeeding) {
        setIsSeeding(true);
        try {
          // Auto-seed das estações iniciais se o banco estiver vazio
          for (const st of INITIAL_STATIONS) {
            await addDoc(collection(db, 'vip_stations'), st);
          }
        } catch (e) {
          console.error("Erro ao inicializar estações VIP:", e);
        } finally {
          setIsSeeding(false);
          setLoading(false);
        }
        return;
      }

      const list: VipStation[] = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() } as VipStation);
      });
      setStations(list);
      setLoading(false);
    }, (err) => {
      console.error("Erro ao carregar estações VIP:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isSeeding]);

  // 2. Ouvir o histórico recente de sessões VIP
  useEffect(() => {
    const historyQuery = query(
      collection(db, 'vip_sessions'), 
      orderBy('endedAt', 'desc'), 
      limit(20)
    );
    const unsubscribe = onSnapshot(historyQuery, (snapshot) => {
      const historyList: VipSessionHistory[] = [];
      snapshot.forEach(docSnap => {
        historyList.push({ id: docSnap.id, ...docSnap.data() } as VipSessionHistory);
      });
      setRecentHistory(historyList);
    }, (err) => {
      console.warn("Erro ao carregar histórico VIP:", err);
    });

    return () => unsubscribe();
  }, []);

  // Adicionar nova estação
  const addStation = async (data: {
    name: string;
    consoleModel: string;
    consoleType: VipConsoleType;
    notes?: string;
  }) => {
    try {
      const newOrder = stations.length > 0 ? Math.max(...stations.map(s => s.order || 0)) + 1 : 1;
      await addDoc(collection(db, 'vip_stations'), {
        name: data.name.trim(),
        consoleModel: data.consoleModel.trim(),
        consoleType: data.consoleType,
        status: 'available',
        order: newOrder,
        currentSession: null,
        notes: data.notes?.trim() || '',
        createdAt: new Date().toISOString()
      });
      toast.success(`Estação "${data.name}" criada com sucesso!`);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao adicionar estação");
    }
  };

  // Atualizar estação (nome, modelo, status, ordem)
  const updateStation = async (stationId: string, updates: Partial<VipStation>) => {
    try {
      await updateDoc(doc(db, 'vip_stations', stationId), {
        ...updates,
        updatedAt: new Date().toISOString()
      });
      toast.success("Estação atualizada com sucesso!");
    } catch (e) {
      console.error(e);
      toast.error("Erro ao atualizar estação");
    }
  };

  // Deletar estação
  const deleteStation = async (stationId: string, stationName: string) => {
    try {
      await deleteDoc(doc(db, 'vip_stations', stationId));
      toast.success(`Estação "${stationName}" excluída.`);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao excluir estação");
    }
  };

  // Iniciar sessão de jogo
  const startSession = async (
    stationId: string, 
    sessionData: {
      clientId: string;
      clientName: string;
      clientAvatar?: string;
      clientWhatsapp?: string;
      totalMinutes: number;
      bonusTypeUsed?: 'vip_hours' | 'unlimited_vip' | 'courtesy' | 'manual';
      bonusId?: string;
      hoursToDeduct?: number;
    }
  ) => {
    try {
      const now = new Date();
      const endTime = new Date(now.getTime() + sessionData.totalMinutes * 60 * 1000);

      const activeSession: VipActiveSession = {
        clientId: sessionData.clientId,
        clientName: sessionData.clientName,
        clientAvatar: sessionData.clientAvatar || '',
        clientWhatsapp: sessionData.clientWhatsapp || '',
        startTime: now.toISOString(),
        endTime: endTime.toISOString(),
        totalMinutes: sessionData.totalMinutes,
        bonusTypeUsed: sessionData.bonusTypeUsed || 'manual',
        bonusId: sessionData.bonusId || '',
        startedBy: 'Admin'
      };

      // 1. Atualizar a estação para ocupada
      await updateDoc(doc(db, 'vip_stations', stationId), {
        status: 'occupied',
        currentSession: activeSession,
        updatedAt: now.toISOString()
      });

      // 2. Se usou bônus de horas VIP, abater do saldo do cliente
      if (sessionData.bonusTypeUsed === 'vip_hours' && sessionData.clientId) {
        try {
          const clientRef = doc(db, 'clients', sessionData.clientId);
          const clientSnap = await getDoc(clientRef);
          if (clientSnap.exists()) {
            const clientData = clientSnap.data();
            const bonuses = clientData.bonuses || [];
            const hoursDeduct = sessionData.hoursToDeduct || 1;

            let updated = false;
            const updatedBonuses = bonuses.map((b: any) => {
              if (
                (!sessionData.bonusId && b.type === 'vip_hours' && (b.usedHours || 0) < (b.totalHours || 0) && !updated) ||
                (sessionData.bonusId && b.id === sessionData.bonusId)
              ) {
                updated = true;
                const newUsed = Math.min((b.usedHours || 0) + hoursDeduct, b.totalHours || hoursDeduct);
                return {
                  ...b,
                  usedHours: newUsed,
                  isRedeemed: newUsed >= (b.totalHours || 0)
                };
              }
              return b;
            });

            if (updated) {
              await updateDoc(clientRef, { bonuses: updatedBonuses });
            }
          }
        } catch (bonusErr) {
          console.warn("Aviso ao abater bônus do cliente:", bonusErr);
        }
      }

      toast.success(`Sessão iniciada na máquina para ${sessionData.clientName}! 🎮`);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao iniciar sessão");
    }
  };

  // Adicionar mais tempo à sessão em andamento
  const addTimeToSession = async (stationId: string, additionalMinutes: number) => {
    try {
      const station = stations.find(s => s.id === stationId);
      if (!station || !station.currentSession) return;

      const currentEnd = new Date(station.currentSession.endTime);
      // Se o tempo já expirou, estende a partir de agora; senão, a partir do fim atual
      const baseTime = currentEnd.getTime() > Date.now() ? currentEnd.getTime() : Date.now();
      const newEnd = new Date(baseTime + additionalMinutes * 60 * 1000);
      const newTotalMinutes = (station.currentSession.totalMinutes || 0) + additionalMinutes;

      await updateDoc(doc(db, 'vip_stations', stationId), {
        'currentSession.endTime': newEnd.toISOString(),
        'currentSession.totalMinutes': newTotalMinutes,
        updatedAt: new Date().toISOString()
      });

      toast.success(`+${additionalMinutes} minutos adicionados com sucesso!`);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao adicionar tempo");
    }
  };

  // Finalizar sessão
  const endSession = async (stationId: string) => {
    try {
      const station = stations.find(s => s.id === stationId);
      if (!station) return;

      const session = station.currentSession;
      if (session) {
        // Gravar no histórico de sessões
        try {
          const now = new Date();
          const start = new Date(session.startTime);
          const duration = Math.round((now.getTime() - start.getTime()) / (60 * 1000));

          await addDoc(collection(db, 'vip_sessions'), {
            stationId: station.id,
            stationName: station.name,
            consoleModel: station.consoleModel,
            clientId: session.clientId,
            clientName: session.clientName,
            clientAvatar: session.clientAvatar || '',
            clientWhatsapp: session.clientWhatsapp || '',
            startTime: session.startTime,
            endTime: session.endTime,
            durationMinutes: duration,
            bonusTypeUsed: session.bonusTypeUsed || 'manual',
            endedAt: now.toISOString(),
            endedBy: 'Admin'
          });
        } catch (histErr) {
          console.warn("Erro ao salvar histórico de sessão:", histErr);
        }
      }

      // Liberar máquina
      await updateDoc(doc(db, 'vip_stations', stationId), {
        status: 'available',
        currentSession: null,
        updatedAt: new Date().toISOString()
      });

      toast.success(`Estação "${station.name}" liberada! Máquina pronta para o próximo jogador.`);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao liberar estação");
    }
  };

  return {
    stations,
    recentHistory,
    loading,
    addStation,
    updateStation,
    deleteStation,
    startSession,
    addTimeToSession,
    endSession
  };
}
