const fs = require('fs');

let code = fs.readFileSync('src/components/modals/RankingModal.tsx', 'utf8');

code = code.replace(
  "orderBy('points', 'desc'),",
  "orderBy('seasonalPoints', 'desc'),"
);

code = code.replace(
  "client.points",
  "(client.seasonalPoints || client.points)"
);
code = code.replace(
  "client.points",
  "(client.seasonalPoints || client.points)"
);
code = code.replace(
  "client.points",
  "(client.seasonalPoints || client.points)"
);
code = code.replace(
  "client.points",
  "(client.seasonalPoints || client.points)"
);
code = code.replace(
  "client.points",
  "(client.seasonalPoints || client.points)"
);

fs.writeFileSync('src/components/modals/RankingModal.tsx', code);
