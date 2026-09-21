const fs = require('fs');
let code = fs.readFileSync('firestore.rules', 'utf8');

const search = `    match /clients/{clientId} {
      allow read: if isSignedIn();
      allow create: if isSignedIn() && request.auth.uid == clientId 
                     && request.resource.data.keys().hasAll(['username', 'email', 'whatsapp', 'points', 'createdAt', 'firstName', 'lastName', 'dateOfBirth'])
                    && request.resource.data.points == 0;
      allow update: if isAdmin() || (isSignedIn() && request.auth.uid == clientId && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['username', 'whatsapp', 'avatarUrl', 'firstName', 'lastName', 'dateOfBirth']));
      allow delete: if isAdmin() || (isSignedIn() && request.auth.uid == clientId);
    }`;

const replace = `    match /clients/{clientId} {
      allow read: if isSignedIn();
      allow create: if isSignedIn() && request.auth.uid == clientId 
                     && request.resource.data.keys().hasAll(['username', 'email', 'whatsapp', 'points', 'createdAt', 'firstName', 'lastName', 'dateOfBirth'])
                    && request.resource.data.points == 0;
      allow update: if isAdmin() || (
        isSignedIn() && request.auth.uid == clientId
        && request.resource.data.points == resource.data.points
        && request.resource.data.createdAt == resource.data.createdAt
        && request.resource.data.email == resource.data.email
      );
      allow delete: if isAdmin() || (isSignedIn() && request.auth.uid == clientId);
    }`;

code = code.replace(search, replace);
fs.writeFileSync('firestore.rules', code);
