const fs = require('fs');
let code = fs.readFileSync('src/pages/ClientAuth.tsx', 'utf8');

code = code.replace(
  "where('whatsapp', '==', parsePhone(whatsapp))",
  "where('whatsapp', '==', whatsapp)"
);

fs.writeFileSync('src/pages/ClientAuth.tsx', code);
console.log('ClientAuth whatsapp variable fixed');
