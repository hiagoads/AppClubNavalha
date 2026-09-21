const fs = require('fs');
let code = fs.readFileSync('firestore.rules', 'utf8');

const search = `['username', 'email', 'whatsapp', 'points', 'createdAt', 'firstName', 'lastName', 'dateOfBirth']`;
const replace = `['username', 'email', 'whatsapp', 'points', 'seasonalPoints', 'createdAt', 'firstName', 'lastName', 'dateOfBirth']`;

code = code.replace(search, replace);

const search2 = `&& request.resource.data.points == 0;`;
const replace2 = `&& request.resource.data.points == 0
                    && request.resource.data.seasonalPoints == 0;`;
code = code.replace(search2, replace2);

fs.writeFileSync('firestore.rules', code);
