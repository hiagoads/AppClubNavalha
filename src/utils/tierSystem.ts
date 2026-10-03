import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

export const DEFAULT_THRESHOLDS = [0, 500, 1000, 1500, 2000, 2500, 3000, 3500];

// Dynamic cache of thresholds from Firestore settings, synchronized across the entire application
const getInitialThresholds = (): number[] => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = localStorage.getItem('barbearia_tier_thresholds');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 8) {
          return parsed.map((n: any) => Number(n) || 0);
        }
      }
    }
  } catch (e) {
    // Ignore storage errors
  }
  return [...DEFAULT_THRESHOLDS];
};

let activeThresholds: number[] = getInitialThresholds();

try {
  onSnapshot(doc(db, 'settings', 'gamification'), (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (Array.isArray(data.tierThresholds) && data.tierThresholds.length >= 8) {
        activeThresholds = data.tierThresholds.map((n: any) => Number(n) || 0);
        try {
          if (typeof window !== 'undefined' && window.localStorage) {
            localStorage.setItem('barbearia_tier_thresholds', JSON.stringify(activeThresholds));
          }
        } catch (e) {
          // ignore
        }
      }
    }
  }, (err) => {
    if (err.code !== 'permission-denied') {
      console.warn('Error syncing active thresholds:', err);
    }
  });
} catch (e) {
  console.warn('Failed to attach tierThresholds listener:', e);
}

export const getActiveThresholds = (): number[] => activeThresholds;

export const setActiveThresholds = (thresholds: number[]) => {
  if (Array.isArray(thresholds) && thresholds.length > 0) {
    activeThresholds = [...thresholds];
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('barbearia_tier_thresholds', JSON.stringify(activeThresholds));
      }
    } catch (e) {
      // ignore
    }
  }
};

export const getTierTheme = (lvl: number) => {
  switch(lvl) {
    case 1: return { text: 'text-stone-400', bg: 'bg-stone-500' };
    case 2: return { text: 'text-amber-700', bg: 'bg-amber-600' };
    case 3: return { text: 'text-gray-300', bg: 'bg-gray-400' };
    case 4: return { text: 'text-yellow-400', bg: 'bg-yellow-400' };
    case 5: return { text: 'text-teal-400', bg: 'bg-teal-400' };
    case 6: return { text: 'text-blue-500', bg: 'bg-blue-500' };
    case 7: return { text: 'text-red-600', bg: 'bg-red-600' };
    default: return { text: 'text-fuchsia-400', bg: 'bg-fuchsia-500' };
  }
};

export const getTierName = (lvl: number) => {
  if (lvl === 1) return 'Iniciante';
  if (lvl === 2) return 'Bronze';
  if (lvl === 3) return 'Prata';
  if (lvl === 4) return 'Ouro';
  if (lvl === 5) return 'Platina';
  if (lvl === 6) return 'Diamante';
  if (lvl === 7) return 'Elite';
  return 'Lenda';
};

export const getLevelTier = (
  points: number, 
  thresholds?: number[],
  minTierLevel: number = 1
) => {
  const safePoints = Math.max(0, points || 0);
  const effectiveThresholds = (thresholds && thresholds.length >= 8) ? thresholds : activeThresholds;
  let tierLevel = 1;

  for (let i = effectiveThresholds.length - 1; i >= 0; i--) {
    if (safePoints >= effectiveThresholds[i]) {
      tierLevel = i + 1;
      break;
    }
  }

  // Trava de não-regressão: dentro da temporada, a patente nunca regride
  if (minTierLevel && minTierLevel > tierLevel) {
    tierLevel = minTierLevel;
  }

  if (tierLevel > 8) tierLevel = 8;
  
  const currentThreshold = effectiveThresholds[tierLevel - 1] || 0;
  let nextThreshold = null;
  let progressPercentage = 100;
  
  if (tierLevel < 8 && effectiveThresholds.length > tierLevel) {
    nextThreshold = effectiveThresholds[tierLevel];
    const levelRange = nextThreshold - currentThreshold;
    const effectivePointsForProgress = Math.max(safePoints, currentThreshold);
    const pointsInLevel = Math.max(0, effectivePointsForProgress - currentThreshold);
    progressPercentage = levelRange > 0 ? Math.min(100, Math.max(0, (pointsInLevel / levelRange) * 100)) : 100;
  }

  const theme = getTierTheme(tierLevel);
  
  const getFrameUrl = (lvl: number) => {
    if (lvl === 1) return null;
    if (lvl === 2) return '/frames/bronze.png';
    if (lvl === 3) return '/frames/prata.png';
    if (lvl === 4) return '/frames/ouro.png';
    if (lvl === 5) return '/frames/platina.png';
    if (lvl === 6) return '/frames/diamante.png';
    if (lvl === 7) return '/frames/elite.png';
    return '/frames/lenda.png';
  };

  return {
    tierLevel,
    name: getTierName(tierLevel),
    colorText: theme.text,
    bgColor: theme.bg,
    frameUrl: getFrameUrl(tierLevel),
    progressPercentage,
    currentThreshold,
    nextThreshold
  };
};

