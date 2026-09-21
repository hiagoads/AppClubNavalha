const fs = require('fs');
let code = fs.readFileSync('src/hooks/useAuth.ts', 'utf8');

// Also import setDoc
if (!code.includes('import { doc, getDoc, onSnapshot, setDoc }')) {
    code = code.replace(
        "import { doc, getDoc, onSnapshot } from 'firebase/firestore';",
        "import { doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';"
    );
}

const target = `unsubscribeProfile = onSnapshot(doc(db, 'clients', u.uid), (clientDoc) => {
        if (clientDoc.exists()) {
          setClientProfile({ id: clientDoc.id, ...clientDoc.data() } as ClientProfile);
        } else {
          setClientProfile(null);
        }
      }, (error) => {`;

const replace = `unsubscribeProfile = onSnapshot(doc(db, 'clients', u.uid), async (clientDoc) => {
        if (clientDoc.exists()) {
          setClientProfile({ id: clientDoc.id, ...clientDoc.data() } as ClientProfile);
        } else {
          // Force create the profile if we are logged in and it's missing!
          try {
            await setDoc(doc(db, 'clients', u.uid), {
              username: u.displayName || u.email?.split('@')[0] || 'Cliente',
              email: u.email,
              whatsapp: '',
              points: 0,
              createdAt: new Date().toISOString()
            });
            // Snapshot will re-fire automatically when setDoc succeeds
          } catch(e) {
             console.error("Could not auto-create profile", e);
             setClientProfile(null);
          }
        }
      }, (error) => {`;

if (code.includes('unsubscribeProfile = onSnapshot(doc(db, \'clients\', u.uid), (clientDoc) => {')) {
    code = code.replace(target, replace);
    fs.writeFileSync('src/hooks/useAuth.ts', code);
    console.log("useAuth updated to force create profile");
}
