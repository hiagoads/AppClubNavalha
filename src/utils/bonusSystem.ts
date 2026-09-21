import { doc, getDoc, updateDoc, increment, addDoc, collection } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { DEFAULT_THRESHOLDS, getLevelTier, getClientTier } from './tierSystem';
import { ClientBonus } from '../types';

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
    activeThresholds || DEFAULT_THRESHOLDS
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
