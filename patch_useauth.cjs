const fs = require('fs');
let code = fs.readFileSync('src/hooks/useAuth.ts', 'utf8');

code = code.replace(
  "console.error(\"Could not auto-create profile\", e);",
  "if (e.code !== 'permission-denied') console.error(\"Could not auto-create profile\", e);"
);

fs.writeFileSync('src/hooks/useAuth.ts', code);
console.log('useAuth updated');
