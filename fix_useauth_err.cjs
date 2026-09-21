const fs = require('fs');
let code = fs.readFileSync('src/hooks/useAuth.ts', 'utf8');

code = code.replace(
  "console.error(\"Error fetching client profile:\", error);",
  "if (error.code !== 'permission-denied') console.error(\"Error fetching client profile:\", error);"
);

fs.writeFileSync('src/hooks/useAuth.ts', code);
console.log('useAuth err log updated');
