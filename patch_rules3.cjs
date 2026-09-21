const fs = require('fs');
let code = fs.readFileSync('firestore.rules', 'utf8');

const search = `hasOnly(['status', 'checkInTime', 'serviceId', 'expectedPrice'])`;
const replace = `hasOnly(['status', 'checkInTime', 'serviceId', 'expectedPrice', 'notifiedJoined', 'notifiedPos2', 'notifiedApproaching', 'notifiedTurnArrived'])`;

code = code.replace(search, replace);
fs.writeFileSync('firestore.rules', code);
