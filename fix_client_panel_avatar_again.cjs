const fs = require('fs');

let code = fs.readFileSync('src/pages/ClientPanel.tsx', 'utf8');

const replacement = `{/* Avatar Frame */}
              <div className="shrink-0 relative w-[72px] h-[72px] flex items-center justify-center">
                <div className="relative w-[64px] h-[64px] rounded-full flex items-center justify-center bg-carbon overflow-hidden z-10">
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
                    className="absolute inset-0 w-[140%] h-[140%] max-w-none max-h-none left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none object-contain" 
                  />
                )}
              </div>
              
              {/* Player Info */}`;

code = code.replace(/\{\/\* Avatar Glow \*\/\}[\s\S]*?\{\/\* Player Info \*\/\}/g, replacement);
fs.writeFileSync('src/pages/ClientPanel.tsx', code);
console.log("ClientPanel Avatar replaced using regex.");
