const fs = require('fs');
let code = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf8');

if (code.includes('../components/admin/GamificationManager')) {
    code = code.replace(
        "import { GamificationManager } from '../components/admin/GamificationManager';",
        "import { GamificationManager } from '../components/GamificationManager';"
    );
    fs.writeFileSync('src/pages/AdminDashboard.tsx', code);
}
