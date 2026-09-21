const fs = require('fs');
let code = fs.readFileSync('firestore.rules', 'utf8');
code = code.replace(
  "allow delete: if isAdmin();\n    }\n    match /barbers/{barberId}",
  "allow delete: if isAdmin() || (isSignedIn() && request.auth.uid == clientId);\n    }\n    match /barbers/{barberId}"
);
fs.writeFileSync('firestore.rules', code);
console.log('firestore.rules updated');
