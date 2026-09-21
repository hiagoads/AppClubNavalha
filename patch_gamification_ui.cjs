const fs = require('fs');
let code = fs.readFileSync('src/components/GamificationManager.tsx', 'utf8');

const newUI = `        </div>
      </div>

      {/* Tier Configuration */}
      <div className="glass-card p-6 border-gold/50 mb-6">
        <h3 className="text-sm font-bold uppercase tracking-widest text-gold mb-4 flex items-center gap-2">
          <Target className="w-4 h-4 text-gold" /> Requisitos de Pontos (Níveis)
        </h3>
        <p className="text-sm text-white/60 mb-6">Configure a quantidade de pontos necessários (XP de Temporada) para atingir cada nível.</p>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[ 'Iniciante', 'Bronze', 'Prata', 'Ouro', 'Platina', 'Diamante', 'Elite', 'Lenda' ].map((tierName, idx) => (
            <div key={idx} className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-white/50 tracking-widest">{tierName}</label>
              <input 
                type="number" 
                value={tierThresholds[idx] ?? 0}
                disabled={idx === 0}
                onChange={(e) => {
                  const newThresholds = [...tierThresholds];
                  newThresholds[idx] = parseInt(e.target.value) || 0;
                  setTierThresholds(newThresholds);
                }}
                className={\`w-full bg-black/40 border \${idx === 0 ? 'border-white/5 opacity-50' : 'border-white/10'} rounded-xl py-3 px-3 text-white focus:outline-none focus:border-gold/50\`}
              />
            </div>
          ))}
        </div>
        <div className="mt-6 flex justify-end">
          <button 
            onClick={handleSaveSeason}
            disabled={isSavingSeason}
            className="btn-primary"
          >
            {isSavingSeason ? 'Salvando...' : 'Salvar Níveis'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">`;

code = code.replace(
  "        </div>\n      </div>\n\n      <div className=\"grid grid-cols-1 lg:grid-cols-2 gap-6\">",
  newUI
);

fs.writeFileSync('src/components/GamificationManager.tsx', code);
