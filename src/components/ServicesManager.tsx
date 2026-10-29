import { useState, useEffect, useMemo } from 'react';
import { db } from '../lib/firebase';
import { collection, query, onSnapshot, doc, updateDoc, addDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { Service } from '../types';
import { Plus, Edit2, Trash2, X, Save, Image as ImageIcon, Box, Scissors, ArrowUpDown, ChevronUp, ChevronDown, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatTime } from '../utils';

type SortOption = 'manual' | 'price-asc' | 'price-desc' | 'date-newest' | 'date-oldest' | 'name-asc';

export default function ServicesManager() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState<Service | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Tab state: 'services' or 'products'
  const [activeTab, setActiveTab] = useState<'services' | 'products'>('services');

  // Sorting state
  const [sortBy, setSortBy] = useState<SortOption>('manual');
  const [isReordering, setIsReordering] = useState(false);

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
      const servicesData = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      })) as Service[];
      setServices(servicesData);
      setLoading(false);
    }, (err) => {
      if (err.code !== 'permission-denied') console.error(err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Filter lists by category
  const servicesList = useMemo(() => {
    return services.filter(s => !s.isProduct);
  }, [services]);

  const productsList = useMemo(() => {
    return services.filter(s => !!s.isProduct);
  }, [services]);

  const currentTabItems = activeTab === 'services' ? servicesList : productsList;

  // Sorted items based on current activeTab and sortBy
  const sortedItems = useMemo(() => {
    const items = [...currentTabItems];

    if (sortBy === 'manual') {
      return items.sort((a, b) => {
        const orderA = typeof a.order === 'number' ? a.order : 999999;
        const orderB = typeof b.order === 'number' ? b.order : 999999;
        if (orderA !== orderB) return orderA - orderB;
        return a.name.localeCompare(b.name);
      });
    }

    if (sortBy === 'price-asc') {
      return items.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
    }

    if (sortBy === 'price-desc') {
      return items.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
    }

    if (sortBy === 'date-newest') {
      return items.sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      });
    }

    if (sortBy === 'date-oldest') {
      return items.sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeA - timeB;
      });
    }

    if (sortBy === 'name-asc') {
      return items.sort((a, b) => a.name.localeCompare(b.name));
    }

    return items;
  }, [currentTabItems, sortBy]);

  // Handle manual position moves (up / down)
  const handleMove = async (itemId: string, direction: 'up' | 'down') => {
    if (sortBy !== 'manual') {
      toast.error('Selecione "Manual" na ordenação para mover posições.');
      return;
    }
    if (isReordering) return;

    const currentIndex = sortedItems.findIndex(i => i.id === itemId);
    if (currentIndex === -1) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= sortedItems.length) return;

    setIsReordering(true);

    // Create a new copy of items with the swapped positions
    const newItems = [...sortedItems];
    const [movedItem] = newItems.splice(currentIndex, 1);
    newItems.splice(targetIndex, 0, movedItem);

    // Optimistically update local state so the UI responds immediately
    const orderMap = new Map<string, number>();
    newItems.forEach((item, idx) => {
      orderMap.set(item.id, idx);
    });

    setServices(prev => prev.map(s => {
      if (orderMap.has(s.id)) {
        return { ...s, order: orderMap.get(s.id) };
      }
      return s;
    }));

    try {
      const batch = writeBatch(db);
      newItems.forEach((item, idx) => {
        batch.update(doc(db, 'services', item.id), { order: idx });
      });
      await batch.commit();
      toast.success(direction === 'up' ? 'Posição alterada (subiu)' : 'Posição alterada (desceu)', { duration: 1200 });
    } catch (err) {
      console.error('Error saving new order:', err);
      toast.error('Erro ao salvar a nova ordem');
    } finally {
      setIsReordering(false);
    }
  };

  const handleSave = async () => {
    try {
      if (!formData.name?.trim() || formData.price === undefined || formData.duration === undefined) {
        toast.error('Preencha os campos obrigatórios');
        return;
      }

      const isProd = !!formData.isProduct;

      const serviceData: any = {
        name: formData.name.trim(),
        price: Number(formData.price),
        duration: isProd ? 0 : Number(formData.duration),
        isActive: formData.isActive ?? true,
        imageUrl: formData.imageUrl?.trim() || '',
        isProduct: isProd
      };

      if (isEditing) {
        await updateDoc(doc(db, 'services', isEditing.id), serviceData);
        toast.success(isProd ? 'Produto atualizado com sucesso!' : 'Serviço atualizado com sucesso!');
      } else {
        serviceData.createdAt = new Date().toISOString();
        serviceData.order = currentTabItems.length;
        await addDoc(collection(db, 'services'), serviceData);
        toast.success(isProd ? 'Produto adicionado com sucesso!' : 'Serviço adicionado com sucesso!');
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
      setDeletingId(null);
      toast.success('Item excluído com sucesso');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao excluir item');
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
    setFormData({
      name: '',
      price: 0,
      duration: activeTab === 'services' ? 30 : 0,
      isActive: true,
      imageUrl: '',
      isProduct: activeTab === 'products'
    });
  };

  if (loading) {
    return <div className="p-8 text-center text-white/50">Carregando catálogo...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header with Title and Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold font-display silver-text-gradient">Serviços e Produtos</h2>
          <p className="text-sm text-white/50 mt-0.5">
            Gerencie o catálogo de cortes, barba, tratamentos e produtos da vitrine
          </p>
        </div>

        <button
          onClick={openAdd}
          className="flex items-center justify-center gap-2 bg-gold text-carbon px-4 py-2.5 rounded-lg font-bold hover:bg-gold-dark transition-all text-sm shadow-md hover:scale-[1.02] active:scale-[0.98] self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>{activeTab === 'services' ? 'Novo Serviço' : 'Novo Produto'}</span>
        </button>
      </div>

      {/* Primary Category Tabs: Serviços vs Produtos */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="inline-flex p-1 bg-black/40 border border-white/10 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('services')}
            className={`flex items-center gap-2.5 px-5 py-2.5 text-sm font-bold rounded-lg transition-all ${
              activeTab === 'services'
                ? 'bg-gold text-carbon shadow-md'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <Scissors className="w-4 h-4" />
            <span>Serviços</span>
            <span
              className={`px-1.5 py-0.5 text-xs rounded-full font-mono font-bold ${
                activeTab === 'services' ? 'bg-carbon/20 text-carbon' : 'bg-white/10 text-white/70'
              }`}
            >
              {servicesList.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('products')}
            className={`flex items-center gap-2.5 px-5 py-2.5 text-sm font-bold rounded-lg transition-all ${
              activeTab === 'products'
                ? 'bg-gold text-carbon shadow-md'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <Box className="w-4 h-4" />
            <span>Produtos</span>
            <span
              className={`px-1.5 py-0.5 text-xs rounded-full font-mono font-bold ${
                activeTab === 'products' ? 'bg-carbon/20 text-carbon' : 'bg-white/10 text-white/70'
              }`}
            >
              {productsList.length}
            </span>
          </button>
        </div>

        {/* Sorting Controls Toolbar */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <div className="flex items-center gap-2 bg-black/40 border border-white/10 px-3 py-1.5 rounded-lg">
            <ArrowUpDown className="w-3.5 h-3.5 text-gold shrink-0" />
            <label htmlFor="sort-select" className="text-xs uppercase font-bold tracking-wider text-white/50 shrink-0">
              Ordenar por:
            </label>
            <select
              id="sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="bg-transparent text-xs text-white font-medium outline-none cursor-pointer pr-2 focus:text-gold"
            >
              <option value="manual" className="bg-carbon text-white">Manual (Personalizada)</option>
              <option value="price-asc" className="bg-carbon text-white">Menor Preço (R$ ↑)</option>
              <option value="price-desc" className="bg-carbon text-white">Maior Preço (R$ ↓)</option>
              <option value="date-newest" className="bg-carbon text-white">Mais Recentes (Adicionados)</option>
              <option value="date-oldest" className="bg-carbon text-white">Mais Antigos (Adicionados)</option>
              <option value="name-asc" className="bg-carbon text-white">Ordem Alfabética (A - Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Helpful Hint when Manual Sorting is Active */}
      {sortBy === 'manual' && sortedItems.length > 1 && (
        <div className="flex items-center gap-2 text-xs text-white/50 bg-white/5 border border-white/10 px-3 py-2 rounded-lg">
          <ArrowUpDown className="w-3.5 h-3.5 text-gold" />
          <span>
            <strong>Ordem manual ativa:</strong> utilize os botões <span className="text-gold font-bold">▲ Subir</span> e <span className="text-gold font-bold">▼ Descer</span> nos cards para reposicionar os itens.
          </span>
        </div>
      )}

      {/* Modal for Adding / Editing an Item */}
      {(isEditing || isAdding) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-card p-6 sm:p-8 bg-carbon-light border border-white/10 rounded-2xl w-full max-w-xl relative animate-in fade-in zoom-in duration-200 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold font-display silver-text-gradient">
                {isEditing ? (formData.isProduct ? 'Editar Produto' : 'Editar Serviço') : (formData.isProduct ? 'Novo Produto' : 'Novo Serviço')}
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

            {/* Toggle Tipo: Serviço vs Produto */}
            <div className="flex bg-black/40 p-1 rounded-xl mb-6 border border-white/5">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, isProduct: false })}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                  !formData.isProduct ? 'bg-carbon shadow-md text-gold' : 'text-white/40 hover:text-white'
                }`}
              >
                <Scissors className="w-4 h-4" />
                <span>Serviço (Gera Pontos)</span>
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, isProduct: true, duration: 0 })}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                  formData.isProduct ? 'bg-carbon shadow-md text-gold' : 'text-white/40 hover:text-white'
                }`}
              >
                <Box className="w-4 h-4" />
                <span>Produto (Sem Pontos)</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs uppercase tracking-widest text-white/50 font-bold">
                  Nome do {formData.isProduct ? 'Produto' : 'Serviço'}
                </label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-carbon border border-white/10 rounded-lg p-3 text-white focus:border-gold outline-none transition-colors"
                  placeholder={formData.isProduct ? "Ex: Pomada Modeladora Matte" : "Ex: Corte Degradê Navalhado"}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs uppercase tracking-widest text-white/50 font-bold">Preço (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.price === undefined ? '' : formData.price}
                  onChange={(e) => {
                    let val = e.target.value;
                    val = val.replace(/^0+(?=\d)/, '');
                    setFormData({ ...formData, price: val as any });
                  }}
                  className="w-full bg-carbon border border-white/10 rounded-lg p-3 text-white focus:border-gold outline-none transition-colors font-mono"
                  placeholder="Ex: 50.00"
                />
              </div>

              {!formData.isProduct && (
                <div className="space-y-1.5">
                  <label className="text-xs uppercase tracking-widest text-white/50 font-bold">Duração (Minutos)</label>
                  <input
                    type="number"
                    value={formData.duration === undefined ? '' : formData.duration}
                    onChange={(e) => {
                      let val = e.target.value;
                      val = val.replace(/^0+(?=\d)/, '');
                      setFormData({ ...formData, duration: val as any });
                    }}
                    className="w-full bg-carbon border border-white/10 rounded-lg p-3 text-white focus:border-gold outline-none transition-colors font-mono"
                    placeholder="Ex: 35"
                  />
                </div>
              )}

              <div className={`space-y-1.5 ${formData.isProduct ? 'md:col-span-1' : 'md:col-span-2'}`}>
                <label className="text-xs uppercase tracking-widest text-white/50 font-bold">URL da Imagem</label>
                <input
                  type="text"
                  value={formData.imageUrl || ''}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  className="w-full bg-carbon border border-white/10 rounded-lg p-3 text-white focus:border-gold outline-none transition-colors text-sm"
                  placeholder="https://..."
                />
              </div>

              <div className="md:col-span-2 flex justify-end gap-3 mt-4 border-t border-white/10 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(null);
                    setIsAdding(false);
                  }}
                  className="px-5 py-2.5 rounded-lg font-bold text-white/40 hover:text-white transition-colors text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="flex items-center gap-2 bg-gold text-carbon px-6 py-2.5 rounded-lg font-bold hover:bg-gold-dark transition-all text-sm shadow-md"
                >
                  <Save className="w-4 h-4" />
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedItems.map((service, index) => (
          <div
            key={service.id}
            className="glass-card overflow-hidden bg-carbon-light border border-white/10 group hover:border-gold/40 transition-all rounded-xl relative flex flex-col shadow-sm"
          >
            {/* Image / Header Cover */}
            {service.imageUrl ? (
              <div className="w-full h-44 bg-carbon relative">
                <img
                  src={service.imageUrl}
                  alt={service.name}
                  className="w-full h-full object-cover opacity-85 group-hover:opacity-100 transition-opacity"
                />
                {/* Category Badge */}
                <div
                  className={`absolute top-2 right-2 backdrop-blur-sm px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${
                    service.isProduct ? 'bg-black/60 text-white/80 border border-white/10' : 'bg-gold/20 text-gold border border-gold/40'
                  }`}
                >
                  {service.isProduct ? 'Produto' : 'Serviço'}
                </div>

                {/* Position Index in Manual Mode */}
                {sortBy === 'manual' && (
                  <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-sm px-2 py-0.5 rounded text-[11px] font-mono font-bold text-gold border border-gold/30">
                    #{index + 1}
                  </div>
                )}
              </div>
            ) : (
              <div className="w-full h-44 bg-carbon/60 flex flex-col items-center justify-center text-white/20 relative border-b border-white/5">
                {service.isProduct ? <Box className="w-10 h-10 mb-2 opacity-50" /> : <Scissors className="w-10 h-10 mb-2 opacity-50" />}
                <span className="text-[11px] uppercase tracking-widest font-bold">Sem imagem</span>

                {/* Category Badge */}
                <div
                  className={`absolute top-2 right-2 backdrop-blur-sm px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${
                    service.isProduct ? 'bg-black/60 text-white/80 border border-white/10' : 'bg-gold/20 text-gold border border-gold/40'
                  }`}
                >
                  {service.isProduct ? 'Produto' : 'Serviço'}
                </div>

                {/* Position Index in Manual Mode */}
                {sortBy === 'manual' && (
                  <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-sm px-2 py-0.5 rounded text-[11px] font-mono font-bold text-gold border border-gold/30">
                    #{index + 1}
                  </div>
                )}
              </div>
            )}

            {/* Card Content */}
            <div className="p-5 flex-1 flex flex-col">
              <div className="flex justify-between items-start gap-2 mb-2">
                <h3 className="font-display font-bold text-lg text-white group-hover:text-gold transition-colors line-clamp-1">
                  {service.name}
                </h3>
                <span className="text-gold font-bold font-mono text-lg shrink-0">
                  R$ {Number(service.price || 0).toFixed(2)}
                </span>
              </div>

              <div className="text-xs text-white/50 mb-5 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-white/30 shrink-0"></span>
                <span>
                  {service.isProduct ? 'Produto Físico • Não pontua no ranking' : `Duração estimada: ${formatTime(service.duration)}`}
                </span>
              </div>

              {/* Inline Delete Confirmation */}
              {deletingId === service.id ? (
                <div className="mt-auto pt-3 border-t border-red-500/30 bg-red-950/20 -mx-5 -mb-5 p-3 rounded-b-xl flex items-center justify-between gap-2 animate-in fade-in">
                  <div className="flex items-center gap-1.5 text-xs text-red-200">
                    <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    <span>Confirmar exclusão?</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setDeletingId(null)}
                      className="px-2.5 py-1 text-xs text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded transition-colors"
                    >
                      Não
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(service.id)}
                      className="px-2.5 py-1 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded transition-colors shadow-sm"
                    >
                      Sim, excluir
                    </button>
                  </div>
                </div>
              ) : (
                /* Standard Footer with Move Up/Down (if manual) and Edit/Delete */
                <div className="mt-auto flex items-center justify-between gap-2 border-t border-white/10 pt-4">
                  {/* Manual Position Reorder Buttons */}
                  {sortBy === 'manual' ? (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={index === 0 || isReordering}
                        onClick={() => handleMove(service.id, 'up')}
                        className={`p-1.5 rounded-lg border text-xs font-bold transition-all flex items-center gap-1 ${
                          index === 0
                            ? 'opacity-20 border-white/5 text-white/30 cursor-not-allowed'
                            : 'bg-white/5 hover:bg-gold/20 text-white/70 hover:text-gold border-white/10 active:scale-95'
                        }`}
                        title="Subir posição"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        disabled={index === sortedItems.length - 1 || isReordering}
                        onClick={() => handleMove(service.id, 'down')}
                        className={`p-1.5 rounded-lg border text-xs font-bold transition-all flex items-center gap-1 ${
                          index === sortedItems.length - 1
                            ? 'opacity-20 border-white/5 text-white/30 cursor-not-allowed'
                            : 'bg-white/5 hover:bg-gold/20 text-white/70 hover:text-gold border-white/10 active:scale-95'
                        }`}
                        title="Descer posição"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="text-[11px] text-white/30 font-mono">
                      #{index + 1}
                    </div>
                  )}

                  {/* Edit and Delete Buttons */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => openEdit(service)}
                      className="px-3 py-1.5 bg-white/5 hover:bg-white/15 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 border border-white/10"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Editar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingId(service.id)}
                      className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors border border-red-500/20"
                      title="Excluir item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Empty State */}
        {sortedItems.length === 0 && !loading && (
          <div className="col-span-full py-16 text-center border border-dashed border-white/10 rounded-2xl bg-white/[0.02]">
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3 text-white/40">
              {activeTab === 'services' ? <Scissors className="w-6 h-6" /> : <Box className="w-6 h-6" />}
            </div>
            <p className="text-white/60 font-medium text-sm">
              Nenhum {activeTab === 'services' ? 'serviço' : 'produto'} cadastrado nesta categoria.
            </p>
            <p className="text-xs text-white/40 mt-1">
              Clique em &quot;{activeTab === 'services' ? 'Novo Serviço' : 'Novo Produto'}&quot; para adicionar o primeiro item.
            </p>
            <button
              onClick={openAdd}
              className="mt-4 inline-flex items-center gap-2 bg-gold/10 hover:bg-gold/20 text-gold border border-gold/30 px-4 py-2 rounded-lg font-bold text-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>{activeTab === 'services' ? 'Cadastrar Serviço' : 'Cadastrar Produto'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
