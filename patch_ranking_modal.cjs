const fs = require('fs');
let code = fs.readFileSync('src/components/modals/RankingModal.tsx', 'utf8');

// Import useGamificationSettings
code = code.replace(
  "import { getLevelTier } from '../../utils/tierSystem';",
  "import { getLevelTier } from '../../utils/tierSystem';\nimport { useGamificationSettings } from '../../hooks/useGamificationSettings';"
);

// Add to component body
code = code.replace(
  "const [ranking, setRanking] = useState<any[]>([]);",
  "const [ranking, setRanking] = useState<any[]>([]);\n  const { thresholds } = useGamificationSettings();"
);

// Update getLevelTier call
code = code.replace(
  "const tier = getLevelTier((client.seasonalPoints || (client.seasonalPoints || (client.seasonalPoints || (client.seasonalPoints || (client.seasonalPoints || client.points))))));",
  "const tier = getLevelTier((client.seasonalPoints || client.points || 0), thresholds);"
);

// There might be another place in RankingModal.tsx. Let's make sure.
code = code.replace(
  /const tier = getLevelTier\(\(client.seasonalPoints \|\| \(client.seasonalPoints \|\| \(client.seasonalPoints \|\| \(client.seasonalPoints \|\| \(client.seasonalPoints \|\| client.points\)\)\)\)\)\)\);/g,
  "const tier = getLevelTier((client.seasonalPoints || client.points || 0), thresholds);"
);

fs.writeFileSync('src/components/modals/RankingModal.tsx', code);
