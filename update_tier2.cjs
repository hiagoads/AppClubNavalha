const fs = require('fs');

const code = `export const getLevelTier = (points: number) => {
  const level = Math.floor(points / 500) + 1;
  if (level === 1) return {
    level, name: 'Iniciante',
    colorText: 'text-stone-400', frameUrl: null
  };
  if (level === 2) return {
    level, name: 'Bronze',
    colorText: 'text-amber-700', frameUrl: '/frames/bronze.png'
  };
  if (level === 3) return {
    level, name: 'Prata',
    colorText: 'text-gray-300', frameUrl: '/frames/prata.png'
  };
  if (level === 4) return {
    level, name: 'Ouro',
    colorText: 'text-yellow-400', frameUrl: '/frames/ouro.png'
  };
  if (level === 5) return {
    level, name: 'Platina',
    colorText: 'text-teal-400', frameUrl: '/frames/platina.png'
  };
  if (level === 6) return {
    level, name: 'Diamante',
    colorText: 'text-blue-500', frameUrl: '/frames/diamante.png'
  };
  if (level === 7) return {
    level, name: 'Elite',
    colorText: 'text-red-600', frameUrl: '/frames/elite.png'
  };
  return {
    level, name: 'Lenda',
    colorText: 'text-fuchsia-400', frameUrl: '/frames/lenda.png'
  };
};
`;

fs.writeFileSync('src/utils/tierSystem.ts', code);
console.log("Tier system updated to use frames");
