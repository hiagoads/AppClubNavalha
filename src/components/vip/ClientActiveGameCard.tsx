import React, { useState, useEffect } from 'react';
import { Gamepad2, Clock, Sparkles, Flame, Tv } from 'lucide-react';
import { VipStation } from '../../types';

interface ClientActiveGameCardProps {
  station: VipStation;
}

export function ClientActiveGameCard({ station }: ClientActiveGameCardProps) {
  const [timeLeft, setTimeLeft] = useState<{
    minutes: number;
    seconds: number;
    isOverdue: boolean;
    percentage: number;
  }>({ minutes: 0, seconds: 0, isOverdue: false, percentage: 0 });

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

  return (
    <div className={`mb-6 p-4 rounded-2xl border transition-all relative overflow-hidden ${
      timeLeft.isOverdue 
        ? 'bg-red-950/30 border-red-500/40 shadow-lg shadow-red-950/40' 
        : 'bg-carbon-light border-gold/40 shadow-lg shadow-gold/10'
    }`}>
      {/* Top progress bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-white/10">
        <div 
          className={`h-full transition-all duration-1000 ${
            timeLeft.isOverdue ? 'bg-red-500 animate-pulse' : 'bg-gold'
          }`}
          style={{ width: `${timeLeft.percentage}%` }}
        />
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gold/15 border border-gold/30 flex items-center justify-center text-gold shrink-0 animate-bounce">
            <Gamepad2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-gold bg-gold/10 px-2 py-0.5 rounded border border-gold/20">
                🎮 Partida Ativa na Sala VIP
              </span>
            </div>
            <h4 className="text-sm font-bold text-white mt-0.5">
              {station.name} • <span className="text-white/70 font-normal">{station.consoleModel}</span>
            </h4>
          </div>
        </div>

        {/* Timer */}
        <div className="text-right shrink-0">
          <p className="text-[10px] uppercase tracking-wider text-white/50 font-bold">
            {timeLeft.isOverdue ? 'Tempo Esgotado' : 'Tempo Restante'}
          </p>
          <p className={`font-mono font-black text-lg tracking-wider ${
            timeLeft.isOverdue ? 'text-red-400' : 'text-gold'
          }`}>
            {timeLeft.isOverdue ? '+' : ''}
            {String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}
          </p>
        </div>
      </div>
    </div>
  );
}
