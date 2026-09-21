const fs = require('fs');
let code = fs.readFileSync('src/pages/ClientPanel.tsx', 'utf8');

if (!code.includes('parsePhone')) {
    code = code.replace(
        "import { formatTime, getDistanceFromLatLonInMeters, parsePrice, parseServiceString, stringifyServices } from '../utils';",
        "import { formatTime, getDistanceFromLatLonInMeters, parsePrice, parseServiceString, stringifyServices, parsePhone } from '../utils';"
    );
    code = code.replace(
        "setFormData(prev => ({ ...prev, name: clientProfile.username, whatsapp: clientProfile.whatsapp }));",
        "setFormData(prev => ({ ...prev, name: clientProfile.username, whatsapp: parsePhone(clientProfile.whatsapp || '') }));"
    );
    
    // also ensure it saves clean phone
    code = code.replace(
        "clientWhatsapp: formData.whatsapp,",
        "clientWhatsapp: parsePhone(formData.whatsapp),"
    );

    fs.writeFileSync('src/pages/ClientPanel.tsx', code);
    console.log("ClientPanel updated");
}
