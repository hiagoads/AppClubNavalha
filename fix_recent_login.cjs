const fs = require('fs');
let code = fs.readFileSync('src/components/modals/EditClientProfileModal.tsx', 'utf8');

if (!code.includes('signOut')) {
    code = code.replace(
        "import { auth } from '../../lib/firebase';",
        "import { auth } from '../../lib/firebase';\nimport { signOut } from 'firebase/auth';"
    );
}

code = code.replace(
    "toast.error('Por segurança, faça login novamente para excluir a conta.');",
    "toast.error('Por segurança, faça login novamente para excluir a conta.');\n        signOut(auth);\n        onClose();"
);

fs.writeFileSync('src/components/modals/EditClientProfileModal.tsx', code);
console.log('EditClientProfileModal updated');