/**
 * Resolves a client's level (lifetime points) and tier (seasonal points).
 * Regra: Dentro da temporada, uma vez que o cliente subir de Patente,
 * ele NÃO regride de Patente mesmo se gastar seus pontos em resgates ou sofrer deduções.
 */
export const getClientTier = (
  client: { 
    points?: number; 
    seasonalPoints?: number; 
    level?: number; 
    lifetimePoints?: number;
    seasonHighestPoints?: number;
    highestSeasonalPoints?: number;
    seasonHighestTierLevel?: number;
    highestTierLevel?: number;
    manualTierLevel?: number;
    manualTierOverride?: boolean;
  },
  thresholds?: number[]
) => {
  const lifetime = Math.max(0, client.lifetimePoints ?? Math.max(client.points || 0, client.seasonalPoints || 0));
  const effectiveThresholds = (thresholds && thresholds.length >= 8) ? thresholds : activeThresholds;

  // Level is strictly 1 per 10,000 lifetime points
  const level = Math.floor(lifetime / 10000) + 1;

  // Se houver override manual ativo definido pelo administrador
  if (client.manualTierOverride && typeof client.manualTierLevel === 'number' && client.manualTierLevel >= 1 && client.manualTierLevel <= 8) {
    const forcedTier = client.manualTierLevel;
    const currentPoints = Math.max(0, client.seasonalPoints ?? client.points ?? 0);
    const currentThreshold = effectiveThresholds[forcedTier - 1] || 0;
    let nextThreshold = null;
    let progressPercentage = 100;

    if (forcedTier < 8 && effectiveThresholds.length > forcedTier) {
      nextThreshold = effectiveThresholds[forcedTier];
      const levelRange = nextThreshold - currentThreshold;
      const effectivePointsForProgress = Math.max(currentPoints, currentThreshold);
      const pointsInLevel = Math.max(0, effectivePointsForProgress - currentThreshold);
      progressPercentage = levelRange > 0 ? Math.min(100, Math.max(0, (pointsInLevel / levelRange) * 100)) : 100;
    }

    const theme = getTierTheme(forcedTier);
    const getFrameUrl = (lvl: number) => {
      if (lvl === 1) return null;
      if (lvl === 2) return '/frames/bronze.png';
      if (lvl === 3) return '/frames/prata.png';
      if (lvl === 4) return '/frames/ouro.png';
      if (lvl === 5) return '/frames/platina.png';
      if (lvl === 6) return '/frames/diamante.png';
      if (lvl === 7) return '/frames/elite.png';
      return '/frames/lenda.png';
    };

    return {
      level,
      tierLevel: forcedTier,
      name: getTierName(forcedTier),
      colorText: theme.text,
      bgColor: theme.bg,
      frameUrl: getFrameUrl(forcedTier),
      progressPercentage,
      currentThreshold,
      nextThreshold,
      effectiveSeasonalPoints: currentPoints,
      lockedTierLevel: forcedTier
    };
  }
  
  // Pontos de pico da temporada atual (não são reduzidos por resgates)
  const peakSeasonalPoints = Math.max(
    0,
    client.seasonHighestPoints ?? 0,
    client.highestSeasonalPoints ?? 0,
    client.seasonalPoints ?? 0,
    client.points ?? 0
  );

  // Patente mínima já conquistada nesta temporada
  const minTier = Math.max(
    1,
    client.seasonHighestTierLevel ?? 1,
    client.highestTierLevel ?? 1
  );
  
  // Tier is based on seasonal points without regression
  const tierInfo = getLevelTier(peakSeasonalPoints, effectiveThresholds, minTier);

  return {
    level, // Nível do usuário
    ...tierInfo,
    effectiveSeasonalPoints: peakSeasonalPoints,
    lockedTierLevel: tierInfo.tierLevel
  };
};

