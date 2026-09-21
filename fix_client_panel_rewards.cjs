const fs = require('fs');
let code = fs.readFileSync('src/pages/ClientPanel.tsx', 'utf8');

if (!code.includes('import { RewardsModal }')) {
    code = code.replace(
        "import { ReceiptModal } from '../components/modals/ReceiptModal';",
        "import { ReceiptModal } from '../components/modals/ReceiptModal';\nimport { RewardsModal } from '../components/modals/RewardsModal';"
    );
    
    // Add state for RewardsModal
    code = code.replace(
        "const [showMenu, setShowMenu] = useState(false);",
        "const [showMenu, setShowMenu] = useState(false);\n  const [showRewards, setShowRewards] = useState(false);"
    );
    
    // Add component inside render
    code = code.replace(
        "</AnimatePresence>\n\n      <main",
        "</AnimatePresence>\n\n      <AnimatePresence>\n        <RewardsModal isOpen={showRewards} onClose={() => setShowRewards(false)} clientProfile={clientProfile} />\n      </AnimatePresence>\n\n      <main"
    );
    fs.writeFileSync('src/pages/ClientPanel.tsx', code);
}

// Update ClientMenuModal to trigger rewards
let menuCode = fs.readFileSync('src/components/modals/ClientMenuModal.tsx', 'utf8');
if (!menuCode.includes('onOpenRewards: () => void;')) {
    menuCode = menuCode.replace(
        "onNavigateToAuth: () => void;",
        "onNavigateToAuth: () => void;\n  onOpenRewards: () => void;"
    );
    menuCode = menuCode.replace(
        "export function ClientMenuModal({ isOpen, onClose, onNavigateToAdmin, onNavigateToAuth, clientProfile }: ClientMenuModalProps)",
        "export function ClientMenuModal({ isOpen, onClose, onNavigateToAdmin, onNavigateToAuth, onOpenRewards, clientProfile }: ClientMenuModalProps)"
    );
    menuCode = menuCode.replace(
        "toast.success('Em breve: Catálogo de Recompensas!');",
        "onClose();\n                onOpenRewards();"
    );
    fs.writeFileSync('src/components/modals/ClientMenuModal.tsx', menuCode);
}

// Ensure ClientPanel passes onOpenRewards
code = fs.readFileSync('src/pages/ClientPanel.tsx', 'utf8');
if (!code.includes('onOpenRewards={() => setShowRewards(true)}')) {
    code = code.replace(
        "onNavigateToAuth={() => navigate('/clube')} clientProfile={clientProfile}",
        "onNavigateToAuth={() => navigate('/clube')} onOpenRewards={() => setShowRewards(true)} clientProfile={clientProfile}"
    );
    fs.writeFileSync('src/pages/ClientPanel.tsx', code);
}

