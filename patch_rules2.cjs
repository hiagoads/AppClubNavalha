const fs = require('fs');
let code = fs.readFileSync('firestore.rules', 'utf8');

const search = `      allow update: if isAdmin() || (
        isSignedIn() && request.auth.uid == clientId
        && request.resource.data.points == resource.data.points
        && request.resource.data.createdAt == resource.data.createdAt
        && request.resource.data.email == resource.data.email
      );`;

const replace = `      allow update: if isAdmin() || (
        isSignedIn() && request.auth.uid == clientId
        && !('points' in request.resource.data.diff(resource.data).affectedKeys())
        && !('createdAt' in request.resource.data.diff(resource.data).affectedKeys())
        && !('email' in request.resource.data.diff(resource.data).affectedKeys())
      );`;

code = code.replace(search, replace);
fs.writeFileSync('firestore.rules', code);
