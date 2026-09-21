const fs = require('fs');
let code = fs.readFileSync('src/components/modals/ClientMenuModal.tsx', 'utf8');

code = code.replace(
    /Resgatar Prêmios/g,
    "Meu Perfil & Prêmios"
);

code = code.replace(
    /<Award className="w-4 h-4" \/>/g,
    "<Star className=\"w-4 h-4\" />"
);

fs.writeFileSync('src/components/modals/ClientMenuModal.tsx', code);
console.log("ClientMenuModal updated");
