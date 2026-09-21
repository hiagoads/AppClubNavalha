import React, { useState, useEffect } from 'react';
import { X, Gamepad2, Tv, Flame, Save, Plus } from 'lucide-react';
import { VipStation, VipConsoleType, VipStationStatus } from '../../types';

interface EditStationModalProps {
  isOpen: boolean;
  station: VipStation | null; // null se estiver criando nova
  onClose: () => void;
  onSave: (data: {
    name: string;
    consoleModel: string;
    consoleType: VipConsoleType;
    status?: VipStationStatus;
    notes?: string;
  }) => void;
}

export function EditStationModal({
  isOpen,
  station,
  onClose,
  onSave
}: EditStationModalProps) {
  const [name, setName] = useState('');
  const [consoleModel, setConsoleModel] = useState('');
  const [consoleType, setConsoleType] = useState<VipConsoleType>('arcade');
  const [status, setStatus] = useState<VipStationStatus>('available');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (station) {
      setName(station.name || '');
      setConsoleModel(station.consoleModel || '');
      setConsoleType(station.consoleType || 'arcade');
      setStatus(station.status || 'available');
      setNotes(station.notes || '');
    } else {
      setName('');
      setConsoleModel('');
      setConsoleType('arcade');
      setStatus('available');
      setNotes('');
    }
  }, [station, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !consoleModel.trim()) return;

    onSave({
      name: name.trim(),
      consoleModel: consoleModel.trim(),
      consoleType,
      status,
      notes: notes.trim()
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-carbon border border-white/15 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
        {/* Topo */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold/15 border border-gold/30 flex items-center justify-center text-gold">
              <Gamepad2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {station ? `Editar • ${station.name}` : 'Nova Estação de Jogo'}
              </h2>
              <p className="text-xs text-white/50">Configure o console ou fliperama da Sala VIP</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-white/60">
              Nome da Estação
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Estação 1, Cabine KOF, Área PS3"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-gold/50"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-white/60">
              Modelo do Console / Máquina
            </label>
            <input
              type="text"
              required
              value={consoleModel}
              onChange={(e) => setConsoleModel(e.target.value)}
              placeholder="Ex: The King of Fighters 2002 Arcade, PlayStation 2, PlayStation 3"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-gold/50"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-white/60">
              Tipo do Console / Ícone
            </label>
            <select
              value={consoleType}
              onChange={(e) => setConsoleType(e.target.value as VipConsoleType)}
              className="w-full bg-carbon-light border border-white/10 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-gold/50"
            >
              <option value="arcade">Fliperama / Arcade (The King of Fighters)</option>
              <option value="ps2">PlayStation 2 (PS2)</option>
              <option value="ps3">PlayStation 3 (PS3)</option>
              <option value="ps4">PlayStation 4 (PS4)</option>
              <option value="ps5">PlayStation 5 (PS5)</option>
              <option value="xbox">Xbox (360 / One / Series)</option>
              <option value="retro">Console Retrô / Multijogos</option>
              <option value="other">Outro Console / Livre</option>
            </select>
          </div>

          {station && (
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-white/60">
                Status Operacional
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as VipStationStatus)}
                className="w-full bg-carbon-light border border-white/10 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-gold/50"
              >
                <option value="available">Disponível para Jogo</option>
                <option value="maintenance">Em Manutenção / Desativado</option>
              </select>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-white/60">
              Notas ou Observações (Opcional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: 2 controles arcade, fone de ouvido incluso"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-white text-xs focus:outline-none focus:border-gold/50"
            />
          </div>

          <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-white/60 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary flex items-center gap-2 text-xs font-bold py-2.5 px-5"
            >
              <Save className="w-4 h-4" /> {station ? 'Salvar Alterações' : 'Criar Estação'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
