const fs = require('fs');
let code = fs.readFileSync('src/components/GamificationManager.tsx', 'utf8');

code = code.replace(
  "    if (!window.confirm(`Aprovar o resgate de \"${redemption.rewardTitle}\" para ${redemption.clientName}?`)) return;",
  "    // Bypass confirm to avoid iframe blocking"
);

code = code.replace(
  "    if (!window.confirm(`Recusar o resgate de \"${redemption.rewardTitle}\" para ${redemption.clientName}? Os pontos não serão debitados.`)) return;",
  "    // Bypass confirm to avoid iframe blocking"
);

fs.writeFileSync('src/components/GamificationManager.tsx', code);
