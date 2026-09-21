const fs = require('fs');
let code = fs.readFileSync('src/pages/ClientAuth.tsx', 'utf8');

const regex = /\/\/ Check availability before creating account\s*const qUsername = query\(collection\(db, 'clients'\), where\('username', '==', username\)\);\s*const snapUsername = await getDocs\(qUsername\);\s*let hasError = false;\s*const newErrors: any = \{\};\s*if \(!snapUsername.empty\) \{\s*newErrors.username = 'Este nome de usuário já está em uso.';\s*hasError = true;\s*\}\s*const qPhone = query\(collection\(db, 'clients'\), where\('whatsapp', '==', whatsapp\)\);\s*const snapPhone = await getDocs\(qPhone\);\s*if \(!snapPhone.empty\) \{\s*newErrors.whatsapp = 'Este número de WhatsApp já está em uso.';\s*hasError = true;\s*\}\s*if \(hasError\) \{\s*setFieldErrors\(newErrors\);\s*setLoading\(false\);\s*return;\s*\}\s*const userCredential = await createUserWithEmailAndPassword\(auth, email, password\);\s*const u = userCredential.user;/ms;

const replacement = `const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const u = userCredential.user;

        // Check availability after creating account (needs auth to read db)
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
            await u.delete();
            setFieldErrors(newErrors);
            setLoading(false);
            return;
        }`;

if (code.match(regex)) {
  code = code.replace(regex, replacement);
  fs.writeFileSync('src/pages/ClientAuth.tsx', code);
  console.log('updated correctly');
} else {
  console.log('regex mismatch');
}