/**
 * Converte com segurança qualquer formato de data (Timestamp do Firestore, ISO string, Date, epoch ms)
 * para milissegundos numéricos. Nunca retorna NaN.
 */
export function parseDateToMs(val: any): number {
  if (!val) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (val instanceof Date) return isNaN(val.getTime()) ? 0 : val.getTime();
  if (typeof val.toDate === 'function') {
    try {
      const d = val.toDate();
      return d instanceof Date && !isNaN(d.getTime()) ? d.getTime() : 0;
    } catch {
      return 0;
    }
  }
  if (typeof val.seconds === 'number') {
    return val.seconds * 1000;
  }
  if (typeof val === 'string') {
    const parsed = Date.parse(val);
    if (!isNaN(parsed)) return parsed;
    const d = new Date(val).getTime();
    return isNaN(d) ? 0 : d;
  }
  return 0;
}

/**
 * Critérios Oficiais de Ordenação e Desempate do Ranking do Clube:
 * 1º Critério: Pontuação da Semana / Período (weeklyPoints maior)
 * 2º Critério (Desempate 1): Quem atingiu a pontuação primeiro (lastPointsUpdate / data do último serviço mais antiga)
 * 3º Critério (Desempate 2): Maior XP histórico acumulado (lifetimePoints ou seasonalPoints maior)
 * 4º Critério (Fallback): Ordem alfabética pelo nome de usuário
 */
export const compareClientsForRanking = (a: any, b: any): number => {
  const getWeeklyScore = (c: any) => {
    if (typeof c.weeklyPoints === 'number') return Math.max(0, c.weeklyPoints);
    return Math.max(0, c.seasonalPoints || c.points || 0);
  };
  const ptsA = getWeeklyScore(a);
  const ptsB = getWeeklyScore(b);

  // 1º Critério: Mais pontos primeiro
  if (ptsB !== ptsA) {
    return ptsB - ptsA;
  }

  // 2º Critério: Quem atingiu a pontuação primeiro (timestamp mais antigo leva vantagem)
  const timeA = parseDateToMs(a.lastPointsUpdate) || parseDateToMs(a.updatedAt) || parseDateToMs(a.createdAt) || Infinity;
  const timeB = parseDateToMs(b.lastPointsUpdate) || parseDateToMs(b.updatedAt) || parseDateToMs(b.createdAt) || Infinity;

  if (timeA !== Infinity && timeB !== Infinity && timeA !== timeB) {
    return timeA - timeB; // Menor timestamp = data/hora anterior = alcançou primeiro
  }

  // 3º Critério: Maior XP acumulado vitalício / histórico
  const lifetimeA = Math.max(0, a.lifetimePoints ?? 0, a.seasonalPoints ?? 0, a.points ?? 0);
  const lifetimeB = Math.max(0, b.lifetimePoints ?? 0, b.seasonalPoints ?? 0, b.points ?? 0);
  if (lifetimeB !== lifetimeA) {
    return lifetimeB - lifetimeA;
  }

  // 4º Critério: Alfabeto (estabilidade visual)
  const nameA = (a.username || a.firstName || '').toLowerCase();
  const nameB = (b.username || b.firstName || '').toLowerCase();
  return nameA.localeCompare(nameB);
};
