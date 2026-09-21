const fs = require('fs');
let code = fs.readFileSync('src/components/GamificationManager.tsx', 'utf8');

const search = `          {/* Dummy button to replace original string match */}
            className="w-full md:w-auto px-6 py-3 bg-red-500/20 hover:bg-red-500/40 text-red-400 border border-red-500/30 rounded-xl font-bold transition-all disabled:opacity-50"
          >
            {isResetting ? 'Zerando...' : 'Encerrar Temporada (Zerar XP)'}
          </button>`;

code = code.replace(search, "");
fs.writeFileSync('src/components/GamificationManager.tsx', code);
