import fs from 'fs';

let content = fs.readFileSync('scripts/temp.ts', 'utf8');

// 1. In active service card
content = content.replace(
  /<p className="text-gold text-sm font-medium truncate">\{activeB\.serviceId\}<\/p>/g,
  `<p className="text-gold text-sm font-medium truncate">{activeB.serviceId}</p>
                                <span className="text-green-400 font-bold text-sm bg-green-400/10 px-2 py-0.5 rounded ml-2">
                                  R$ {Number(activeB.expectedPrice || 0).toFixed(2)}
                                </span>`
);

// 2. In queue list item
content = content.replace(
  /<span className="truncate">\{item\.serviceId\}<\/span>/g,
  `<span className="truncate">{item.serviceId}</span>
                              <span className="text-green-400 font-bold text-xs bg-green-400/10 px-1.5 py-0.5 rounded ml-2">
                                R$ {Number(item.expectedPrice || 0).toFixed(2)}
                              </span>`
);

// 3. Let's rewrite the form inside the modal
const formRegex = /<form onSubmit=\{withProcessing\(handleUpdateServices\)\} className="space-y-4">[\s\S]*?<\/form>/;

const newForm = `<form onSubmit={withProcessing(handleUpdateServices)} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs uppercase tracking-widest text-white/50 font-bold">Serviços / Produtos</label>
                      <input
                        type="text"
                        value={editingServicesBooking.serviceId}
                        onChange={(e) => {
                           setEditingServicesBooking(prev => prev ? { ...prev, serviceId: e.target.value } : prev);
                        }}
                        placeholder="Ex: Corte, Barba"
                        className="w-full bg-carbon border border-white/10 rounded-lg p-3 text-sm text-white focus:border-gold outline-none transition-colors mb-2"
                      />
                      
                      <label className="text-xs uppercase tracking-widest text-white/50 font-bold mt-4 block">Valor Total (R$)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editingServicesBooking.expectedPrice}
                        onChange={(e) => {
                           setEditingServicesBooking(prev => prev ? { ...prev, expectedPrice: e.target.value } : prev);
                        }}
                        placeholder="Valor total"
                        className="w-full bg-carbon border border-white/10 rounded-lg p-3 text-sm text-white focus:border-gold outline-none transition-colors mb-2 font-mono"
                      />

                      <div className="flex flex-col gap-2 mt-4">
                         <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-2 bg-black/20 rounded-lg border border-white/10">
                           {services.map(s => {
                             const parsedNames = parseServiceString(editingServicesBooking.serviceId).map(ps => ps.name.trim().toLowerCase());
                             const isSelected = parsedNames.includes(s.name.trim().toLowerCase());
                             return (
                               <button
                                 key={s.id}
                                 type="button"
                                 onClick={() => {
                                   setEditingServicesBooking(prev => {
                                     if (!prev) return prev;
                                     let parsed = parseServiceString(prev.serviceId);
                                     if (isSelected) {
                                       parsed = parsed.filter(p => p.name.trim().toLowerCase() !== s.name.trim().toLowerCase());
                                     } else {
                                       parsed.push({ quantity: 1, name: s.name });
                                     }
                                     
                                     // Recalculate price
                                     let newPrice = 0;
                                     parsed.forEach(ps => {
                                        const srv = services.find(x => x.name.trim().toLowerCase() === ps.name.toLowerCase() || x.id === ps.name);
                                        if (srv) {
                                            const promo = parsePrice(srv.promoPrice);
                                            const reg = parsePrice(srv.price);
                                            newPrice += ((promo > 0) ? promo : reg) * ps.quantity;
                                        }
                                     });
                                     
                                     return { ...prev, serviceId: stringifyServices(parsed), expectedPrice: newPrice };
                                   });
                                 }}
                                 className={\`px-3 py-2 rounded-xl text-sm border font-medium transition-colors flex items-center gap-2 \${isSelected ? 'bg-gold/20 border-gold/50 text-gold shadow-sm shadow-gold/10' : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10'}\`}
                               >
                                 {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-gold"></div>}
                                 {s.name}
                               </button>
                             );
                           })}
                         </div>
                         {parseServiceString(editingServicesBooking.serviceId).filter(ps => {
                            const s = services.find(srv => srv.name.trim().toLowerCase() === ps.name.toLowerCase());
                            return s?.isProduct;
                         }).map(ps => (
                            <div key={ps.name} className="flex flex-col gap-1 mt-2 p-2 bg-white/5 rounded-lg border border-white/10">
                              <label className="text-xs text-white/70 font-bold flex justify-between">
                                <span>Quantidade: {ps.name}</span>
                                <span className="text-gold">R$ {
                                  ( (parsePrice(services.find(srv => srv.name.trim().toLowerCase() === ps.name.toLowerCase())?.promoPrice) > 0 ? parsePrice(services.find(srv => srv.name.trim().toLowerCase() === ps.name.toLowerCase())?.promoPrice) : parsePrice(services.find(srv => srv.name.trim().toLowerCase() === ps.name.toLowerCase())?.price)) * ps.quantity ).toFixed(2)
                                }</span>
                              </label>
                              <div className="flex items-center gap-3">
                                <button 
                                  type="button" 
                                  onClick={() => {
                                    setEditingServicesBooking(prev => {
                                      if (!prev) return prev;
                                      let parsed = parseServiceString(prev.serviceId);
                                      let existing = parsed.find(p => p.name.trim().toLowerCase() === ps.name.toLowerCase());
                                      if (existing) {
                                        existing.quantity -= 1;
                                        if (existing.quantity <= 0) {
                                          parsed = parsed.filter(p => p.name.trim().toLowerCase() !== ps.name.toLowerCase());
                                        }
                                      }
                                      
                                      // Recalculate price
                                     let newPrice = 0;
                                     parsed.forEach(ps => {
                                        const srv = services.find(x => x.name.trim().toLowerCase() === ps.name.toLowerCase() || x.id === ps.name);
                                        if (srv) {
                                            const promo = parsePrice(srv.promoPrice);
                                            const reg = parsePrice(srv.price);
                                            newPrice += ((promo > 0) ? promo : reg) * ps.quantity;
                                        }
                                     });

                                      return { ...prev, serviceId: stringifyServices(parsed), expectedPrice: newPrice };
                                    });
                                  }}
                                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold transition-colors"
                                >
                                  -
                                </button>
                                <span className="w-8 text-center text-white font-bold">{ps.quantity}</span>
                                <button 
                                  type="button" 
                                  onClick={() => {
                                    setEditingServicesBooking(prev => {
                                      if (!prev) return prev;
                                      let parsed = parseServiceString(prev.serviceId);
                                      let existing = parsed.find(p => p.name.trim().toLowerCase() === ps.name.toLowerCase());
                                      if (existing) existing.quantity += 1;
                                      
                                      // Recalculate price
                                     let newPrice = 0;
                                     parsed.forEach(ps => {
                                        const srv = services.find(x => x.name.trim().toLowerCase() === ps.name.toLowerCase() || x.id === ps.name);
                                        if (srv) {
                                            const promo = parsePrice(srv.promoPrice);
                                            const reg = parsePrice(srv.price);
                                            newPrice += ((promo > 0) ? promo : reg) * ps.quantity;
                                        }
                                     });

                                      return { ...prev, serviceId: stringifyServices(parsed), expectedPrice: newPrice };
                                    });
                                  }}
                                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold transition-colors"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                         ))}
                       </div>
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setEditingServicesBooking(null)}
                        className="px-6 py-3 rounded-lg font-bold text-white/40 hover:text-white transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="bg-gold text-carbon px-6 py-3 rounded-lg font-bold hover:bg-gold-dark transition-colors flex items-center gap-2"
                      >
                        Salvar Alterações
                      </button>
                    </div>
                  </form>`;

content = content.replace(formRegex, newForm);

fs.writeFileSync('src/pages/AdminDashboard.tsx', content, 'utf8');
