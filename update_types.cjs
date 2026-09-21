const fs = require('fs');
let code = fs.readFileSync('src/types/index.ts', 'utf8');

if (!code.includes('avatarUrl?: string;')) {
    code = code.replace(
        "whatsapp: string;",
        "whatsapp: string;\n  avatarUrl?: string;"
    );
    fs.writeFileSync('src/types/index.ts', code);
    console.log("Types updated");
}
