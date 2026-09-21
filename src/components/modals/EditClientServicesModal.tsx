import React from 'react';
import { X, Scissors } from 'lucide-react';
import { Service } from '../../types';
import { parsePrice, parseServiceString, stringifyServices } from '../../utils';

interface EditingServicesState {
  id: string;
  serviceId: string;
}

interface EditClientServicesModalProps {
  isOpen: boolean;
  editingServices: EditingServicesState | null;
  setEditingServices: React.Dispatch<React.SetStateAction<EditingServicesState | null>>;
  services: Service[];
  onSubmit: (e: React.FormEvent) => void;
}

export function EditClientServicesModal({
  isOpen,
  editingServices,
  setEditingServices,
  services,
  onSubmit
}: EditClientServicesModalProps) {
  if (!isOpen || !editingServices) return null;

  return (
    <div className="fixed inset-0 bg-carbon/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-carbon-light border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
        <button 
          onClick={() => setEditingServices(null)}
          className="absolute top-4 right-4 text-white/40 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center text-gold">
            <Scissors className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-display font-bold">Editar Serviços</h2>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-widest text-white/50 font-bold">Serviços Selecionados</label>
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-2 bg-black/20 rounded-lg border border-white/10">
                {services.map(s => {
                  const parsedNames = parseServiceString(editingServices.serviceId).map(ps => ps.name.trim().toLowerCase());
                  const isSelected = parsedNames.includes(s.name.trim().toLowerCase());
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setEditingServices(prev => {
                          if (!prev) return prev;
                          let parsed = parseServiceString(prev.serviceId);
                          if (isSelected) {
                            parsed = parsed.filter(p => p.name.trim().toLowerCase() !== s.name.trim().toLowerCase());
                          } else {
                            parsed.push({ quantity: 1, name: s.name });
                          }
                          return { ...prev, serviceId: stringifyServices(parsed) };
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
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setEditingServices(null)}
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
