const fs = require('fs');
let code = fs.readFileSync('src/components/GamificationManager.tsx', 'utf-8');

const replacement = `
        const hasWeeklyPoints = (c.weeklyPoints || 0) > 0;
        
        if (hasWeeklyPoints) {
          if (rank === 1) {
            addBonusWithoutStacking({ id: crypto.randomUUID(), title: 'Acesso Livre VIP (1º da Semana)', type: 'unlimited_vip', isRedeemed: false, createdAt: new Date().toISOString() });
          } else if (rank === 2) {
            addBonusWithoutStacking({ id: crypto.randomUUID(), title: '1 Hora VIP (2º da Semana)', type: 'vip_hours', totalHours: 1, usedHours: 0, createdAt: new Date().toISOString() });
            addBonusWithoutStacking({ id: crypto.randomUUID(), title: 'Picolé Grátis (2º da Semana)', type: 'popsicle', isRedeemed: false, createdAt: new Date().toISOString() });
          } else if (rank === 3) {
            addBonusWithoutStacking({ id: crypto.randomUUID(), title: 'Picolé Grátis (3º da Semana)', type: 'popsicle', isRedeemed: false, createdAt: new Date().toISOString() });
          }
        }
`;

code = code.replace(/        if \(rank === 1\) \{[\s\S]*?addBonusWithoutStacking\(\{ id: crypto\.randomUUID\(\), title: 'Picolé Grátis \(3º da Semana\)', type: 'popsicle', isRedeemed: false, createdAt: new Date\(\)\.toISOString\(\) \}\);\n        \}/, replacement.trim());

fs.writeFileSync('src/components/GamificationManager.tsx', code);
