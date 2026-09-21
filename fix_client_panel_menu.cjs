const fs = require('fs');
let code = fs.readFileSync('src/pages/ClientPanel.tsx', 'utf8');

if (!code.includes('clientProfile={clientProfile}')) {
    code = code.replace(
        '<ClientMenuModal isOpen={showMenu} onClose={() => setShowMenu(false)} onNavigateToAdmin={() => navigate(\'/admin\')} />',
        '<ClientMenuModal isOpen={showMenu} onClose={() => setShowMenu(false)} onNavigateToAdmin={() => navigate(\'/admin\')} onNavigateToAuth={() => navigate(\'/clube\')} clientProfile={clientProfile} />'
    );
    
    // Also we need to get `clientProfile` from `useAuth()`
    // find: const { user, isAdmin, loading } = useAuth(); OR check if it exists in ClientPanel
    if (!code.includes('const { clientProfile } = useAuth();')) {
        // find useAuth import if we need
        code = code.replace(
            "const { queue, activeBookings, loading } = useQueue();",
            "const { clientProfile } = useAuth();\n  const { queue, activeBookings, loading } = useQueue();"
        );
    }

    fs.writeFileSync('src/pages/ClientPanel.tsx', code);
}
