const fs = require('fs');
let code = fs.readFileSync('src/components/modals/ClientProfileModal.tsx', 'utf8');

const target = `{/* Avatar Glow */}
                <div className="shrink-0 relative mb-5">
                  {tier.level >= 8 && (
                    <div className="absolute -top-5 left-1/2 -translate-x-1/2 z-20">
                      <Crown className="w-8 h-8 text-fuchsia-400 drop-shadow-[0_0_8px_rgba(217,70,239,0.8)]" />
                    </div>
                  )}
                  <div className={\`absolute inset-0 \${tier.glowBg} blur-lg opacity-40 rounded-full animate-pulse\`}></div>
                  
                  <div className={\`relative w-28 h-28 rounded-full border-4 \${tier.borderColor} flex items-center justify-center bg-carbon overflow-hidden z-10 \${tier.shadow}\`}>
                     {clientProfile.avatarUrl || defaultAvatar ? (
                       <img src={clientProfile.avatarUrl || defaultAvatar} alt="Avatar" className="w-full h-full object-cover" />
                     ) : (
                       <User className={\`w-12 h-12 \${tier.colorText} opacity-80\`} />
                     )}
                  </div>
                </div>`;

const replacement = `{/* Avatar Frame */}
                <div className="shrink-0 relative mb-5 w-28 h-28 flex items-center justify-center">
                  <div className="relative w-full h-full rounded-full flex items-center justify-center bg-carbon overflow-hidden z-10">
                     {clientProfile.avatarUrl || defaultAvatar ? (
                       <img src={clientProfile.avatarUrl || defaultAvatar} alt="Avatar" className="w-full h-full object-cover" />
                     ) : (
                       <User className={\`w-12 h-12 \${tier.colorText} opacity-80\`} />
                     )}
                  </div>
                  {tier.frameUrl && (
                    <img 
                      src={tier.frameUrl} 
                      alt={tier.name} 
                      className="absolute inset-0 w-[120%] h-[120%] max-w-none max-h-none left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none object-contain" 
                    />
                  )}
                </div>`;

if (code.includes('{/* Avatar Glow */}')) {
    code = code.replace(target, replacement);
    fs.writeFileSync('src/components/modals/ClientProfileModal.tsx', code);
    console.log('Replaced in ClientProfileModal');
} else {
    console.log('Target not found in ClientProfileModal');
}
