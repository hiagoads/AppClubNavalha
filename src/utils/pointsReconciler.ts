import { collection, getDocs, doc, updateDoc, query, where, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { DEFAULT_THRESHOLDS, getLevelTier, parseDateToMs } from './tierSystem';
import { checkAndSyncClientRankBonuses, RankBonusDefinition, getActiveRankBonuses, DEFAULT_RANK_BONUSES } from './bonusSystem';

/**
 * Retorna o início exato da semana corrente com base no último fechamento (lastWeekClosedAt).
 * Se o fechamento semanal foi há menos de 7 dias, essa data/hora é o marco zero da semana atual.
 * Caso contrário, calcula o domingo mais recente às 00:00:00 (início do ciclo semanal padrão).
 * 
 * Isso garante estritamente que pontuações de semanas anteriores NÃO interfiram no ranking semanal!
 */
export function getCurrentWeekWindow(lastWeekClosedAt?: any): { startTime: Date; startIso: string; weekStartMs: number } {
  const now = new Date();

  // 1. Domingo mais recente às 00:00:00 (marco padrão de início da semana)
  const startOfWeek = new Date(now);
  const day = startOfWeek.getDay(); // 0 = Domingo, 1 = Segunda, etc.
  startOfWeek.setDate(startOfWeek.getDate() - day);
  startOfWeek.setHours(0, 0, 0, 0);
  startOfWeek.setMilliseconds(0);

  // 2. Se houver data de encerramento manual registrada pelo barbeiro
  if (lastWeekClosedAt) {
    const closedMs = parseDateToMs(lastWeekClosedAt);
    if (closedMs > 0 && closedMs <= now.getTime()) {
      const diffMs = now.getTime() - closedMs;
      // Se foi fechado nos últimos 7 dias, a data/hora exata do fechamento é o início da semana atual
      if (diffMs <= 7 * 24 * 60 * 60 * 1000) {
        const closedDate = new Date(closedMs);
        return { 
          startTime: closedDate, 
          startIso: closedDate.toISOString(),
          weekStartMs: closedMs
        };
      }
    }
  }

  return { 
    startTime: startOfWeek, 
    startIso: startOfWeek.toISOString(),
    weekStartMs: startOfWeek.getTime()
  };
}

export interface ReconcileResult {
  checkedCount: number;
  updatedCount: number;
  rankingsFixedCount: number;
  tiersFixedCount: number;
  errorsCount: number;
  currentWeekStart: string;
}

let isReconcilingGlobal = false;

/**
 * Motor de Verificação e Reconciliação Periódica (a cada minuto) e em Tempo Real:
 * 1. Determina a janela temporal da semana atual (atenta à data dos créditos/débitos).
 * 2. Examina todos os clientes cadastrados.
 * 3. Analisa transações (point_transactions) e atendimentos finalizados (bookings com pointsAwarded).
 * 4. Garante estritamente que pontuações da semana passada NÃO interfiram no ranking semanal.
 * 5. Garante que qualquer cliente que pontuou nesta semana esteja no ranking com pontuação precisa.
 * 6. Reconcilia e atualiza a Patente do cliente com base nos pontos de pico e metas do admin.
 * 7. Concede automaticamente os bônus de patente pendentes se o cliente subiu de nível.
 */
export async function reconcileAllClientsPointsAndTiers(options?: {
  thresholds?: number[];
  lastWeekClosedAt?: string;
  rankBonuses?: RankBonusDefinition[];
  forceFull?: boolean;
}): Promise<ReconcileResult> {
  if (isReconcilingGlobal) {
    return {
      checkedCount: 0,
      updatedCount: 0,
      rankingsFixedCount: 0,
      tiersFixedCount: 0,
      errorsCount: 0,
      currentWeekStart: new Date().toISOString()
    };
  }

  isReconcilingGlobal = true;

  const result: ReconcileResult = {
    checkedCount: 0,
    updatedCount: 0,
    rankingsFixedCount: 0,
    tiersFixedCount: 0,
    errorsCount: 0,
    currentWeekStart: ''
  };

  try {
    // 1. Obter configurações de gamificação se não fornecidas
    let effectiveThresholds = options?.thresholds;
    let closedAt = options?.lastWeekClosedAt;
    let effectiveRankBonuses = options?.rankBonuses;

    if (!effectiveThresholds || !closedAt || !effectiveRankBonuses) {
      try {
        const settingsSnap = await getDoc(doc(db, 'settings', 'gamification'));
        if (settingsSnap.exists()) {
          const sData = settingsSnap.data();
          if (!effectiveThresholds && Array.isArray(sData.tierThresholds)) {
            effectiveThresholds = sData.tierThresholds;
          }
          if (!closedAt && sData.lastWeekClosedAt) {
            closedAt = sData.lastWeekClosedAt;
          }
          if (!effectiveRankBonuses && Array.isArray(sData.rankBonuses)) {
            effectiveRankBonuses = sData.rankBonuses;
          }
        }
      } catch (err) {
        // ignora se falhar
      }
    }

    const { startTime, startIso, weekStartMs } = getCurrentWeekWindow(closedAt);
    result.currentWeekStart = startIso;
    const thresholdsToUse = effectiveThresholds && effectiveThresholds.length >= 8 ? effectiveThresholds : DEFAULT_THRESHOLDS;
    const bonusesToUse = effectiveRankBonuses || getActiveRankBonuses() || DEFAULT_RANK_BONUSES;

    // 2. Carregar todos os clientes sem limites arbitrários
    const clientsSnap = await getDocs(collection(db, 'clients'));
    const clientsList = clientsSnap.docs.map(d => ({ id: d.id, ...d.data() as any }));
    result.checkedCount = clientsList.length;

    if (clientsList.length === 0) {
      return result;
    }

    // Cria índice rápido de clientes por telefone limpo e por nome
    const clientByCleanPhone: Record<string, any> = {};
    for (const c of clientsList) {
      const cleanPhone = (c.whatsapp || '').replace(/\D/g, '');
      if (cleanPhone) {
        clientByCleanPhone[cleanPhone] = c;
      }
    }

    // 3. Carregar transações de pontos
    const transactionsByClient: Record<string, any[]> = {};
    const existingTxBookingIds = new Set<string>();

    try {
      const txSnap = await getDocs(collection(db, 'point_transactions'));
      txSnap.docs.forEach(d => {
        const tx = d.data();
        const cId = tx.clientId;
        if (tx.bookingId) {
          existingTxBookingIds.add(String(tx.bookingId));
        }
        if (cId) {
          if (!transactionsByClient[cId]) {
            transactionsByClient[cId] = [];
          }
          transactionsByClient[cId].push({ id: d.id, ...tx });
        }
      });
    } catch (txErr) {
      console.warn('Aviso: Não foi possível carregar point_transactions globais:', txErr);
    }

    // 4. Carregar atendimentos finalizados (bookings com status == 'completed')
    // para capturar pontuações legítimas que possam não ter gerado transação em point_transactions
    const completedBookingsByClient: Record<string, any[]> = {};
    try {
      const bookingsSnap = await getDocs(query(collection(db, 'bookings'), where('status', '==', 'completed')));
      bookingsSnap.docs.forEach(d => {
        const b = d.data();
        const bId = d.id;
        const pts = Number(b.pointsAwarded || 0);

        if (pts > 0) {
          // Identifica o cliente associado ao booking
          let targetClientId = b.awardedClientId || b.clientId;

          if (!targetClientId && b.clientWhatsapp) {
            const cleanPhone = String(b.clientWhatsapp).replace(/\D/g, '');
            if (cleanPhone && clientByCleanPhone[cleanPhone]) {
              targetClientId = clientByCleanPhone[cleanPhone].id;
            } else if (cleanPhone) {
              // Tenta substring
              const found = Object.keys(clientByCleanPhone).find(p => p.endsWith(cleanPhone) || cleanPhone.endsWith(p));
              if (found) {
                targetClientId = clientByCleanPhone[found].id;
              }
            }
          }

          if (targetClientId) {
            if (!completedBookingsByClient[targetClientId]) {
              completedBookingsByClient[targetClientId] = [];
            }
            completedBookingsByClient[targetClientId].push({ id: bId, ...b, pointsAwarded: pts });
          }
        }
      });
    } catch (bErr) {
      console.warn('Aviso: Não foi possível carregar bookings completados:', bErr);
    }

    const nowIso = new Date().toISOString();

    // 5. Analisar cada cliente
    for (const client of clientsList) {
      try {
        let needsUpdate = false;
        const updatePayload: Record<string, any> = {};

        // A) Cálculo estrito dos pontos da semana corrente (weeklyPoints)
        const clientTxs = transactionsByClient[client.id] || [];
        const clientCompletedBookings = completedBookingsByClient[client.id] || [];

        let calculatedWeeklyPoints = 0;
        let hasActivityThisWeek = false;

        // 1. Processa point_transactions da semana atual
        for (const tx of clientTxs) {
          const txTime = parseDateToMs(tx.createdAt) || parseDateToMs(tx.date);
          if (txTime >= weekStartMs) {
            hasActivityThisWeek = true;
            const pts = Number(tx.points || 0);
            
            // Adições e ganhos
            if (tx.type === 'earned' || tx.type === 'manual_add' || tx.type === 'bonus' || pts > 0) {
              calculatedWeeklyPoints += Math.max(0, pts);
            } 
            // Deduções e estornos
            else if (tx.type === 'manual_remove' || tx.type === 'adjusted' || tx.type === 'reverted' || pts < 0) {
              calculatedWeeklyPoints += pts; // pts é negativo, reduz pontuação semanal
            }
          }
        }

        // 2. Processa atendimentos completados da semana que ainda não estejam em point_transactions
        for (const b of clientCompletedBookings) {
          if (!existingTxBookingIds.has(b.id)) {
            const bTime = parseDateToMs(b.paidAt) || parseDateToMs(b.estimatedEndTime) || parseDateToMs(b.updatedAt) || parseDateToMs(b.createdAt);
            if (bTime >= weekStartMs) {
              hasActivityThisWeek = true;
              calculatedWeeklyPoints += Math.max(0, b.pointsAwarded || 0);
            }
          }
        }

        calculatedWeeklyPoints = Math.max(0, calculatedWeeklyPoints);

        // 3. Se o cliente não tem transações registradas nesta semana:
        // Avalia a data de último update de pontos (lastPointsUpdate)
        if (!hasActivityThisWeek) {
          const lastUpdateMs = parseDateToMs(client.lastPointsUpdate) || parseDateToMs(client.updatedAt);

          // Se a última pontuação foi comprovadamente nesta semana e o cliente tem weeklyPoints > 0, preservamos
          if (lastUpdateMs >= weekStartMs && (client.weeklyPoints || 0) > 0) {
            calculatedWeeklyPoints = Math.max(0, client.weeklyPoints || 0);
          } else {
            // Se a última pontuação foi ANTES da semana atual (semana passada ou anterior),
            // os pontos da semana passada NÃO DEVEM interferir no ranking semanal!
            calculatedWeeklyPoints = 0;
          }
        }

        // Verifica se os weeklyPoints do cliente no banco estão desatualizados
        const currentWeeklyInDb = client.weeklyPoints ?? 0;
        if (currentWeeklyInDb !== calculatedWeeklyPoints) {
          updatePayload.weeklyPoints = calculatedWeeklyPoints;
          needsUpdate = true;
          result.rankingsFixedCount++;
        }

        // B) Cálculo da Patente correta e pontos de pico
        const peakPoints = Math.max(
          0,
          client.seasonHighestPoints ?? 0,
          client.highestSeasonalPoints ?? 0,
          client.seasonalPoints ?? 0,
          client.points ?? 0
        );

        const currentHighestTier = Math.max(
          1,
          client.seasonHighestTierLevel ?? 1,
          client.highestTierLevel ?? 1
        );

        const calculatedTier = getLevelTier(
          peakPoints, 
          thresholdsToUse, 
          currentHighestTier
        );

        const newHighestTier = Math.max(currentHighestTier, calculatedTier.tierLevel);

        // Nível vitalício (1 por 10.000 pts)
        const lifetime = Math.max(0, client.lifetimePoints ?? Math.max(client.points || 0, client.seasonalPoints || 0, peakPoints));
        const calculatedLevel = Math.floor(lifetime / 10000) + 1;

        if (client.level !== calculatedTier.tierLevel ||
            client.seasonHighestTierLevel !== newHighestTier ||
            client.highestTierLevel !== newHighestTier ||
            (client.seasonHighestPoints ?? 0) < peakPoints ||
            client.level !== calculatedLevel) {
          
          updatePayload.level = calculatedTier.tierLevel;
          updatePayload.seasonHighestTierLevel = newHighestTier;
          updatePayload.highestTierLevel = newHighestTier;
          updatePayload.seasonHighestPoints = peakPoints;
          updatePayload.highestSeasonalPoints = peakPoints;
          needsUpdate = true;
          result.tiersFixedCount++;
        }

        // C) Aplicar atualização no banco se necessário
        if (needsUpdate) {
          updatePayload.lastReconciledAt = nowIso;
          await updateDoc(doc(db, 'clients', client.id), updatePayload);
          result.updatedCount++;

          // Sincronizar bônus de patente se subiu de nível/patente
          try {
            await checkAndSyncClientRankBonuses(
              client.id,
              { ...client, ...updatePayload },
              thresholdsToUse,
              bonusesToUse
            );
          } catch (bonusErr) {
            // ignora erro em bonus individual
          }
        }
      } catch (clientErr) {
        result.errorsCount++;
        console.warn(`Erro ao reconciliar cliente ${client.id}:`, clientErr);
      }
    }
  } catch (err) {
    console.error('Erro global na reconciliação de pontuações e ranking:', err);
    result.errorsCount++;
  } finally {
    isReconcilingGlobal = false;
  }

  return result;
}
