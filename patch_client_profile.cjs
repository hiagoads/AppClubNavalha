const fs = require('fs');
let code = fs.readFileSync('src/components/modals/ClientProfileModal.tsx', 'utf8');

// Import useGamificationSettings
code = code.replace(
  "import { getLevelTier } from '../../utils/tierSystem';",
  "import { getLevelTier } from '../../utils/tierSystem';\nimport { useGamificationSettings } from '../../hooks/useGamificationSettings';"
);

// Add to component body
code = code.replace(
  "const [confirmReward, setConfirmReward] = useState<typeof REWARDS_CATALOG[0] | null>(null);",
  "const [confirmReward, setConfirmReward] = useState<typeof REWARDS_CATALOG[0] | null>(null);\n  const { thresholds } = useGamificationSettings();"
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

fs.writeFileSync('src/components/modals/ClientProfileModal.tsx', code);
