const fs = require('fs');
let code = fs.readFileSync('src/pages/ClientPanel.tsx', 'utf8');

code = code.replace(
    "clientProfile={clientProfile}\n        defaultAvatar={defaultAvatar} />",
    "clientProfile={clientProfile} />"
);

code = code.replace(
    "<ClientProfileModal isOpen={showRewards} onClose={() => setShowRewards(false)} clientProfile={clientProfile} />",
    "<ClientProfileModal isOpen={showRewards} onClose={() => setShowRewards(false)} clientProfile={clientProfile} defaultAvatar={defaultAvatar} />"
);

fs.writeFileSync('src/pages/ClientPanel.tsx', code);
console.log("Modals props fixed");
