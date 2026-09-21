const fs = require('fs');
let code = fs.readFileSync('src/components/modals/EditClientProfileModal.tsx', 'utf8');

// 1. Add EmailAuthProvider and reauthenticateWithCredential imports
code = code.replace(
  "import { signOut } from 'firebase/auth';",
  "import { signOut, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';"
);

// 2. Add Lock to lucide-react imports
code = code.replace(
  "Trash2, Calendar } from 'lucide-react';",
  "Trash2, Calendar, Lock } from 'lucide-react';"
);

// 3. Add password state
code = code.replace(
  "const [showConfirmDelete, setShowConfirmDelete] = useState(false);",
  "const [showConfirmDelete, setShowConfirmDelete] = useState(false);\n  const [passwordConfirm, setPasswordConfirm] = useState('');\n  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);"
);

// 4. Update handleDelete
const deleteFunc = `const handleDelete = async () => {
    if (!clientProfile || !auth.currentUser || !auth.currentUser.email) return;

    if (!showPasswordConfirm) {
      setShowPasswordConfirm(true);
      return;
    }

    if (!passwordConfirm) {
      toast.error('Por favor, digite sua senha.');
      return;
    }

    setIsDeleting(true);
    try {
      const credential = EmailAuthProvider.credential(auth.currentUser.email, passwordConfirm);
      await reauthenticateWithCredential(auth.currentUser, credential);

      await deleteDoc(doc(db, 'clients', clientProfile.id));
      await auth.currentUser.delete();
      toast.success('Conta deletada com sucesso.');
      onClose();
    } catch (err: any) {
      if (err.code !== 'auth/requires-recent-login' && err.code !== 'permission-denied') console.error(err);
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        toast.error('Senha incorreta.');
      } else if (err.code === 'auth/requires-recent-login') {
        toast.error('Por segurança, faça login novamente para excluir a conta.');
        signOut(auth);
        onClose();
      } else {
        toast.error('Erro ao excluir conta.');
      }
    } finally {
      setIsDeleting(false);
    }
  };`;

// replace the old handleDelete
code = code.replace(
  /const handleDelete = async \(\) => \{[\s\S]*?setIsDeleting\(false\);\n      setShowConfirmDelete\(false\);\n    \}\n  \};/m,
  deleteFunc
);

// 5. Update the render for delete section
const newRenderDelete = `{showConfirmDelete ? (
            <div className="mt-8 p-4 border border-red-500/20 bg-red-500/10 rounded-xl">
              <p className="text-red-400 text-sm mb-4 text-center">Tem certeza que deseja excluir sua conta permanentemente? Esta ação não pode ser desfeita.</p>
              
              {showPasswordConfirm && (
                <div className="mb-4">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-4 w-4 text-red-400/50" />
                    </div>
                    <input
                      type="password"
                      value={passwordConfirm}
                      onChange={(e) => setPasswordConfirm(e.target.value)}
                      className="w-full bg-black/20 border border-red-500/20 rounded-lg py-2.5 pl-10 pr-4 text-white placeholder:text-white/20 focus:outline-none focus:border-red-500/50 transition-colors text-sm"
                      placeholder="Confirme sua senha atual"
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowConfirmDelete(false);
                    setShowPasswordConfirm(false);
                    setPasswordConfirm('');
                  }}
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
                  {isDeleting ? 'Excluindo...' : (showPasswordConfirm ? 'Confirmar Exclusão' : 'Sim, Excluir')}
                </button>
              </div>
            </div>
          ) : (`;

code = code.replace(
  /\{showConfirmDelete \? \([\s\S]*?\) : \(/m,
  newRenderDelete
);

fs.writeFileSync('src/components/modals/EditClientProfileModal.tsx', code);
console.log('patched EditClientProfileModal');
