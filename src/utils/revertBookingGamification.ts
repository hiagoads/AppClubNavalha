import { doc, getDoc, updateDoc, collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getLevelTier, getActiveThresholds, getTierName } from './tierSystem';
import { Booking, ClientBonus } from '../types';

/**
 * Reverte todos os pontos, XP/nível, patente de temporada, ranking semanal e bônus de rank
 * que foram acumulados por um serviço/atendimento quando este registro é excluído ou restaurado pelo administrador.
 */
export async function revertCompletedBookingGamification(
  booking: Booking | any,
  reason: string = 'Estorno por exclusão do atendimento',
  thresholds?: number[]
): Promise<{
  reverted: boolean;
  pointsDeducted?: number;
  clientName?: string;
  previousTier?: string;
  newTier?: string;
  newLevel?: number;
}> {
  if (!booking) return { reverted: false };

  try {
    let clientId = booking.awardedClientId || booking.clientId || null;
    let clientDoc: any = null;
    let clientData: any = null;

    // 1. Localizar o cliente pelo ID vinculado
    if (clientId) {
      const snap = await getDoc(doc(db, 'clients', clientId));
      if (snap.exists()) {
        clientDoc = snap;
        clientData = snap.data();
      }
    }

    // 2. Se não encontrou pelo ID, buscar pelo WhatsApp do cliente
    if (!clientData && booking.clientWhatsapp) {
      const cleanPhone = String(booking.clientWhatsapp).replace(/\D/g, '');
      if (cleanPhone) {
        const clientsRef = collection(db, 'clients');
        const q = query(clientsRef, where('whatsapp', '==', cleanPhone));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          clientDoc = snapshot.docs[0];
          clientId = clientDoc.id;
          clientData = clientDoc.data();
        }
      }
    }

    if (!clientId || !clientData) {
      return { reverted: false };
    }

    // 3. Determinar a quantidade de pontos que foi creditada por este atendimento
    let pointsToDeduct = 0;

    if (typeof booking.pointsAwarded === 'number' && booking.pointsAwarded > 0) {
      pointsToDeduct = booking.pointsAwarded;
    } else {
      // Tentar localizar na coleção point_transactions vinculada ao bookingId
      try {
        const txQuery = query(
          collection(db, 'point_transactions'),
          where('clientId', '==', clientId),
          where('bookingId', '==', booking.id)
        );
        const txSnap = await getDocs(txQuery);
        if (!txSnap.empty) {
          for (const txDoc of txSnap.docs) {
            const txData = txDoc.data();
            if (txData.type === 'earned' && typeof txData.points === 'number' && txData.points > 0) {
              pointsToDeduct += txData.points;
            }
          }
        }
      } catch (txErr) {
        console.warn('Erro ao consultar point_transactions para estorno:', txErr);
      }

      // Fallback: se não encontrou em pointsAwarded nem em point_transactions, calcular pelo preço do serviço
      if (pointsToDeduct === 0 && (booking.price || booking.expectedPrice)) {
        const p = Number(booking.price ?? booking.expectedPrice ?? 0);
        if (p > 0) {
          pointsToDeduct = Math.floor(p * 100);
        }
      }
    }

    if (pointsToDeduct <= 0) {
      return { reverted: false, clientName: clientData.username || clientData.firstName };
    }

    // 4. Calcular os novos valores reduzindo exatamente o que foi ganho
    const currentPts = clientData.points || 0;
    const currentSeasonal = clientData.seasonalPoints || 0;
    const currentWeekly = clientData.weeklyPoints || 0;
    const currentLifetime = clientData.lifetimePoints ?? Math.max(currentPts, currentSeasonal);
    const currentPeakSeasonal = Math.max(
      clientData.seasonHighestPoints ?? 0,
      clientData.highestSeasonalPoints ?? 0,
      currentSeasonal,
      currentPts
    );

    const newPts = Math.max(0, currentPts - pointsToDeduct);
    const newSeasonal = Math.max(0, currentSeasonal - pointsToDeduct);
    const newWeekly = Math.max(0, currentWeekly - pointsToDeduct);
    const newLifetime = Math.max(0, currentLifetime - pointsToDeduct);

    // Reduz o pico sazonal proporcionalmente à dedução
    const newPeakSeasonal = Math.max(0, currentPeakSeasonal - pointsToDeduct, newSeasonal, newPts);

    // Nível (XP vitalício: 1 por 10.000 pontos vitalícios)
    const newLevel = Math.max(1, Math.floor(newLifetime / 10000) + 1);

    // Recalcular patente com os limites ativos
    const effectiveThresholds = (thresholds && thresholds.length >= 8) ? thresholds : getActiveThresholds();
    const updatedTier = getLevelTier(newPeakSeasonal, effectiveThresholds, 1);
    const newTierLevel = updatedTier.tierLevel;

    const previousTierLevel = clientData.seasonHighestTierLevel ?? clientData.highestTierLevel ?? 1;

    // 5. Tratar reversão de bônus de patente se o cliente regrediu de nível/patente
    const tierOrder: Record<string, number> = {
      iniciante: 1,
      bronze: 2,
      prata: 3,
      ouro: 4,
      platina: 5,
      diamante: 6,
      elite: 7,
      lenda: 8
    };

    let updatedBonuses = (clientData.bonuses || []).filter((b: ClientBonus) => {
      // Se for bônus do pódio semanal, preserva (só expira na virada de semana)
      if (b.category === 'weekly_podium' || (b.title && b.title.includes('da Semana'))) {
        return true;
      }

      // Verificar se o bônus pertence a uma patente acima da nova patente do cliente
      const titleLower = (b.title || '').toLowerCase();
      for (const [tierNameKey, tierLvl] of Object.entries(tierOrder)) {
        if (titleLower.includes(tierNameKey) || (b.rankKey && b.rankKey.includes(tierNameKey))) {
          if (tierLvl > newTierLevel) {
            // Este bônus foi concedido por uma patente que o cliente não possui mais após a exclusão do serviço
            return false;
          }
        }
      }
      return true;
    });

    const nowIso = new Date().toISOString();

    const updatePayload: any = {
      points: newPts,
      seasonalPoints: newSeasonal,
      weeklyPoints: newWeekly,
      lifetimePoints: newLifetime,
      seasonHighestPoints: newPeakSeasonal,
      highestSeasonalPoints: newPeakSeasonal,
      seasonHighestTierLevel: newTierLevel,
      highestTierLevel: newTierLevel,
      level: newLevel,
      bonuses: updatedBonuses,
      manualTierOverride: false,
      manualTierLevel: newTierLevel,
      lastPointsUpdate: nowIso
    };

    // 6. Atualizar documento do cliente
    await updateDoc(doc(db, 'clients', clientId), updatePayload);

    // 7. Registrar transação de estorno no extrato de auditoria de pontos
    await addDoc(collection(db, 'point_transactions'), {
      clientId,
      clientName: clientData.username || clientData.firstName || booking.clientName || 'Cliente',
      points: -pointsToDeduct,
      type: 'manual_remove',
      description: `${reason} (${pointsToDeduct} pts)`,
      balanceAfter: newPts,
      bookingId: booking.id,
      createdAt: nowIso
    });

    return {
      reverted: true,
      pointsDeducted: pointsToDeduct,
      clientName: clientData.username || clientData.firstName || booking.clientName,
      previousTier: getTierName(previousTierLevel),
      newTier: updatedTier.name,
      newLevel
    };
  } catch (err) {
    console.error('Erro ao reverter gamificação do atendimento excluído:', err);
    return { reverted: false };
  }
}
