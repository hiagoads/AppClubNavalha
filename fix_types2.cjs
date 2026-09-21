const fs = require('fs');
let code = fs.readFileSync('src/types/index.ts', 'utf8');

// Undo wrong replace
code = code.replace(
    "whatsapp: string;\n  avatarUrl?: string;",
    "whatsapp: string;"
);

// Correctly add avatarUrl to ClientProfile
code = code.replace(
    "export interface ClientProfile {\n  id: string; // The uid from auth\n  username: string;\n  email: string;\n  whatsapp: string;\n",
    "export interface ClientProfile {\n  id: string; // The uid from auth\n  username: string;\n  email: string;\n  whatsapp: string;\n  avatarUrl?: string;\n"
);

fs.writeFileSync('src/types/index.ts', code);
console.log("Types updated correctly");
