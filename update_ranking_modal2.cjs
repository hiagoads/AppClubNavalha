const fs = require('fs');

let code = fs.readFileSync('src/components/modals/RankingModal.tsx', 'utf8');

if (!code.includes('getLevelTier')) {
    code = code.replace(
        "import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';",
        "import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';\nimport { getLevelTier } from '../../utils/tierSystem';"
    );
}

const target = `<div className={\`w-10 h-10 rounded-full border-2 overflow-hidden flex items-center justify-center shrink-0 \${
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
                      </div>`;

const replacement = `{/* Avatar with Frame */}
                      <div className="relative w-10 h-10 flex items-center justify-center shrink-0">
                        <div className="w-full h-full rounded-full flex items-center justify-center bg-carbon overflow-hidden z-10">
                          {client.avatarUrl || defaultAvatar ? (
                            <img src={client.avatarUrl || defaultAvatar} alt="Avatar" className="w-full h-full object-cover" />
                          ) : (
                            <User className={\`w-5 h-5 \${tier.colorText} opacity-80\`} />
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

if (code.includes('border-yellow-500')) {
    code = code.replace(target, replacement);
    
    // Also inject tier variable
    code = code.replace(
        "const isThird = client.position === 3;",
        "const isThird = client.position === 3;\n                const tier = getLevelTier(client.points);"
    );
    
    fs.writeFileSync('src/components/modals/RankingModal.tsx', code);
    console.log("RankingModal avatar updated");
} else {
    console.log("Target not found");
}

