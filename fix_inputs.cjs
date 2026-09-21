const fs = require('fs');
let code = fs.readFileSync('src/pages/ClientAuth.tsx', 'utf8');

code = code.replace(
  '<label className="block text-xs uppercase tracking-widest text-white/50 mb-2">Nome de Usuário</label>',
  '<div className="flex justify-between items-center mb-2"><label className="block text-xs uppercase tracking-widest text-white/50">Nome de Usuário</label>{fieldErrors.username && <span className="text-[10px] text-red-500">{fieldErrors.username}</span>}</div>'
);

code = code.replace(
  '<label className="block text-xs uppercase tracking-widest text-white/50 mb-2">WhatsApp</label>',
  '<div className="flex justify-between items-center mb-2"><label className="block text-xs uppercase tracking-widest text-white/50">WhatsApp</label>{fieldErrors.whatsapp && <span className="text-[10px] text-red-500">{fieldErrors.whatsapp}</span>}</div>'
);

code = code.replace(
  '<label className="block text-xs uppercase tracking-widest text-white/50 mb-2">E-mail</label>',
  '<div className="flex justify-between items-center mb-2"><label className="block text-xs uppercase tracking-widest text-white/50">E-mail</label>{fieldErrors.email && <span className="text-[10px] text-red-500">{fieldErrors.email}</span>}</div>'
);

fs.writeFileSync('src/pages/ClientAuth.tsx', code);
console.log('inputs updated');
