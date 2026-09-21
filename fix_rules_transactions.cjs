const fs = require('fs');
let code = fs.readFileSync('firestore.rules', 'utf8');

const target = `    match /redemptions/{redemptionId} {`;
const replace = `    match /point_transactions/{transactionId} {
      allow read: if isAdmin() || (isSignedIn() && request.auth.uid == resource.data.clientId);
      allow write: if isAdmin();
    }
    match /redemptions/{redemptionId} {`;

if (code.includes(target) && !code.includes('point_transactions')) {
    code = code.replace(target, replace);
    fs.writeFileSync('firestore.rules', code);
    console.log("firestore.rules updated with point_transactions");
}
