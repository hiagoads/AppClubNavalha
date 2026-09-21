const fs = require('fs');
let code = fs.readFileSync('src/pages/ClientPanel.tsx', 'utf8');

if (!code.includes('useEffect(() => { if (clientProfile) {')) {
    code = code.replace(
        "const [formData, setFormData] = useState({",
        "useEffect(() => {\n    if (clientProfile) {\n      setFormData(prev => ({ ...prev, name: clientProfile.username, whatsapp: clientProfile.whatsapp }));\n    }\n  }, [clientProfile]);\n\n  const [formData, setFormData] = useState({"
    );
    fs.writeFileSync('src/pages/ClientPanel.tsx', code);
}
