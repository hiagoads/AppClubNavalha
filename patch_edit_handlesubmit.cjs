const fs = require('fs');
let code = fs.readFileSync('src/components/modals/EditClientProfileModal.tsx', 'utf8');

const search = `    setIsSubmitting(true);

    const qUsername = query(collection(db, 'clients'), where('username', '==', username.trim()));`;

const replace = `    setIsSubmitting(true);
    try {
    const qUsername = query(collection(db, 'clients'), where('username', '==', username.trim()));`;

code = code.replace(search, replace);

const search2 = `      await updateDoc(doc(db, 'clients', clientProfile.id), {
        username: username.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        dateOfBirth,
        whatsapp: cleanPhone,
        avatarUrl
      });
      toast.success('Perfil atualizado com sucesso!');
      onClose();
    } catch (err) {
      if (err.code !== 'permission-denied') console.error(err);
      toast.error('Erro ao atualizar perfil.');
    } finally {
      setIsSubmitting(false);
    }
  };`;

const replace2 = `      await updateDoc(doc(db, 'clients', clientProfile.id), {
        username: username.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        dateOfBirth,
        whatsapp: cleanPhone,
        avatarUrl
      });
      toast.success('Perfil atualizado com sucesso!');
      onClose();
    } catch (err: any) {
      if (err.code !== 'permission-denied') console.error(err);
      toast.error('Erro ao atualizar perfil.');
    } finally {
      setIsSubmitting(false);
    }
  };`;

// Let's do it using regex to ensure it wraps correctly
