const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

if (!code.includes('import ClientAuth')) {
    code = code.replace(
        "import AdminDashboard from './pages/AdminDashboard';",
        "import AdminDashboard from './pages/AdminDashboard';\nimport ClientAuth from './pages/ClientAuth';"
    );
}

if (!code.includes('<Route path="/clube" element={<ClientAuth />} />')) {
    code = code.replace(
        '<Route path="/login" element={<AdminLogin />} />',
        '<Route path="/login" element={<AdminLogin />} />\n        <Route path="/clube" element={<ClientAuth />} />'
    );
}

fs.writeFileSync('src/App.tsx', code);
