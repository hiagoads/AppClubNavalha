const fs = require('fs');
let code = fs.readFileSync('src/components/modals/ClientProfileModal.tsx', 'utf8');

// 1. Update Props
if (!code.includes('defaultAvatar?: string')) {
    code = code.replace(
        "clientProfile: ClientProfile | null;",
        "clientProfile: ClientProfile | null;\n  defaultAvatar?: string;"
    );
    code = code.replace(
        "export function ClientProfileModal({ isOpen, onClose, clientProfile }: ClientProfileModalProps)",
        "export function ClientProfileModal({ isOpen, onClose, clientProfile, defaultAvatar }: ClientProfileModalProps)"
    );
}

// 2. Update Avatar display
const targetAvatar = `<div className={\`relative w-28 h-28 rounded-full border-4 \${tier.borderColor} flex items-center justify-center bg-carbon overflow-hidden z-10 \${tier.shadow}\`}>
                     <User className={\`w-12 h-12 \${tier.colorText} opacity-80\`} />
                  </div>`;
const newAvatar = `
                  <div className={\`relative w-28 h-28 rounded-full border-4 \${tier.borderColor} flex items-center justify-center bg-carbon overflow-hidden z-10 \${tier.shadow}\`}>
                     {clientProfile.avatarUrl || defaultAvatar ? (
                       <img src={clientProfile.avatarUrl || defaultAvatar} alt="Avatar" className="w-full h-full object-cover" />
                     ) : (
                       <User className={\`w-12 h-12 \${tier.colorText} opacity-80\`} />
                     )}
                  </div>
`;
code = code.replace(targetAvatar, newAvatar);

fs.writeFileSync('src/components/modals/ClientProfileModal.tsx', code);
console.log("ClientProfileModal updated");
