const fs = require('fs');
let code = fs.readFileSync('src/pages/ClientPanel.tsx', 'utf8');

code = code.replace(
  "const { queue, activeBookings, loading } = useQueue();",
  "const { queue, activeBookings, loading } = useQueue();\n  const { thresholds } = useGamificationSettings();"
);

fs.writeFileSync('src/pages/ClientPanel.tsx', code);
