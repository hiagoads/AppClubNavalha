const fs = require('fs');
let code = fs.readFileSync('src/pages/ClientAuth.tsx', 'utf8');

if (!code.includes('collection, query, where, getDocs')) {
  code = code.replace(
    "import { doc, setDoc, getDoc } from 'firebase/firestore';",
    "import { doc, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';"
  );
}

const checkLogic = `
        const qUsername = query(collection(db, 'clients'), where('username', '==', username));
        const snapUsername = await getDocs(qUsername);
        if (!snapUsername.empty) {
            await u.delete();
            toast.error('Este nome de usuário já está em uso.');
            setLoading(false);
            return;
        }

        const qPhone = query(collection(db, 'clients'), where('whatsapp', '==', parsePhone(whatsapp)));
        const snapPhone = await getDocs(qPhone);
        if (!snapPhone.empty) {
            await u.delete();
            toast.error('Este número de WhatsApp já está em uso.');
            setLoading(false);
            return;
        }
`;

if (!code.includes('snapUsername')) {
  code = code.replace(
    "const u = userCredential.user;\n\n        await updateProfile(u, { displayName: username });",
    "const u = userCredential.user;\n" + checkLogic + "\n        await updateProfile(u, { displayName: username });"
  );
}

fs.writeFileSync('src/pages/ClientAuth.tsx', code);
console.log('ClientAuth updated');
