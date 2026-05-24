import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Barber } from '../types';
import toast from 'react-hot-toast';
import { Plus, Edit2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function BarbersManager() {
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', specialties: '', isActive: true });

  useEffect(() => {
    const q = query(collection(db, 'barbers'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const bData: Barber[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        bData.push({
          id: doc.id,
          name: data.name,
          isActive: data.isActive,
          specialties: data.specialties || [],
          photoUrl: data.photoUrl,
        });
      });
      setBarbers(bData);
    });
    return () => unsubscribe();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    try {
      await addDoc(collection(db, 'barbers'), {
        name: formData.name,
        isActive: formData.isActive,
        specialties: formData.specialties.split(',').map(s => s.trim()).filter(s => s)
      });
      setFormData({ name: '', specialties: '', isActive: true });
      setShowAddForm(false);
      toast.success('Barbeiro adicionado');
    } catch (error) {
      toast.error('Erro ao adicionar barbeiro');
    }
  };

  const updateBarber = async (id: string, updates: Partial<Barber>) => {
    try {
      await updateDoc(doc(db, 'barbers', id), updates);
      toast.success('Barbeiro atualizado');
      setIsEditing(null);
    } catch (error) {
      toast.error('Erro ao atualizar');
    }
  };

  const toggleStatus = async (barber: Barber) => {
    await updateBarber(barber.id, { isActive: !barber.isActive });
  };

  const removeBarber = async (id: string) => {
    if(!window.confirm('Tem certeza que deseja remover este barbeiro?')) return;
    try {
      await deleteDoc(doc(db, 'barbers', id));
      toast.success('Removido com sucesso');
    } catch (error) {
      toast.error('Erro ao remover');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-display font-bold">Gerenciar Barbeiros</h2>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-gold text-carbon px-4 py-2 rounded-lg font-bold flex items-center gap-2 text-sm hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          Novo Barbeiro
        </button>
      </div>

      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-carbon-light p-4 rounded-xl border border-white/5 overflow-hidden"
          >
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-xs uppercase text-white/50 mb-1">Nome</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-carbon border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-gold outline-none"
                    required
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button type="submit" className="bg-gold text-carbon px-4 py-2 rounded-lg font-bold text-sm hover:opacity-90 transition-opacity">
                  Salvar
                </button>
                <button type="button" onClick={() => setShowAddForm(false)} className="text-white/50 text-sm hover:text-white transition-colors">
                  Cancelar
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {barbers.map((barber) => (
          <div key={barber.id} className="bg-carbon-light rounded-xl border border-white/5 p-4 flex flex-col justify-between hover:border-white/10 transition-colors">
            {isEditing === barber.id ? (
              <div className="space-y-3">
                <input
                  type="text"
                  defaultValue={barber.name}
                  onBlur={(e) => updateBarber(barber.id, { name: e.target.value })}
                  className="w-full bg-carbon border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-gold outline-none"
                  autoFocus
                />
              </div>
            ) : (
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-bold text-lg mb-2 truncate">{barber.name}</h3>
                  <button
                    onClick={() => toggleStatus(barber)}
                    className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider transition-colors border ${
                      barber.isActive 
                        ? 'bg-green-500/10 text-green-500 border-green-500/30 hover:bg-green-500/20' 
                        : 'bg-red-500/10 text-red-500 border-red-500/30 hover:bg-red-500/20'
                    }`}
                  >
                    {barber.isActive ? 'Disponível' : 'Indisponível'}
                  </button>
                </div>
                <div className="flex items-center gap-1.5 ml-2">
                  <button onClick={() => setIsEditing(barber.id)} className="p-1.5 text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => removeBarber(barber.id)} className="p-1.5 text-white/40 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        {barbers.length === 0 && !showAddForm && (
          <div className="col-span-full py-16 text-center text-white/40 text-sm border border-dashed border-white/10 rounded-xl">
            Nenhum barbeiro cadastrado.
          </div>
        )}
      </div>
    </div>
  );
}
