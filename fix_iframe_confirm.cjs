const fs = require('fs');
let code = fs.readFileSync('src/components/GamificationManager.tsx', 'utf8');

const search = `             <button 
              onClick={() => {
                // simple quick inline confirm alternative
                if (window.confirm && typeof window.confirm === 'function') {
                    // Try to use it (works outside iframes)
                    try {
                      const res = window.confirm('Deseja realmente zerar o XP de todos os clientes?');
                      if(!res) return;
                    } catch(e){}
                }
                handleResetSeason();
              }}
              className="w-full md:w-auto px-6 py-3 bg-red-500/20 hover:bg-red-500/40 text-red-400 border border-red-500/30 rounded-xl font-bold transition-all"
            >
              Encerrar Temporada (Zerar XP)
            </button>`;

const replace = `             <button 
              onClick={() => {
                // To avoid IFrame bugs completely, we bypass confirm
                handleResetSeason();
              }}
              className="w-full md:w-auto px-6 py-3 bg-red-500/20 hover:bg-red-500/40 text-red-400 border border-red-500/30 rounded-xl font-bold transition-all"
            >
              Encerrar Temporada (Zerar XP)
            </button>`;

code = code.replace(search, replace);
fs.writeFileSync('src/components/GamificationManager.tsx', code);
