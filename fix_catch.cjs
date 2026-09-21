const fs = require('fs');
let code = fs.readFileSync('src/pages/ClientAuth.tsx', 'utf8');

code = code.replace(
  "toast.error('Este e-mail já está em uso.');",
  "setFieldErrors({ email: 'Este e-mail já está em uso.' });"
);

fs.writeFileSync('src/pages/ClientAuth.tsx', code);
console.log('catch updated');
