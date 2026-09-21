const fs = require('fs');

const code = `export const getLevelTier = (points: number) => {
  const level = Math.floor(points / 500) + 1;
  
  const getTheme = (level: number) => {
    switch(level) {
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
  
  const theme = getTheme(level);
  
  const getFrameUrl = (level: number) => {
    if (level === 1) return null;
    if (level === 2) return '/frames/bronze.png';
    if (level === 3) return '/frames/prata.png';
    if (level === 4) return '/frames/ouro.png';
    if (level === 5) return '/frames/platina.png';
    if (level === 6) return '/frames/diamante.png';
    if (level === 7) return '/frames/elite.png';
    return '/frames/lenda.png';
  }

  const getTierName = (level: number) => {
    if (level === 1) return 'Iniciante';
    if (level === 2) return 'Bronze';
    if (level === 3) return 'Prata';
    if (level === 4) return 'Ouro';
    if (level === 5) return 'Platina';
    if (level === 6) return 'Diamante';
    if (level === 7) return 'Elite';
    return 'Lenda';
  }

  return {
    level,
    name: getTierName(level),
    colorText: theme.text,
    bgColor: theme.bg,
    frameUrl: getFrameUrl(level)
  };
};
`;

fs.writeFileSync('src/utils/tierSystem.ts', code);
console.log("Tier system updated to include bgColor");
