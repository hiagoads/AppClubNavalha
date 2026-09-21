const fs = require('fs');
let code = fs.readFileSync('firestore.rules', 'utf8');

code = code.replace(
    /request\.auth\.token\.email == 'slvhiago2@gmail\.com'/g,
    "('email' in request.auth.token && request.auth.token.email == 'slvhiago2@gmail.com')"
);

fs.writeFileSync('firestore.rules', code);
console.log('firestore.rules updated');
