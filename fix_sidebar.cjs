const fs = require('fs');
let code = fs.readFileSync('src/components/AdminSidebar.tsx', 'utf8');

// The replacement was missed because of label="Fila" vs label="Gestão da Fila"
const target = `<button onClick={() => { setActiveTab('queue'); setIsMobileMenuOpen(false); }} className={\`w-full text-left\`}>\n          <NavItem icon={<Users />} label="Fila" active={activeTab === 'queue'} />\n        </button>`;
const replacement = target + `\n        <button onClick={() => { setActiveTab('gamification'); setIsMobileMenuOpen(false); }} className={\`w-full text-left\`}>\n          <NavItem icon={<Award />} label="Clube Navalha" active={activeTab === 'gamification'} />\n        </button>`;

if (code.includes(target) && !code.includes('Clube Navalha')) {
    code = code.replace(target, replacement);
    fs.writeFileSync('src/components/AdminSidebar.tsx', code);
    console.log('Sidebar updated');
} else {
    console.log('Target not found or already updated');
}
