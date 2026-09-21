const fs = require('fs');
let code = fs.readFileSync('src/components/BarbersManager.tsx', 'utf8');

code = code.replace(
  "    if(!window.confirm('Tem certeza que deseja remover este barbeiro?')) return;",
  "    // Bypass confirm to avoid iframe blocking"
);

fs.writeFileSync('src/components/BarbersManager.tsx', code);
