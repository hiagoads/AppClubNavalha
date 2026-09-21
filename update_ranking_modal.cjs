const fs = require('fs');

let code = fs.readFileSync('src/components/modals/RankingModal.tsx', 'utf8');

// 1. Add defaultAvatar to props
if (!code.includes('defaultAvatar?: string')) {
    code = code.replace(
        "currentUserId?: string;",
        "currentUserId?: string;\n  defaultAvatar?: string;"
    );
    code = code.replace(
        "export function RankingModal({ isOpen, onClose, currentUserId }: RankingModalProps)",
        "export function RankingModal({ isOpen, onClose, currentUserId, defaultAvatar }: RankingModalProps)"
    );
}

// 2. Add User Icon import
if (!code.includes('User,')) {
    code = code.replace(
        "import { X, Trophy, Medal, Star } from 'lucide-react';",
        "import { X, Trophy, Medal, Star, User } from 'lucide-react';"
    );
}

// 3. Add avatar display
const avatarBlock = `
                      <div className={\`w-10 h-10 rounded-full border-2 overflow-hidden flex items-center justify-center shrink-0 \${
                        isFirst ? 'border-yellow-500' :
                        isSecond ? 'border-gray-300' :
                        isThird ? 'border-amber-700' :
                        'border-white/10'
                      }\`}>
                        {client.avatarUrl || defaultAvatar ? (
                          <img src={client.avatarUrl || defaultAvatar} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-5 h-5 text-white/40" />
                        )}
                      </div>
`;
if (!code.includes('client.avatarUrl')) {
    const target = `<div className="flex items-center gap-4">
                      <div className={\`w-8 h-8 rounded-full flex items-center justify-center font-bold font-display \${`;
                      
    const replacement = `<div className="flex items-center gap-3">
                      <div className={\`w-6 h-6 rounded-full flex items-center justify-center font-bold font-display text-xs shrink-0 \${
                        isFirst ? 'bg-yellow-500 text-carbon' :
                        isSecond ? 'bg-gray-300 text-carbon' :
                        isThird ? 'bg-amber-700 text-carbon' :
                        'bg-white/5 text-white/50'
                      }\`}>
                        {client.position}
                      </div>
                      ${avatarBlock}
                      <div>`;
                      
    const regex = /<div className="flex items-center gap-4">\s*<div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold font-display \${/m;
    code = code.replace(
        `<div className="flex items-center gap-4">
                      <div className={\`w-8 h-8 rounded-full flex items-center justify-center font-bold font-display \${`, 
        replacement
    );
}

fs.writeFileSync('src/components/modals/RankingModal.tsx', code);
console.log("RankingModal updated");
