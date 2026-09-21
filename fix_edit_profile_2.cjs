const fs = require('fs');
let code = fs.readFileSync('src/components/modals/EditClientProfileModal.tsx', 'utf8');

if (!code.includes('Trash2')) {
    code = code.replace(
        "import { X, User, Phone, Save, Camera } from 'lucide-react';",
        "import { X, User, Phone, Save, Camera, Trash2, Calendar } from 'lucide-react';\nimport { auth } from '../../lib/firebase';\nimport { deleteDoc } from 'firebase/firestore';"
    );
}

const formFields = `
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-widest text-white/50 font-bold mb-2">Nome</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-white/20 focus:outline-none focus:border-gold/50 transition-colors"
                  placeholder="Nome"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest text-white/50 font-bold mb-2">Sobrenome</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-white/20 focus:outline-none focus:border-gold/50 transition-colors"
                  placeholder="Sobrenome"
                />
              </div>
            </div>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest text-white/50 font-bold mb-2">Data de Nascimento</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calendar className="h-5 w-5 text-gold/50" />
              </div>
              <input
                type="date"
                required
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-white/20 focus:outline-none focus:border-gold/50 transition-colors [color-scheme:dark]"
              />
            </div>
          </div>
`;

if (!code.includes('Data de Nascimento')) {
  code = code.replace(
      "<div>\n            <label className=\"block text-xs uppercase tracking-widest text-white/50 font-bold mb-2\">Seu Nome</label>",
      formFields + "\n          <div>\n            <label className=\"block text-xs uppercase tracking-widest text-white/50 font-bold mb-2\">Nome de Usuário</label>"
  );
}

// Add state for Delete confirmation
if (!code.includes('isDeleting')) {
    code = code.replace(
        "const [isSubmitting, setIsSubmitting] = useState(false);",
        "const [isSubmitting, setIsSubmitting] = useState(false);\n  const [isDeleting, setIsDeleting] = useState(false);\n  const [showConfirmDelete, setShowConfirmDelete] = useState(false);"
    );
}

// Add handleDelete function
if (!code.includes('handleDelete')) {
    const handleDeleteCode = `
  const handleDelete = async () => {
    if (!clientProfile) return;
    setIsDeleting(true);
    try {
      if (auth.currentUser) {
        await auth.currentUser.delete();
      }
      await deleteDoc(doc(db, 'clients', clientProfile.id));
      toast.success('Conta deletada com sucesso.');
      onClose();
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/requires-recent-login') {
        toast.error('Por segurança, faça login novamente para excluir a conta.');
      } else {
        toast.error('Erro ao excluir conta.');
      }
    } finally {
      setIsDeleting(false);
      setShowConfirmDelete(false);
    }
  };
`;
    code = code.replace("const handleSubmit = async", handleDeleteCode + "\n  const handleSubmit = async");
}

// Add Delete Button to the UI
if (!code.includes('Deletar Conta')) {
    const deleteButtonUI = `
          {showConfirmDelete ? (
            <div className="mt-8 p-4 border border-red-500/20 bg-red-500/10 rounded-xl">
              <p className="text-red-400 text-sm mb-4 text-center">Tem certeza que deseja excluir sua conta permanentemente? Esta ação não pode ser desfeita.</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmDelete(false)}
                  className="flex-1 py-2 rounded-lg bg-white/5 text-white/60 hover:bg-white/10 transition-colors text-sm font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex-1 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors text-sm font-bold flex items-center justify-center gap-2"
                >
                  {isDeleting ? 'Excluindo...' : 'Sim, Excluir'}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowConfirmDelete(true)}
              className="w-full mt-4 bg-transparent border border-red-500/30 hover:bg-red-500/10 text-red-500 font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <Trash2 className="w-5 h-5" />
              Deletar Conta
            </button>
          )}
`;
    code = code.replace("</form>", "  " + deleteButtonUI + "\n        </form>");
}

fs.writeFileSync('src/components/modals/EditClientProfileModal.tsx', code);
console.log('EditClientProfileModal updated');
