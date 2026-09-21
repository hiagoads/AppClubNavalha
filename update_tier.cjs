const fs = require('fs');

let code = fs.readFileSync('src/utils/tierSystem.ts', 'utf8');

code = code.replace(
    "colorText: 'rainbow-text', borderColor: 'rainbow-border', glowBg: 'rainbow-bg', shadow: 'shadow-[0_0_30px_rgba(255,255,255,0.4)]'",
    "colorText: 'text-fuchsia-400', borderColor: 'rainbow-border', glowBg: 'bg-fuchsia-500', shadow: 'shadow-[0_0_25px_rgba(217,70,239,0.8)]'"
);

fs.writeFileSync('src/utils/tierSystem.ts', code);
console.log("Tier updated");
