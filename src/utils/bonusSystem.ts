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
  type: 'vip_hours' | 'discount_50' | 'unlimited_vip' | 'popsicle' | 'points';
  totalHours?: number;
  bonusPoints?: number;
}

export const RANK_BONUSES_CONFIG: RankBonusDefinition[] = [
  {
    level: 2,
    tierName: 'Bronze',
    rankKey: 'rank_bronze_popsicle',
    title: 'Bônus Patente Bronze (1 Picolé Grátis)',
    type: 'popsicle',
  },
  {
    level: 3,
    tierName: 'Prata',
    rankKey: 'rank_prata_vip',
    title: 'Bônus Patente Prata (1h VIP)',
    type: 'vip_hours',
    totalHours: 1,
  },
  {
    level: 4,
    tierName: 'Ouro',
    rankKey: 'rank_ouro_vip',
    title: 'Bônus Patente Ouro (1h VIP)',
    type: 'vip_hours',
    totalHours: 1,
  },
  {
    level: 4,
    tierName: 'Ouro',
    rankKey: 'rank_ouro_points',
    title: 'Bônus Patente Ouro (+5.000 pts)',
    type: 'points',
    bonusPoints: 5000,
  },
  {
    level: 5,
    tierName: 'Platina',
    rankKey: 'rank_platina_vip',
    title: 'Bônus Patente Platina (3h VIP)',
    type: 'vip_hours',
    totalHours: 3,
  },
  {
    level: 6,
    tierName: 'Diamante',
    rankKey: 'rank_diamante_50',
    title: 'Bônus Patente Diamante (50% OFF)',
    type: 'discount_50',
  },
  {
    level: 7,
    tierName: 'Elite',
    rankKey: 'rank_elite_50',
    title: 'Bônus Patente Elite (50% OFF)',
    type: 'discount_50',
  },
  {
    level: 8,
    tierName: 'Lenda',
    rankKey: 'rank_lenda_50',
    title: 'Bônus Patente Lenda (50% OFF)',
    type: 'discount_50',
  },
];

