const fs = require('fs');
let code = fs.readFileSync('src/components/modals/RankingModal.tsx', 'utf8');

code = code.replace(
  "console.error(e);",
  "if (e.code !== 'permission-denied') console.error(e);"
);

fs.writeFileSync('src/components/modals/RankingModal.tsx', code);
