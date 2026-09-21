const fs = require('fs');

const fixCrown = (file) => {
    let code = fs.readFileSync(file, 'utf8');
    code = code.replace(/tier\.level >= 6/g, "tier.level >= 8");
    fs.writeFileSync(file, code);
}

fixCrown('src/pages/ClientPanel.tsx');
fixCrown('src/components/modals/ClientProfileModal.tsx');
console.log("Crown levels fixed to 8");
