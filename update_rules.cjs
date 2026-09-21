const fs = require('fs');
let code = fs.readFileSync('firestore.rules', 'utf8');

code = code.replace(
    "match /clients/{clientId} {\n      allow read: if isAdmin() || (isSignedIn() && request.auth.uid == clientId);",
    "match /clients/{clientId} {\n      allow read: if isSignedIn();"
);

// We also need clients to update themselves for Edit Profile.
// Only username and whatsapp!
code = code.replace(
    "      allow update: if isAdmin();",
    "      allow update: if isAdmin() || (isSignedIn() && request.auth.uid == clientId && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['username', 'whatsapp']));"
);


fs.writeFileSync('firestore.rules', code);
console.log("firestore.rules updated");
