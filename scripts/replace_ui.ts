import fs from 'fs';

let content = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf8');

const getNextForBarberSnippet = `
  const getNextForBarber = (barberId: string) => {
    return sortedQueue.find(b => b.barberId === 'any' || b.barberId === barberId);
  };

  const activeBarbersList = barbers.filter(b => b.isActive);
`;

content = content.replace(
  /const startService = async/,
  getNextForBarberSnippet + '\n  const startService = async'
);

// We need to replace the Cadeira Atual section.
// It starts at <h2 className="text-xs uppercase tracking-widest text-white/30 font-bold mb-4">Cadeira Atual</h2>
// and ends right before {/* Queue Column */}

const uiOld = `              <div className="lg:col-span-1">
                <h2 className="text-xs uppercase tracking-widest text-white/30 font-bold mb-4">Cadeira Atual</h2>
                {activeBooking ? (
                  <motion.div 
                    layoutId="active"
                    className="glass-card p-6 border-gold/40 bg-gold/5 ring-1 ring-gold/20"
                  >
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-16 h-16 rounded-full bg-gold/20 flex items-center justify-center text-gold text-2xl font-bold">
                        {activeBooking.clientName[0]}
                      </div>
                      <div>
                        <h3 className="text-2xl font-display font-bold">{activeBooking.clientName}</h3>
                        <div className="flex items-center gap-2 flex-wrap">
                          {activeBooking.barberId !== 'any' && (
                            <span className="truncate bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-white/70 font-bold flex items-center gap-1 text-[10px]">
                              <Scissors className="w-2 h-2" />
                              {barbers.find(b => b.id === activeBooking.barberId)?.name || 'Específico'}
                            </span>
                          )}
                          <p className="text-gold text-sm font-medium">{activeBooking.serviceId}</p>
                          <button onClick={() => setEditingServicesBooking({id: activeBooking.id, serviceId: activeBooking.serviceId})} className="text-white/40 hover:text-white p-1">
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="flex items-center gap-1 mt-1 text-white/40">
                          <Clock className="w-3 h-3" />
                          <p className="text-xs">
                            {activeBooking.status === BookingStatus.PAUSED ? (
                              <span className="text-yellow-500 font-bold">Pausado</span>
                            ) : activeBooking.serviceStartTime ? \`Restam aprox. \${formatTime(activeRemainingMinutes)}\` : "Iniciando..."}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 sm:space-y-3">
                      {activeBooking.status === BookingStatus.PAUSED ? (
                        <button 
                          onClick={() => resumeService(activeBooking)}
                          className="w-full bg-gold/20 hover:bg-gold/30 text-gold border border-gold/40 py-3 sm:py-4 rounded-xl flex items-center justify-center gap-1.5 sm:gap-2 font-bold text-xs sm:text-base md:text-sm lg:text-base transition-all"
                        >
                          <Play className="w-4 h-4 sm:w-5 sm:h-5" />
                          RETOMAR ATENDIMENTO
                        </button>
                      ) : (
                        <button 
                          onClick={() => completeService(activeBooking.id)}
                          className="w-full bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30 py-3 sm:py-4 rounded-xl flex items-center justify-center gap-1.5 sm:gap-2 font-bold text-xs sm:text-base md:text-sm lg:text-base transition-all"
                        >
                          <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                          CONCLUIR ATENDIMENTO
                        </button>
                      )}
                      
                      <div className="flex gap-2">
                        {activeBooking.status === BookingStatus.IN_SERVICE && (
                          <button 
                             onClick={() => pauseService(activeBooking)}
                             className="flex-1 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 py-2 sm:py-3 rounded-xl flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-bold transition-colors"
                          >
                            <Pause className="w-4 h-4" />
                            Pausar
                          </button>
                        )}
                        <button 
                           onClick={() => removeBooking(activeBooking.id)}
                           className="flex-1 bg-white/5 hover:bg-white/10 text-white/40 border border-white/10 py-2 sm:py-3 rounded-xl flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm transition-colors font-bold"
                        >
                          <XCircle className="w-4 h-4" />
                          Cancelar
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <div className="glass-card p-12 border-dashed border-white/10 flex flex-col items-center justify-center text-center opacity-50">
                    <Clock className="w-8 h-8 mb-4 text-white/20" />
                    <p className="text-white/40 italic">Nenhum cliente sendo atendido</p>
                    {queue.length > 0 && (
                      <p className="text-xs mt-2">Chame o próximo da fila abaixo</p>
                    )}
                  </div>
                )}
              </div>`;

