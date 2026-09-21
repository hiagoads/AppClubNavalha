const fs = require('fs');

let code = fs.readFileSync('src/components/GamificationManager.tsx', 'utf8');

const searchState = `  const [isAdding, setIsAdding] = useState(false);`;
const replaceState = `  const [isAdding, setIsAdding] = useState(false);

  // Season State
  const [seasonStart, setSeasonStart] = useState('');
  const [seasonDuration, setSeasonDuration] = useState('3');
  const [isResetting, setIsResetting] = useState(false);
  const [isSavingSeason, setIsSavingSeason] = useState(false);`;

code = code.replace(searchState, replaceState);

const searchLoad = `        if (docSnap.exists()) {
          setDefaultAvatarUrl(docSnap.data().defaultAvatarUrl || '');
        }`;
const replaceLoad = `        if (docSnap.exists()) {
          const data = docSnap.data();
          setDefaultAvatarUrl(data.defaultAvatarUrl || '');
          setSeasonStart(data.seasonStartDate || '');
          setSeasonDuration(data.seasonDurationMonths?.toString() || '3');
        }`;

code = code.replace(searchLoad, replaceLoad);

const searchAdd = `  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {`;
const replaceAdd = `  const handleSaveSeason = async () => {
    setIsSavingSeason(true);
    try {
      await setDoc(doc(db, 'settings', 'gamification'), {
        seasonStartDate: seasonStart,
        seasonDurationMonths: parseInt(seasonDuration)
      }, { merge: true });
      toast.success('Configuração da Temporada salva!');
    } catch (e) {
      if ((e as any).code !== 'permission-denied') console.error(e);
      toast.error('Erro ao salvar temporada.');
    } finally {
      setIsSavingSeason(false);
    }
  };

  const handleResetSeason = async () => {
    if (!window.confirm('CUIDADO: Isso vai zerar o progresso da Temporada (XP) de TODOS os clientes. O Saldo de Pontos ficará intacto. Deseja continuar?')) return;
    setIsResetting(true);
    try {
      // In a real app we'd use a Cloud Function or batch job. 
      // Doing it from client could be slow, but for a barbershop scale it's fine.
      const batchList = [];
      const snap = await getDocs(collection(db, 'clients'));
      let count = 0;
      // We process sequentially due to batch limit if needed, or just updateDoc
      for (const docSnap of snap.docs) {
        await updateDoc(doc(db, 'clients', docSnap.id), { seasonalPoints: 0 });
        count++;
      }
      toast.success(\`Temporada encerrada. \${count} clientes resetados com sucesso.\`);
    } catch (e) {
      console.error(e);
      toast.error('Erro ao resetar clientes.');
    } finally {
      setIsResetting(false);
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {`;

code = code.replace(searchAdd, replaceAdd);

const searchUI = `      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">`;
const replaceUI = `      {/* Season Config */}
      <div className="glass-card p-6 border-gold/50 mb-6">
        <h3 className="text-sm font-bold uppercase tracking-widest text-gold mb-4 flex items-center gap-2">
          <Trophy className="w-4 h-4 text-gold" /> Configuração de Temporada
        </h3>
        <p className="text-sm text-white/60 mb-6">A temporada define o ranking atual dos clientes. Zerar a temporada recomeça a corrida pelos prêmios, mas mantém o saldo de pontos atual.</p>
        <div className="flex flex-col md:flex-row gap-6 items-end">
          <div className="flex-1 space-y-2">
            <label className="text-xs font-bold uppercase text-white/50 tracking-widest">Início da Temporada</label>
            <input 
              type="date" 
              value={seasonStart}
              onChange={(e) => setSeasonStart(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-gold/50" 
            />
          </div>
          <div className="flex-1 space-y-2">
            <label className="text-xs font-bold uppercase text-white/50 tracking-widest">Duração (Meses)</label>
            <input 
              type="number" 
              min="1"
              max="12"
              value={seasonDuration}
              onChange={(e) => setSeasonDuration(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-gold/50" 
            />
          </div>
          <button 
            onClick={handleSaveSeason}
            disabled={isSavingSeason}
            className="w-full md:w-auto px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold transition-all disabled:opacity-50"
          >
            {isSavingSeason ? 'Salvando...' : 'Salvar'}
          </button>
          <button 
            onClick={handleResetSeason}
            disabled={isResetting}
            className="w-full md:w-auto px-6 py-3 bg-red-500/20 hover:bg-red-500/40 text-red-400 border border-red-500/30 rounded-xl font-bold transition-all disabled:opacity-50"
          >
            {isResetting ? 'Zerando...' : 'Encerrar Temporada (Zerar XP)'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">`;

code = code.replace(searchUI, replaceUI);
fs.writeFileSync('src/components/GamificationManager.tsx', code);
