const fs = require('fs');
let code = fs.readFileSync('src/types/index.ts', 'utf8');

code = code.replace(
  "username: string;\n  email: string;",
  "username: string;\n  firstName?: string;\n  lastName?: string;\n  dateOfBirth?: string;\n  email: string;"
);

fs.writeFileSync('src/types/index.ts', code);
console.log("Types updated");
