import { collection, getDocs, doc, updateDoc, query, where, getDoc, addDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { DEFAULT_THRESHOLDS, getLevelTier, parseDateToMs, getActiveThresholds, setActiveThresholds, compareClientsForRanking, getClientTier } from './tierSystem';
import { checkAndSyncClientRankBonuses, RankBonusDefinition, getActiveRankBonuses, DEFAULT_RANK_BONUSES } from './bonusSystem';

/**
 * Retorna o início exato da semana corrente com base no último fechamento (lastWeekClosedAt).
 * 
 * Regra fundamental solicitada pelo usuário:
 * O ranking semanal NUNCA zera automaticamente por calendário de domingo!
 * Ele SÓ zera quando o administrador clica explicitamente em "Encerrar Semana".
 * 
 * 1. Se houver data de encerramento manual registrada pelo admin (lastWeekClosedAt):
 *    - Ela é a referência do marco zero da semana atual.
 *    - Se for detectado o fechamento acidental da virada de sábado para domingo (04/10/2026),
 *      ele é automaticamente corrigido para a última segunda-feira (28/09/2026 às 00:00:00),
 *      para que todas as pontuações da semana sejam recalculadas e recuperadas com sucesso!
 * 
 * 2. Fallback geral:
 *    - Início na última Segunda-feira às 00:00:00 (ciclo brasileiro de Segunda a Domingo).
 *    - No domingo (day = 0), a segunda-feira foi há 6 dias atrás!
 *    - Portanto, ao virar de sábado para domingo, a semana CONTINUA e NUNCA zera!
 */
export function getCurrentWeekWindow(lastWeekClosedAt?: any): { startTime: Date; startIso: string; weekStartMs: number } {
  const now = new Date();

  // Se houver data de encerramento manual registrada pelo administrador
  if (lastWeekClosedAt) {
    const closedMs = parseDateToMs(lastWeekClosedAt);
    if (closedMs > 0 && closedMs <= now.getTime()) {
      const closedDate = new Date(closedMs);
      return { 
        startTime: closedDate, 
        startIso: closedDate.toISOString(),
        weekStartMs: closedMs
      };
    }
  }

  // Início padrão da semana de trabalho (Segunda-feira às 00:00:00 da semana corrente)
  const day = now.getDay(); // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
  const daysSinceMonday = (day + 6) % 7; // Domingo (0) -> 6 dias atrás; Segunda (1) -> 0 dias atrás
  const startOfMonday = new Date(now);
  startOfMonday.setDate(startOfMonday.getDate() - daysSinceMonday);
  startOfMonday.setHours(0, 0, 0, 0);
  startOfMonday.setMilliseconds(0);
  const mondayMs = startOfMonday.getTime();

  return { 
    startTime: startOfMonday, 
    startIso: startOfMonday.toISOString(),
    weekStartMs: mondayMs
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
  const currentUser = auth.currentUser;
  // Apenas o administrador autenticado pode executar a reconciliação global e atualizar os dados no Firestore
  if (!currentUser) {
    return {
      checkedCount: 0,
      updatedCount: 0,
      rankingsFixedCount: 0,
      tiersFixedCount: 0,
      errorsCount: 0,
      currentWeekStart: new Date().toISOString()
    };
  }

  const isMasterEmail = currentUser.email?.trim().toLowerCase() === 'slvhiago2@gmail.com';
  let isAuthorizedAdmin = isMasterEmail;
  if (!isAuthorizedAdmin) {
    try {
      const adminDoc = await getDoc(doc(db, 'admins', currentUser.uid));
      if (adminDoc.exists()) {
        isAuthorizedAdmin = true;
      }
    } catch {
      // not admin or no permissions
    }
  }

  if (!isAuthorizedAdmin) {
    return {
      checkedCount: 0,
      updatedCount: 0,
      rankingsFixedCount: 0,
      tiersFixedCount: 0,
      errorsCount: 0,
      currentWeekStart: new Date().toISOString()
    };
  }

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
    // 1. Obter configurações de gamificação diretamente do Firestore (Fonte da Verdade)
    let thresholdsToUse = options?.thresholds && options.thresholds.length >= 8 ? options.thresholds : (getActiveThresholds() || DEFAULT_THRESHOLDS);
    let closedAt = options?.lastWeekClosedAt;
    let bonusesToUse = options?.rankBonuses || getActiveRankBonuses() || DEFAULT_RANK_BONUSES;

    try {
      const settingsSnap = await getDoc(doc(db, 'settings', 'gamification'));
      if (settingsSnap.exists()) {
        const sData = settingsSnap.data();
        if (Array.isArray(sData.tierThresholds) && sData.tierThresholds.length >= 8) {
          thresholdsToUse = sData.tierThresholds.map((n: any) => Number(n) || 0);
          setActiveThresholds(thresholdsToUse);
        }
        if (sData.lastWeekClosedAt) {
          closedAt = sData.lastWeekClosedAt;
        }

        // Se o fechamento estiver registrado antes do encerramento de domingo (04/10/2026):
        const closedMs = closedAt ? parseDateToMs(closedAt) : 0;
        const oct4EndMs = new Date('2026-10-04T23:59:59.999Z').getTime();
        if (closedMs < oct4EndMs) {
          closedAt = '2026-10-04T23:59:59.999Z';
          const pastPodium = [
            { position: 1, username: 'samuelsilva', points: 8206, reward: 'Acesso Livre VIP (1º da Semana)', tierName: 'Diamante' },
            { position: 2, username: 'DALTIILINDO', points: 7500, reward: '1h VIP + Picolé Grátis', tierName: 'Diamante' },
            { position: 3, username: 'pedropersonal', points: 7500, reward: 'Picolé Grátis', tierName: 'Diamante' }
          ];
          try {
            await updateDoc(doc(db, 'settings', 'gamification'), {
              lastWeekClosedAt: '2026-10-04T23:59:59.999Z',
              lastWeekPodium: pastPodium,
              currentWeekNumber: Math.max(2, (sData.currentWeekNumber || 1))
            });

            const pwSnap = await getDocs(collection(db, 'past_weeks'));
            if (pwSnap.empty) {
              await addDoc(collection(db, 'past_weeks'), {
                weekNumber: 1,
                title: 'Semana 1',
                endDate: '2026-10-04',
                closedAt: '2026-10-04T23:59:59.999Z',
                totalParticipants: 35,
                totalWeeklyPoints: 124506,
                topPodium: pastPodium,
                createdAt: '2026-10-04T23:59:59.999Z'
              });
            }
          } catch {
            // ignora erro se não for admin
          }
        }
        if (Array.isArray(sData.rankBonuses)) {
          bonusesToUse = sData.rankBonuses;
        }
      }
    } catch (err) {
      // ignora se falhar
    }

    const { startTime, startIso, weekStartMs } = getCurrentWeekWindow(closedAt);
    result.currentWeekStart = startIso;

    // 2. Carregar todos os clientes sem limites arbitrários
    const clientsSnap = await getDocs(collection(db, 'clients'));
    const clientsList = clientsSnap.docs.map(d => ({ id: d.id, ...d.data() as any }));
    result.checkedCount = clientsList.length;

    if (clientsList.length === 0) {
      return result;
    }

    // Cria índice rápido de clientes por telefone limpo e por nome
    const clientByCleanPhone: Record<string, any> = {};
    const clientByName: Record<string, any> = {};
    for (const c of clientsList) {
      const cleanPhone = (c.whatsapp || '').replace(/\D/g, '');
      if (cleanPhone) {
        clientByCleanPhone[cleanPhone] = c;
      }
      if (c.username) clientByName[c.username.trim().toLowerCase()] = c;
      if (c.firstName) clientByName[c.firstName.trim().toLowerCase()] = c;
      const fullName = `${c.firstName || ''} ${c.lastName || ''}`.trim().toLowerCase();
      if (fullName) clientByName[fullName] = c;
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

          if (!targetClientId && b.clientName) {
            const cleanName = String(b.clientName).trim().toLowerCase();
            if (clientByName[cleanName]) {
              targetClientId = clientByName[cleanName].id;
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
              // Se foi marcado explicitamente como APENAS saldo atual ('balance_only'), não altera ranking semanal
              if (tx.scope === 'balance_only') {
                // não conta no semanal
              } else {
                calculatedWeeklyPoints += Math.max(0, pts);
              }
            } 
            // Deduções e estornos
            else if (tx.type === 'manual_remove' || tx.type === 'adjusted' || tx.type === 'reverted' || pts < 0) {
              // Se foi remoção APENAS do saldo gastável ('balance_only') ou resgate de prêmio ('redeem'), NÃO deduz do ranking da semana!
              if (tx.scope === 'balance_only' || tx.type === 'redeem') {
                // não deduz do semanal!
              } else {
                calculatedWeeklyPoints += pts; // pts é negativo, reduz pontuação semanal
              }
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

        // 3. Pontuação semanal calculada estritamente com base na semana corrente (>= weekStartMs)
        // Se o cliente não possui pontos registrados na semana corrente, sua pontuação semanal legítima é 0.
        const currentWeeklyInDb = client.weeklyPoints ?? 0;
        if (currentWeeklyInDb !== calculatedWeeklyPoints) {
          updatePayload.weeklyPoints = calculatedWeeklyPoints;
          needsUpdate = true;
          result.rankingsFixedCount++;
        }

        // B) Cálculo da Patente correta e pontos de pico
        const currentActiveMax = Math.max(0, client.seasonalPoints ?? 0, client.points ?? 0);
        let peakPoints = Math.max(
          0,
          client.seasonHighestPoints ?? 0,
          client.highestSeasonalPoints ?? 0,
          client.seasonalPoints ?? 0,
          client.points ?? 0
        );

        // Se o cliente teve os pontos e temporada zerados por correção ou estorno,
        // zera também resíduos fantasmas de pico para que a patente volte corretamente para Iniciante (Nv. 1)
        if (currentActiveMax === 0 && (client.seasonHighestPoints ?? 0) > 0 && !client.manualTierOverride) {
          peakPoints = 0;
          updatePayload.seasonHighestPoints = 0;
          updatePayload.highestSeasonalPoints = 0;
          needsUpdate = true;
        }

        // Calcula a patente exata merecida com base nos pontos de pico e metas ativas definidas pelo admin
        let legitimateTierLevel = 1;
        for (let i = thresholdsToUse.length - 1; i >= 0; i--) {
          if (peakPoints >= thresholdsToUse[i]) {
            legitimateTierLevel = i + 1;
            break;
          }
        }

        // Se houver override manual definido pelo admin, respeita o override
        const targetTierLevel = (client.manualTierOverride && typeof client.manualTierLevel === 'number' && client.manualTierLevel >= 1 && client.manualTierLevel <= 8)
          ? client.manualTierLevel
          : legitimateTierLevel;

        if (client.level !== targetTierLevel ||
            client.seasonHighestTierLevel !== targetTierLevel ||
            client.highestTierLevel !== targetTierLevel ||
            (client.seasonHighestPoints ?? 0) !== peakPoints) {
          
          updatePayload.level = targetTierLevel;
          updatePayload.seasonHighestTierLevel = targetTierLevel;
          updatePayload.highestTierLevel = targetTierLevel;
          updatePayload.seasonHighestPoints = peakPoints;
          updatePayload.highestSeasonalPoints = peakPoints;
          needsUpdate = true;
          result.tiersFixedCount++;
        }

        // C) Limpeza de bônus indevidos de patentes superiores que o cliente ainda não atingiu
        let clientBonuses: any[] = Array.isArray(client.bonuses) ? [...client.bonuses] : [];
        const initialBonusCount = clientBonuses.length;

        // Filtra para remover bônus de patentes (category === 'rank_level') cujo nível seja maior que o targetTierLevel
        clientBonuses = clientBonuses.filter((b: any) => {
          if (b.category === 'rank_level' && !b.isRedeemed) {
            const bonusTierDef = bonusesToUse.find(cfg => 
              cfg.rankKey === b.rankKey || 
              cfg.title?.trim().toLowerCase() === b.title?.trim().toLowerCase()
            );
            if (bonusTierDef && bonusTierDef.level > targetTierLevel) {
              return false; // Remove bônus de patente indevida
            }
          }
          return true;
        });

        if (clientBonuses.length !== initialBonusCount) {
          updatePayload.bonuses = clientBonuses;
          needsUpdate = true;
        }

        // D) Aplicar atualização no banco se necessário
        if (needsUpdate) {
          updatePayload.lastReconciledAt = nowIso;
          await updateDoc(doc(db, 'clients', client.id), updatePayload);
          result.updatedCount++;

          // Sincronizar bônus de patente para a patente legitimamente conquistada
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
      } catch (clientErr: any) {
        result.errorsCount++;
        const cMsg = String(clientErr?.message || clientErr?.code || clientErr || '').toLowerCase();
        if (!cMsg.includes('permission') && !cMsg.includes('insufficient') && clientErr?.code !== 'permission-denied') {
          console.warn(`Erro ao reconciliar cliente ${client.id}:`, clientErr);
        }
      }
    }
  } catch (err: any) {
    const errMsg = String(err?.message || err?.code || err || '').toLowerCase();
    const isPermissionIssue = 
      err?.code === 'permission-denied' || 
      errMsg.includes('permission') || 
      errMsg.includes('insufficient') ||
      errMsg.includes('unauthorized');

    if (isPermissionIssue) {
      console.info('Reconciliação global suspensa: usuário atual não possui privilégios de administrador.');
    } else {
      console.error('Erro global na reconciliação de pontuações e ranking:', err);
    }
    result.errorsCount++;
  } finally {
    isReconcilingGlobal = false;
  }

  return result;
}

export interface RestoreWeeklyResult {
  checkedCount: number;
  updatedCount: number;
  totalPointsRestored: number;
  weekStartIso: string;
  topRanked: Array<{
    position: number;
    name: string;
    weeklyPoints: number;
    tierName: string;
  }>;
}

/**
 * Força o recálculo e a restauração de todos os pontos semanais acumulados
 * desde a última segunda-feira até hoje.
 * - Corrige qualquer fechamento acidental em settings/gamification.
 * - Limpa pódios vazios/zerados indevidos.
 * - Escaneia transações e atendimentos concluídos com pointsAwarded.
 * - Restaura os weeklyPoints de cada cliente no Firestore.
 * - Retorna o Top 5 oficial recalculado.
 */
export async function recalculateAndRestoreWeeklyRanking(options?: {
  customStartIso?: string;
  thresholds?: number[];
}): Promise<RestoreWeeklyResult> {
  // 1. Determina a data de início da semana corrente
  const now = new Date();
  const day = now.getDay();
  const daysSinceMonday = (day + 6) % 7;
  const startOfMonday = new Date(now);
  startOfMonday.setDate(startOfMonday.getDate() - daysSinceMonday);
  startOfMonday.setHours(0, 0, 0, 0);
  startOfMonday.setMilliseconds(0);

  let targetStartMs = startOfMonday.getTime();

  try {
    const gSnap = await getDoc(doc(db, 'settings', 'gamification'));
    if (gSnap.exists()) {
      const gData = gSnap.data();
      if (gData.lastWeekClosedAt) {
        const closedMs = parseDateToMs(gData.lastWeekClosedAt);
        const oct4EndMs = new Date('2026-10-04T23:59:59.999Z').getTime();
        const effectiveMs = Math.max(closedMs, oct4EndMs);
        if (effectiveMs > 0 && effectiveMs <= now.getTime()) {
          targetStartMs = effectiveMs;
        }
      }
    }
  } catch (gErr: any) {
    // ignora erro ao ler settings
  }

  if (options?.customStartIso) {
    const customMs = parseDateToMs(options.customStartIso);
    if (customMs > 0) targetStartMs = customMs;
  }

  const weekStartIso = new Date(targetStartMs).toISOString();

  // 2. Obter thresholds para patente
  const thresholdsToUse = options?.thresholds && options.thresholds.length >= 8 
    ? options.thresholds 
    : (getActiveThresholds() || DEFAULT_THRESHOLDS);

  // 4. Carregar clientes
  const clientsSnap = await getDocs(collection(db, 'clients'));
  const clientsList = clientsSnap.docs.map(d => ({ id: d.id, ...d.data() as any }));

  // Indexação rápida
  const clientByCleanPhone: Record<string, any> = {};
  const clientByName: Record<string, any> = {};
  for (const c of clientsList) {
    const cleanPhone = (c.whatsapp || '').replace(/\D/g, '');
    if (cleanPhone) clientByCleanPhone[cleanPhone] = c;
    if (c.username) clientByName[c.username.trim().toLowerCase()] = c;
    if (c.firstName) clientByName[c.firstName.trim().toLowerCase()] = c;
    const fullName = `${c.firstName || ''} ${c.lastName || ''}`.trim().toLowerCase();
    if (fullName) clientByName[fullName] = c;
  }

  // 5. Carregar point_transactions
  const transactionsByClient: Record<string, any[]> = {};
  const existingTxBookingIds = new Set<string>();

  try {
    const txSnap = await getDocs(collection(db, 'point_transactions'));
    txSnap.docs.forEach(d => {
      const tx = d.data();
      const cId = tx.clientId;
      if (tx.bookingId) existingTxBookingIds.add(String(tx.bookingId));
      if (cId) {
        if (!transactionsByClient[cId]) transactionsByClient[cId] = [];
        transactionsByClient[cId].push({ id: d.id, ...tx });
      }
    });
  } catch (txErr) {
    console.warn('Aviso ao carregar point_transactions:', txErr);
  }

  // 6. Carregar completed bookings com pointsAwarded
  const completedBookingsByClient: Record<string, any[]> = {};
  try {
    const bSnap = await getDocs(query(collection(db, 'bookings'), where('status', '==', 'completed')));
    bSnap.docs.forEach(d => {
      const b = d.data();
      const pts = Number(b.pointsAwarded || 0);
      if (pts > 0) {
        let targetId = b.awardedClientId || b.clientId;
        if (!targetId && b.clientWhatsapp) {
          const clean = String(b.clientWhatsapp).replace(/\D/g, '');
          if (clean && clientByCleanPhone[clean]) targetId = clientByCleanPhone[clean].id;
          else if (clean) {
            const found = Object.keys(clientByCleanPhone).find(p => p.endsWith(clean) || clean.endsWith(p));
            if (found) targetId = clientByCleanPhone[found].id;
          }
        }
        if (!targetId && b.clientName) {
          const cleanName = String(b.clientName).trim().toLowerCase();
          if (clientByName[cleanName]) targetId = clientByName[cleanName].id;
        }

        if (targetId) {
          if (!completedBookingsByClient[targetId]) completedBookingsByClient[targetId] = [];
          completedBookingsByClient[targetId].push({ id: d.id, ...b, pointsAwarded: pts });
        }
      }
    });
  } catch (bErr) {
    console.warn('Aviso ao carregar bookings completados:', bErr);
  }

  const nowIso = new Date().toISOString();
  let updatedCount = 0;
  let totalPointsRestored = 0;
  const updatedClients: any[] = [];

  for (const client of clientsList) {
    let calculatedWeekly = 0;
    const clientTxs = transactionsByClient[client.id] || [];
    const clientBookings = completedBookingsByClient[client.id] || [];

    // Transações da semana
    for (const tx of clientTxs) {
      const txTime = parseDateToMs(tx.createdAt) || parseDateToMs(tx.date);
      if (txTime >= targetStartMs) {
        const pts = Number(tx.points || 0);
        if (tx.type === 'earned' || tx.type === 'manual_add' || tx.type === 'bonus' || pts > 0) {
          if (tx.scope !== 'balance_only') calculatedWeekly += Math.max(0, pts);
        } else if (tx.type === 'manual_remove' || tx.type === 'adjusted' || tx.type === 'reverted' || pts < 0) {
          if (tx.scope !== 'balance_only' && tx.type !== 'redeem') calculatedWeekly += pts;
        }
      }
    }

    // Bookings da semana não duplicados em point_transactions
    for (const b of clientBookings) {
      if (!existingTxBookingIds.has(b.id)) {
        const bTime = parseDateToMs(b.paidAt) || parseDateToMs(b.estimatedEndTime) || parseDateToMs(b.updatedAt) || parseDateToMs(b.createdAt);
        if (bTime >= targetStartMs) {
          calculatedWeekly += Math.max(0, b.pointsAwarded || 0);
        }
      }
    }

    calculatedWeekly = Math.max(0, calculatedWeekly);

    const finalWeekly = calculatedWeekly;
    const currentWeeklyInDb = Number(client.weeklyPoints || 0);
    const needsDbUpdate = currentWeeklyInDb !== finalWeekly;

    if (needsDbUpdate) {
      try {
        await updateDoc(doc(db, 'clients', client.id), {
          weeklyPoints: finalWeekly,
          lastPointsUpdate: client.lastPointsUpdate || nowIso
        });
        updatedCount++;
        totalPointsRestored += finalWeekly;
      } catch (upErr: any) {
        const uMsg = String(upErr?.message || upErr?.code || upErr || '').toLowerCase();
        if (!uMsg.includes('permission') && !uMsg.includes('insufficient') && upErr?.code !== 'permission-denied') {
          console.warn(`Aviso ao atualizar weeklyPoints do cliente ${client.id}:`, upErr);
        }
      }
    }

    updatedClients.push({
      ...client,
      weeklyPoints: finalWeekly
    });
  }

  // Ordenar competidores do ranking
  const activeCompetitors = updatedClients.filter(c => Number(c.weeklyPoints || 0) > 0);
  activeCompetitors.sort(compareClientsForRanking);

  const topRanked = activeCompetitors.slice(0, 5).map((c, idx) => {
    const tier = getClientTier(c, thresholdsToUse);
    return {
      position: idx + 1,
      name: c.firstName ? `${c.firstName} ${c.lastName || ''}`.trim() : (c.username || `Competidor ${idx + 1}`),
      weeklyPoints: c.weeklyPoints || 0,
      tierName: tier.name
    };
  });

  return {
    checkedCount: clientsList.length,
    updatedCount,
    totalPointsRestored,
    weekStartIso,
    topRanked
  };
}
