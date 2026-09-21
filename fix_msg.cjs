const fs = require('fs');

let clientAuth = fs.readFileSync('src/pages/ClientAuth.tsx', 'utf8');
clientAuth = clientAuth.replace(
  "toast.error('Credenciais inválidas.');",
  "toast.error('E-mail ou senha incorretos.');"
);
fs.writeFileSync('src/pages/ClientAuth.tsx', clientAuth);

let adminLogin = fs.readFileSync('src/pages/AdminLogin.tsx', 'utf8');
adminLogin = adminLogin.replace(
  "toast.error('Acesso negado. Verifique suas credenciais.');",
  "toast.error('Acesso negado. E-mail ou senha incorretos.');"
);
fs.writeFileSync('src/pages/AdminLogin.tsx', adminLogin);

console.log('Fixed auth messages');
