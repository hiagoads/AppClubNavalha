const fs = require('fs');
let code = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf8');

const target = `          if (!snapshot.empty) {
            // Client found! Add points
            const pointsToGive = Math.floor(finalPrice * 100);
            const clientDoc = snapshot.docs[0];
            await updateDoc(doc(db, 'clients', clientDoc.id), {
              points: increment(pointsToGive)
            });
            toast.success(\`\${pointsToGive} pontos creditados para \${clientDoc.data().username}!\`);
          }`;

const replace = `          if (!snapshot.empty) {
            // Client found! Add points
            const pointsToGive = Math.floor(finalPrice * 100);
            const clientDoc = snapshot.docs[0];
            await updateDoc(doc(db, 'clients', clientDoc.id), {
              points: increment(pointsToGive)
            });
            
            // Register point transaction
            await addDoc(collection(db, 'point_transactions'), {
              clientId: clientDoc.id,
              clientName: clientDoc.data().username,
              points: pointsToGive,
              type: 'earned',
              description: 'Corte/Serviço finalizado',
              createdAt: new Date().toISOString()
            });
            
            toast.success(\`\${pointsToGive} pontos creditados para \${clientDoc.data().username}!\`);
          }`;

if (code.includes('await updateDoc(doc(db, \'clients\', clientDoc.id), {')) {
    code = code.replace(target, replace);
    fs.writeFileSync('src/pages/AdminDashboard.tsx', code);
    console.log("AdminDashboard updated to save point_transactions");
}
