const fs = require('fs');

function patch(file, search, replace) {
  let code = fs.readFileSync(file, 'utf8');
  code = code.replace(search, replace);
  fs.writeFileSync(file, code);
}

patch('src/components/modals/ClientProfileModal.tsx',
  "console.error(err);\n      toast.error('Erro ao solicitar resgate.');",
  "if (err.code !== 'permission-denied') console.error(err);\n      toast.error('Erro ao solicitar resgate.');"
);

patch('src/pages/AdminLogin.tsx',
  "console.error(err);\n      toast.error('Erro ao enviar e-mail. Verifique se o endereço está correto.');",
  "if (err.code !== 'permission-denied') console.error(err);\n      toast.error('Erro ao enviar e-mail. Verifique se o endereço está correto.');"
);

patch('src/pages/ClientAuth.tsx',
  "console.error(err);\n        toast.error('Erro ao processar imagem.');",
  "if (err.code !== 'permission-denied') console.error(err);\n        toast.error('Erro ao processar imagem.');"
);

patch('src/pages/ClientAuth.tsx',
  "console.error(err);\n      toast.error('Erro ao enviar e-mail. Verifique se o endereço está correto.');",
  "if (err.code !== 'permission-denied') console.error(err);\n      toast.error('Erro ao enviar e-mail. Verifique se o endereço está correto.');"
);

console.log('patched other consoles');
