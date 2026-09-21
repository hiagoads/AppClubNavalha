const fs = require('fs');
let code = fs.readFileSync('src/pages/ClientAuth.tsx', 'utf8');

// Also need getDoc to check if doc exists
if (!code.includes('getDoc')) {
    code = code.replace(
        "import { doc, setDoc } from 'firebase/firestore';",
        "import { doc, setDoc, getDoc } from 'firebase/firestore';"
    );
}

const target = `        await signInWithEmailAndPassword(auth, email, password);
        toast.success('Login realizado com sucesso!');
        navigate('/');`;

const replace = `        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const u = userCredential.user;
        
        // Retroactive fix: if old account doesn't have a client document, create it
        const clientDoc = await getDoc(doc(db, 'clients', u.uid));
        if (!clientDoc.exists()) {
           await setDoc(doc(db, 'clients', u.uid), {
              username: u.displayName || email.split('@')[0],
              email: u.email,
              whatsapp: '',
              points: 0,
              createdAt: new Date().toISOString()
           });
        }
        
        toast.success('Login realizado com sucesso!');
        navigate('/');`;

if (code.includes('await signInWithEmailAndPassword(auth, email, password);')) {
    code = code.replace(target, replace);
    fs.writeFileSync('src/pages/ClientAuth.tsx', code);
    console.log("ClientAuth updated for retroactive profile creation");
}
