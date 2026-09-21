const fs = require('fs');
let code1 = fs.readFileSync('src/pages/ClientPanel.tsx', 'utf8');
code1 = code1.replace(
  'style={{ width: `${(clientProfile.points % 500) / 500 * 100}%` }}',
  'style={{ width: `${((clientProfile.seasonalPoints || clientProfile.points) % 500) / 500 * 100}%` }}'
);
fs.writeFileSync('src/pages/ClientPanel.tsx', code1);

let code2 = fs.readFileSync('src/components/modals/ClientProfileModal.tsx', 'utf8');
code2 = code2.replace(
  'style={{ width: `${(clientProfile.points % 500) / 500 * 100}%` }}',
  'style={{ width: `${((clientProfile.seasonalPoints || clientProfile.points) % 500) / 500 * 100}%` }}'
);
fs.writeFileSync('src/components/modals/ClientProfileModal.tsx', code2);
