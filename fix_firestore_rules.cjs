const fs = require('fs');
let code = fs.readFileSync('firestore.rules', 'utf8');

code = code.replace(
  "hasOnly(['username', 'whatsapp', 'avatarUrl'])",
  "hasOnly(['username', 'whatsapp', 'avatarUrl', 'firstName', 'lastName', 'dateOfBirth'])"
);

code = code.replace(
  "hasAll(['username', 'email', 'whatsapp', 'points', 'createdAt'])",
  "hasAll(['username', 'email', 'whatsapp', 'points', 'createdAt', 'firstName', 'lastName', 'dateOfBirth'])"
);

fs.writeFileSync('firestore.rules', code);
console.log("firestore.rules updated");
