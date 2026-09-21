import React, { useState, useEffect } from 'react';
import { 
  Gamepad2, 
  Tv, 
  Clock, 
  Play, 
  Square, 
  Plus, 
  MoreVertical, 
  Wrench, 
  CheckCircle2, 
  AlertCircle, 
  User, 
  Trash2, 
  Edit3,
  Flame,
  Award,
  Sparkles
} from 'lucide-react';
import { VipStation, VipConsoleType } from '../../types';

interface VipStationCardProps {
  key?: React.Key;
  station: VipStation;
  onStartSession: (station: VipStation) => void;
  onAddMinutes: (stationId: string, minutes: number) => void;
  onEndSession: (stationId: string) => void;
  onEditStation: (station: VipStation) => void;
  onDeleteStation: (stationId: string, name: string) => void;
  onToggleMaintenance: (stationId: string, currentStatus: string) => void;
}

export function VipStationCard({
  station,
  onStartSession,
  onAddMinutes,
  onEndSession,
  onEditStation,
  onDeleteStation,
  onToggleMaintenance
}: VipStationCardProps) {
  const [timeLeft, setTimeLeft] = useState<{
    minutes: number;
    seconds: number;
    isOverdue: boolean;
    overdueMinutes: number;
    percentage: number;
  }>({ minutes: 0, seconds: 0, isOverdue: false, overdueMinutes: 0, percentage: 0 });

  const [showMenu, setShowMenu] = useState(false);

  // Timer em tempo real
  useEffect(() => {
    if (station.status !== 'occupied' || !station.currentSession) {
      return;
    }

    const calculateTime = () => {
      const session = station.currentSession!;
      const now = Date.now();
      const end = new Date(session.endTime).getTime();
      const start = new Date(session.startTime).getTime();
      const totalMs = Math.max(end - start, 1000);
      const remainingMs = end - now;

      if (remainingMs <= 0) {
        const overdue = Math.abs(remainingMs);
        const ovMin = Math.floor(overdue / (60 * 1000));
        const ovSec = Math.floor((overdue % (60 * 1000)) / 1000);
        setTimeLeft({
          minutes: ovMin,
          seconds: ovSec,
          isOverdue: true,
          overdueMinutes: ovMin,
          percentage: 100
        });
      } else {
        const min = Math.floor(remainingMs / (60 * 1000));
        const sec = Math.floor((remainingMs % (60 * 1000)) / 1000);
        const elapsed = now - start;
        const pct = Math.min(100, Math.max(0, (elapsed / totalMs) * 100));
        setTimeLeft({
          minutes: min,
          seconds: sec,
          isOverdue: false,
          overdueMinutes: 0,
          percentage: pct
        });
      }
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [station.status, station.currentSession]);

  const getConsoleIcon = (type: VipConsoleType) => {
    switch (type) {
      case 'arcade':
        return <Flame className="w-5 h-5 text-amber-400" />;
      case 'ps2':
      case 'ps3':
      case 'ps4':
      case 'ps5':
        return <Gamepad2 className="w-5 h-5 text-blue-400" />;
      case 'xbox':
        return <Gamepad2 className="w-5 h-5 text-emerald-400" />;
      case 'retro':
        return <Tv className="w-5 h-5 text-purple-400" />;
      default:
        return <Gamepad2 className="w-5 h-5 text-gold" />;
    }
  };

  const isOccupied = station.status === 'occupied' && station.currentSession;
  const isMaintenance = station.status === 'maintenance';

  return (
    <div className={`relative rounded-2xl border transition-all duration-300 flex flex-col justify-between overflow-hidden group ${
      isOccupied 
        ? timeLeft.isOverdue 
          ? 'bg-red-950/20 border-red-500/50 shadow-lg shadow-red-950/40' 
          : 'bg-carbon-light border-gold/40 shadow-lg shadow-gold/5'
        : isMaintenance
          ? 'bg-black/30 border-white/5 opacity-70'
          : 'bg-carbon-light/80 border-white/10 hover:border-white/20'
    }`}>
      {/* Barra de Progresso Superior quando Ocupado */}
      {isOccupied && (
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-white/5">
          <div 
            className={`h-full transition-all duration-1000 ${
              timeLeft.isOverdue ? 'bg-red-500 animate-pulse' : 'bg-gradient-to-r from-gold/60 to-gold'
            }`}
            style={{ width: `${timeLeft.isOverdue ? 100 : timeLeft.percentage}%` }}
          />
        </div>
      )}

      {/* Header do Card */}
      <div className="p-5 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center border transition-transform group-hover:scale-105 ${
              isOccupied 
                ? 'bg-gold/10 border-gold/30' 
                : isMaintenance
                  ? 'bg-white/5 border-white/10'
                  : 'bg-white/5 border-white/10'
            }`}>
              {getConsoleIcon(station.consoleType)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-base tracking-wide leading-tight">
                  {station.name}
                </h3>
                {isOccupied && (
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-gold"></span>
                  </span>
                )}
              </div>
              <p className="text-xs text-white/50 font-medium mt-0.5">
                {station.consoleModel}
              </p>
            </div>
          </div>

          {/* Menu de Ações da Máquina */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              title="Opções do Console"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showMenu && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowMenu(false)} 
                />
                <div className="absolute right-0 top-8 z-50 w-48 bg-carbon border border-white/15 rounded-xl shadow-2xl py-1.5 animate-in fade-in zoom-in-95 duration-150">
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onEditStation(station);
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs text-white/80 hover:text-white hover:bg-white/10 flex items-center gap-2"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-gold" /> Editar Detalhes
                  </button>
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onToggleMaintenance(station.id, station.status);
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs text-white/80 hover:text-white hover:bg-white/10 flex items-center gap-2"
                  >
                    <Wrench className="w-3.5 h-3.5 text-amber-400" />
                    {isMaintenance ? 'Ativar Console' : 'Modo Manutenção'}
                  </button>
                  <div className="my-1 border-t border-white/10" />
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onDeleteStation(station.id, station.name);
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs text-red-400 hover:bg-red-500/10 flex items-center gap-2"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Excluir Máquina
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Status Badge */}
        <div className="mt-3 flex items-center gap-2">
          {isOccupied ? (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${
              timeLeft.isOverdue 
                ? 'bg-red-500/20 text-red-300 border-red-500/40 animate-pulse'
                : 'bg-gold/15 text-gold border-gold/30'
            }`}>
              <Clock className="w-3.5 h-3.5" />
              {timeLeft.isOverdue ? 'TEMPO ESGOTADO' : 'EM PARTIDA'}
            </span>
          ) : isMaintenance ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white/5 text-white/40 border border-white/10">
              <Wrench className="w-3.5 h-3.5" /> Em Manutenção
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 className="w-3.5 h-3.5" /> Disponível
            </span>
          )}

          {station.notes && (
            <span className="text-[11px] text-white/40 truncate max-w-[150px]" title={station.notes}>
              {station.notes}
            </span>
          )}
        </div>
      </div>

      {/* Corpo Central: Dados do Jogador ou Call to Action */}
      <div className="px-5 py-3 border-t border-b border-white/5 flex-1 flex flex-col justify-center">
        {isOccupied ? (
          <div className="space-y-3">
            {/* Informações do Jogador */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                {station.currentSession?.clientAvatar ? (
                  <img 
                    src={station.currentSession.clientAvatar} 
                    alt={station.currentSession.clientName} 
                    className="w-8 h-8 rounded-full object-cover border border-gold/40 shrink-0" 
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/70 text-xs font-bold shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white truncate">
                    {station.currentSession?.clientName}
                  </p>
                  <p className="text-[10px] text-white/50 flex items-center gap-1">
                    {station.currentSession?.bonusTypeUsed === 'vip_hours' && (
                      <span className="text-gold font-semibold">Bônus VIP</span>
                    )}
                    {station.currentSession?.bonusTypeUsed === 'unlimited_vip' && (
                      <span className="text-gold font-semibold">VIP Ilimitado</span>
                    )}
                    {station.currentSession?.bonusTypeUsed === 'courtesy' && (
                      <span className="text-emerald-400 font-semibold">Cortesia</span>
                    )}
                    {station.currentSession?.bonusTypeUsed === 'manual' && (
                      <span className="text-white/60">Avulso</span>
                    )}
                    <span>• {station.currentSession?.totalMinutes} min</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Cronômetro Regressivo em Tempo Real */}
            <div className={`p-3 rounded-xl border flex items-center justify-between ${
              timeLeft.isOverdue 
                ? 'bg-red-500/15 border-red-500/30 text-red-200'
                : 'bg-black/40 border-white/10 text-white'
            }`}>
              <div className="flex items-center gap-2">
                <Clock className={`w-4 h-4 ${timeLeft.isOverdue ? 'text-red-400 animate-spin' : 'text-gold'}`} />
                <span className="text-xs font-medium text-white/60">
                  {timeLeft.isOverdue ? 'Excedente:' : 'Restante:'}
                </span>
              </div>
              <div className="font-mono font-black text-lg tracking-wider">
                {timeLeft.isOverdue ? (
                  <span className="text-red-400">
                    +{String(timeLeft.overdueMinutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}
                  </span>
                ) : (
                  <span className="text-gold">
                    {String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}
                  </span>
                )}
              </div>
            </div>
          </div>
        ) : isMaintenance ? (
          <div className="py-4 text-center">
            <p className="text-xs text-white/40">Este console está temporariamente indisponível para manutenção ou reparo de controles.</p>
          </div>
        ) : (
          <div className="py-4 text-center">
            <p className="text-xs text-white/40">Máquina livre. Nenhum jogador conectado no momento.</p>
          </div>
        )}
      </div>

      {/* Rodapé / Controles */}
      <div className="p-4 bg-black/20">
        {isOccupied ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onAddMinutes(station.id, 15)}
              className="flex-1 bg-white/5 hover:bg-white/10 text-white text-xs font-bold py-2 rounded-xl border border-white/10 transition-colors flex items-center justify-center gap-1"
              title="Adicionar 15 minutos"
            >
              <Plus className="w-3.5 h-3.5 text-gold" /> 15m
            </button>
            <button
              type="button"
              onClick={() => onAddMinutes(station.id, 30)}
              className="flex-1 bg-white/5 hover:bg-white/10 text-white text-xs font-bold py-2 rounded-xl border border-white/10 transition-colors flex items-center justify-center gap-1"
              title="Adicionar 30 minutos"
            >
              <Plus className="w-3.5 h-3.5 text-gold" /> 30m
            </button>
            <button
              type="button"
              onClick={() => onEndSession(station.id)}
              className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-bold py-2 rounded-xl border border-red-500/30 transition-colors flex items-center justify-center gap-1"
              title="Liberar máquina"
            >
              <Square className="w-3.5 h-3.5" /> Liberar
            </button>
          </div>
        ) : isMaintenance ? (
          <button
            type="button"
            onClick={() => onToggleMaintenance(station.id, station.status)}
            className="w-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Reativar Máquina
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onStartSession(station)}
            className="w-full btn-primary text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-gold/10"
          >
            <Play className="w-4 h-4 fill-current" /> Iniciar Partida
          </button>
        )}
      </div>
    </div>
  );
}
