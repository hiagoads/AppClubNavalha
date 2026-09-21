const fs = require('fs');

let code = fs.readFileSync('src/pages/ClientPanel.tsx', 'utf8');

code = code.replace(
    "clientProfile={clientProfile}\n        defaultAvatar={defaultAvatar} />\n      </AnimatePresence>\n      <AnimatePresence>\n        <ClientProfileModal",
    "clientProfile={clientProfile} />\n      </AnimatePresence>\n      <AnimatePresence>\n        <ClientProfileModal"
);

fs.writeFileSync('src/pages/ClientPanel.tsx', code);
console.log("ClientPanel Menu Modal Fixed.");
