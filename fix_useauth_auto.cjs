const fs = require('fs');
let code = fs.readFileSync('src/hooks/useAuth.ts', 'utf8');

code = code.replace(
  "email: u.email,",
  "email: u.email || '',\n              avatarUrl: '',"
);

fs.writeFileSync('src/hooks/useAuth.ts', code);
console.log('useAuth updated');
