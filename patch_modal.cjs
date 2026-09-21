const fs = require('fs');
let code = fs.readFileSync('src/components/modals/EditClientProfileModal.tsx', 'utf8');

if (!code.includes('collection, query, where, getDocs')) {
  code = code.replace(
    "import { doc, updateDoc } from 'firebase/firestore';",
    "import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';"
  );
}

const checkLogic = `
    const qUsername = query(collection(db, 'clients'), where('username', '==', username.trim()));
    const snapUsername = await getDocs(qUsername);
    if (!snapUsername.empty && snapUsername.docs[0].id !== clientProfile.id) {
        toast.error('Este nome de usuário já está em uso por outra pessoa.');
        setIsSubmitting(false);
        return;
    }

    const qPhone = query(collection(db, 'clients'), where('whatsapp', '==', cleanPhone));
    const snapPhone = await getDocs(qPhone);
    if (!snapPhone.empty && snapPhone.docs[0].id !== clientProfile.id) {
        toast.error('Este número de WhatsApp já está em uso por outra pessoa.');
        setIsSubmitting(false);
        return;
    }
`;

if (!code.includes('snapUsername')) {
  code = code.replace(
    "setIsSubmitting(true);\n    try {",
    "setIsSubmitting(true);\n" + checkLogic + "\n    try {"
  );
}

fs.writeFileSync('src/components/modals/EditClientProfileModal.tsx', code);
console.log('EditClientProfileModal updated');
