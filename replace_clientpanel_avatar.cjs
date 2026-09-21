const fs = require('fs');
let code = fs.readFileSync('src/pages/ClientPanel.tsx', 'utf8');

const target = `{/* Avatar Glow */}
              <div className="shrink-0 relative">
                {tier.level >= 8 && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-20">
                    <Crown className="w-5 h-5 text-fuchsia-400 drop-shadow-[0_0_5px_rgba(217,70,239,0.8)]" />
                  </div>
                )}
                <div className={\`absolute inset-0 \${tier.glowBg} blur-md opacity-40 rounded-full\`}></div>
                
                <div className={\`relative w-[72px] h-[72px] rounded-full border-[3px] \${tier.borderColor} flex items-center justify-center bg-carbon overflow-hidden z-10 \${tier.shadow}\`}>
                   {clientProfile.avatarUrl || defaultAvatar ? (
                     <img src={clientProfile.avatarUrl || defaultAvatar} alt="Avatar" className="w-full h-full object-cover" />
                   ) : (
                     <User className={\`w-8 h-8 \${tier.colorText} opacity-80\`} />
                   )}
                </div>
              </div>`;

const replacement = `{/* Avatar Frame */}
              <div className="shrink-0 relative w-[72px] h-[72px] flex items-center justify-center">
                <div className="relative w-full h-full rounded-full flex items-center justify-center bg-carbon overflow-hidden z-10">
                   {clientProfile.avatarUrl || defaultAvatar ? (
                     <img src={clientProfile.avatarUrl || defaultAvatar} alt="Avatar" className="w-full h-full object-cover" />
                   ) : (
                     <User className={\`w-8 h-8 \${tier.colorText} opacity-80\`} />
                   )}
                </div>
                {tier.frameUrl && (
                  <img 
                    src={tier.frameUrl} 
                    alt={tier.name} 
                    className="absolute inset-0 w-[110%] h-[110%] max-w-none max-h-none left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none object-contain" 
                  />
                )}
              </div>`;

if (code.includes('{/* Avatar Glow */}')) {
    code = code.replace(target, replacement);
    fs.writeFileSync('src/pages/ClientPanel.tsx', code);
    console.log('Replaced in ClientPanel');
} else {
    console.log('Target not found in ClientPanel');
}
