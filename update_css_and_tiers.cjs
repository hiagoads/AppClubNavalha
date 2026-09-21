const fs = require('fs');

// 1. Add CSS
let css = fs.readFileSync('src/index.css', 'utf8');
if (!css.includes('.rainbow-text')) {
    css += `
.rainbow-text {
  background: linear-gradient(45deg, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #4b0082, #9400d3);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
.rainbow-bg {
  background: linear-gradient(45deg, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #4b0082, #9400d3);
}
.rainbow-border {
  border-color: transparent !important;
  background: linear-gradient(#121212, #121212) padding-box,
              linear-gradient(45deg, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #4b0082, #9400d3) border-box !important;
}
`;
    fs.writeFileSync('src/index.css', css);
}

// 2. Rewrite tierSystem.ts
const tierCode = `export const getLevelTier = (points: number) => {
  const level = Math.floor(points / 500) + 1;
  if (level === 1) return {
    level, name: 'Iniciante',
    colorText: 'text-stone-400', borderColor: 'border-stone-600/30', glowBg: 'bg-stone-500/20', shadow: 'shadow-none'
  };
  if (level === 2) return {
    level, name: 'Bronze',
    colorText: 'text-amber-700', borderColor: 'border-amber-700', glowBg: 'bg-amber-700', shadow: 'shadow-[0_0_15px_rgba(180,83,9,0.4)]'
  };
  if (level === 3) return {
    level, name: 'Prata',
    colorText: 'text-gray-300', borderColor: 'border-gray-300', glowBg: 'bg-gray-300', shadow: 'shadow-[0_0_15px_rgba(209,213,219,0.4)]'
  };
  if (level === 4) return {
    level, name: 'Ouro',
    colorText: 'text-yellow-400', borderColor: 'border-yellow-400', glowBg: 'bg-yellow-400', shadow: 'shadow-[0_0_15px_rgba(250,204,21,0.5)]'
  };
  if (level === 5) return {
    level, name: 'Platina',
    colorText: 'text-teal-400', borderColor: 'border-teal-400', glowBg: 'bg-teal-400', shadow: 'shadow-[0_0_15px_rgba(45,212,191,0.5)]'
  };
  if (level === 6) return {
    level, name: 'Diamante',
    colorText: 'text-blue-500', borderColor: 'border-blue-500', glowBg: 'bg-blue-500', shadow: 'shadow-[0_0_20px_rgba(59,130,246,0.6)]'
  };
  if (level === 7) return {
    level, name: 'Elite',
    colorText: 'text-red-600', borderColor: 'border-red-600', glowBg: 'bg-red-600', shadow: 'shadow-[0_0_25px_rgba(220,38,38,0.7)]'
  };
  return {
    level, name: 'Lenda',
    colorText: 'rainbow-text', borderColor: 'rainbow-border', glowBg: 'rainbow-bg', shadow: 'shadow-[0_0_30px_rgba(255,255,255,0.4)]'
  };
};
`;
fs.writeFileSync('src/utils/tierSystem.ts', tierCode);

// 3. Update firestore rules
let rules = fs.readFileSync('firestore.rules', 'utf8');
if (rules.includes("['username', 'whatsapp']")) {
    rules = rules.replace(
        "['username', 'whatsapp']",
        "['username', 'whatsapp', 'avatarUrl']"
    );
    fs.writeFileSync('firestore.rules', rules);
}
console.log("CSS, Tiers and Rules updated");
