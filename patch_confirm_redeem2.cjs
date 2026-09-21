const fs = require('fs');

let code = fs.readFileSync('src/components/modals/ClientProfileModal.tsx', 'utf8');

// Add state for confirmation
code = code.replace(
  "const [transactions, setTransactions] = useState<any[]>([]);",
  "const [transactions, setTransactions] = useState<any[]>([]);\n  const [confirmReward, setConfirmReward] = useState<typeof REWARDS_CATALOG[0] | null>(null);"
);

// Modify handleRedeem to set confirm state instead of window.confirm
const searchHandle = `  const handleRedeem = async (reward: typeof REWARDS_CATALOG[0], availablePoints: number) => {
    if (!clientProfile) return;

    if (availablePoints < reward.points) {
      toast.error('Você não tem pontos suficientes (ou tem resgates pendentes).');
      return;
    }

    // Removed window.confirm because of iframe restrictions. 
    // We can just proceed or add a custom UI if needed. 
    // Let's just proceed for now to unblock the user immediately.

    setLoading(true);`;

const replaceHandle = `  const handleRedeem = (reward: typeof REWARDS_CATALOG[0], availablePoints: number) => {
    if (!clientProfile) return;

    if (availablePoints < reward.points) {
      toast.error('Você não tem pontos suficientes (ou tem resgates pendentes).');
      return;
    }

    setConfirmReward(reward);
  };

  const confirmAndRedeem = async () => {
    if (!clientProfile || !confirmReward) return;
    const reward = confirmReward;
    setConfirmReward(null);

    setLoading(true);`;

code = code.replace(searchHandle, replaceHandle);

// Render the confirm state modal/overlay
const searchRender = `          <div className="mb-8">
            <h3 className="text-xs uppercase tracking-widest text-white/40 font-bold mb-4 ml-1 flex items-center gap-2">
              <Gift className="w-4 h-4 text-white/40" /> Catálogo de Prêmios
            </h3>`;

const replaceRender = `          {confirmReward && (
            <div className="mb-6 p-4 border border-gold/30 bg-gold/5 rounded-xl">
              <p className="text-white text-sm mb-4 text-center">
                Deseja resgatar <strong>{confirmReward.title}</strong> por <strong>{confirmReward.points} pts</strong>?
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmReward(null)}
                  className="flex-1 py-2 rounded-lg bg-white/5 text-white/60 hover:bg-white/10 transition-colors text-sm font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmAndRedeem}
                  disabled={loading}
                  className="flex-1 py-2 rounded-lg bg-gold hover:bg-gold/90 text-carbon transition-colors text-sm font-bold"
                >
                  Sim, Resgatar
                </button>
              </div>
            </div>
          )}

          <div className="mb-8">
            <h3 className="text-xs uppercase tracking-widest text-white/40 font-bold mb-4 ml-1 flex items-center gap-2">
              <Gift className="w-4 h-4 text-white/40" /> Catálogo de Prêmios
            </h3>`;

code = code.replace(searchRender, replaceRender);

fs.writeFileSync('src/components/modals/ClientProfileModal.tsx', code);
