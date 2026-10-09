import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Gift, Plus, Trash2, Sparkles, Trophy, RotateCcw, Check, Loader2, Users, AlertCircle } from 'lucide-react';
import { RankBonusDefinition, DEFAULT_RANK_BONUSES } from '../../utils/bonusSystem';
import { getTierTheme } from '../../utils/tierSystem';
import toast from 'react-hot-toast';

interface EditRankBonusModalProps {
  isOpen: boolean;
  onClose: () => void;
  tierLevel: number;
  tierName: string;
  currentBonuses: RankBonusDefinition[];
  clientCount?: number;
  onSave: (tierLevel: number, bonuses: RankBonusDefinition[], syncClients?: boolean) => Promise<void> | void;
}

export function EditRankBonusModal({
  isOpen,
  onClose,
  tierLevel,
  tierName,
  currentBonuses,
  clientCount = 0,
  onSave,
}: EditRankBonusModalProps) {
  const [bonuses, setBonuses] = useState<RankBonusDefinition[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [syncWithClients, setSyncWithClients] = useState(true);

  // Track which tier was initialized so we don't wipe active user edits when parent re-renders
  const initializedTierRef = React.useRef<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (initializedTierRef.current !== tierLevel) {
        setBonuses(
          currentBonuses && currentBonuses.length > 0
            ? JSON.parse(JSON.stringify(currentBonuses))
            : []
        );
        initializedTierRef.current = tierLevel;
        setIsSaving(false);
      }
    } else {
      initializedTierRef.current = null;
    }
  }, [isOpen, tierLevel]);

  if (!isOpen) return null;

  const theme = getTierTheme(tierLevel);

  const getDefaultTitleForType = (type: RankBonusDefinition['type'], hours = 1, pts = 5000) => {
    const safeName = tierName || 'Patente';
    switch (type) {
      case 'vip_hours':
        return `Bônus Patente ${safeName} (${hours}h VIP)`;
      case 'points':
        return `Bônus Patente ${safeName} (+${pts.toLocaleString('pt-BR')} pts)`;
      case 'popsicle':
        return `Bônus Patente ${safeName} (1 Picolé Grátis)`;
      case 'discount_50':
        return `Bônus Patente ${safeName} (50% OFF)`;
      case 'unlimited_vip':
        return `Bônus Patente ${safeName} (Acesso VIP Ilimitado)`;
      case 'custom':
        return `Bônus Patente ${safeName} (Prêmio Especial)`;
      default:
        return `Bônus Patente ${safeName}`;
    }
  };

  const handleAddBonus = (type: RankBonusDefinition['type'] = 'vip_hours') => {
    const timestamp = Date.now();
    const safeTierName = tierName || 'Patente';
    const newBonus: RankBonusDefinition = {
      level: tierLevel,
      tierName: safeTierName,
      rankKey: `rank_${safeTierName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${type}_${timestamp}`,
      title: getDefaultTitleForType(type, type === 'vip_hours' ? 1 : undefined, type === 'points' ? 5000 : undefined),
      type,
      ...(type === 'vip_hours' ? { totalHours: 1 } : {}),
      ...(type === 'points' ? { bonusPoints: 5000 } : {}),
    };
    setBonuses(prev => [...prev, newBonus]);
    toast.success(`Prêmio "${newBonus.title}" adicionado! Personalize e salve.`);
  };

  const handleRemoveBonus = (index: number) => {
    const removed = bonuses[index];
    setBonuses(prev => prev.filter((_, i) => i !== index));
    toast(`Prêmio "${removed?.title || 'Bônus'}" removido. Clique em salvar para confirmar.`, { icon: '🗑️' });
  };

  const handleTypeChange = (index: number, newType: RankBonusDefinition['type']) => {
    setBonuses(prev => {
      const copy = [...prev];
      const item = { ...copy[index], type: newType };
      
      if (newType === 'vip_hours') {
        item.totalHours = item.totalHours || 1;
        item.title = getDefaultTitleForType('vip_hours', item.totalHours);
      } else if (newType === 'points') {
        item.bonusPoints = item.bonusPoints || 5000;
        item.title = getDefaultTitleForType('points', 0, item.bonusPoints);
      } else {
        delete item.totalHours;
        delete item.bonusPoints;
        item.title = getDefaultTitleForType(newType);
      }
      
      copy[index] = item;
      return copy;
    });
  };

  const handleHoursChange = (index: number, hours: number) => {
    const safeHours = Math.max(1, hours || 1);
    setBonuses(prev => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        totalHours: safeHours,
        title: getDefaultTitleForType('vip_hours', safeHours)
      };
      return copy;
    });
  };

  const handlePointsChange = (index: number, pts: number) => {
    const safePts = Math.max(1, pts || 0);
    setBonuses(prev => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        bonusPoints: safePts,
        title: getDefaultTitleForType('points', 0, safePts)
      };
      return copy;
    });
  };

  const handleTitleChange = (index: number, title: string) => {
    setBonuses(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], title };
      return copy;
    });
  };

  const handleRestoreDefault = () => {
    const defaultForTier = DEFAULT_RANK_BONUSES.filter(b => b.level === tierLevel);
    setBonuses(JSON.parse(JSON.stringify(defaultForTier)));
    toast.success(`Prêmios padrão da patente ${tierName} restaurados.`);
  };

  const handleClearAll = () => {
    setBonuses([]);
    toast('Todos os prêmios foram removidos desta patente. Clique em salvar para confirmar.', { icon: 'ℹ️' });
  };

  const handleDirectSaveNoBonus = async () => {
    setBonuses([]);
    setIsSaving(true);
    try {
      await onSave(tierLevel, [], syncWithClients);
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao definir patente sem bônus.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate titles if there are bonuses
    for (let i = 0; i < bonuses.length; i++) {
      if (!bonuses[i].title || !bonuses[i].title.trim()) {
        toast.error(`Informe o título para o prêmio #${i + 1}`);
        return;
      }
    }

    setIsSaving(true);
    try {
      await onSave(tierLevel, bonuses, syncWithClients);
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Ocorreu um erro ao salvar os prêmios da patente.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-carbon border border-gold/40 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl my-8 relative flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-6 border-b border-white/10 flex items-center justify-between bg-black/40">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-2xl ${theme.bg} bg-opacity-20 flex items-center justify-center border border-current border-opacity-30 ${theme.text}`}>
                <Trophy className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-white font-display">
                    Editar Prêmios: {tierName}
                  </h3>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${theme.bg} bg-opacity-20 ${theme.text} border border-current border-opacity-30 uppercase`}>
                    Nível {tierLevel}
                  </span>
                </div>
                <p className="text-xs text-white/50 mt-0.5">
                  Recompensas creditadas ao cliente no momento em que alcançar esta patente
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="text-white/40 hover:text-white p-2 rounded-full hover:bg-white/5 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-5">
            {/* Quick Actions Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-white/5">
              <span className="text-xs font-bold text-white/70 uppercase tracking-wider flex items-center gap-1.5">
                <Gift className="w-3.5 h-3.5 text-gold" /> Prêmios Configurados ({bonuses.length})
              </span>
              <div className="flex items-center gap-2">
                {bonuses.length > 0 ? (
                  <button
                    type="button"
                    onClick={handleDirectSaveNoBonus}
                    disabled={isSaving}
                    className="text-xs text-red-400 hover:text-red-300 font-bold px-3 py-1.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 transition-all flex items-center gap-1.5 shadow-sm"
                    title="Exclui todos os prêmios e define esta patente como sem bônus imediatamente"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Definir Sem Bônus</span>
                  </button>
                ) : (
                  <span className="text-xs font-semibold text-amber-400/80 px-2 py-1 bg-amber-500/10 rounded-lg border border-amber-500/20">
                    Patente Sem Bônus
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleRestoreDefault}
                  disabled={isSaving}
                  className="text-xs text-gold/80 hover:text-gold flex items-center gap-1 font-semibold px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-gold/10 border border-white/10 transition-colors"
                  title="Restaurar padrão inicial do sistema para esta patente"
                >
                  <RotateCcw className="w-3 h-3" /> Restaurar Padrão
                </button>
              </div>
            </div>

            {/* Presets Bar */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase text-white/40 tracking-wider">
                Adicionar rapidamente:
              </label>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => handleAddBonus('vip_hours')}
                  disabled={isSaving}
                  className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-teal-500/10 text-teal-300 border border-teal-500/30 hover:bg-teal-500/20 transition-all flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> 1h VIP
                </button>
                <button
                  type="button"
                  onClick={() => handleAddBonus('points')}
                  disabled={isSaving}
                  className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-gold/10 text-gold border border-gold/30 hover:bg-gold/20 transition-all flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> 5.000 pts
                </button>
                <button
                  type="button"
                  onClick={() => handleAddBonus('popsicle')}
                  disabled={isSaving}
                  className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20 transition-all flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> 1 Picolé
                </button>
                <button
                  type="button"
                  onClick={() => handleAddBonus('discount_50')}
                  disabled={isSaving}
                  className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-300 border border-purple-500/30 hover:bg-purple-500/20 transition-all flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> 50% OFF
                </button>
                <button
                  type="button"
                  onClick={() => handleAddBonus('unlimited_vip')}
                  disabled={isSaving}
                  className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-red-500/10 text-red-300 border border-red-500/30 hover:bg-red-500/20 transition-all flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> VIP Ilimitado
                </button>
                <button
                  type="button"
                  onClick={() => handleAddBonus('custom')}
                  disabled={isSaving}
                  className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-300 border border-blue-500/30 hover:bg-blue-500/20 transition-all flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Personalizado
                </button>
              </div>
            </div>

            {/* List of Bonuses */}
            {bonuses.length === 0 ? (
              <div className="text-center py-8 p-6 rounded-2xl bg-white/[0.02] border border-dashed border-white/10 space-y-4">
                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto text-white/40">
                  <Gift className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-base font-bold text-white/90">Esta patente está configurada SEM BÔNUS</p>
                  <p className="text-xs text-white/40 max-w-sm mx-auto mt-1">
                    Nenhum prêmio ou bônus automático será concedido ao atingir o nível de <strong>{tierName}</strong>.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => handleAddBonus('vip_hours')}
                    disabled={isSaving}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gold/15 hover:bg-gold/25 text-gold border border-gold/30 font-bold text-xs transition-all shadow-sm"
                  >
                    <Plus className="w-4 h-4" /> + Adicionar Prêmio
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {bonuses.map((bonus, idx) => (
                  <div
                    key={bonus.rankKey || idx}
                    className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-3 relative group transition-all hover:border-gold/30"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gold uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" /> Prêmio #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveBonus(idx)}
                        disabled={isSaving}
                        className="flex items-center gap-1 text-xs font-bold text-red-400 hover:text-red-300 py-1 px-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-all"
                        title="Excluir este prêmio"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Excluir Prêmio</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Tipo de Prêmio */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-white/50 tracking-wider">
                          Tipo de Benefício
                        </label>
                        <select
                          value={bonus.type}
                          onChange={(e) => handleTypeChange(idx, e.target.value as any)}
                          disabled={isSaving}
                          className="w-full bg-black/60 border border-white/10 rounded-xl py-2 px-3 text-white focus:outline-none focus:border-gold/50 text-xs font-medium"
                        >
                          <option value="vip_hours">🎮 Horas na Sala VIP (Console)</option>
                          <option value="points">⭐ Pontos Bônus no Saldo</option>
                          <option value="popsicle">🍦 1 Picolé Grátis</option>
                          <option value="discount_50">🏷️ Desconto no Corte / Serviço</option>
                          <option value="unlimited_vip">👑 Acesso Ilimitado Sala VIP</option>
                          <option value="custom">🎁 Recompensa Personalizada (Outro)</option>
                        </select>
                      </div>

                      {/* Parâmetros Condicionais */}
                      {bonus.type === 'vip_hours' && (
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase text-white/50 tracking-wider">
                            Horas de Jogo
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="1"
                              max="24"
                              value={bonus.totalHours || 1}
                              onChange={(e) => handleHoursChange(idx, parseInt(e.target.value) || 1)}
                              onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                              disabled={isSaving}
                              className="w-full bg-black/60 border border-white/10 rounded-xl py-2 px-3 text-white focus:outline-none focus:border-gold/50 text-xs font-bold font-mono"
                            />
                            <span className="text-xs text-white/60 font-bold shrink-0">hora(s)</span>
                          </div>
                        </div>
                      )}

                      {bonus.type === 'points' && (
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase text-white/50 tracking-wider">
                            Pontos Creditados
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              step="500"
                              min="100"
                              value={bonus.bonusPoints || 5000}
                              onChange={(e) => handlePointsChange(idx, parseInt(e.target.value) || 0)}
                              onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                              disabled={isSaving}
                              className="w-full bg-black/60 border border-white/10 rounded-xl py-2 px-3 text-white focus:outline-none focus:border-gold/50 text-xs font-bold font-mono"
                            />
                            <span className="text-xs text-gold font-bold shrink-0">pts</span>
                          </div>
                        </div>
                      )}

                      {bonus.type === 'popsicle' && (
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase text-white/50 tracking-wider">
                            Benefício Físico
                          </label>
                          <p className="text-xs text-amber-300 font-medium py-2">
                            1 Picolé Grátis na Barbearia
                          </p>
                        </div>
                      )}

                      {bonus.type === 'discount_50' && (
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase text-white/50 tracking-wider">
                            Desconto Especial
                          </label>
                          <p className="text-xs text-purple-300 font-medium py-2">
                            Desconto no Corte no Balcão
                          </p>
                        </div>
                      )}

                      {bonus.type === 'unlimited_vip' && (
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase text-white/50 tracking-wider">
                            Status VIP Especial
                          </label>
                          <p className="text-xs text-red-300 font-medium py-2">
                            Acesso Livre à Sala Gamer VIP
                          </p>
                        </div>
                      )}

                      {bonus.type === 'custom' && (
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase text-white/50 tracking-wider">
                            Exemplos de Recompensa
                          </label>
                          <p className="text-[11px] text-white/50 py-1.5">
                            Corte Grátis, Pomada, Cerveja, Barba na Faixa
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Título do Bônus */}
                    <div className="space-y-1 pt-1">
                      <label className="text-[10px] font-bold uppercase text-white/50 tracking-wider flex items-center justify-between">
                        <span>Título / Nome do Prêmio</span>
                        <span className="text-[9px] text-white/30 lowercase font-normal">
                          como aparecerá no extrato do cliente
                        </span>
                      </label>
                      <input
                        type="text"
                        value={bonus.title}
                        onChange={(e) => handleTitleChange(idx, e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                        placeholder={`Bônus Patente ${tierName}`}
                        disabled={isSaving}
                        className="w-full bg-black/60 border border-white/10 rounded-xl py-2 px-3 text-white focus:outline-none focus:border-gold/50 text-xs font-bold"
                      />
                    </div>
                  </div>
                ))}

                {/* Botão Adicionar Outro Prêmio */}
                <button
                  type="button"
                  onClick={() => handleAddBonus('vip_hours')}
                  disabled={isSaving}
                  className="w-full py-2.5 rounded-xl border border-dashed border-white/20 hover:border-gold/50 text-white/60 hover:text-gold text-xs font-bold flex items-center justify-center gap-2 transition-colors bg-white/[0.02]"
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar Outro Prêmio para {tierName}
                </button>
              </div>
            )}

            {/* Opção de Sincronização Automática com Clientes Existentes */}
            <div className="p-3.5 bg-black/40 border border-white/10 rounded-2xl space-y-2">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={syncWithClients}
                  onChange={(e) => setSyncWithClients(e.target.checked)}
                  disabled={isSaving}
                  className="mt-0.5 rounded border-white/20 bg-black/50 text-gold focus:ring-gold"
                />
                <div className="text-xs">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-gold" />
                    Atualizar clientes que já atingiram esta patente
                  </span>
                  <p className="text-[11px] text-white/50 mt-0.5">
                    Atualiza os prêmios para todos os clientes com patente <strong>{tierName}</strong> ou superior {clientCount > 0 ? `(${clientCount} cliente(s))` : ''}.
                  </p>
                </div>
              </label>
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-white/60 hover:text-white hover:bg-white/5 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className={`py-2.5 px-6 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  bonuses.length === 0
                    ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/20'
                    : 'btn-primary shadow-lg shadow-gold/20'
                }`}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-black" />
                    <span>Gravando no Banco...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 text-black" />
                    <span>{bonuses.length === 0 ? 'Salvar Patente Sem Bônus' : 'Salvar Prêmios da Patente'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
