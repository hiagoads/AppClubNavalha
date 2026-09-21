const fs = require('fs');
let code = fs.readFileSync('src/components/modals/EditClientProfileModal.tsx', 'utf8');

code = code.replace(
  "console.error(err);\n      if (err.code === 'auth/requires-recent-login')",
  "if (err.code !== 'auth/requires-recent-login' && err.code !== 'permission-denied') console.error(err);\n      if (err.code === 'auth/requires-recent-login')"
);

code = code.replace(
  "console.error(err);\n      toast.error('Erro ao atualizar perfil.');",
  "if (err.code !== 'permission-denied') console.error(err);\n      toast.error('Erro ao atualizar perfil.');"
);

fs.writeFileSync('src/components/modals/EditClientProfileModal.tsx', code);
console.log('patched EditClientProfileModal.tsx');
