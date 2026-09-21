import React, { useState } from 'react';
import { 
  Gamepad2, 
  Plus, 
  Tv, 
  Clock, 
  CheckCircle2, 
  Flame, 
  Wrench, 
  Users, 
  History, 
  Search,
  Sparkles,
  Award
} from 'lucide-react';
import { useVipRoom } from '../hooks/useVipRoom';
import { VipStationCard } from './vip/VipStationCard';
import { StartSessionModal } from './vip/StartSessionModal';
import { EditStationModal } from './vip/EditStationModal';
import { VipStation, VipConsoleType, VipStationStatus } from '../types';

export function VipRoomManager() {
  const {
    stations,
    recentHistory,
    loading,
    addStation,
    updateStation,
    deleteStation,
    startSession,
    addTimeToSession,
    endSession
  } = useVipRoom();

  const [activeFilter, setActiveFilter] = useState<'all' | 'occupied' | 'available' | 'maintenance'>('all');
  const [sessionTargetStation, setSessionTargetStation] = useState<VipStation | null>(null);
  const [editingStation, setEditingStation] = useState<VipStation | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deletingStation, setDeletingStation] = useState<{ id: string; name: string } | null>(null);

  // Métricas
  const totalStations = stations.length;
  const occupiedStations = stations.filter(s => s.status === 'occupied' && s.currentSession).length;
  const availableStations = stations.filter(s => s.status === 'available').length;
  const maintenanceStations = stations.filter(s => s.status === 'maintenance').length;

  const todaySessionsCount = recentHistory.filter(h => {
    if (!h.endedAt) return false;
    const end = new Date(h.endedAt);
    const today = new Date();
    return end.toDateString() === today.toDateString();
  }).length;

  const filteredStations = stations.filter(s => {
    if (activeFilter === 'occupied') return s.status === 'occupied' && s.currentSession;
    if (activeFilter === 'available') return s.status === 'available';
    if (activeFilter === 'maintenance') return s.status === 'maintenance';
    return true;
  });

  const handleToggleMaintenance = (stationId: string, currentStatus: string) => {
    const newStatus: VipStationStatus = currentStatus === 'maintenance' ? 'available' : 'maintenance';
    updateStation(stationId, { 
      status: newStatus,
      currentSession: null 
    });
  };

  const handleDeleteConfirm = () => {
    if (deletingStation) {
      deleteStation(deletingStation.id, deletingStation.name);
      setDeletingStation(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Cabeçalho da Seção */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold/15 border border-gold/30 flex items-center justify-center text-gold shadow-lg shadow-gold/10">
              <Gamepad2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-display font-bold tracking-wide text-white flex items-center gap-2">
                Sala VIP & Game Room
              </h1>
              <p className="text-sm text-white/50">
                Gerencie os consoles, fliperamas e o tempo de jogo dos clientes em tempo real.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="btn-primary flex items-center gap-2 py-2.5 px-4 text-xs font-bold rounded-xl shadow-lg shadow-gold/20"
          >
            <Plus className="w-4 h-4" /> Nova Estação / Console
          </button>
        </div>
      </div>

      {/* Cards de Métricas / Visão Geral */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-carbon-light border border-white/10 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-white/70">
            <Tv className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-white/50 uppercase tracking-wider">Total de Máquinas</p>
            <p className="text-2xl font-display font-bold text-white mt-0.5">{totalStations}</p>
          </div>
        </div>

        <div className="bg-carbon-light border border-gold/30 rounded-2xl p-4 flex items-center gap-4 shadow-lg shadow-gold/5">
          <div className="w-12 h-12 rounded-xl bg-gold/15 flex items-center justify-center text-gold">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-gold uppercase tracking-wider">Em Partida</p>
            <p className="text-2xl font-display font-bold text-gold mt-0.5">{occupiedStations}</p>
          </div>
        </div>

        <div className="bg-carbon-light border border-emerald-500/30 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Livres / Prontas</p>
            <p className="text-2xl font-display font-bold text-emerald-400 mt-0.5">{availableStations}</p>
          </div>
        </div>

        <div className="bg-carbon-light border border-white/10 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-white/60">
            <History className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-white/50 uppercase tracking-wider">Partidas Hoje</p>
            <p className="text-2xl font-display font-bold text-white mt-0.5">{todaySessionsCount}</p>
          </div>
        </div>
      </div>

      {/* Filtros de Visualização */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeFilter === 'all'
                ? 'bg-gold text-carbon shadow-md shadow-gold/20'
                : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            Todas ({totalStations})
          </button>
          <button
            onClick={() => setActiveFilter('occupied')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeFilter === 'occupied'
                ? 'bg-gold text-carbon shadow-md shadow-gold/20'
                : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            Em Jogo ({occupiedStations})
          </button>
          <button
            onClick={() => setActiveFilter('available')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeFilter === 'available'
                ? 'bg-emerald-500 text-carbon shadow-md shadow-emerald-500/20'
                : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            Disponíveis ({availableStations})
          </button>
          {maintenanceStations > 0 && (
            <button
              onClick={() => setActiveFilter('maintenance')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                activeFilter === 'maintenance'
                  ? 'bg-amber-400 text-carbon'
                  : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              Manutenção ({maintenanceStations})
            </button>
          )}
        </div>

        <p className="text-xs text-white/40">
          Atualização instantânea em tempo real com o banco de dados.
        </p>
      </div>

      {/* Grid de Estações */}
      {loading ? (
        <div className="p-12 text-center text-white/40">
          <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm">Carregando estações da Sala VIP...</p>
        </div>
      ) : filteredStations.length === 0 ? (
        <div className="bg-carbon-light border border-white/10 rounded-2xl p-12 text-center">
          <Gamepad2 className="w-12 h-12 text-white/20 mx-auto mb-3" />
          <p className="text-white/60 font-bold text-base">Nenhuma estação encontrada</p>
          <p className="text-white/40 text-xs mt-1">Crie sua primeira estação ou altere o filtro selecionado.</p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="btn-primary text-xs font-bold py-2 px-4 rounded-xl mt-4 inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Criar Estação
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredStations.map(station => (
            <VipStationCard
              key={station.id}
              station={station}
              onStartSession={(st) => setSessionTargetStation(st)}
              onAddMinutes={(stId, mins) => addTimeToSession(stId, mins)}
              onEndSession={(stId) => endSession(stId)}
              onEditStation={(st) => setEditingStation(st)}
              onDeleteStation={(stId, name) => setDeletingStation({ id: stId, name })}
              onToggleMaintenance={(stId, curStatus) => handleToggleMaintenance(stId, curStatus)}
            />
          ))}
        </div>
      )}

      {/* Seção de Histórico Recente de Partidas */}
      <div className="bg-carbon-light border border-white/10 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <History className="w-5 h-5 text-gold" />
            <h3 className="font-bold text-white text-base">Histórico Recente de Partidas na Sala VIP</h3>
          </div>
          <span className="text-xs text-white/40">{recentHistory.length} registros</span>
        </div>

        {recentHistory.length === 0 ? (
          <div className="py-8 text-center text-white/40 text-xs">
            Nenhuma partida finalizada registrada recentemente.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/5 text-white/40 font-bold uppercase tracking-wider">
                  <th className="py-3 px-3">Jogador</th>
                  <th className="py-3 px-3">Estação / Console</th>
                  <th className="py-3 px-3">Tempo de Jogo</th>
                  <th className="py-3 px-3">Tipo de Acesso</th>
                  <th className="py-3 px-3">Horário de Encerramento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {recentHistory.map(session => (
                  <tr key={session.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-3 font-semibold text-white">
                      <div className="flex items-center gap-2">
                        {session.clientAvatar ? (
                          <img src={session.clientAvatar} alt="" className="w-6 h-6 rounded-full object-cover border border-white/10" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold text-white/60">
                            {session.clientName ? session.clientName.charAt(0).toUpperCase() : 'C'}
                          </div>
                        )}
                        <span>{session.clientName}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-white/70">
                      <span className="font-medium text-white">{session.stationName}</span>
                      <span className="text-white/40 ml-1.5 font-normal">({session.consoleModel})</span>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-gold">
                      {session.durationMinutes} min
                    </td>
                    <td className="py-3 px-3">
                      {session.bonusTypeUsed === 'vip_hours' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          <Award className="w-3 h-3" /> Bônus VIP
                        </span>
                      )}
                      {session.bonusTypeUsed === 'unlimited_vip' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-gold bg-gold/10 px-2 py-0.5 rounded border border-gold/20">
                          <Sparkles className="w-3 h-3" /> VIP Ilimitado
                        </span>
                      )}
                      {session.bonusTypeUsed === 'courtesy' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                          Cortesia
                        </span>
                      )}
                      {(!session.bonusTypeUsed || session.bonusTypeUsed === 'manual') && (
                        <span className="text-[11px] text-white/50">Avulso</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-white/40">
                      {session.endedAt ? new Date(session.endedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Iniciar Partida */}
      <StartSessionModal
        isOpen={!!sessionTargetStation}
        station={sessionTargetStation}
        onClose={() => setSessionTargetStation(null)}
        onConfirm={(stationId, data) => startSession(stationId, data)}
      />

      {/* Modal: Editar Estação Existente */}
      <EditStationModal
        isOpen={!!editingStation}
        station={editingStation}
        onClose={() => setEditingStation(null)}
        onSave={(data) => {
          if (editingStation) {
            updateStation(editingStation.id, data);
          }
        }}
      />

      {/* Modal: Criar Nova Estação */}
      <EditStationModal
        isOpen={isAddModalOpen}
        station={null}
        onClose={() => setIsAddModalOpen(false)}
        onSave={(data) => {
          addStation(data);
        }}
      />

      {/* Diálogo de Confirmação para Excluir Estação */}
      {deletingStation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-carbon border border-white/15 w-full max-w-sm rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="font-bold text-white text-base">Excluir Estação?</h3>
            <p className="text-xs text-white/60">
              Tem certeza que deseja remover a <strong className="text-white">{deletingStation.name}</strong>? Esta ação não pode ser desfeita.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setDeletingStation(null)}
                className="px-4 py-2 text-xs font-bold text-white/60 hover:text-white"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 text-xs font-bold bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 rounded-xl"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
