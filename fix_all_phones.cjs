const fs = require('fs');

// 1. ClientAuth.tsx
let clientAuth = fs.readFileSync('src/pages/ClientAuth.tsx', 'utf8');
if (!clientAuth.includes('formatPhone')) {
    clientAuth = clientAuth.replace(
        "import { useAuth } from '../hooks/useAuth';",
        "import { useAuth } from '../hooks/useAuth';\nimport { formatPhone, parsePhone } from '../utils';"
    );
    clientAuth = clientAuth.replace(
        /value=\{whatsapp\}\s*onChange=\{\(e\) => \{\s*let val = e\.target\.value\.replace\(\/\\D\/g, ''\);\s*if \(val\.length > 11\) val = val\.slice\(0, 11\);\s*if \(val\.length > 2\) val = `\(\$\{val\.slice\(0,2\)\}\) \$\{val\.slice\(2\)\}`;\s*if \(val\.length > 10\) val = `\$\{val\.slice\(0,10\)\}-\$\{val\.slice\(10\)\}`;\s*setWhatsapp\(val\);\s*\}\}/m,
        "value={formatPhone(whatsapp)}\n                      onChange={(e) => setWhatsapp(parsePhone(e.target.value))}"
    );
    fs.writeFileSync('src/pages/ClientAuth.tsx', clientAuth);
    console.log("ClientAuth updated");
}

// 2. JoinQueueModal.tsx
let joinQueue = fs.readFileSync('src/components/modals/JoinQueueModal.tsx', 'utf8');
if (!joinQueue.includes('formatPhone')) {
    joinQueue = joinQueue.replace(
        "import { Service } from '../../types';",
        "import { Service } from '../../types';\nimport { formatPhone, parsePhone } from '../../utils';"
    );
    joinQueue = joinQueue.replace(
        /value=\{formData\.whatsapp\}\s*onChange=\{\(e\) => \{\s*let val = e\.target\.value\.replace\(\/\\D\/g, ''\);\s*if \(val\.length > 11\) val = val\.slice\(0, 11\);\s*if \(val\.length > 2\) val = `\(\$\{val\.slice\(0,2\)\}\) \$\{val\.slice\(2\)\}`;\s*if \(val\.length > 10\) val = `\$\{val\.slice\(0,10\)\}-\$\{val\.slice\(10\)\}`;\s*setFormData\(\{\.\.\.formData, whatsapp: val\}\);\s*\}\}/m,
        "value={formatPhone(formData.whatsapp)}\n                onChange={(e) => setFormData({...formData, whatsapp: parsePhone(e.target.value)})}"
    );
    fs.writeFileSync('src/components/modals/JoinQueueModal.tsx', joinQueue);
    console.log("JoinQueueModal updated");
}

// 3. EditClientProfileModal.tsx
let editProfile = fs.readFileSync('src/components/modals/EditClientProfileModal.tsx', 'utf8');
if (editProfile.includes('const formatPhone')) {
    editProfile = editProfile.replace(
        /const formatPhone = \(val: string\) => \{[\s\S]*?\};\n\n/,
        ""
    );
    editProfile = editProfile.replace(
        "import { ClientProfile } from '../../types';",
        "import { ClientProfile } from '../../types';\nimport { formatPhone, parsePhone } from '../../utils';"
    );
    editProfile = editProfile.replace(
        "onChange={(e) => setWhatsapp(e.target.value)}",
        "onChange={(e) => setWhatsapp(parsePhone(e.target.value))}"
    );
    fs.writeFileSync('src/components/modals/EditClientProfileModal.tsx', editProfile);
    console.log("EditClientProfileModal updated");
}

