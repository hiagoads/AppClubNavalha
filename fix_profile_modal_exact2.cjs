const fs = require('fs');

let code = fs.readFileSync('src/components/modals/ClientProfileModal.tsx', 'utf8');

const targetRegex = /\{\/\* Avatar Glow \*\/\}[\s\S]*?<\/div>\s*<\/div>\s*<p className=\{/m;

const replacement = `{/* Avatar Frame */}
                <div className="shrink-0 relative mb-5 w-[112px] h-[112px] flex items-center justify-center">
                  <div className="relative w-[100px] h-[100px] rounded-full flex items-center justify-center bg-carbon overflow-hidden z-10">
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
                      className="absolute inset-0 w-[140%] h-[140%] max-w-none max-h-none left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none object-contain" 
                    />
                  )}
                </div>
                
                <p className=\{`;

if (targetRegex.test(code)) {
    code = code.replace(targetRegex, replacement);
    fs.writeFileSync('src/components/modals/ClientProfileModal.tsx', code);
    console.log("ClientProfileModal updated successfully");
} else {
    console.log("Regex not matched");
}