const uiNew = `              <div className="lg:col-span-1 flex flex-col gap-6">
                <h2 className="text-xs uppercase tracking-widest text-white/30 font-bold mb-4">Em Atendimento</h2>
                {activeBarbersList.map(barber => {
                  const activeB = activeBookings.find(b => b.barberId === barber.id);
                  const nextB = getNextForBarber(barber.id);
                  
                  return (
                    <div key={barber.id} className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <Scissors className="w-4 h-4 text-gold" />
                        <h3 className="text-sm font-bold text-white">{barber.name}</h3>
                      </div>
                      
                      {activeB ? (
                        <motion.div 
                          layoutId={\`active-\${activeB.id}\`}
                          className="glass-card p-6 border-gold/40 bg-gold/5 ring-1 ring-gold/20"
                        >
                          <div className="flex items-center gap-4 mb-6">
                            <div className="w-16 h-16 rounded-full bg-gold/20 flex items-center justify-center text-gold text-2xl font-bold">
                              {activeB.clientName[0]}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-2xl font-display font-bold truncate">{activeB.clientName}</h3>
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-gold text-sm font-medium truncate">{activeB.serviceId}</p>
                                <button onClick={() => setEditingServicesBooking({id: activeB.id, serviceId: activeB.serviceId})} className="text-white/40 hover:text-white p-1 shrink-0">
                                  <Edit2 className="w-3 h-3" />
                                </button>
                              </div>
                              <div className="flex items-center gap-1 mt-1 text-white/40">
                                <Clock className="w-3 h-3" />
                                <p className="text-xs truncate">
                                  {activeB.status === BookingStatus.PAUSED ? (
                                    <span className="text-yellow-500 font-bold">Pausado</span>
                                  ) : activeB.serviceStartTime ? \`Restam aprox. \${formatTime(activeRemainingMinutes[activeB.id] || 0)}\` : "Iniciando..."}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2 sm:space-y-3">
                            {activeB.status === BookingStatus.PAUSED ? (
                              <button 
                                onClick={() => resumeService(activeB)}
                                className="w-full bg-gold/20 hover:bg-gold/30 text-gold border border-gold/40 py-3 rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-all"
                              >
                                <Play className="w-4 h-4" />
                                RETOMAR
                              </button>
                            ) : (
                              <button 
                                onClick={() => completeService(activeB.id)}
                                className="w-full bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30 py-3 rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-all"
                              >
                                <CheckCircle className="w-4 h-4" />
                                CONCLUIR
                              </button>
                            )}
                            
                            <div className="flex gap-2">
                              {activeB.status === BookingStatus.IN_SERVICE && (
                                <button 
                                   onClick={() => pauseService(activeB)}
                                   className="flex-1 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 py-2 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-colors"
                                >
                                  <Pause className="w-3 h-3" />
                                  Pausar
                                </button>
                              )}
                              <button 
                                 onClick={() => removeBooking(activeB.id)}
                                 className="flex-1 bg-white/5 hover:bg-white/10 text-white/40 border border-white/10 py-2 rounded-xl flex items-center justify-center gap-2 text-xs transition-colors font-bold"
                              >
                                <XCircle className="w-3 h-3" />
                                Cancelar
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      ) : (
                        <div className="glass-card p-6 border-dashed border-white/10 flex flex-col items-center justify-center text-center">
                          <p className="text-white/40 italic mb-4">Livre</p>
                          {nextB ? (
                            <button 
                              onClick={() => startService(nextB.id, barber.id)}
                              className="w-full bg-gold/10 hover:bg-gold text-gold hover:text-carbon border border-gold/20 py-3 rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-all"
                            >
                              <Play className="w-4 h-4 fill-current" />
                              CHAMAR PRÓXIMO
                            </button>
                          ) : (
                            <p className="text-xs text-white/30">Nenhum cliente na fila</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>`;

if (content.includes(uiOld)) {
  content = content.replace(uiOld, uiNew);
  console.log("Successfully replaced UI!");
} else {
  console.log("Could not find uiOld to replace.");
}

// Now replace startService calls in the Queue
// We need to change onClick={() => startService(item.id)} to something that selects barber
// Or since they can call from the station, maybe we remove the CHAMAR button in the queue if it's "any"?
// Actually, let's just make the CHAMAR button in the queue assign to item.barberId if !== 'any', otherwise to the first available barber.
const queueCallOld = /<button \n\s*onClick=\{([^}]+)startService\(item\.id\)\}\n\s*className="flex items-center gap-1\.5 sm:gap-2 whitespace-nowrap bg-gold\/10 hover:bg-gold text-gold hover:text-carbon px-3 py-1\.5 sm:px-4 sm:py-2\.5 rounded-lg font-bold text-\[10px\] sm:text-sm transition-all shrink-0"\n\s*>\n\s*<Play className="w-3 h-3 sm:w-4 sm:h-4 fill-current" \/>\n\s*CHAMAR\n\s*<\/button>/g;

const queueCallNew = `<button 
                               onClick={() => {
                                 if (item.barberId !== 'any') {
                                    startService(item.id, item.barberId);
                                 } else {
                                    // find first available
                                    const freeBarber = activeBarbersList.find(b => !activeBookings.some(ab => ab.barberId === b.id));
                                    if (freeBarber) {
                                       startService(item.id, freeBarber.id);
                                    } else {
                                       // just assign to first active if none free?
                                       startService(item.id, activeBarbersList[0]?.id || 'any');
                                    }
                                 }
                               }}
                               className="flex items-center gap-1.5 sm:gap-2 whitespace-nowrap bg-gold/10 hover:bg-gold text-gold hover:text-carbon px-3 py-1.5 sm:px-4 sm:py-2.5 rounded-lg font-bold text-[10px] sm:text-sm transition-all shrink-0"
                             >
                               <Play className="w-3 h-3 sm:w-4 sm:h-4 fill-current" />
                               CHAMAR
                             </button>`;

content = content.replace(queueCallOld, queueCallNew);

fs.writeFileSync('src/pages/AdminDashboard.tsx', content, 'utf8');
