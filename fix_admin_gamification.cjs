const fs = require('fs');
let code = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf8');

// Also fix the query imports which were misplaced! Wait, I used them but didn't put them on the right line?
if (!code.includes('import { doc, updateDoc, deleteDoc, serverTimestamp, setDoc, query, collection, where, getDocs, increment } from "firebase/firestore";')) {
    // wait I injected it into firestore import but probably it was single quotes
}

code = code.replace(
  "import { doc, updateDoc, deleteDoc, serverTimestamp, setDoc } from 'firebase/firestore';",
  "import { doc, updateDoc, deleteDoc, serverTimestamp, setDoc, query, collection, where, getDocs, increment } from 'firebase/firestore';"
);

// We need to add the tab to AdminDashboard
if (!code.includes("gamification")) {
    // 1. Sidebar import
    let sidebar = fs.readFileSync('src/components/AdminSidebar.tsx', 'utf8');
    sidebar = sidebar.replace(
        "import { Users, BarChart3, Settings, Scissors, History, LogOut, Menu, X } from 'lucide-react';",
        "import { Users, BarChart3, Settings, Scissors, History, LogOut, Menu, X, Award } from 'lucide-react';"
    );
    sidebar = sidebar.replace(
        "activeTab: 'queue' | 'billing' | 'services' | 'barbers' | 'history' | 'settings' | 'log';",
        "activeTab: 'queue' | 'billing' | 'services' | 'barbers' | 'history' | 'settings' | 'log' | 'gamification';"
    );
    sidebar = sidebar.replace(
        "setActiveTab: (tab: 'queue' | 'billing' | 'services' | 'barbers' | 'history' | 'settings' | 'log'",
        "setActiveTab: (tab: 'queue' | 'billing' | 'services' | 'barbers' | 'history' | 'settings' | 'log' | 'gamification'"
    );
    sidebar = sidebar.replace(
        "<NavItem icon={<Users />} label=\"Gestão da Fila\" active={activeTab === 'queue'} />\n        </button>",
        "<NavItem icon={<Users />} label=\"Gestão da Fila\" active={activeTab === 'queue'} />\n        </button>\n        <button onClick={() => { setActiveTab('gamification'); setIsMobileMenuOpen(false); }} className={`w-full text-left`}>\n          <NavItem icon={<Award />} label=\"Clube Navalha\" active={activeTab === 'gamification'} />\n        </button>"
    );
    fs.writeFileSync('src/components/AdminSidebar.tsx', sidebar);

    // 2. Dashboard Import
    code = code.replace(
        "import { HistoryView } from '../components/HistoryView';",
        "import { HistoryView } from '../components/HistoryView';\nimport { GamificationManager } from '../components/admin/GamificationManager';"
    );
    
    // 3. Tab state
    code = code.replace(
        "const [activeTab, setActiveTab] = useState<'queue' | 'billing' | 'services' | 'barbers' | 'history' | 'settings' | 'log'>('queue');",
        "const [activeTab, setActiveTab] = useState<'queue' | 'billing' | 'services' | 'barbers' | 'history' | 'settings' | 'log' | 'gamification'>('queue');"
    );
    
    // 4. Render component
    code = code.replace(
        "{activeTab === 'history' && <HistoryView />}",
        "{activeTab === 'history' && <HistoryView />}\n        {activeTab === 'gamification' && <GamificationManager />}"
    );

    fs.writeFileSync('src/pages/AdminDashboard.tsx', code);
}
