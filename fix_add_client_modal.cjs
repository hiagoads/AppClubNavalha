const fs = require('fs');
let code = fs.readFileSync('src/components/modals/AddClientModal.tsx', 'utf8');

if (!code.includes('formatPhone')) {
    code = code.replace(
        "import { parsePrice, parseServiceString, stringifyServices } from '../../utils';",
        "import { parsePrice, parseServiceString, stringifyServices, formatPhone, parsePhone } from '../../utils';"
    );
    code = code.replace(
        /value=\{newClientData\.whatsapp\}\s*onChange=\{\(e\) => setNewClientData\(\{ \.\.\.newClientData, whatsapp: e\.target\.value \}\)\}/m,
        "value={formatPhone(newClientData.whatsapp)}\n              onChange={(e) => setNewClientData({ ...newClientData, whatsapp: parsePhone(e.target.value) })}"
    );
    fs.writeFileSync('src/components/modals/AddClientModal.tsx', code);
    console.log("AddClientModal updated");
}
