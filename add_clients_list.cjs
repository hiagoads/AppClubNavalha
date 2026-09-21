const fs = require('fs');
let code = fs.readFileSync('src/components/GamificationManager.tsx', 'utf8');

// 1. Add Users icon
if (!code.includes('Users')) {
  code = code.replace(
    "import { Award, Check, X, Clock, Search, Plus, UserPlus, Star, Camera } from 'lucide-react';",
    "import { Award, Check, X, Clock, Search, Plus, UserPlus, Star, Camera, Users } from 'lucide-react';"
  );
}

// 2. Add state
if (!code.includes('clientListSearchTerm')) {
  code = code.replace(
    "const [addDescription, setAddDescription] = useState('Bônus Manual');",
    "const [addDescription, setAddDescription] = useState('Bônus Manual');\n  const [clientListSearchTerm, setClientListSearchTerm] = useState('');"
  );
}

// 3. Add filtered list logic
if (!code.includes('filteredClientList')) {
  code = code.replace(
    "const filteredClients = searchTerm.length > 1",
    "const filteredClientList = clients.filter(c => \n    (c.username || '').toLowerCase().includes(clientListSearchTerm.toLowerCase()) || \n    (c.whatsapp || '').includes(clientListSearchTerm) || \n    (c.email || '').toLowerCase().includes(clientListSearchTerm.toLowerCase()) ||\n    (c.firstName || '').toLowerCase().includes(clientListSearchTerm.toLowerCase()) ||\n    (c.lastName || '').toLowerCase().includes(clientListSearchTerm.toLowerCase())\n  ).sort((a, b) => (b.points || 0) - (a.points || 0));\n\n  const filteredClients = searchTerm.length > 1"
  );
}

// 4. Add the JSX block before the final closing div
const clientsListUI = `
      {/* Registered Clients */}
      <div className="glass-card p-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
          <h3 className="text-sm font-bold uppercase tracking-widest text-gold flex items-center gap-2">
            <Users className="w-4 h-4" /> Clientes Registrados ({clients.length})
          </h3>
          <div className="relative max-w-sm w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-white/40" />
            </div>
            <input
              type="text"
              value={clientListSearchTerm}
              onChange={(e) => setClientListSearchTerm(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-gold/50 transition-colors"
              placeholder="Buscar clientes na lista..."
            />
          </div>
        </div>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-sm text-white/70 min-w-[600px]">
            <thead className="text-xs uppercase bg-white/5 text-white/50 border-b border-white/10">
              <tr>
                <th className="px-4 py-3 rounded-tl-lg font-bold">Cliente</th>
                <th className="px-4 py-3 font-bold">Contato</th>
                <th className="px-4 py-3 font-bold">Nascimento</th>
                <th className="px-4 py-3 font-bold">Cadastro</th>
                <th className="px-4 py-3 text-right rounded-tr-lg font-bold">Pontos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredClientList.map(client => (
                <tr key={client.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-black/50 overflow-hidden shrink-0 border border-white/10">
                        {client.avatarUrl || defaultAvatarUrl ? (
                          <img src={client.avatarUrl || defaultAvatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white/20"><Users className="w-4 h-4"/></div>
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-white">{client.firstName ? \`\${client.firstName} \${client.lastName || ''}\` : client.username}</p>
                        {client.firstName && <p className="text-[10px] text-white/40">@{client.username}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-mono text-xs text-white/90">{client.whatsapp}</p>
                    <p className="text-[10px] text-white/40">{client.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs">
                      {client.dateOfBirth ? new Date(client.dateOfBirth).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] text-white/40">
                      {client.createdAt ? new Date(client.createdAt).toLocaleDateString('pt-BR') : '-'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-bold text-gold font-mono">{client.points || 0}</span>
                  </td>
                </tr>
              ))}
              {filteredClientList.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-white/40">
                    Nenhum cliente encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
`;

if (!code.includes('Clientes Registrados')) {
  // Insert before the last `</div>`
  const lastIndex = code.lastIndexOf('</div>');
  code = code.substring(0, lastIndex) + clientsListUI + code.substring(lastIndex);
}

fs.writeFileSync('src/components/GamificationManager.tsx', code);
console.log('GamificationManager updated');