export function getEligibleRankBonuses(
  clientData: any,
  thresholds: number[] = DEFAULT_THRESHOLDS
) {
  if (!clientData) return { toAddBonuses: [], pointsToAdd: 0, currentLevel: 1 };

  const tier = getClientTier(clientData, thresholds);
  const currentTierLevel = Math.max(
    tier.tierLevel,
    clientData.seasonHighestTierLevel ?? 1,
    clientData.highestTierLevel ?? 1,
    clientData.manualTierLevel ?? 1
  );

  const existingBonuses: ClientBonus[] = clientData.bonuses || [];
  const toAddBonuses: ClientBonus[] = [];
  let pointsToAdd = 0;

  for (const cfg of RANK_BONUSES_CONFIG) {
    if (currentTierLevel >= cfg.level) {
      const alreadyHas = existingBonuses.some((b) => {
        if (b.rankKey && b.rankKey === cfg.rankKey) return true;
        if (b.title && b.title.trim().toLowerCase() === cfg.title.trim().toLowerCase()) return true;
        const tLower = (b.title || '').toLowerCase();
        if (cfg.type === 'popsicle' && (tLower.includes('picolé') || tLower.includes('picole')) && tLower.includes(cfg.tierName.toLowerCase())) return true;
        if (cfg.type === 'vip_hours' && tLower.includes('vip') && tLower.includes(cfg.tierName.toLowerCase())) return true;
        if (cfg.type === 'discount_50' && (tLower.includes('50%') || tLower.includes('desconto')) && tLower.includes(cfg.tierName.toLowerCase())) return true;
        if (cfg.type === 'points' && tLower.includes('pontos') && tLower.includes(cfg.tierName.toLowerCase())) return true;
        return false;
      });

      if (!alreadyHas) {
        toAddBonuses.push({
          id: crypto.randomUUID(),
          rankKey: cfg.rankKey,
          title: cfg.title,
          type: cfg.type,
          category: 'rank_level',
          createdAt: new Date().toISOString(),
          ...(cfg.totalHours ? { totalHours: cfg.totalHours, usedHours: 0 } : {}),
          ...(cfg.type === 'discount_50' || cfg.type === 'popsicle' ? { isRedeemed: false } : {}),
          ...(cfg.type === 'points' ? { isRedeemed: true } : {})
        });

        if (cfg.bonusPoints && cfg.bonusPoints > 0) {
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
  if (!activeThresholds || activeThresholds.length < 8) {
    try {
      const settingsDoc = await getDoc(doc(db, 'settings', 'gamification'));
      if (settingsDoc.exists() && Array.isArray(settingsDoc.data().tierThresholds)) {
        activeThresholds = settingsDoc.data().tierThresholds;
      }
    } catch {
      // fallback
    }
  }

  syncingClients.add(clientId);
  try {
    // Buscar sempre dados mais recentes preservando valores mais altos e bônus existentes
    let freshData = { ...clientData };
    try {
      const freshSnap = await getDoc(doc(db, 'clients', clientId));
      if (freshSnap.exists()) {
        const snapData = freshSnap.data();
        freshData = {
          ...snapData,
          ...clientData,
          points: Math.max(clientData.points ?? 0, snapData.points ?? 0),
          seasonalPoints: Math.max(clientData.seasonalPoints ?? 0, snapData.seasonalPoints ?? 0),
          seasonHighestPoints: Math.max(
            clientData.seasonHighestPoints ?? 0,
            snapData.seasonHighestPoints ?? 0,
            clientData.seasonalPoints ?? 0,
            snapData.seasonalPoints ?? 0
          ),
          highestSeasonalPoints: Math.max(
            clientData.highestSeasonalPoints ?? 0,
            snapData.highestSeasonalPoints ?? 0
          ),
          seasonHighestTierLevel: Math.max(
            clientData.seasonHighestTierLevel ?? 1,
            snapData.seasonHighestTierLevel ?? 1
          ),
          highestTierLevel: Math.max(
            clientData.highestTierLevel ?? 1,
            snapData.highestTierLevel ?? 1
          ),
          manualTierLevel: clientData.manualTierLevel ?? snapData.manualTierLevel,
          manualTierOverride: clientData.manualTierOverride ?? snapData.manualTierOverride,
          bonuses: snapData.bonuses || clientData.bonuses || []
        };
      }
    } catch (e) {
      // fallback
    }

    const { toAddBonuses, pointsToAdd, currentLevel } = getEligibleRankBonuses(
      freshData,
      activeThresholds || getActiveThresholds()
    );

    if (toAddBonuses.length === 0 && pointsToAdd === 0) {
      return null;
    }

    const currentBonuses = freshData.bonuses || [];
    const newBonuses = [...currentBonuses, ...toAddBonuses];
    const nowIso = new Date().toISOString();

    const updatePayload: any = {
      bonuses: newBonuses,
      seasonHighestTierLevel: Math.max(freshData.seasonHighestTierLevel ?? 1, currentLevel),
      highestTierLevel: Math.max(freshData.highestTierLevel ?? 1, currentLevel),
      lastPointsUpdate: nowIso,
    };

    const currentPts = freshData.points ?? 0;
    if (pointsToAdd > 0) {
      updatePayload.points = increment(pointsToAdd);
      updatePayload.seasonalPoints = increment(pointsToAdd);
      updatePayload.weeklyPoints = increment(pointsToAdd);
      updatePayload.seasonHighestPoints = Math.max(freshData.seasonHighestPoints ?? 0, currentPts + pointsToAdd);
      updatePayload.highestSeasonalPoints = Math.max(freshData.highestSeasonalPoints ?? 0, currentPts + pointsToAdd);
    }

    await updateDoc(doc(db, 'clients', clientId), updatePayload);

    if (pointsToAdd > 0) {
      try {
        await addDoc(collection(db, 'point_transactions'), {
          clientId,
          clientName: freshData.username || freshData.firstName || 'Cliente',
          points: pointsToAdd,
          type: 'earned',
          description: `Bônus de Patente: ${toAddBonuses.find(b => b.type === 'points')?.title || 'Ouro (+5.000 pts)'}`,
          balanceAfter: currentPts + pointsToAdd,
          createdAt: nowIso,
        });
      } catch (err) {
        console.error('Error logging point transaction for rank bonus:', err);
      }
    }

    return {
      awardedBonuses: toAddBonuses,
      pointsAdded: pointsToAdd,
      updatedBonuses: newBonuses,
      newTierLevel: currentLevel
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
