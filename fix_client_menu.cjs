const fs = require('fs');
let code = fs.readFileSync('src/components/modals/ClientMenuModal.tsx', 'utf8');

// Update imports
code = code.replace(
    "import { Scissors, X, LogIn, Star, LogOut, Award } from 'lucide-react';",
    "import { Scissors, X, LogIn, Star, LogOut, Award, User, Edit3, Trophy } from 'lucide-react';"
);

// Update props
code = code.replace(
    "onOpenRewards: () => void;",
    "onOpenProfile: () => void;\n  onOpenEditProfile: () => void;\n  onOpenRanking: () => void;"
);

code = code.replace(
    "onNavigateToAuth, onOpenRewards, clientProfile",
    "onNavigateToAuth, onOpenProfile, onOpenEditProfile, onOpenRanking, clientProfile"
);

// Replace the profile card and the empty flex-1 space-y-2
const targetBlock = `{clientProfile ? (
          <div className="mb-8 p-4 rounded-2xl bg-gold/5 border border-gold/20">
            <h3 className="font-bold text-white mb-1">Olá, {clientProfile.username}!</h3>
            <p className="text-xs text-white/50 mb-4 font-mono">{clientProfile.whatsapp}</p>
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center">
                <Star className="w-5 h-5 text-gold fill-gold" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-gold font-bold">Seus Pontos</p>
                <p className="text-2xl font-display font-bold text-white">{clientProfile.points}</p>
              </div>
            </div>
            
            <button 
              className="w-full mt-4 bg-gold/10 hover:bg-gold/20 border border-gold/30 text-gold text-xs font-bold py-2 rounded-lg transition-colors flex justify-center items-center gap-2"
              onClick={() => {
                onClose();
                onOpenRewards();
              }}
            >
              <Star className="w-4 h-4" />
              Meu Perfil & Prêmios
            </button>
          </div>
        ) : (
          <div className="mb-8">
            <button 
              onClick={() => {
                onClose();
                onNavigateToAuth();
              }}
              className="w-full gold-gradient p-4 rounded-xl text-carbon font-bold flex flex-col items-center justify-center gap-2 transition-transform active:scale-95 shadow-lg"
            >
              <Star className="w-6 h-6" />
              <span>Entrar no Clube Navalha</span>
              <span className="text-[10px] uppercase tracking-widest opacity-80">Ganhe pontos e prêmios</span>
            </button>
          </div>
        )}

        <div className="flex-1 space-y-2">
          {/* Other links can go here */}
        </div>`;

const replaceBlock = `{clientProfile ? (
          <div className="flex-1 space-y-2 mb-8">
            <div className="px-3 pb-4 mb-4 border-b border-white/10">
               <h3 className="font-bold text-white text-lg">Olá, {clientProfile.username}!</h3>
               <p className="text-xs text-gold uppercase tracking-widest font-bold mt-1">Nível {Math.floor(clientProfile.points / 500) + 1}</p>
            </div>
            
            <button 
              onClick={() => { onClose(); onOpenProfile(); }}
              className="w-full flex items-center p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors text-left group"
            >
              <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center mr-3 group-hover:bg-gold/20 transition-colors">
                <User className="w-4 h-4 text-gold" />
              </div>
              <span className="font-bold text-white/80 text-sm">Meu Perfil & Prêmios</span>
            </button>

            <button 
              onClick={() => { onClose(); onOpenEditProfile(); }}
              className="w-full flex items-center p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors text-left group"
            >
              <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center mr-3 group-hover:bg-white/10 transition-colors">
                <Edit3 className="w-4 h-4 text-white/50" />
              </div>
              <span className="font-bold text-white/80 text-sm">Editar Perfil</span>
            </button>

            <button 
              onClick={() => { onClose(); onOpenRanking(); }}
              className="w-full flex items-center p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors text-left group"
            >
              <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center mr-3 group-hover:bg-orange-500/20 transition-colors">
                <Trophy className="w-4 h-4 text-orange-500" />
              </div>
              <span className="font-bold text-white/80 text-sm">Ranking do Clube</span>
            </button>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <button 
                onClick={() => {
                  onClose();
                  onNavigateToAuth();
                }}
                className="w-full gold-gradient p-4 rounded-xl text-carbon font-bold flex flex-col items-center justify-center gap-2 transition-transform active:scale-95 shadow-lg"
              >
                <Star className="w-6 h-6" />
                <span>Entrar no Clube Navalha</span>
                <span className="text-[10px] uppercase tracking-widest opacity-80">Ganhe pontos e prêmios</span>
              </button>
            </div>
            <div className="flex-1 space-y-2"></div>
          </>
        )}`;

code = code.replace(targetBlock, replaceBlock);
fs.writeFileSync('src/components/modals/ClientMenuModal.tsx', code);
console.log("ClientMenuModal updated");
