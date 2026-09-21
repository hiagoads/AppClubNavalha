const fs = require('fs');
let code = fs.readFileSync('src/pages/ClientAuth.tsx', 'utf8');

// Imports
if (!code.includes('compressImage')) {
  code = code.replace(
    "import { formatPhone, parsePhone } from '../utils';",
    "import { formatPhone, parsePhone } from '../utils';\nimport { compressImage } from '../utils/imageUtils';\nimport { sendEmailVerification } from 'firebase/auth';"
  );
  code = code.replace(
    "import { Lock, Mail, Phone, User, X } from 'lucide-react';",
    "import { Lock, Mail, Phone, User, X, Camera, Calendar } from 'lucide-react';"
  );
}

// State variables
code = code.replace(
  "const [username, setUsername] = useState('');",
  "const [username, setUsername] = useState('');\n  const [firstName, setFirstName] = useState('');\n  const [lastName, setLastName] = useState('');\n  const [dateOfBirth, setDateOfBirth] = useState('');\n  const [avatarUrl, setAvatarUrl] = useState('');\n  const fileInputRef = useRef<HTMLInputElement>(null);"
);

// Add useRef to React import if not there
if (!code.includes('useRef')) {
  code = code.replace(
    "import React, { useState, useEffect } from 'react';",
    "import React, { useState, useEffect, useRef } from 'react';"
  );
}

// Handle Image Change
if (!code.includes('handleImageChange')) {
  code = code.replace(
    "const handleResetPassword",
    "const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {\n    if (e.target.files && e.target.files[0]) {\n      const file = e.target.files[0];\n      try {\n        const base64 = await compressImage(file);\n        setAvatarUrl(base64);\n      } catch (err) {\n        console.error(err);\n        toast.error('Erro ao processar imagem.');\n      }\n    }\n  };\n\n  const handleResetPassword"
  );
}

// Create User Fields
code = code.replace(
  "if (!username || !whatsapp) {",
  "if (!username || !whatsapp || !firstName || !lastName || !dateOfBirth) {"
);

// Save Doc
code = code.replace(
  "username,\n          email,\n          whatsapp,",
  "username,\n          firstName,\n          lastName,\n          dateOfBirth,\n          email,\n          whatsapp,\n          avatarUrl,"
);

// Send Email verification
code = code.replace(
  "toast.success('Conta criada com sucesso! Ganhe pontos e troque por prêmios.');",
  "try { await sendEmailVerification(u); toast.success('Conta criada! Enviamos um link de verificação para o seu e-mail.'); } catch (e) { toast.success('Conta criada com sucesso! (Erro ao enviar e-mail de verificação)'); }"
);

// Form Fields
const formFields = `
                {/* Photo Upload */}
                <div className="flex justify-center mb-6">
                  <div className="relative">
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="w-24 h-24 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center cursor-pointer hover:border-gold/50 hover:bg-white/5 transition-all overflow-hidden group"
                    >
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <Camera className="w-8 h-8 text-white/30 group-hover:text-gold/50" />
                      )}
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Camera className="w-6 h-6 text-white" />
                      </div>
                    </div>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleImageChange} 
                      accept="image/*" 
                      className="hidden" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs uppercase tracking-widest text-white/50 mb-2">Nome</label>
                    <input 
                      required={!isLogin}
                      type="text" 
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Primeiro"
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-gold/50 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-widest text-white/50 mb-2">Sobrenome</label>
                    <input 
                      required={!isLogin}
                      type="text" 
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Último"
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-gold/50 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-widest text-white/50 mb-2">Data de Nascimento</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input 
                      required={!isLogin}
                      type="date" 
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-gold/50 text-sm [color-scheme:dark]"
                    />
                  </div>
                </div>
`;

code = code.replace(
  "<div>\n                  <label className=\"block text-xs uppercase tracking-widest text-white/50 mb-2\">Nome de Usuário</label>",
  formFields + "\n                <div>\n                  <label className=\"block text-xs uppercase tracking-widest text-white/50 mb-2\">Nome de Usuário</label>"
);

fs.writeFileSync('src/pages/ClientAuth.tsx', code);
console.log("ClientAuth updated");
