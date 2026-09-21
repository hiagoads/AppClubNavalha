import React, { useState, useEffect } from 'react';
import { 
  Gamepad2, 
  Clock, 
  Flame, 
  Sparkles, 
  Award, 
  Zap, 
  User, 
  Plus, 
  X, 
  ChevronRight, 
  Tv, 
  AlertCircle,
  ArrowRight
} from 'lucide-react';
import { useVipRoom } from '../../hooks/useVipRoom';
import { VipStation, VipConsoleType } from '../../types';

interface VipQueueQuickBarProps {
  onGoToVipRoom: () => void;
}

interface ActiveStationQuickCardProps {
  key?: React.Key;
  station: VipStation;
  onAddMinutes: (stationId: string, minutes: number) => void;
  onEndSession: (stationId: string) => void;
}

// Sub-componente para cada estação ativa com cronômetro em tempo real
function ActiveStationQuickCard({
  station,
  onAddMinutes,
  onEndSession
}: ActiveStationQuickCardProps) {
  const [timeLeft, setTimeLeft] = useState<{
    minutes: number;
    seconds: number;
    isOverdue: boolean;
    percentage: number;
  }>({ minutes: 0, seconds: 0, isOverdue: false, percentage: 0 });

  const [confirmEnd, setConfirmEnd] = useState(false);

  useEffect(() => {
    if (!station.currentSession) return;

    const updateTimer = () => {
      const session = station.currentSession!;
      const now = Date.now();
      const start = new Date(session.startTime).getTime();
      const end = new Date(session.endTime).getTime();
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
          percentage: pct
        });
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [station.currentSession]);

  const session = station.currentSession;
  if (!session) return null;

  const getConsoleIcon = (type: VipConsoleType) => {
    switch (type) {
      case 'arcade':
        return <Flame className="w-4 h-4 text-amber-400" />;
      case 'ps2':
      case 'ps3':
      case 'ps4':
      case 'ps5':
        return <Gamepad2 className="w-4 h-4 text-blue-400" />;
      case 'xbox':
        return <Gamepad2 className="w-4 h-4 text-emerald-400" />;
      case 'retro':
        return <Tv className="w-4 h-4 text-purple-400" />;
      default:
        return <Gamepad2 className="w-4 h-4 text-gold" />;
    }
  };

  return (
    <div className={`relative overflow-hidden rounded-xl border transition-all flex flex-col justify-between ${
      timeLeft.isOverdue
        ? 'bg-red-950/40 border-red-500/50 shadow-md shadow-red-950/40'
        : 'bg-carbon-light/90 border-gold/30 hover:border-gold/50 shadow-md shadow-black/40'
    }`}>
      {/* Barra de progresso no topo */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-white/10">
        <div
          className={`h-full transition-all duration-1000 ${
            timeLeft.isOverdue ? 'bg-red-500 animate-pulse' : 'bg-gold'
          }`}
          style={{ width: `${timeLeft.percentage}%` }}
        />
      </div>

      <div className="p-3.5 space-y-3">
        {/* Topo do Card: Estação e Status */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
              {getConsoleIcon(station.consoleType)}
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                {station.name}
              </h4>
              <p className="text-[10px] text-white/50 truncate">{station.consoleModel}</p>
            </div>
          </div>

          {/* Badge do Tipo de Acesso */}
          <div className="shrink-0">
            {session.bonusTypeUsed === 'unlimited_vip' && (
              <span className="bg-gold/20 text-gold border border-gold/40 text-[9px] font-extrabold px-1.5 py-0.5 rounded flex items-center gap-1 uppercase">
                <Sparkles className="w-2.5 h-2.5" /> Ilimitado
              </span>
            )}
            {session.bonusTypeUsed === 'vip_hours' && (
              <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[9px] font-extrabold px-1.5 py-0.5 rounded flex items-center gap-1 uppercase">
                <Award className="w-2.5 h-2.5" /> Bônus VIP
              </span>
            )}
            {session.bonusTypeUsed === 'courtesy' && (
              <span className="bg-blue-500/20 text-blue-300 border border-blue-500/40 text-[9px] font-extrabold px-1.5 py-0.5 rounded flex items-center gap-1 uppercase">
                <Zap className="w-2.5 h-2.5" /> Cortesia
              </span>
            )}
            {(!session.bonusTypeUsed || session.bonusTypeUsed === 'manual') && (
              <span className="bg-white/10 text-white/70 border border-white/10 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">
                Avulso
              </span>
            )}
          </div>
        </div>

        {/* Jogador & Tempo */}
        <div className="bg-white/[0.03] border border-white/5 rounded-lg p-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {session.clientAvatar ? (
              <img
                src={session.clientAvatar}
                alt=""
                className="w-7 h-7 rounded-full object-cover border border-white/20 shrink-0"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white/60 text-xs font-bold shrink-0">
                <User className="w-3.5 h-3.5" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">{session.clientName}</p>
              <p className="text-[10px] text-white/40 truncate">
                {session.totalMinutes} min total
              </p>
            </div>
          </div>

          {/* Cronômetro */}
          <div className="text-right shrink-0">
            <span className="text-[9px] font-bold uppercase tracking-wider text-white/40 block">
              {timeLeft.isOverdue ? 'Esgotado' : 'Restante'}
            </span>
            <span className={`font-mono font-bold text-sm tracking-wider ${
              timeLeft.isOverdue ? 'text-red-400 animate-pulse' : 'text-gold'
            }`}>
              {timeLeft.isOverdue ? '+' : ''}
              {String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}
            </span>
          </div>
        </div>

        {/* Ações Rápidas */}
        <div className="flex items-center justify-between gap-1.5 pt-1">
          <div className="flex items-center gap-1">
            <button
              onClick={() => onAddMinutes(station.id, 15)}
              title="Adicionar 15 minutos"
              className="bg-white/5 hover:bg-gold/20 hover:text-gold hover:border-gold/40 text-white/70 border border-white/10 rounded-md px-2 py-1 text-[10px] font-bold transition-all"
            >
              +15m
            </button>
            <button
              onClick={() => onAddMinutes(station.id, 30)}
              title="Adicionar 30 minutos"
              className="bg-white/5 hover:bg-gold/20 hover:text-gold hover:border-gold/40 text-white/70 border border-white/10 rounded-md px-2 py-1 text-[10px] font-bold transition-all"
            >
              +30m
            </button>
          </div>

          {confirmEnd ? (
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  onEndSession(station.id);
                  setConfirmEnd(false);
                }}
                className="bg-red-500 hover:bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded-md transition-colors shadow-sm"
              >
                Confirmar
              </button>
              <button
                onClick={() => setConfirmEnd(false)}
                className="text-white/40 hover:text-white p-1 text-[10px]"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmEnd(true)}
              className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 hover:border-red-500/40 rounded-md px-2 py-1 text-[10px] font-bold transition-all"
            >
              Liberar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function VipQueueQuickBar({ onGoToVipRoom }: VipQueueQuickBarProps) {
  const { stations, loading, addTimeToSession, endSession } = useVipRoom();

  const occupiedStations = stations.filter(
    s => s.status === 'occupied' && s.currentSession
  );
  const availableCount = stations.filter(s => s.status === 'available').length;

  if (loading) return null;

  // Se ninguém estiver jogando: exibir barra informativa discreta e elegante
  if (occupiedStations.length === 0) {
    return (
      <div className="mb-6 p-3 rounded-xl bg-carbon-light/60 border border-white/10 hover:border-gold/30 transition-all flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center text-gold">
            <Gamepad2 className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-white">Sala VIP & Consoles:</span>{' '}
            <span className="text-white/60">
              Nenhuma partida em andamento ({availableCount} máquina{availableCount !== 1 ? 's' : ''} livre{availableCount !== 1 ? 's' : ''})
            </span>
          </div>
        </div>

        <button
          onClick={onGoToVipRoom}
          className="text-gold hover:text-gold-light font-bold flex items-center gap-1 text-xs hover:underline shrink-0"
        >
          <span>Abrir Sala VIP</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  // Se houver alguém jogando: exibir painel em destaque com os jogadores em tempo real
  return (
    <div className="mb-6 rounded-2xl border border-gold/40 bg-gradient-to-r from-carbon-light via-carbon to-carbon-light p-4 shadow-xl shadow-black/50 space-y-3.5 animate-in fade-in duration-300">
      {/* Topo do Painel de Visualização Rápida */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gold/20 border border-gold/40 flex items-center justify-center text-gold shadow-lg shadow-gold/20 shrink-0">
            <Gamepad2 className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display font-bold text-sm text-white tracking-wide flex items-center gap-1.5">
                Sala VIP • Partidas Ativas
              </h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-gold text-carbon shadow-sm animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-carbon" />
                {occupiedStations.length} em jogo
              </span>
            </div>
            <p className="text-[11px] text-white/50">
              Acompanhe o tempo de jogo e adicione minutos sem sair da gestão da fila.
            </p>
          </div>
        </div>

        <button
          onClick={onGoToVipRoom}
          className="inline-flex items-center gap-1.5 bg-gold/15 hover:bg-gold/25 text-gold border border-gold/40 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 self-start sm:self-center"
        >
          <span>Gerenciar Sala VIP Completa</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Grid com as Estações em Jogo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {occupiedStations.map(st => (
          <ActiveStationQuickCard
            key={st.id}
            station={st}
            onAddMinutes={(stId, mins) => addTimeToSession(stId, mins)}
            onEndSession={(stId) => endSession(stId)}
          />
        ))}
      </div>
    </div>
  );
}
