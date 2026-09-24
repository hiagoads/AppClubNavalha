import { doc, getDoc, updateDoc, increment, addDoc, collection } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { DEFAULT_THRESHOLDS, getLevelTier, getClientTier, getActiveThresholds } from './tierSystem';
import { ClientBonus } from '../types';

/**
 * Verifica se um bônus expirou com base no prazo de validade (expiresAt).
 * Se for bônus do pódio semanal sem expiresAt explícito, mas com mais de 7 dias de criação,
 * também é considerado expirado.
 */
export function isBonusExpired(bonus: ClientBonus): boolean {
  if (!bonus) return false;

  const now = Date.now();

  if (bonus.expiresAt) {
    const expireTime = new Date(bonus.expiresAt).getTime();
    if (!isNaN(expireTime) && now > expireTime) {
      return true;
    }
  }

  // Fallback para bônus de pódio semanal criados anteriormente sem o campo expiresAt
  const isWeekly = bonus.category === 'weekly_podium' || 
    (bonus.title && (bonus.title.includes('da Semana') || bonus.title.includes('Semanal')));
  
  if (isWeekly && bonus.createdAt) {
    const createdTime = new Date(bonus.createdAt).getTime();
    // 7 dias em ms = 7 * 24 * 60 * 60 * 1000
    if (!isNaN(createdTime) && now - createdTime > 7 * 24 * 60 * 60 * 1000) {
      return true;
    }
  }

  return false;
}

/**
 * Checa se o bônus está ativo e elegível para uso.
 */
export function isBonusActive(bonus: ClientBonus): boolean {
  if (!bonus) return false;
  if (isBonusExpired(bonus)) return false;

  if (bonus.type === 'vip_hours') {
    return (bonus.totalHours || 0) > (bonus.usedHours || 0);
  } else if (bonus.type === 'unlimited_vip') {
    return !bonus.isRedeemed;
  } else {
    return !bonus.isRedeemed;
  }
}

export interface RankBonusDefinition {
  level: number;
  tierName: string;
  rankKey: string;
  title: string;
  type: 'vip_hours' | 'discount_50' | 'unlimited_vip' | 'popsicle';
  totalHours?: number;
  bonusPoints?: number;
}

export const RANK_BONUSES_CONFIG: RankBonusDefinition[] = [];

export function getEligibleRankBonuses(
  clientData: { points?: number; seasonalPoints?: number; level?: number; lifetimePoints?: number; bonuses?: ClientBonus[] },
  thresholds: number[] = DEFAULT_THRESHOLDS
) {
  const tier = getClientTier(clientData, thresholds);
  const currentTierLevel = tier.tierLevel;

  const existingBonuses = clientData.bonuses || [];
  const toAddBonuses: ClientBonus[] = [];
  let pointsToAdd = 0;

  for (const cfg of RANK_BONUSES_CONFIG) {
    if (currentTierLevel >= cfg.level) {
      const alreadyHas = existingBonuses.some(
        (b) =>
          b.rankKey === cfg.rankKey ||
          (b.title && b.title.toLowerCase().includes(`bônus ${cfg.tierName.toLowerCase()}`))
      );

      if (!alreadyHas) {
        toAddBonuses.push({
          id: crypto.randomUUID(),
          rankKey: cfg.rankKey,
          title: cfg.title,
          type: cfg.type,
          ...(cfg.totalHours ? { totalHours: cfg.totalHours, usedHours: 0 } : {}),
          ...(cfg.type === 'discount_50' ? { isRedeemed: false } : {}),
          createdAt: new Date().toISOString(),
        });

        if (cfg.bonusPoints) {
          pointsToAdd += cfg.bonusPoints;
        }
      }
    }
  }

  return { toAddBonuses, pointsToAdd, currentLevel: currentTierLevel };
}

const syncingClients = new Set<string>();

export async function checkAndSyncClientRankBonuses(
  clientId: string,
  clientData: any,
  thresholds?: number[]
) {
  if (!clientId || !clientData) return null;
  if (syncingClients.has(clientId)) return null;

  let activeThresholds = thresholds;
  if (!activeThresholds) {
    try {
      const settingsDoc = await getDoc(doc(db, 'settings', 'gamification'));
      if (settingsDoc.exists() && Array.isArray(settingsDoc.data().tierThresholds)) {
        activeThresholds = settingsDoc.data().tierThresholds;
      }
    } catch {
      // fallback
    }
  }

  const { toAddBonuses, pointsToAdd } = getEligibleRankBonuses(
    clientData,
    activeThresholds || getActiveThresholds()
  );

  if (toAddBonuses.length === 0 && pointsToAdd === 0) {
    return null;
  }

  syncingClients.add(clientId);
  try {
    const newBonuses = [...(clientData.bonuses || []), ...toAddBonuses];
    const updatePayload: any = {
      bonuses: newBonuses,
    };

    if (pointsToAdd > 0) {
      updatePayload.points = increment(pointsToAdd);
      updatePayload.seasonalPoints = increment(pointsToAdd);
      updatePayload.weeklyPoints = increment(pointsToAdd);
    }

    await updateDoc(doc(db, 'clients', clientId), updatePayload);

    if (pointsToAdd > 0) {
      try {
        await addDoc(collection(db, 'point_transactions'), {
          clientId,
          clientName: clientData.username || 'Cliente',
          points: pointsToAdd,
          type: 'earned',
          description: 'Bônus de Rank: Ouro (+5.000 pts)',
          createdAt: new Date().toISOString(),
        });
      } catch (err) {
        console.error('Error logging point transaction for rank bonus:', err);
      }
    }

    return {
      awardedBonuses: toAddBonuses,
      pointsAdded: pointsToAdd,
      updatedBonuses: newBonuses,
    };
  } catch (err: any) {
    if (err.code !== 'permission-denied') {
      console.error('Error syncing rank bonuses:', err);
    }
    return null;
  } finally {
    syncingClients.delete(clientId);
  }
}
