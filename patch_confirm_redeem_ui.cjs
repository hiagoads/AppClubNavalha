const fs = require('fs');

let code = fs.readFileSync('src/components/modals/ClientProfileModal.tsx', 'utf8');

const search = `          {/* Rewards Carousel */}
          <div className="mb-8">`;

const replace = `          {/* Rewards Carousel */}
          {confirmReward && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-5 border border-gold/30 bg-gold/5 rounded-xl shadow-lg shadow-gold/5"
            >
              <p className="text-white text-sm mb-5 text-center">
                Deseja confirmar o resgate de <br/><strong className="text-gold text-lg">{confirmReward.title}</strong><br/> por <strong>{confirmReward.points} pts</strong>?
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmReward(null)}
                  className="flex-1 py-3 rounded-xl bg-white/5 text-white/60 hover:bg-white/10 hover:text-white transition-colors text-sm font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmAndRedeem}
                  disabled={loading}
                  className="flex-1 py-3 rounded-xl bg-gold hover:bg-gold/90 text-carbon transition-all text-sm font-bold shadow-lg shadow-gold/20 disabled:opacity-50 flex items-center justify-center"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-carbon/20 border-t-carbon rounded-full animate-spin" />
                  ) : (
                    'Confirmar Resgate'
                  )}
                </button>
              </div>
            </motion.div>
          )}

          <div className="mb-8">`;

code = code.replace(search, replace);
fs.writeFileSync('src/components/modals/ClientProfileModal.tsx', code);
