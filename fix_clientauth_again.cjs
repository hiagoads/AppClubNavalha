const fs = require('fs');
let code = fs.readFileSync('src/pages/ClientAuth.tsx', 'utf8');

const regex = /const userCredential = await createUserWithEmailAndPassword\(auth, email, password\);[\s\S]*?await updateProfile\(u, \{ displayName: username \}\);/m;

const replacement = `// Check availability before creating account
        const qUsername = query(collection(db, 'clients'), where('username', '==', username));
        const snapUsername = await getDocs(qUsername);
        let hasError = false;
        const newErrors: any = {};
        
        if (!snapUsername.empty) {
            newErrors.username = 'Este nome de usuário já está em uso.';
            hasError = true;
        }
        const qPhone = query(collection(db, 'clients'), where('whatsapp', '==', whatsapp));
        const snapPhone = await getDocs(qPhone);
        if (!snapPhone.empty) {
            newErrors.whatsapp = 'Este número de WhatsApp já está em uso.';
            hasError = true;
        }

        if (hasError) {
            setFieldErrors(newErrors);
            setLoading(false);
            return;
        }

        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const u = userCredential.user;
        await updateProfile(u, { displayName: username });`;

if (code.match(regex)) {
  code = code.replace(regex, replacement);
  fs.writeFileSync('src/pages/ClientAuth.tsx', code);
  console.log('updated successfully');
} else {
  console.log('regex did not match');
}
