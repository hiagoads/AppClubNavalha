const fs = require('fs');
let code = fs.readFileSync('src/pages/ClientPanel.tsx', 'utf8');

// Import useGamificationSettings
code = code.replace(
  "import { getLevelTier } from '../utils/tierSystem';",
  "import { getLevelTier } from '../utils/tierSystem';\nimport { useGamificationSettings } from '../hooks/useGamificationSettings';"
);

// Add to component body (search for const [loading, setLoading] = useState(true);)
code = code.replace(
  "const [loading, setLoading] = useState(true);",
  "const [loading, setLoading] = useState(true);\n  const { thresholds } = useGamificationSettings();"
);

// Update getLevelTier call
code = code.replace(
  "const tier = getLevelTier(clientProfile.seasonalPoints || clientProfile.points);",
  "const tier = getLevelTier(clientProfile.seasonalPoints || clientProfile.points, thresholds);"
);

// Update progress bar
code = code.replace(
  "style={{ width: `${((clientProfile.seasonalPoints || clientProfile.points) % 500) / 500 * 100}%` }}",
  "style={{ width: `${tier.progressPercentage}%` }}"
);

fs.writeFileSync('src/pages/ClientPanel.tsx', code);
