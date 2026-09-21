const fs = require('fs');

let clientAuth = fs.readFileSync('src/pages/ClientAuth.tsx', 'utf8');
clientAuth = clientAuth.replace(
  "    } catch (err: any) {\n      console.error(err);\n      if (err.code === 'auth/email-already-in-use') {",
  "    } catch (err: any) {\n      if (err.code !== 'auth/invalid-credential' && err.code !== 'auth/email-already-in-use') console.error(err);\n      if (err.code === 'auth/email-already-in-use') {"
);
fs.writeFileSync('src/pages/ClientAuth.tsx', clientAuth);

let adminLogin = fs.readFileSync('src/pages/AdminLogin.tsx', 'utf8');
adminLogin = adminLogin.replace(
  "    } catch (err) {\n      toast.error('Acesso negado. Verifique suas credenciais.');",
  "    } catch (err: any) {\n      if (err.code !== 'auth/invalid-credential') console.error(err);\n      toast.error('Acesso negado. Verifique suas credenciais.');"
);
fs.writeFileSync('src/pages/AdminLogin.tsx', adminLogin);

console.log('Fixed auth errors');
