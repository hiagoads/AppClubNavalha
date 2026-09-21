const fs = require('fs');
let code = fs.readFileSync('src/components/GamificationManager.tsx', 'utf8');

const search = `<div className="flex flex-col md:flex-row gap-6 items-stretch md:items-end w-full">
          <div className="flex-1 w-full space-y-2">
            <label className="text-xs font-bold uppercase text-white/50 tracking-widest">Início da Temporada</label>
            <input 
              type="date" 
              value={seasonStart}
              onChange={(e) => setSeasonStart(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-gold/50" 
            />
          </div>
          <div className="flex-1 w-full space-y-2">
            <label className="text-xs font-bold uppercase text-white/50 tracking-widest">Duração (Meses)</label>
            <input 
              type="number" 
              min="1"
              max="12"
              value={seasonDuration}
              onChange={(e) => setSeasonDuration(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-gold/50" 
            />
          </div>`;

const replace = `<div className="flex flex-col md:flex-row gap-6 items-stretch md:items-end w-full overflow-hidden">
          <div className="w-full md:flex-1 space-y-2 min-w-0">
            <label className="text-xs font-bold uppercase text-white/50 tracking-widest block truncate">Início da Temporada</label>
            <input 
              type="date" 
              value={seasonStart}
              onChange={(e) => setSeasonStart(e.target.value)}
              className="w-full min-w-0 bg-black/40 border border-white/10 rounded-xl py-3 px-3 text-white focus:outline-none focus:border-gold/50 appearance-none box-border block"
              style={{ maxWidth: '100%' }}
            />
          </div>
          <div className="w-full md:flex-1 space-y-2 min-w-0">
            <label className="text-xs font-bold uppercase text-white/50 tracking-widest block truncate">Duração (Meses)</label>
            <input 
              type="number" 
              min="1"
              max="12"
              value={seasonDuration}
              onChange={(e) => setSeasonDuration(e.target.value)}
              className="w-full min-w-0 bg-black/40 border border-white/10 rounded-xl py-3 px-3 text-white focus:outline-none focus:border-gold/50 appearance-none box-border block" 
              style={{ maxWidth: '100%' }}
            />
          </div>`;

// Since spacing in `search` might be tricky with indentations, let's just use string replace. 
// If it fails, we will do a regex or simpler replace.
code = code.replace(search, replace);
fs.writeFileSync('src/components/GamificationManager.tsx', code);
