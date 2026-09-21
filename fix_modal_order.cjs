const fs = require('fs');
let code = fs.readFileSync('src/components/modals/EditClientProfileModal.tsx', 'utf8');

code = code.replace(
  "if (auth.currentUser) {\n        await auth.currentUser.delete();\n      }\n      await deleteDoc(doc(db, 'clients', clientProfile.id));",
  "await deleteDoc(doc(db, 'clients', clientProfile.id));\n      if (auth.currentUser) {\n        await auth.currentUser.delete();\n      }"
);

fs.writeFileSync('src/components/modals/EditClientProfileModal.tsx', code);
console.log('EditClientProfileModal delete order fixed');
