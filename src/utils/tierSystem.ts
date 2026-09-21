export const DEFAULT_THRESHOLDS = [0, 500, 1000, 1500, 2000, 2500, 3000, 3500];

export const getLevelTier = (
  points: number, 
  thresholds: number[] = DEFAULT_THRESHOLDS
) => {
  const safePoints = Math.max(0, points || 0);
  let tierLevel = 1;

  for (let i = thresholds.length - 1; i >= 0; i--) {
    if (safePoints >= thresholds[i]) {
      tierLevel = i + 1;
      break;
    }
  }
  if (tierLevel > 8) tierLevel = 8;
  
  const currentThreshold = thresholds[tierLevel - 1] || 0;
  let nextThreshold = null;
  let progressPercentage = 100;
  
  if (tierLevel < 8 && thresholds.length > tierLevel) {
    nextThreshold = thresholds[tierLevel];
    const levelRange = nextThreshold - currentThreshold;
    const pointsInLevel = Math.max(0, safePoints - currentThreshold);
    progressPercentage = Math.min(100, Math.max(0, (pointsInLevel / levelRange) * 100));
  }

  const getTheme = (lvl: number) => {
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
  
  const theme = getTheme(tierLevel);
  
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

  const getTierName = (lvl: number) => {
    if (lvl === 1) return 'Iniciante';
    if (lvl === 2) return 'Bronze';
    if (lvl === 3) return 'Prata';
    if (lvl === 4) return 'Ouro';
    if (lvl === 5) return 'Platina';
    if (lvl === 6) return 'Diamante';
    if (lvl === 7) return 'Elite';
    return 'Lenda';
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
 */
export const getClientTier = (
  client: { points?: number; seasonalPoints?: number; level?: number; lifetimePoints?: number },
  thresholds: number[] = DEFAULT_THRESHOLDS
) => {
  const lifetime = Math.max(0, client.lifetimePoints ?? Math.max(client.points || 0, client.seasonalPoints || 0));
  const seasonal = Math.max(0, client.seasonalPoints || 0);

  // Level is strictly 1 per 10,000 lifetime points
  const level = Math.floor(lifetime / 10000) + 1;
  
  // Tier is based entirely on the current seasonal points
  const tierInfo = getLevelTier(seasonal, thresholds);

  return {
    level, // Nível do usuário
    ...tierInfo
  };
};

