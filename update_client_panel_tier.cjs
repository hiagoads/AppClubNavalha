const fs = require('fs');
let code = fs.readFileSync('src/pages/ClientPanel.tsx', 'utf8');

// Add Crown to imports
code = code.replace(
  "import { Scissors, Clock, Users, ChevronRight, User, Phone, CheckCircle2, Menu, LogIn, X, Edit2, MapPin, AlertTriangle, Check } from 'lucide-react';",
  "import { Scissors, Clock, Users, ChevronRight, User, Phone, CheckCircle2, Menu, LogIn, X, Edit2, MapPin, AlertTriangle, Check, Crown } from 'lucide-react';"
);

// Add getLevelTier to imports
if (!code.includes('getLevelTier')) {
  code = code.replace(
    "import { ClientProfileModal } from '../components/modals/ClientProfileModal';",
    "import { ClientProfileModal } from '../components/modals/ClientProfileModal';\nimport { getLevelTier } from '../utils/tierSystem';"
  );
}

// Replace the render block for Player Card
const target = `        {/* Player Card (Gamification) */}
        {clientProfile && user && (
          <div 
            onClick={() => setShowRewards(true)}
            className="relative p-[2px] rounded-2xl bg-gradient-to-b from-gold/40 to-white/5 shadow-lg overflow-hidden cursor-pointer transition-transform hover:scale-[1.02] active:scale-95 mx-2 sm:mx-0"
          >
            <div className="rounded-[14px] bg-[#1a1a1a] p-4 sm:p-5 flex items-center gap-4 sm:gap-5 relative z-10 bg-noise">
              {/* Avatar Glow */}
              <div className="shrink-0 relative">
                <div className="absolute inset-0 bg-gold blur-md opacity-30 rounded-full"></div>
                <div className="relative w-[72px] h-[72px] rounded-full border-[3px] border-gold/80 flex items-center justify-center bg-carbon overflow-hidden z-10 shadow-[0_0_15px_rgba(212,175,55,0.4)]">
                   <User className="w-8 h-8 text-gold/50" />
                </div>
              </div>
              
              {/* Player Info */}
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-white/60 tracking-widest uppercase mb-0.5">Player:</p>
                <h3 className="text-lg sm:text-xl font-display font-bold text-white truncate mb-2 leading-tight">
                  {clientProfile.username}
                </h3>
                
                <div className="flex items-center justify-between mb-1.5 border-t border-white/10 pt-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-white/70 uppercase tracking-widest">Nível:</span>
                    <span className="text-sm font-bold text-gold">{Math.floor(clientProfile.points / 500) + 1}</span>
                  </div>
                  <div className="flex gap-1">
                    <div className="w-3 h-1.5 bg-gold -skew-x-12"></div>
                    <div className="w-3 h-1.5 bg-gold -skew-x-12"></div>
                    <div className="w-3 h-1.5 bg-white/10 -skew-x-12"></div>
                  </div>
                </div>
                
                {/* Progress bar */}
                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden mb-2 relative">
                  <div 
                    className="absolute top-0 left-0 h-full bg-gold rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(212,175,55,0.8)]" 
                    style={{ width: \`\${(clientProfile.points % 500) / 500 * 100}%\` }}
                  />
                </div>
                
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-white/70 uppercase tracking-widest">Pontos XP:</span>
                  <span className="text-sm font-bold text-gold">{clientProfile.points.toLocaleString('pt-BR')}</span>
                </div>
              </div>
            </div>
          </div>
        )}`;

const replacement = `        {/* Player Card (Gamification) */}
        {clientProfile && user && (() => {
          const tier = getLevelTier(clientProfile.points);
          return (
          <div 
            onClick={() => setShowRewards(true)}
            className="relative p-[2px] rounded-2xl bg-gradient-to-b from-white/10 to-white/5 shadow-lg overflow-hidden cursor-pointer transition-transform hover:scale-[1.02] active:scale-95 mx-2 sm:mx-0"
          >
            {/* Dynamic border gradient based on tier for outer card? Just use white/10 is fine, or we can use tier.glowBg */}
            <div className="rounded-[14px] bg-[#1a1a1a] p-4 sm:p-5 flex items-center gap-4 sm:gap-5 relative z-10 bg-noise">
              {/* Avatar Glow */}
              <div className="shrink-0 relative">
                {tier.level >= 6 && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-20">
                    <Crown className="w-5 h-5 text-fuchsia-400 drop-shadow-[0_0_5px_rgba(217,70,239,0.8)]" />
                  </div>
                )}
                <div className={\`absolute inset-0 \${tier.glowBg} blur-md opacity-40 rounded-full\`}></div>
                <div className={\`relative w-[72px] h-[72px] rounded-full border-[3px] \${tier.borderColor} flex items-center justify-center bg-carbon overflow-hidden z-10 \${tier.shadow}\`}>
                   <User className={\`w-8 h-8 \${tier.colorText} opacity-80\`} />
                </div>
              </div>
              
              {/* Player Info */}
              <div className="flex-1 min-w-0">
                <p className={\`text-[10px] font-bold \${tier.colorText} tracking-widest uppercase mb-0.5\`}>{tier.name}</p>
                <h3 className="text-lg sm:text-xl font-display font-bold text-white truncate mb-2 leading-tight">
                  {clientProfile.username}
                </h3>
                
                <div className="flex items-center justify-between mb-1.5 border-t border-white/10 pt-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-white/70 uppercase tracking-widest">Nível:</span>
                    <span className={\`text-sm font-bold \${tier.colorText}\`}>{tier.level}</span>
                  </div>
                  <div className="flex gap-1">
                    <div className={\`w-3 h-1.5 \${tier.glowBg} -skew-x-12\`}></div>
                    <div className={\`w-3 h-1.5 \${tier.glowBg} -skew-x-12 opacity-80\`}></div>
                    <div className="w-3 h-1.5 bg-white/10 -skew-x-12"></div>
                  </div>
                </div>
                
                {/* Progress bar */}
                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden mb-2 relative">
                  <div 
                    className={\`absolute top-0 left-0 h-full \${tier.glowBg} rounded-full transition-all duration-1000 \${tier.shadow}\`} 
                    style={{ width: \`\${(clientProfile.points % 500) / 500 * 100}%\` }}
                  />
                </div>
                
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-white/70 uppercase tracking-widest">Pontos XP:</span>
                  <span className={\`text-sm font-bold \${tier.colorText}\`}>{clientProfile.points.toLocaleString('pt-BR')}</span>
                </div>
              </div>
            </div>
          </div>
        )})()}`;

if (code.includes('Player Card (Gamification)')) {
  // Simple check for if we haven't done it yet
  if (!code.includes('const tier = getLevelTier')) {
    code = code.replace(target, replacement);
    fs.writeFileSync('src/pages/ClientPanel.tsx', code);
    console.log("ClientPanel updated");
  } else {
    console.log("Already updated");
  }
} else {
  console.log("Could not find target in ClientPanel");
}
