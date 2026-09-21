import React from 'react';
import { X, Scissors } from 'lucide-react';
import { Service } from '../../types';
import { parsePrice, parseServiceString, stringifyServices } from '../../utils';

interface EditingServicesState {
  id: string;
  serviceId: string;
  expectedPrice: number | string;
}

interface EditServicesModalProps {
  booking: EditingServicesState | null;
  setBooking: React.Dispatch<React.SetStateAction<EditingServicesState | null>>;
  services: Service[];
  onSubmit: (e: React.FormEvent) => void;
}

export function EditServicesModal({
  booking,
  setBooking,
  services,
  onSubmit
}: EditServicesModalProps) {
  if (!booking) return null;

  return (
    <div className="fixed inset-0 bg-carbon/80 backdrop-blur-sm z-50 flex p-4 pb-20 overflow-y-auto">
      <div className="m-auto bg-carbon-light border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
        <button 
          onClick={() => setBooking(null)}
          className="absolute top-4 right-4 text-white/40 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center text-gold">
            <Scissors className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-display font-bold">Editar Serviços e Produtos</h2>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-widest text-white/50 font-bold">Serviços / Produtos</label>
            <input type="text" value={booking.serviceId} onChange={(e) => { 
              const newVal = e.target.value; 
              let newPrice = 0; 
              parseServiceString(newVal).forEach(ps => { 
                const srv = services.find(x => x.name.trim().toLowerCase() === ps.name.trim().toLowerCase() || x.id === ps.name); 
                if (srv) { 
                  const promo = parsePrice(srv.promoPrice); 
                  const reg = parsePrice(srv.price); 
                  newPrice += ((promo > 0) ? promo : reg) * ps.quantity; 
                } 
              }); 
              setBooking(prev => prev ? { ...prev, serviceId: newVal, expectedPrice: newPrice } : prev); 
            }} placeholder="Ex: Corte, Barba" className="w-full bg-carbon border border-white/10 rounded-lg p-3 text-sm text-white focus:border-gold outline-none transition-colors mb-2" />
            
            <label className="text-xs uppercase tracking-widest text-white/50 font-bold mt-4 block">Valor Total (R$)</label>
            <input
              type="number"
              step="0.01"
              value={booking.expectedPrice}
              onChange={(e) => {
                  setBooking(prev => prev ? { ...prev, expectedPrice: e.target.value } : prev);
              }}
              placeholder="Valor total"
              className="w-full bg-carbon border border-white/10 rounded-lg p-3 text-sm text-white focus:border-gold outline-none transition-colors mb-2 font-mono"
            />

            <div className="flex flex-col gap-2 mt-4">
                <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-2 bg-black/20 rounded-lg border border-white/10">
                  {services.map(s => {
                    const parsedNames = parseServiceString(booking.serviceId).map(ps => ps.name.trim().toLowerCase());
                    const isSelected = parsedNames.includes(s.name.trim().toLowerCase());
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setBooking(prev => {
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
                              const srv = services.find(x => x.name.trim().toLowerCase() === ps.name.trim().toLowerCase() || x.id === ps.name);
                              if (srv) {
                                  const promo = parsePrice(srv.promoPrice);
                                  const reg = parsePrice(srv.price);
                                  newPrice += ((promo > 0) ? promo : reg) * ps.quantity;
                              }
                            });
                            
                            return { ...prev, serviceId: stringifyServices(parsed), expectedPrice: newPrice };
                          });
                        }}
                        className={`px-3 py-2 rounded-xl text-sm border font-medium transition-colors flex items-center gap-2 ${isSelected ? 'bg-gold/20 border-gold/50 text-gold shadow-sm shadow-gold/10' : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10'}`}
                      >
                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-gold"></div>}
                        {s.name}
                      </button>
                    );
                  })}
                </div>
                {parseServiceString(booking.serviceId).filter(ps => {
                  const s = services.find(srv => srv.name.trim().toLowerCase() === ps.name.trim().toLowerCase());
                  return s?.isProduct;
                }).map(ps => (
                  <div key={ps.name} className="flex flex-col gap-1 mt-2 p-2 bg-white/5 rounded-lg border border-white/10">
                    <label className="text-xs text-white/70 font-bold flex justify-between">
                      <span>Quantidade: {ps.name}</span>
                      <span className="text-gold">R$ {
                        ( (parsePrice(services.find(srv => srv.name.trim().toLowerCase() === ps.name.trim().toLowerCase())?.promoPrice) > 0 ? parsePrice(services.find(srv => srv.name.trim().toLowerCase() === ps.name.trim().toLowerCase())?.promoPrice) : parsePrice(services.find(srv => srv.name.trim().toLowerCase() === ps.name.trim().toLowerCase())?.price)) * ps.quantity ).toFixed(2)
                      }</span>
                    </label>
                    <div className="flex items-center gap-3">
                      <button 
                        type="button" 
                        onClick={() => {
                          setBooking(prev => {
                            if (!prev) return prev;
                            let parsed = parseServiceString(prev.serviceId);
                            let existing = parsed.find(p => p.name.trim().toLowerCase() === ps.name.trim().toLowerCase());
                            if (existing) {
                              existing.quantity -= 1;
                              if (existing.quantity <= 0) {
                                parsed = parsed.filter(p => p.name.trim().toLowerCase() !== ps.name.trim().toLowerCase());
                              }
                            }
                            
                            // Recalculate price
                            let newPrice = 0;
                            parsed.forEach(ps => {
                              const srv = services.find(x => x.name.trim().toLowerCase() === ps.name.trim().toLowerCase() || x.id === ps.name);
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
                          setBooking(prev => {
                            if (!prev) return prev;
                            let parsed = parseServiceString(prev.serviceId);
                            let existing = parsed.find(p => p.name.trim().toLowerCase() === ps.name.trim().toLowerCase());
                            if (existing) existing.quantity += 1;
                            
                            // Recalculate price
                            let newPrice = 0;
                            parsed.forEach(ps => {
                              const srv = services.find(x => x.name.trim().toLowerCase() === ps.name.trim().toLowerCase() || x.id === ps.name);
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
              onClick={() => setBooking(null)}
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
        </form>
      </div>
    </div>
  );
}
