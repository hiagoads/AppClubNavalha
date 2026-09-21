const fs = require('fs');
let code = fs.readFileSync('src/pages/AdminLogin.tsx', 'utf8');

// 1. Add sendPasswordResetEmail import
if (!code.includes('sendPasswordResetEmail')) {
    code = code.replace(
        "import { signInWithEmailAndPassword } from 'firebase/auth';",
        "import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';"
    );
}

// 2. Add handleResetPassword logic
if (!code.includes('const handleResetPassword')) {
    const target = "const handleLogin = async (e: React.FormEvent) => {";
    const logic = `const handleResetPassword = async () => {
    if (!email) {
      toast.error('Digite seu e-mail no campo acima para redefinir a senha.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success('E-mail de redefinição enviado! Verifique sua caixa de entrada.');
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao enviar e-mail. Verifique se o endereço está correto.');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {`;
    code = code.replace(target, logic);
}

// 3. Add UI button
const uiTarget = `<label className="block text-xs uppercase tracking-widest text-white/50 mb-2">Senha</label>`;
const uiReplacement = `<div className="flex justify-between items-center mb-2">
              <label className="block text-xs uppercase tracking-widest text-white/50">Senha</label>
              <button 
                type="button" 
                onClick={handleResetPassword}
                className="text-[10px] uppercase tracking-widest text-gold hover:text-gold-light transition-colors"
              >
                Esqueceu a senha?
              </button>
            </div>`;

if (code.includes(uiTarget)) {
    code = code.replace(uiTarget, uiReplacement);
}

fs.writeFileSync('src/pages/AdminLogin.tsx', code);
console.log('AdminLogin updated');
