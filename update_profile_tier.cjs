const fs = require('fs');
let code = fs.readFileSync('src/components/modals/ClientProfileModal.tsx', 'utf8');

// Add Crown to imports
code = code.replace(
  "import { X, Award, Clock, Star, Gift, Scissors, Gamepad2, History, User, CheckCircle2 } from 'lucide-react';",
  "import { X, Award, Clock, Star, Gift, Scissors, Gamepad2, History, User, CheckCircle2, Crown } from 'lucide-react';"
);

// Add getLevelTier to imports
if (!code.includes('getLevelTier')) {
  code = code.replace(
    "import { ClientProfile } from '../../types';",
    "import { ClientProfile } from '../../types';\nimport { getLevelTier } from '../../utils/tierSystem';"
  );
}

const target = `          {/* Detailed Player Card */}
          <div className="relative p-[2px] rounded-3xl bg-gradient-to-b from-gold/40 to-white/5 shadow-xl overflow-hidden mb-8 mt-2">
            <div className="rounded-[22px] bg-[#1a1a1a] p-6 sm:p-8 flex flex-col items-center text-center relative z-10 bg-noise">
              
              {/* Avatar Glow */}
              <div className="shrink-0 relative mb-5">
                <div className="absolute inset-0 bg-gold blur-lg opacity-40 rounded-full animate-pulse"></div>
                <div className="relative w-28 h-28 rounded-full border-4 border-gold/80 flex items-center justify-center bg-carbon overflow-hidden z-10 shadow-[0_0_20px_rgba(212,175,55,0.4)]">
                   <User className="w-12 h-12 text-gold/50" />
                </div>
              </div>
              
              <p className="text-[10px] font-bold text-gold tracking-widest uppercase mb-1">Player</p>
              <h3 className="text-3xl font-display font-bold text-white mb-6">
                {clientProfile.username}
              </h3>
              
              <div className="w-full max-w-[280px] mx-auto bg-black/40 p-4 rounded-2xl border border-white/5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white/50 uppercase tracking-widest">Nível:</span>
                      <span className="text-xl font-bold text-gold">{Math.floor(clientProfile.points / 500) + 1}</span>
                    </div>
                    <div className="flex gap-1.5">
                      <div className="w-4 h-2 bg-gold -skew-x-12"></div>
                      <div className="w-4 h-2 bg-gold -skew-x-12"></div>
                      <div className="w-4 h-2 bg-gold/30 -skew-x-12"></div>
                    </div>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="h-2.5 w-full bg-white/10 rounded-full overflow-hidden mb-3 relative">
                    <div 
                      className="absolute top-0 left-0 h-full bg-gold rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(212,175,55,0.8)]" 
                      style={{ width: \`\${(clientProfile.points % 500) / 500 * 100}%\` }}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-bold text-white/40 uppercase tracking-widest text-[10px]">Total: {clientProfile.points}</span>
                    <span className="font-bold text-gold uppercase tracking-widest text-[10px]">Saldo: {availablePoints} pts</span>
                  </div>
              </div>
            </div>
          </div>`;

const replacement = `          {/* Detailed Player Card */}
          {(() => {
            const tier = getLevelTier(clientProfile.points);
            return (
            <div className="relative p-[2px] rounded-3xl bg-gradient-to-b from-white/10 to-white/5 shadow-xl overflow-hidden mb-8 mt-2">
              <div className="rounded-[22px] bg-[#1a1a1a] p-6 sm:p-8 flex flex-col items-center text-center relative z-10 bg-noise">
                
                {/* Avatar Glow */}
                <div className="shrink-0 relative mb-5">
                  {tier.level >= 6 && (
                    <div className="absolute -top-5 left-1/2 -translate-x-1/2 z-20">
                      <Crown className="w-8 h-8 text-fuchsia-400 drop-shadow-[0_0_8px_rgba(217,70,239,0.8)]" />
                    </div>
                  )}
                  <div className={\`absolute inset-0 \${tier.glowBg} blur-lg opacity-40 rounded-full animate-pulse\`}></div>
                  <div className={\`relative w-28 h-28 rounded-full border-4 \${tier.borderColor} flex items-center justify-center bg-carbon overflow-hidden z-10 \${tier.shadow}\`}>
                     <User className={\`w-12 h-12 \${tier.colorText} opacity-80\`} />
                  </div>
                </div>
                
                <p className={\`text-[10px] font-bold \${tier.colorText} tracking-widest uppercase mb-1\`}>{tier.name}</p>
                <h3 className="text-3xl font-display font-bold text-white mb-6">
                  {clientProfile.username}
                </h3>
                
                <div className="w-full max-w-[280px] mx-auto bg-black/40 p-4 rounded-2xl border border-white/5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white/50 uppercase tracking-widest">Nível:</span>
                        <span className={\`text-xl font-bold \${tier.colorText}\`}>{tier.level}</span>
                      </div>
                      <div className="flex gap-1.5">
                        <div className={\`w-4 h-2 \${tier.glowBg} -skew-x-12\`}></div>
                        <div className={\`w-4 h-2 \${tier.glowBg} -skew-x-12 opacity-80\`}></div>
                        <div className="w-4 h-2 bg-white/10 -skew-x-12"></div>
                      </div>
                    </div>
                    
                    {/* Progress bar */}
                    <div className="h-2.5 w-full bg-white/10 rounded-full overflow-hidden mb-3 relative">
                      <div 
                        className={\`absolute top-0 left-0 h-full \${tier.glowBg} rounded-full transition-all duration-1000 \${tier.shadow}\`}
                        style={{ width: \`\${(clientProfile.points % 500) / 500 * 100}%\` }}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-bold text-white/40 uppercase tracking-widest text-[10px]">Total: {clientProfile.points}</span>
                      <span className={\`font-bold \${tier.colorText} uppercase tracking-widest text-[10px]\`}>Saldo: {availablePoints} pts</span>
                    </div>
                </div>
              </div>
            </div>
            )
          })()}`;

if (code.includes('Detailed Player Card')) {
  if (!code.includes('const tier = getLevelTier')) {
    code = code.replace(target, replacement);
    fs.writeFileSync('src/components/modals/ClientProfileModal.tsx', code);
    console.log("ClientProfileModal updated");
  } else {
    console.log("Already updated");
  }
} else {
  console.log("Target not found");
}
