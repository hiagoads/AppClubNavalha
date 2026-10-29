import { doc, getDoc, updateDoc, collection, query, where, getDocs, addDoc, deleteField, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getLevelTier, getActiveThresholds, getTierName } from './tierSystem';
import { Booking, BookingStatus, ClientBonus } from '../types';

export interface RevertGamificationResult {
  reverted: boolean;
  pointsDeducted?: number;
  clientName?: string;
  previousTier?: string;
  newTier?: string;
  newLevel?: number;
  newWeeklyPoints?: number;
  revokedBonuses?: string[];
  actionTaken?: 'cancel' | 'return_to_queue' | 'delete' | 'none';
}

/**
 * Reverte todos os pontos, XP/nível, patente de temporada, ranking semanal e bônus de rank
 * que foram acumulados por um serviço/atendimento quando este é cancelado, devolvido para a fila ou excluído.
 */
export async function revertCompletedBookingGamification(
  booking: Booking | any,
  reason: string = 'Estorno de atendimento finalizado',
  thresholds?: number[],
  targetAction?: 'cancel' | 'return_to_queue' | 'delete' | 'none'
): Promise<RevertGamificationResult> {
  if (!booking) return { reverted: false };

  // Atendimentos de clientes sem cadastro não pontuaram e não devem estornar pontos
  if (booking.pointsAwarded === 0 && !booking.awardedClientId && !booking.clientId) {
    if (targetAction === 'cancel') {
      await updateDoc(doc(db, 'bookings', booking.id), {
        status: BookingStatus.CANCELLED,
        cancelledAt: new Date().toISOString(),
        cancellationReason: reason,
        updatedAt: new Date().toISOString()
      });
      return { reverted: true, pointsDeducted: 0, actionTaken: 'cancel' };
    } else if (targetAction === 'return_to_queue') {
      await updateDoc(doc(db, 'bookings', booking.id), {
        status: BookingStatus.WAITING,
        isPaid: false,
        paidAt: deleteField(),
        estimatedEndTime: deleteField(),
        completedAt: deleteField(),
        pointsAwarded: deleteField(),
        updatedAt: new Date().toISOString()
      });
      return { reverted: true, pointsDeducted: 0, actionTaken: 'return_to_queue' };
    } else if (targetAction === 'delete') {
      await deleteDoc(doc(db, 'bookings', booking.id));
      return { reverted: true, pointsDeducted: 0, actionTaken: 'delete' };
    }
    return { reverted: false };
  }

  try {
    const clientId = booking.awardedClientId || booking.clientId || null;
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

    // Apenas clientes cadastrados no Clube Navalha com clientId/awardedClientId explícito pontuaram
    if (!clientId || !clientData) {
      if (targetAction === 'cancel') {
        await updateDoc(doc(db, 'bookings', booking.id), {
          status: BookingStatus.CANCELLED,
          cancelledAt: new Date().toISOString(),
          cancellationReason: reason,
          updatedAt: new Date().toISOString()
        });
        return { reverted: true, pointsDeducted: 0, actionTaken: 'cancel' };
      } else if (targetAction === 'return_to_queue') {
        await updateDoc(doc(db, 'bookings', booking.id), {
          status: BookingStatus.WAITING,
          isPaid: false,
          paidAt: deleteField(),
          estimatedEndTime: deleteField(),
          completedAt: deleteField(),
          pointsAwarded: deleteField(),
          updatedAt: new Date().toISOString()
        });
        return { reverted: true, pointsDeducted: 0, actionTaken: 'return_to_queue' };
      } else if (targetAction === 'delete') {
        await deleteDoc(doc(db, 'bookings', booking.id));
        return { reverted: true, pointsDeducted: 0, actionTaken: 'delete' };
      }
      return { reverted: false };
    }

    // 2. Determinar a quantidade de pontos creditada por este atendimento
    let pointsToDeduct = 0;

    if (typeof booking.pointsAwarded === 'number' && booking.pointsAwarded > 0) {
      pointsToDeduct = Math.max(0, booking.pointsAwarded);
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

    const nowIso = new Date().toISOString();

    if (pointsToDeduct <= 0) {
      // Se não havia pontos a estornar, apenas aplica a alteração no agendamento se solicitada
      if (targetAction === 'cancel') {
        await updateDoc(doc(db, 'bookings', booking.id), {
          status: BookingStatus.CANCELLED,
          cancelledAt: nowIso,
          cancellationReason: reason,
          updatedAt: nowIso
        });
      } else if (targetAction === 'return_to_queue') {
        await updateDoc(doc(db, 'bookings', booking.id), {
          status: BookingStatus.WAITING,
          isPaid: false,
          paidAt: deleteField(),
          estimatedEndTime: deleteField(),
          completedAt: deleteField(),
          pointsAwarded: deleteField(),
          updatedAt: nowIso
        });
      } else if (targetAction === 'delete') {
        await deleteDoc(doc(db, 'bookings', booking.id));
      }
      return { 
        reverted: true, 
        pointsDeducted: 0, 
        clientName: clientData.username || clientData.firstName,
        actionTaken: targetAction 
      };
    }

    // 3. Calcular os novos valores reduzindo exatamente o que foi ganho
    const currentPts = clientData.points || 0;
    const currentSeasonal = clientData.seasonalPoints || 0;
    const currentWeekly = clientData.weeklyPoints || 0;
    const currentLifetime = clientData.lifetimePoints ?? Math.max(currentPts, currentSeasonal);
    
    // Pico sazonal deve rastrear APENAS pontos sazonais, NUNCA saldo gastável
    const currentPeakSeasonal = Math.max(
      clientData.seasonHighestPoints ?? 0,
      clientData.highestSeasonalPoints ?? 0,
      currentSeasonal
    );

    const depId = (booking as any).awardedToDependentId || (booking as any).dependentId;
    let updatedDependents = clientData.dependents;

    // Regra de dependente: ranking semanal vai para o dependente
    if (depId && Array.isArray(clientData.dependents)) {
      updatedDependents = clientData.dependents.map((dep: any) => {
        if (dep.id === depId) {
          return {
            ...dep,
            points: Math.max(0, (dep.points || 0) - pointsToDeduct),
            weeklyPoints: Math.max(0, (dep.weeklyPoints || 0) - pointsToDeduct),
            lastPointsUpdate: nowIso
          };
        }
        return dep;
      });
    }

    const newPts = Math.max(0, currentPts - pointsToDeduct);
    const newSeasonal = Math.max(0, currentSeasonal - pointsToDeduct);
    // Se foi corte de dependente, o weeklyPoints do responsável não mudou na conclusão, logo não deve diminuir
    const newWeekly = depId ? currentWeekly : Math.max(0, currentWeekly - pointsToDeduct);
    const newLifetime = Math.max(0, currentLifetime - pointsToDeduct);

    // Reduz o pico sazonal proporcionalmente à dedução sem contaminar com newPts
    const newPeakSeasonal = Math.max(0, Math.max(0, currentPeakSeasonal - pointsToDeduct), newSeasonal);

    // Nível da conta (1 por 10.000 pontos vitalícios)
    const newLevel = Math.max(1, Math.floor(newLifetime / 10000) + 1);

    // Recalcular patente com os limites ativos
    const effectiveThresholds = (thresholds && thresholds.length >= 8) ? thresholds : getActiveThresholds();
    const updatedTier = getLevelTier(newPeakSeasonal, effectiveThresholds, 1);
    const newTierLevel = updatedTier.tierLevel;

    const previousTierLevel = clientData.seasonHighestTierLevel ?? clientData.highestTierLevel ?? 1;

    // 4. Revogar automaticamente bônus e prêmios pendentes não resgatados de patentes superiores
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

    const revokedBonuses: string[] = [];

    const updatedBonuses = (clientData.bonuses || []).filter((b: ClientBonus) => {
      // Se for bônus do pódio semanal, preserva (só expira na virada de semana)
      if (b.category === 'weekly_podium' || (b.title && b.title.includes('da Semana'))) {
        return true;
      }

      // Se já foi resgatado, preserva o histórico de resgate
      if (b.isRedeemed) {
        return true;
      }

      // Se for bônus de horas VIP e já foram consumidas horas parciais, preserva
      if (b.type === 'vip_hours' && (b.usedHours || 0) > 0) {
        return true;
      }

      // Identificar o nível da patente ao qual este bônus pertencia
      let bonusTierLevel = 0;
      const bAny = b as any;
      if (bAny.level && typeof bAny.level === 'number') {
        bonusTierLevel = bAny.level;
      } else {
        const titleLower = (b.title || '').toLowerCase();
        for (const [tierNameKey, tierLvl] of Object.entries(tierOrder)) {
          if (titleLower.includes(tierNameKey) || (b.rankKey && b.rankKey.toLowerCase().includes(tierNameKey))) {
            bonusTierLevel = Math.max(bonusTierLevel, tierLvl);
          }
        }
      }

      // Se o cliente regrediu para um nível menor que a patente do prêmio, revoga o bônus não resgatado
      if (bonusTierLevel > newTierLevel) {
        revokedBonuses.push(b.title || `Prêmio Patente Nível ${bonusTierLevel}`);
        return false;
      }

      return true;
    });

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
      dependents: updatedDependents,
      manualTierOverride: false,
      manualTierLevel: newTierLevel,
      lastPointsUpdate: nowIso
    };

    // 5. Atualizar documento do cliente
    await updateDoc(doc(db, 'clients', clientId), updatePayload);

    // 6. Registrar transação de estorno no extrato de auditoria de pontos
    await addDoc(collection(db, 'point_transactions'), {
      clientId,
      clientName: clientData.username || clientData.firstName || booking.clientName || 'Cliente',
      points: -pointsToDeduct,
      type: 'reverted',
      scope: 'all_balances',
      description: `${reason} (-${pointsToDeduct} pts)`,
      balanceAfter: newPts,
      weeklyBalanceAfter: newWeekly,
      seasonalBalanceAfter: newSeasonal,
      weeklyPointsChange: depId ? 0 : -pointsToDeduct,
      seasonalPointsChange: -pointsToDeduct,
      balancePointsChange: -pointsToDeduct,
      bookingId: booking.id,
      createdAt: nowIso
    });

    if (depId) {
      const depObj = updatedDependents?.find((d: any) => d.id === depId);
      await addDoc(collection(db, 'point_transactions'), {
        clientId,
        clientName: clientData.username || clientData.firstName || booking.clientName || 'Responsável',
        dependentId: depId,
        dependentName: depObj?.name || 'Dependente',
        points: -pointsToDeduct,
        type: 'reverted',
        scope: 'weekly_only',
        description: `Estorno no Ranking Semanal do dependente ${depObj?.name || ''} (-${pointsToDeduct} pts)`,
        weeklyPointsChange: -pointsToDeduct,
        bookingId: booking.id,
        createdAt: nowIso
      });
    }

    // 7. Atualizar agendamento conforme targetAction selecionada
    if (targetAction === 'cancel') {
      await updateDoc(doc(db, 'bookings', booking.id), {
        status: BookingStatus.CANCELLED,
        cancelledAt: nowIso,
        cancellationReason: reason,
        revertedPoints: pointsToDeduct,
        updatedAt: nowIso
      });
    } else if (targetAction === 'return_to_queue') {
      await updateDoc(doc(db, 'bookings', booking.id), {
        status: BookingStatus.WAITING,
        revertedPoints: pointsToDeduct,
        isPaid: false,
        paidAt: deleteField(),
        estimatedEndTime: deleteField(),
        completedAt: deleteField(),
        pointsAwarded: deleteField(),
        updatedAt: nowIso
      });
    } else if (targetAction === 'delete') {
      await deleteDoc(doc(db, 'bookings', booking.id));
    }

    return {
      reverted: true,
      pointsDeducted: pointsToDeduct,
      clientName: clientData.username || clientData.firstName || booking.clientName,
      previousTier: getTierName(previousTierLevel),
      newTier: updatedTier.name,
      newLevel,
      newWeeklyPoints: newWeekly,
      revokedBonuses,
      actionTaken: targetAction
    };
  } catch (err) {
    console.error('Erro ao reverter gamificação do atendimento:', err);
    return { reverted: false };
  }
}
