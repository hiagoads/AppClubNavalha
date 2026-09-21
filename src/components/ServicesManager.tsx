import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, onSnapshot, doc, updateDoc, addDoc, deleteDoc } from 'firebase/firestore';
import { Service } from '../types';
import { Plus, Edit2, Trash2, X, Save, Image as ImageIcon, Box } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatTime } from '../utils';

export default function ServicesManager() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState<Service | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const [formData, setFormData] = useState<Partial<Service>>({
    name: '',
    price: 0,
    duration: 30,
    isActive: true,
    imageUrl: '',
    isProduct: false
  });

  useEffect(() => {
    const q = query(collection(db, 'services'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const servicesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Service[];
      setServices(servicesData);
      setLoading(false);
    }, (err) => { if(err.code !== "permission-denied") console.error(err); setLoading(false); });

    return () => unsubscribe();
  }, []);

  const handleSave = async () => {
    try {
      if (!formData.name || formData.price === undefined || formData.duration === undefined) {
        toast.error('Preencha os campos obrigatórios');
        return;
      }

      const serviceData = {
        name: formData.name,
        price: Number(formData.price),
        duration: formData.isProduct ? 0 : Number(formData.duration),
        isActive: formData.isActive ?? true,
        imageUrl: formData.imageUrl || '',
        isProduct: formData.isProduct || false
      };

      if (isEditing) {
        await updateDoc(doc(db, 'services', isEditing.id), serviceData);
        toast.success('Atualizado com sucesso!');
      } else {
        await addDoc(collection(db, 'services'), serviceData);
        toast.success('Adicionado com sucesso!');
      }

      setIsEditing(null);
      setIsAdding(false);
      setFormData({ name: '', price: 0, duration: 30, isActive: true, imageUrl: '', isProduct: false });
    } catch (error) {
      console.error(error);
      toast.error('Erro ao salvar');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'services', id));
      toast.success('Excluído');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao excluir');
    }
  };

  const openEdit = (service: Service) => {
    setIsEditing(service);
    setIsAdding(false);
    setFormData(service);
  };

  const openAdd = () => {
    setIsAdding(true);
    setIsEditing(null);
    setFormData({ name: '', price: 0, duration: 30, isActive: true, imageUrl: '', isProduct: false });
  };

  if (loading) {
    return <div className="p-8 text-center text-white/50">Carregando serviços/produtos...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold font-display">Serviços e Produtos</h2>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-gold text-carbon px-4 py-2 rounded-lg font-bold hover:bg-gold-dark transition-colors text-sm sm:text-base"
        >
          <Plus className="w-5 h-5" />
          Novo Item
        </button>
      </div>

      {(isEditing || isAdding) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-card p-6 sm:p-8 bg-carbon-light border border-white/10 rounded-2xl w-full max-w-xl relative animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold font-display silver-text-gradient">
                {isEditing ? 'Editar Item' : 'Novo Item'}
              </h3>
              <button
                onClick={() => {
                  setIsEditing(null);
                  setIsAdding(false);
                }}
                className="text-white/40 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex bg-black/40 p-1 rounded-xl mb-6">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, isProduct: false })}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${!formData.isProduct ? 'bg-carbon shadow-md text-gold' : 'text-white/40 hover:text-white'}`}
              >
                Serviço
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, isProduct: true, duration: 0 })}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${formData.isProduct ? 'bg-carbon shadow-md text-gold' : 'text-white/40 hover:text-white'}`}
              >
                Produto
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs uppercase tracking-widest text-white/50 font-bold">Nome</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-carbon border border-white/10 rounded-lg p-3 text-white focus:border-gold outline-none transition-colors"
                  placeholder={formData.isProduct ? "Ex: Pomada Modeladora" : "Ex: Corte Degrade"}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase tracking-widest text-white/50 font-bold">Preço (R$)</label>
                <input
                  type="number"
                  value={formData.price === undefined ? '' : formData.price}
                  onChange={(e) => {
                    let val = e.target.value;
                    val = val.replace(/^0+(?=\d)/, '');
                    setFormData({ ...formData, price: val as any });
                  }}
                  className="w-full bg-carbon border border-white/10 rounded-lg p-3 text-white focus:border-gold outline-none transition-colors"
                  placeholder="Ex: 50"
                />
              </div>

              {!formData.isProduct && (
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-widest text-white/50 font-bold">Duração (Minutos)</label>
                  <input
                    type="number"
                    value={formData.duration === undefined ? '' : formData.duration}
                    onChange={(e) => {
                      let val = e.target.value;
                      val = val.replace(/^0+(?=\d)/, '');
                      setFormData({ ...formData, duration: val as any });
                    }}
                    className="w-full bg-carbon border border-white/10 rounded-lg p-3 text-white focus:border-gold outline-none transition-colors"
                    placeholder="Ex: 30"
                  />
                </div>
              )}

              <div className={`space-y-2 ${formData.isProduct ? 'md:col-span-1' : 'md:col-span-2'}`}>
                <label className="text-xs uppercase tracking-widest text-white/50 font-bold">URL da Imagem</label>
                <input
                  type="text"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  className="w-full bg-carbon border border-white/10 rounded-lg p-3 text-white focus:border-gold outline-none transition-colors"
                  placeholder="https://..."
                />
              </div>

              <div className="md:col-span-2 flex justify-end gap-3 mt-4">
                <button
                  onClick={() => {
                    setIsEditing(null);
                    setIsAdding(false);
                  }}
                  className="px-6 py-3 rounded-lg font-bold text-white/40 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 bg-gold text-carbon px-6 py-3 rounded-lg font-bold hover:bg-gold-dark transition-colors"
                >
                  <Save className="w-5 h-5" />
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.map(service => (
          <div key={service.id} className="glass-card overflow-hidden bg-carbon-light border border-white/5 group hover:border-gold/30 transition-all rounded-xl relative flex flex-col">
            {service.imageUrl ? (
              <div className="w-full h-48 bg-carbon relative">
                <img src={service.imageUrl} alt={service.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-xs font-bold text-white uppercase tracking-widest">
                  {service.isProduct ? 'Produto' : 'Serviço'}
                </div>
              </div>
            ) : (
              <div className="w-full h-48 bg-carbon/50 flex flex-col items-center justify-center text-white/20 relative">
                {service.isProduct ? <Box className="w-12 h-12 mb-2" /> : <ImageIcon className="w-12 h-12 mb-2" />}
                <span className="text-xs uppercase tracking-widest font-bold">Sem imagem</span>
                <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-xs font-bold text-white uppercase tracking-widest">
                  {service.isProduct ? 'Produto' : 'Serviço'}
                </div>
              </div>
            )}
            
            <div className="p-5 flex-1 flex flex-col">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-display font-bold text-xl">{service.name}</h3>
                <span className="text-gold font-bold font-mono">R$ {service.price?.toFixed(2)}</span>
              </div>
              <p className="text-sm text-white/50 mb-6 flex items-center gap-1">
                 <span className="inline-block w-2 h-2 rounded-full bg-white/20"></span>
                 {service.isProduct ? 'Produto Físico' : `Duração: ${formatTime(service.duration)}`}
              </p>

              <div className="mt-auto flex gap-2 border-t border-white/10 pt-4">
                <button
                  onClick={() => openEdit(service)}
                  className="flex-1 bg-white/5 hover:bg-white/10 text-white py-2 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2"
                >
                  <Edit2 className="w-4 h-4" /> Editar
                </button>
                <button
                  onClick={() => handleDelete(service.id)}
                  className="px-4 bg-red-500/10 hover:bg-red-500/20 text-red-400 py-2 rounded-lg transition-colors flex items-center justify-center"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {services.length === 0 && !loading && (
          <div className="col-span-full py-16 text-center opacity-40">
            <p>Nenhum serviço ou produto cadastrado.</p>
          </div>
        )}
      </div>
    </div>
  );
}
