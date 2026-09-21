const fs = require('fs');
let code = fs.readFileSync('src/components/modals/RankingModal.tsx', 'utf8');
code = code.replace(/getLevelTier\(\(client\.seasonalPoints \|\| \(client\.seasonalPoints \|\| \(client\.seasonalPoints \|\| \(client\.seasonalPoints \|\| \(client\.seasonalPoints \|\| client\.points\)\)\)\)\)\)\)/g, "getLevelTier(client.seasonalPoints || client.points)");
fs.writeFileSync('src/components/modals/RankingModal.tsx', code);
