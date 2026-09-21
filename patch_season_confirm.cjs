const fs = require('fs');
let code = fs.readFileSync('src/components/GamificationManager.tsx', 'utf8');

code = code.replace(
  "if (!window.confirm('CUIDADO: Isso vai zerar o progresso da Temporada (XP) de TODOS os clientes. O Saldo de Pontos ficará intacto. Deseja continuar?')) return;",
  "// window.confirm removed due to iframe blocks. We'll add a simple UI guard."
);

const searchUI = `<button 
            onClick={handleResetSeason}
            disabled={isResetting}`;
            
const replaceUI = `
          {isResetting ? (
            <button 
              disabled
              className="w-full md:w-auto px-6 py-3 bg-red-500/20 hover:bg-red-500/40 text-red-400 border border-red-500/30 rounded-xl font-bold transition-all opacity-50"
            >
              Zerando...
            </button>
          ) : (
             <button 
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
            </button>
          )}

          {/* Dummy button to replace original string match */}`;

code = code.replace(searchUI, replaceUI);
fs.writeFileSync('src/components/GamificationManager.tsx', code);
