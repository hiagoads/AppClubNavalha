const fs = require('fs');
let code = fs.readFileSync('src/pages/ClientAuth.tsx', 'utf8');

// Add fieldErrors state
code = code.replace(
  "const [loading, setLoading] = useState(false);",
  "const [loading, setLoading] = useState(false);\n  const [fieldErrors, setFieldErrors] = useState<{username?: string, whatsapp?: string, email?: string}>({});"
);

// Update handleSubmit
const handleSubmitOld = `  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        toast.success('Bem-vindo de volta!');
        navigate('/');
      } else {
        if (!username || !whatsapp || !firstName || !lastName || !dateOfBirth) {
          toast.error('Preencha todos os campos!');
          setLoading(false);
          return;
        }
        // Check password length
        if (password.length < 6) {
          toast.error('A senha deve ter pelo menos 6 caracteres.');
          setLoading(false);
          return;
        }
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const u = userCredential.user;
        const qUsername = query(collection(db, 'clients'), where('username', '==', username));
        const snapUsername = await getDocs(qUsername);
        if (!snapUsername.empty) {
            await u.delete();
            toast.error('Este nome de usuário já está em uso.');
            setLoading(false);
            return;
        }
        const qPhone = query(collection(db, 'clients'), where('whatsapp', '==', whatsapp));
        const snapPhone = await getDocs(qPhone);
        if (!snapPhone.empty) {
            await u.delete();
            toast.error('Este número de WhatsApp já está em uso.');
            setLoading(false);
            return;
        }
        await updateProfile(u, { displayName: username });
        // Save client profile in firestore
        await setDoc(doc(db, 'clients', u.uid), {
          username,
          firstName,
          lastName,
          dateOfBirth,
          email,
          whatsapp,
          avatarUrl,
          points: 0,
          createdAt: new Date().toISOString()
        });
        try { await sendEmailVerification(u); toast.success('Conta criada! Enviamos um link de verificação para o seu e-mail.'); } catch (e) { toast.success('Conta criada com sucesso! (Erro ao enviar e-mail de verificação)'); }
        navigate('/');
      }
    } catch (err: any) {
      if (err.code !== 'auth/invalid-credential' && err.code !== 'auth/email-already-in-use') console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        toast.error('Este e-mail já está em uso.');
      } else if (err.code === 'auth/invalid-credential') {
        toast.error('E-mail ou senha incorretos.');
      } else {
        toast.error(isLogin ? 'Erro ao fazer login.' : 'Erro ao criar conta.');
      }
    } finally {
      setLoading(false);
    }
  };`;

const handleSubmitNew = `  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFieldErrors({});
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        toast.success('Bem-vindo de volta!');
        navigate('/');
      } else {
        if (!username || !whatsapp || !firstName || !lastName || !dateOfBirth) {
          toast.error('Preencha todos os campos!');
          setLoading(false);
          return;
        }
        // Check password length
        if (password.length < 6) {
          toast.error('A senha deve ter pelo menos 6 caracteres.');
          setLoading(false);
          return;
        }

        // Check availability before creating account
        const qUsername = query(collection(db, 'clients'), where('username', '==', username));
        const snapUsername = await getDocs(qUsername);
        let hasError = false;
        const newErrors: any = {};
        
        if (!snapUsername.empty) {
            newErrors.username = 'Este nome de usuário já está em uso.';
            hasError = true;
        }
        const qPhone = query(collection(db, 'clients'), where('whatsapp', '==', whatsapp));
        const snapPhone = await getDocs(qPhone);
        if (!snapPhone.empty) {
            newErrors.whatsapp = 'Este número de WhatsApp já está em uso.';
            hasError = true;
        }

        if (hasError) {
            setFieldErrors(newErrors);
            setLoading(false);
            return;
        }

        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const u = userCredential.user;
        await updateProfile(u, { displayName: username });
        // Save client profile in firestore
        await setDoc(doc(db, 'clients', u.uid), {
          username,
          firstName,
          lastName,
          dateOfBirth,
          email,
          whatsapp,
          avatarUrl,
          points: 0,
          createdAt: new Date().toISOString()
        });
        try { await sendEmailVerification(u); toast.success('Conta criada! Enviamos um link de verificação para o seu e-mail.'); } catch (e) { toast.success('Conta criada com sucesso! (Erro ao enviar e-mail de verificação)'); }
        navigate('/');
      }
    } catch (err: any) {
      if (err.code !== 'auth/invalid-credential' && err.code !== 'auth/email-already-in-use') console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        setFieldErrors({ email: 'Este e-mail já está em uso.' });
      } else if (err.code === 'auth/invalid-credential') {
        toast.error('E-mail ou senha incorretos.');
      } else {
        toast.error(isLogin ? 'Erro ao fazer login.' : 'Erro ao criar conta.');
      }
    } finally {
      setLoading(false);
    }
  };`;

code = code.replace(handleSubmitOld, handleSubmitNew);

fs.writeFileSync('src/pages/ClientAuth.tsx', code);
console.log('handleSubmit updated');
