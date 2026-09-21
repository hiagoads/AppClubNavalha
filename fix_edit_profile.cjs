const fs = require('fs');
let code = fs.readFileSync('src/components/modals/EditClientProfileModal.tsx', 'utf8');

if (!code.includes('setFirstName')) {
  code = code.replace(
    "const [username, setUsername] = useState('');",
    "const [username, setUsername] = useState('');\n  const [firstName, setFirstName] = useState('');\n  const [lastName, setLastName] = useState('');\n  const [dateOfBirth, setDateOfBirth] = useState('');"
  );
  code = code.replace(
    "setUsername(clientProfile.username || '');",
    "setUsername(clientProfile.username || '');\n      setFirstName(clientProfile.firstName || '');\n      setLastName(clientProfile.lastName || '');\n      setDateOfBirth(clientProfile.dateOfBirth || '');"
  );
  code = code.replace(
    "username: username.trim(),",
    "username: username.trim(),\n        firstName: firstName.trim(),\n        lastName: lastName.trim(),\n        dateOfBirth,"
  );

  const formFields = `
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-widest text-white/50 mb-2 font-bold ml-1">Nome</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-gold/50 transition-colors"
                placeholder="Nome"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest text-white/50 mb-2 font-bold ml-1">Sobrenome</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-gold/50 transition-colors"
                placeholder="Sobrenome"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs uppercase tracking-widest text-white/50 mb-2 font-bold ml-1">Data de Nascimento</label>
            <input
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-gold/50 transition-colors [color-scheme:dark]"
            />
          </div>
  `;

  code = code.replace(
    "<div>\n            <label className=\"block text-xs uppercase tracking-widest text-white/50 mb-2 font-bold ml-1\">Nome de Usuário</label>",
    formFields + "\n          <div>\n            <label className=\"block text-xs uppercase tracking-widest text-white/50 mb-2 font-bold ml-1\">Nome de Usuário</label>"
  );

  fs.writeFileSync('src/components/modals/EditClientProfileModal.tsx', code);
  console.log("EditClientProfileModal updated");
}
