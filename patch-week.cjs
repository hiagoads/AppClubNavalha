const fs = require('fs');
let code = fs.readFileSync('src/components/GamificationManager.tsx', 'utf-8');

const replacement = `
      for (let i = 0; i < sortedClients.length; i++) {
        const c = sortedClients[i];
        const rank = i + 1;
        
        let newBonuses = c.bonuses || [];

        const addBonusWithoutStacking = (bonusDef: any) => {
          // Remove any existing active bonus of the SAME TYPE
          newBonuses = newBonuses.filter((b: any) => {
            if (b.type === bonusDef.type) {
              if (b.type === 'vip_hours') return (b.usedHours || 0) >= (b.totalHours || 1);
              return b.isRedeemed === true; // Keep only if already redeemed
            }
            return true;
          });
          // Add the new fresh bonus
          newBonuses.push(bonusDef);
        };

        if (rank === 1) {
          addBonusWithoutStacking({ id: crypto.randomUUID(), title: 'Acesso Livre VIP (1º da Semana)', type: 'unlimited_vip', isRedeemed: false, createdAt: new Date().toISOString() });
        } else if (rank === 2) {
          addBonusWithoutStacking({ id: crypto.randomUUID(), title: '1 Hora VIP (2º da Semana)', type: 'vip_hours', totalHours: 1, usedHours: 0, createdAt: new Date().toISOString() });
          addBonusWithoutStacking({ id: crypto.randomUUID(), title: 'Picolé Grátis (2º da Semana)', type: 'popsicle', isRedeemed: false, createdAt: new Date().toISOString() });
        } else if (rank === 3) {
          addBonusWithoutStacking({ id: crypto.randomUUID(), title: 'Picolé Grátis (3º da Semana)', type: 'popsicle', isRedeemed: false, createdAt: new Date().toISOString() });
        }

        await updateDoc(doc(db, 'clients', c.id), {
`;

code = code.replace(/      for \(let i = 0; i < sortedClients\.length; i\+\+\) \{\n        const c = sortedClients\[i\];\n        const rank = i \+ 1;\n        let newBonuses = c\.bonuses \|\| \[\];\n\n        if \(rank === 1\) \{[\s\S]*?await updateDoc\(doc\(db, 'clients', c\.id\), \{/, replacement.trim());

fs.writeFileSync('src/components/GamificationManager.tsx', code);
