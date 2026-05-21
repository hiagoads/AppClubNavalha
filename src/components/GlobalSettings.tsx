import React, { useState, useEffect } from 'react';
import { useSettings } from '../hooks/useSettings';
import toast from 'react-hot-toast';
import { Save } from 'lucide-react';

export function GlobalSettings() {
  const { schedulingFee, scheduleHours, updateSettings, loading } = useSettings();
  const [fee, setFee] = useState(0);
  const [hours, setHours] = useState<Record<number, string[]>>({});
  const [selectedDay, setSelectedDay] = useState(1); // Default to Monday
  const [saving, setSaving] = useState(false);

  const daysOfWeek = [
    { id: 0, label: 'Dom' },
    { id: 1, label: 'Seg' },
    { id: 2, label: 'Ter' },
    { id: 3, label: 'Qua' },
    { id: 4, label: 'Qui' },
    { id: 5, label: 'Sex' },
    { id: 6, label: 'Sáb' },
  ];

  // Generate all possible 30-min slots from 7:00 to 22:00
  const allPossibleSlots = Array.from({ length: (22 - 7) * 2 + 1 }, (_, i) => {
    const h = Math.floor(i / 2) + 7;
    const m = (i % 2) * 30;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  });

  const generateDefaultSlots = () => {
    const defaults = [];
    for (let h = 9; h <= 20; h++) {
      for (let m = 0; m < 60; m += 30) {
        defaults.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
      }
    }
    return defaults;
  };

  useEffect(() => {
    if (!loading) {
      setFee(schedulingFee);
      // Migrate array to object if necessary or initialize
      if (scheduleHours && !Array.isArray(scheduleHours) && Object.keys(scheduleHours).length > 0) {
        setHours(scheduleHours);
      } else if (scheduleHours && Array.isArray(scheduleHours) && scheduleHours.length > 0) {
          const init: Record<number, string[]> = {};
          for (let i = 0; i < 7; i++) init[i] = [...scheduleHours];
          setHours(init);
      } else {
        const init: Record<number, string[]> = {};
        const defaultSlots = generateDefaultSlots();
        for (let i = 0; i < 7; i++) init[i] = [...defaultSlots];
        setHours(init);
      }
    }
  }, [schedulingFee, scheduleHours, loading]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateSettings({ schedulingFee: fee, scheduleHours: hours });
      toast.success('Configurações salvas!');
    } catch (err) {
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const toggleHour = (slot: string) => {
    setHours(prev => {
      const dayHours = prev[selectedDay] || [];
      const newDayHours = dayHours.includes(slot) 
        ? dayHours.filter(h => h !== slot) 
        : [...dayHours, slot].sort();
      return { ...prev, [selectedDay]: newDayHours };
    });
  };

  const currentDayHours = hours[selectedDay] || [];

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
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Horários de Agendamento Disponíveis
            </label>
            <p className="text-sm text-gray-500 mb-4">
              Selecione os horários disponíveis para cada dia da semana.
            </p>

            <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
              {daysOfWeek.map(day => (
                <button
                  type="button"
                  key={day.id}
                  onClick={() => setSelectedDay(day.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                    selectedDay === day.id
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {day.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 max-h-[300px] overflow-y-auto p-1">
              {allPossibleSlots.map(slot => (
                <button
                  type="button"
                  key={slot}
                  onClick={() => toggleHour(slot)}
                  className={`text-xs py-2 px-1 rounded-md border font-medium transition-colors ${
                    currentDayHours.includes(slot) 
                      ? 'bg-gray-900 border-gray-900 text-white shadow-sm' 
                      : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {slot}
                </button>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
               <button type="button" onClick={() => setHours(prev => ({ ...prev, [selectedDay]: allPossibleSlots }))} className="text-xs text-gray-600 hover:text-gray-900 border border-gray-200 px-3 py-1.5 rounded bg-white hover:bg-gray-50">Selecionar Todos ({daysOfWeek.find(d => d.id === selectedDay)?.label})</button>
               <button type="button" onClick={() => setHours(prev => ({ ...prev, [selectedDay]: [] }))} className="text-xs text-gray-600 hover:text-gray-900 border border-gray-200 px-3 py-1.5 rounded bg-white hover:bg-gray-50">Limpar ({daysOfWeek.find(d => d.id === selectedDay)?.label})</button>
            </div>
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
