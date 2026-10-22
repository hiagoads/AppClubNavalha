import React, { useState } from 'react';
import { X, Users, Plus, Trash2, Edit2, Check, Award, Calendar, AlertCircle } from 'lucide-react';
import { ClientProfile, ClientDependent } from '../../types';
import { db } from '../../lib/firebase';
import { doc, updateDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';

interface ManageDependentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: ClientProfile | null;
  onClientUpdated?: (updatedClient: ClientProfile) => void;
}

export function ManageDependentsModal({
  isOpen,
  onClose,
  client,
  onClientUpdated
}: ManageDependentsModalProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDob, setNewDob] = useState('');
  const [newInitialPoints, setNewInitialPoints] = useState<number>(0);
  const [saving, setSaving] = useState(false);

  // Editing state
  const [editingDepId, setEditingDepId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDob, setEditDob] = useState('');

  const [adjustingDepId, setAdjustingDepId] = useState<string | null>(null);
  const [pointsDelta, setPointsDelta] = useState<number>(0);
  const [adjustScope, setAdjustScope] = useState<'weekly' | 'balance' | 'both'>('weekly');
  const [adjustReason, setAdjustReason] = useState('Ajuste manual pelo administrador');

  if (!isOpen || !client) return null;

  const dependents = client.dependents || [];

  const handleAddDependent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      toast.error('Informe o nome do dependente.');
      return;
    }

    setSaving(true);
    try {
      const newDependent: ClientDependent = {
        id: `dep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: newName.trim(),
        dateOfBirth: newDob || undefined,
        points: Number(newInitialPoints) || 0,
        createdAt: new Date().toISOString()
      };

      const updatedDependents = [...dependents, newDependent];
      const clientRef = doc(db, 'clients', client.id);

      await updateDoc(clientRef, {
        dependents: updatedDependents
      });

      // Se informou pontos iniciais, registra transação
      if (newInitialPoints > 0) {
        try {
          await addDoc(collection(db, 'point_transactions'), {
            clientId: client.id,
            dependentId: newDependent.id,
            dependentName: newDependent.name,
            points: Number(newInitialPoints),
            type: 'earned',
            description: `Saldo inicial para dependente ${newDependent.name}`,
            createdAt: serverTimestamp()
          });
        } catch (_) {}
      }

      const updatedProfile: ClientProfile = {
        ...client,
        dependents: updatedDependents
      };

      if (onClientUpdated) {
        onClientUpdated(updatedProfile);
      }

      toast.success(`Dependente ${newDependent.name} cadastrado com sucesso!`);
      setNewName('');
      setNewDob('');
      setNewInitialPoints(0);
      setIsAdding(false);
    } catch (err) {
      console.error('Error adding dependent:', err);
      toast.error('Erro ao adicionar dependente.');
    } finally {
      setSaving(false);
    }
  };

  const handleStartEdit = (dep: ClientDependent) => {
    setEditingDepId(dep.id);
    setEditName(dep.name);
    setEditDob(dep.dateOfBirth || '');
  };

  const handleSaveEdit = async (depId: string) => {
    if (!editName.trim()) {
      toast.error('O nome não pode ficar vazio.');
      return;
    }

    setSaving(true);
    try {
      const updatedDependents = dependents.map(d => {
        if (d.id === depId) {
          return {
            ...d,
            name: editName.trim(),
            dateOfBirth: editDob || undefined
          };
        }
        return d;
      });

      const clientRef = doc(db, 'clients', client.id);
      await updateDoc(clientRef, {
        dependents: updatedDependents
      });

      const updatedProfile: ClientProfile = {
        ...client,
        dependents: updatedDependents
      };

      if (onClientUpdated) {
        onClientUpdated(updatedProfile);
      }

      toast.success('Dados do dependente atualizados!');
      setEditingDepId(null);
    } catch (err) {
      console.error('Error updating dependent:', err);
      toast.error('Erro ao atualizar dependente.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDependent = async (dep: ClientDependent) => {
    if (!confirm(`Tem certeza que deseja remover o dependente ${dep.name}?`)) {
      return;
    }

    setSaving(true);
    try {
      const updatedDependents = dependents.filter(d => d.id !== dep.id);
      const clientRef = doc(db, 'clients', client.id);

      await updateDoc(clientRef, {
        dependents: updatedDependents
      });

      const updatedProfile: ClientProfile = {
        ...client,
        dependents: updatedDependents
      };

      if (onClientUpdated) {
        onClientUpdated(updatedProfile);
      }

      toast.success(`Dependente ${dep.name} removido.`);
    } catch (err) {
      console.error('Error deleting dependent:', err);
      toast.error('Erro ao remover dependente.');
    } finally {
      setSaving(false);
    }
  };

  const handleAdjustPoints = async (dep: ClientDependent) => {
    if (!pointsDelta || pointsDelta === 0) {
      toast.error('Informe um valor diferente de zero.');
      return;
    }

    setSaving(true);
    try {
      const currentPts = dep.points || 0;
      const currentWeekly = dep.weeklyPoints || 0;
      const newPts = (adjustScope === 'weekly') ? currentPts : Math.max(0, currentPts + pointsDelta);
      const newWeekly = (adjustScope === 'balance') ? currentWeekly : Math.max(0, currentWeekly + pointsDelta);
      const nowIso = new Date().toISOString();

      const updatedDependents = dependents.map(d => {
        if (d.id === dep.id) {
          return {
            ...d,
            points: newPts,
            weeklyPoints: newWeekly,
            lastPointsUpdate: nowIso
          };
        }
        return d;
      });

      const clientRef = doc(db, 'clients', client.id);
      await updateDoc(clientRef, {
        dependents: updatedDependents
      });

      try {
        await addDoc(collection(db, 'point_transactions'), {
          clientId: client.id,
          dependentId: dep.id,
          dependentName: dep.name,
          points: pointsDelta,
          type: pointsDelta > 0 ? 'earned' : 'adjusted',
          scope: adjustScope === 'weekly' ? 'weekly_only' : adjustScope === 'balance' ? 'balance_only' : 'all_balances',
          weeklyPointsChange: adjustScope !== 'balance' ? pointsDelta : 0,
          description: adjustReason || `Ajuste manual para ${dep.name} (${adjustScope === 'weekly' ? 'Ranking Semanal' : adjustScope === 'balance' ? 'Saldo Acumulado' : 'Ambos'})`,
          createdAt: nowIso
        });
      } catch (_) {}

      const updatedProfile: ClientProfile = {
        ...client,
        dependents: updatedDependents
      };

      if (onClientUpdated) {
        onClientUpdated(updatedProfile);
      }

      toast.success(`Pontos de ${dep.name} atualizados com sucesso!`);
      setAdjustingDepId(null);
      setPointsDelta(0);
    } catch (err) {
      console.error('Error adjusting points:', err);
      toast.error('Erro ao ajustar pontos.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#141414] border border-white/10 rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/30 flex items-center justify-center text-gold">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white font-display">
                Dependentes de {client.firstName ? `${client.firstName} ${client.lastName || ''}` : client.username}
              </h3>
              <p className="text-xs text-white/50">
                Gerencie filhos ou familiares vinculados à conta deste cliente
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/40 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto custom-scrollbar flex-1 space-y-4">
          {/* Top Info Banner */}
          <div className="p-3.5 rounded-xl bg-gold/10 border border-gold/30 flex items-start gap-2.5 text-xs text-white/80">
            <AlertCircle className="w-4 h-4 text-gold shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-gold">Regra dos Dependentes:</span> Conta secundária vinculada ao responsável (sem necessidade de email, telefone ou senha). Ao finalizar o corte de um dependente, os pontos <strong className="text-gold">XP e Patente</strong> vão para a conta do responsável, e os pontos do <strong className="text-purple-300">Ranking Semanal</strong> vão para a conta do dependente!
            </div>
          </div>

          {/* Dependents List */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs uppercase tracking-wider font-bold text-white/50">
                Dependentes Cadastrados ({dependents.length})
              </span>
              {!isAdding && (
                <button
                  type="button"
                  onClick={() => setIsAdding(true)}
                  className="px-3 py-1.5 text-xs font-bold text-gold bg-gold/10 hover:bg-gold/20 border border-gold/30 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Novo Dependente</span>
                </button>
              )}
            </div>

            {dependents.length === 0 && !isAdding && (
              <div className="text-center py-8 px-4 rounded-xl border border-dashed border-white/10 bg-white/[0.01]">
                <Users className="w-8 h-8 text-white/20 mx-auto mb-2" />
                <p className="text-sm font-medium text-white/60">Nenhum dependente vinculado</p>
                <p className="text-xs text-white/40 mt-1 max-w-sm mx-auto">
                  Clique no botão acima para adicionar um filho ou familiar à conta deste cliente.
                </p>
              </div>
            )}

            {dependents.map((dep) => (
              <div
                key={dep.id}
                className="p-3.5 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition-all space-y-2.5"
              >
                {editingDepId === dep.id ? (
                  /* Inline Edit Form */
                  <div className="space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] uppercase font-bold text-white/40 block mb-1">Nome</label>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full bg-black/40 border border-white/20 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-gold/50"
                          placeholder="Nome do dependente"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-bold text-white/40 block mb-1">Data de Nasc.</label>
                        <input
                          type="date"
                          value={editDob}
                          onChange={(e) => setEditDob(e.target.value)}
                          className="w-full bg-black/40 border border-white/20 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-gold/50 [color-scheme:dark]"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setEditingDepId(null)}
                        className="px-2.5 py-1 text-xs text-white/50 hover:text-white"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => handleSaveEdit(dep.id)}
                        className="px-3 py-1 text-xs font-bold bg-gold text-black rounded-lg hover:bg-gold-light"
                      >
                        Salvar
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Standard Card View */
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold text-sm">
                        {dep.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-white text-sm">{dep.name}</p>
                        <div className="flex items-center gap-2 text-[11px] text-white/40 mt-0.5">
                          {dep.dateOfBirth ? (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(dep.dateOfBirth).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                            </span>
                          ) : (
                            <span>Sem data de nasc.</span>
                          )}
                          <span>•</span>
                          <span>Cadastrado em {new Date(dep.createdAt).toLocaleDateString('pt-BR')}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      {/* Pontos do Dependente */}
                      <div className="flex items-center gap-1.5">
                        <div className="px-2.5 py-1 rounded-lg bg-purple-500/10 border border-purple-500/25 text-right">
                          <span className="text-[9px] uppercase tracking-wider text-purple-300 block font-bold">Ranking Semanal</span>
                          <span className="text-xs font-mono font-bold text-purple-200">
                            {(dep.weeklyPoints || 0).toLocaleString('pt-BR')} pts
                          </span>
                        </div>
                        <div className="px-2.5 py-1 rounded-lg bg-black/50 border border-white/10 text-right">
                          <span className="text-[9px] uppercase tracking-wider text-white/40 block font-bold">Acumulado</span>
                          <span className="text-xs font-mono font-bold text-gold">
                            {(dep.points || 0).toLocaleString('pt-BR')} pts
                          </span>
                        </div>
                      </div>

                      {/* Botão Ajustar Pontos */}
                      <button
                        type="button"
                        onClick={() => {
                          setAdjustingDepId(adjustingDepId === dep.id ? null : dep.id);
                          setPointsDelta(0);
                        }}
                        className="p-1.5 text-white/50 hover:text-gold bg-white/5 hover:bg-gold/10 border border-white/10 rounded-lg transition-colors"
                        title="Ajustar pontos deste dependente"
                      >
                        <Award className="w-4 h-4" />
                      </button>

                      {/* Botão Editar */}
                      <button
                        type="button"
                        onClick={() => handleStartEdit(dep)}
                        className="p-1.5 text-white/50 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors"
                        title="Editar nome / nascimento"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      {/* Botão Excluir */}
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => handleDeleteDependent(dep)}
                        className="p-1.5 text-red-400/60 hover:text-red-400 bg-red-500/5 hover:bg-red-500/15 border border-red-500/10 rounded-lg transition-colors"
                        title="Remover dependente"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Points Adjustment Panel */}
                {adjustingDepId === dep.id && (
                  <div className="p-3.5 rounded-lg bg-black/70 border border-gold/30 mt-2 space-y-2.5">
                    <p className="text-xs font-bold text-gold flex items-center gap-1">
                      <Award className="w-3.5 h-3.5" />
                      <span>Ajustar Pontos de {dep.name}</span>
                    </p>

                    {/* Scope Selector */}
                    <div>
                      <label className="text-[10px] uppercase font-bold text-white/50 block mb-1">
                        Onde aplicar este ajuste?
                      </label>
                      <div className="grid grid-cols-3 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setAdjustScope('weekly')}
                          className={`py-1 px-2 rounded-lg text-[10px] font-bold border transition-colors ${
                            adjustScope === 'weekly'
                              ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                              : 'bg-white/5 text-white/50 border-white/10 hover:text-white'
                          }`}
                        >
                          Ranking Semanal
                        </button>
                        <button
                          type="button"
                          onClick={() => setAdjustScope('balance')}
                          className={`py-1 px-2 rounded-lg text-[10px] font-bold border transition-colors ${
                            adjustScope === 'balance'
                              ? 'bg-gold/20 text-gold border-gold/40'
                              : 'bg-white/5 text-white/50 border-white/10 hover:text-white'
                          }`}
                        >
                          Saldo Acumulado
                        </button>
                        <button
                          type="button"
                          onClick={() => setAdjustScope('both')}
                          className={`py-1 px-2 rounded-lg text-[10px] font-bold border transition-colors ${
                            adjustScope === 'both'
                              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                              : 'bg-white/5 text-white/50 border-white/10 hover:text-white'
                          }`}
                        >
                          Ambos os Saldos
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] uppercase font-bold text-white/50 block mb-1">
                          Quantidade de Pontos (+ para crédito, - para débito)
                        </label>
                        <input
                          type="number"
                          value={pointsDelta || ''}
                          onChange={(e) => setPointsDelta(Number(e.target.value))}
                          placeholder="Ex: 500 ou -200"
                          className="w-full bg-white/5 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-gold"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-bold text-white/50 block mb-1">Motivo do Ajuste</label>
                        <input
                          type="text"
                          value={adjustReason}
                          onChange={(e) => setAdjustReason(e.target.value)}
                          placeholder="Motivo"
                          className="w-full bg-white/5 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-gold"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setAdjustingDepId(null)}
                        className="px-2.5 py-1 text-xs text-white/50 hover:text-white"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        disabled={saving || pointsDelta === 0}
                        onClick={() => handleAdjustPoints(dep)}
                        className="px-3 py-1 text-xs font-bold bg-gold text-black rounded-lg hover:bg-gold-light disabled:opacity-50"
                      >
                        Aplicar Ajuste
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Form to Add New Dependent */}
          {isAdding && (
            <form onSubmit={handleAddDependent} className="p-4 rounded-xl border border-gold/30 bg-gold/[0.02] space-y-3">
              <div className="flex justify-between items-center border-b border-white/10 pb-2">
                <span className="text-xs font-bold text-gold uppercase tracking-wider flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5" />
                  <span>Cadastrar Novo Dependente</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="text-white/40 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-[10px] uppercase font-bold text-white/50 block mb-1">
                    Nome Completo ou Apelido do Filho/Dependente *
                  </label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Ex: Enzo Silva"
                    className="w-full bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-gold"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-white/50 block mb-1">
                    Data de Nascimento (Opcional)
                  </label>
                  <input
                    type="date"
                    value={newDob}
                    onChange={(e) => setNewDob(e.target.value)}
                    className="w-full bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-gold [color-scheme:dark]"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-white/50 block mb-1">
                    Saldo Inicial de Pontos (Opcional)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newInitialPoints || ''}
                    onChange={(e) => setNewInitialPoints(Number(e.target.value))}
                    placeholder="0"
                    className="w-full bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-gold"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-3 py-1.5 text-xs text-white/50 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving || !newName.trim()}
                  className="px-4 py-1.5 text-xs font-bold bg-gold text-black rounded-lg hover:bg-gold-light disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Salvando...' : 'Adicionar Dependente'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-white/[0.01] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-white/80 bg-white/10 hover:bg-white/15 rounded-xl transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
