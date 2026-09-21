const fs = require('fs');
let code = fs.readFileSync('src/pages/ClientAuth.tsx', 'utf8');

code = code.replace(
  "if (err.code !== 'auth/invalid-credential' && err.code !== 'auth/email-already-in-use') console.error(err);",
  "if (err.code !== 'auth/invalid-credential' && err.code !== 'auth/email-already-in-use' && err.code !== 'permission-denied') console.error(err);"
);

fs.writeFileSync('src/pages/ClientAuth.tsx', code);
console.log('patched catch');
