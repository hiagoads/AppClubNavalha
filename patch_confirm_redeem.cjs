const fs = require('fs');

let code = fs.readFileSync('src/components/modals/ClientProfileModal.tsx', 'utf8');

const search = `    if (!window.confirm(\`Deseja resgatar "\${reward.title}" por \${reward.points} pontos?\`)) {
      return;
    }`;

const replace = `    // Removed window.confirm because of iframe restrictions. 
    // We can just proceed or add a custom UI if needed. 
    // Let's just proceed for now to unblock the user immediately.`;

code = code.replace(search, replace);
fs.writeFileSync('src/components/modals/ClientProfileModal.tsx', code);
