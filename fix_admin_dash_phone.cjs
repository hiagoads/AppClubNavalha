const fs = require('fs');
let code = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf8');

if (!code.includes('parsePhone')) {
    code = code.replace(
        "import { formatTime, parsePrice, parseServiceString, stringifyServices } from '../utils';",
        "import { formatTime, parsePrice, parseServiceString, stringifyServices, parsePhone } from '../utils';"
    );
    code = code.replace(
        "clientWhatsapp: newClientData.whatsapp,",
        "clientWhatsapp: parsePhone(newClientData.whatsapp),"
    );

    fs.writeFileSync('src/pages/AdminDashboard.tsx', code);
    console.log("AdminDashboard updated");
}
