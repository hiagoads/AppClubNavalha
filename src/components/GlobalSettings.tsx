import React, { useState, useEffect } from 'react';
import { useSettings } from '../hooks/useSettings';
import toast from 'react-hot-toast';
import { Save } from 'lucide-react';

export function GlobalSettings() {
  const { schedulingFee, updateSchedulingFee, loading } = useSettings();
  const [fee, setFee] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading) {
      setFee(schedulingFee);
    }
  }, [schedulingFee, loading]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateSchedulingFee(fee);
      toast.success('Configurações salvas!');
    } catch (err) {
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Carregando...</div>;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden max-w-2xl mx-auto">
      <div className="p-6 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-800">Configurações Gerais</h2>
        <p className="text-sm text-gray-500 mt-1">Gerencie taxas e preferências da barbearia.</p>
      </div>
      <div className="p-6">
        <form onSubmit={handleSave} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Taxa de Agendamento (R$)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={fee}
              onChange={(e) => setFee(parseFloat(e.target.value) || 0)}
              className="w-full px-4 py-2 bg-gray-50 text-gray-900 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
              placeholder="0,00"
            />
            <p className="text-sm text-gray-500 mt-2">
              Esse valor será informado ao cliente no momento do agendamento pelo aplicativo.
            </p>
          </div>
          
          <button
            type="submit"
            disabled={saving}
            className="w-full flex items-center justify-center space-x-2 bg-gray-900 text-white py-3 rounded-xl font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            <span>{saving ? 'Salvando...' : 'Salvar Configurações'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
