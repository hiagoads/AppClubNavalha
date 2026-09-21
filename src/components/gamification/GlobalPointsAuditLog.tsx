import React, { useState } from 'react';
import { 
  History, 
  Search, 
  Filter, 
  ArrowUpRight, 
  ArrowDownRight, 
  Clock, 
  Award, 
  Sparkles, 
  User, 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  ExternalLink
} from 'lucide-react';
import { PointTransaction } from '../../types';

interface GlobalPointsAuditLogProps {
  transactions: PointTransaction[];
  loading: boolean;
  onOpenClientAudit: (client: any) => void;
  clients: any[];
}

export function GlobalPointsAuditLog({
  transactions,
  loading,
  onOpenClientAudit,
  clients
}: GlobalPointsAuditLogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'earned' | 'redeem' | 'manual' | 'correction'>('all');

  const filtered = transactions.filter(t => {
    // Busca por nome do cliente ou descrição
    const matchesSearch = 
      (t.clientName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.description || '').toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (typeFilter === 'earned') {
      return t.type === 'earned' || (t.points ?? 0) > 0;
    }
    if (typeFilter === 'redeem') {
      return t.type === 'redeem';
    }
    if (typeFilter === 'manual') {
      return t.type === 'manual_add' || t.type === 'manual_remove';
    }
    if (typeFilter === 'correction') {
      return t.type === 'correction';
    }
    return true;
  });

  const totalPointsEarned = transactions
    .filter(t => (t.points ?? 0) > 0)
    .reduce((sum, t) => sum + t.points, 0);

  const totalPointsRedeemed = transactions
    .filter(t => (t.points ?? 0) < 0)
    .reduce((sum, t) => sum + Math.abs(t.points), 0);

  const getTransactionBadge = (type?: string, points?: number) => {
    if ((points ?? 0) < 0) {
      if (type === 'redeem') {
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-300 bg-purple-500/15 border border-purple-500/30 px-2 py-0.5 rounded-md uppercase">
            <Award className="w-3 h-3" /> Resgate Aprovado
          </span>
        );
      }
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-400 bg-red-500/15 border border-red-500/30 px-2 py-0.5 rounded-md uppercase">
          <ArrowDownRight className="w-3 h-3" /> Remoção Manual
        </span>
      );
    }
    if (type === 'correction') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-md uppercase">
          <Sparkles className="w-3 h-3" /> Correção de Saldo
        </span>
      );
    }
    if (type === 'rank_bonus') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-teal-400 bg-teal-500/15 border border-teal-500/30 px-2 py-0.5 rounded-md uppercase">
          <Award className="w-3 h-3" /> Bônus de Patente
        </span>
      );
    }
    if (type === 'manual_add') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-gold bg-gold/15 border border-gold/30 px-2 py-0.5 rounded-md uppercase">
          <Sparkles className="w-3 h-3" /> Bônus Manual
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-md uppercase">
        <ArrowUpRight className="w-3 h-3" /> Corte / Serviço
      </span>
    );
  };

  const handleClientClick = (clientId: string) => {
    const found = clients.find(c => c.id === clientId);
    if (found) {
      onOpenClientAudit(found);
    } else {
      // Cria objeto mock temporário caso não encontre no array
      onOpenClientAudit({ id: clientId, username: 'Cliente' });
    }
  };

  return (
    <div className="space-y-5">
      {/* Resumo Métrico do Log */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 block">
              Total de Transações
            </span>
            <span className="text-xl font-mono font-bold text-white block mt-1">
              {transactions.length.toLocaleString('pt-BR')}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/50">
            <History className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 block">
              Pontos Concedidos (Créditos)
            </span>
            <span className="text-xl font-mono font-bold text-emerald-400 block mt-1">
              +{totalPointsEarned.toLocaleString('pt-BR')} pts
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 block">
              Pontos Utilizados (Débitos)
            </span>
            <span className="text-xl font-mono font-bold text-red-400 block mt-1">
              -{totalPointsRedeemed.toLocaleString('pt-BR')} pts
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
            <TrendingDown className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Controles: Busca e Filtros */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-white/40" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-gold/50 transition-colors"
            placeholder="Buscar por cliente ou descrição..."
          />
        </div>

        {/* Filtros em Pill */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setTypeFilter('all')}
            className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all ${
              typeFilter === 'all'
                ? 'bg-gold text-carbon'
                : 'bg-white/5 text-white/60 hover:text-white'
            }`}
          >
            Todas ({transactions.length})
          </button>
          <button
            onClick={() => setTypeFilter('earned')}
            className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all ${
              typeFilter === 'earned'
                ? 'bg-emerald-500 text-white'
                : 'bg-white/5 text-white/60 hover:text-white'
            }`}
          >
            Ganhos
          </button>
          <button
            onClick={() => setTypeFilter('redeem')}
            className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all ${
              typeFilter === 'redeem'
                ? 'bg-purple-500 text-white'
                : 'bg-white/5 text-white/60 hover:text-white'
            }`}
          >
            Resgates
          </button>
          <button
            onClick={() => setTypeFilter('manual')}
            className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all ${
              typeFilter === 'manual'
                ? 'bg-blue-500 text-white'
                : 'bg-white/5 text-white/60 hover:text-white'
            }`}
          >
            Ajustes Manuais
          </button>
          <button
            onClick={() => setTypeFilter('correction')}
            className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all ${
              typeFilter === 'correction'
                ? 'bg-amber-500 text-white'
                : 'bg-white/5 text-white/60 hover:text-white'
            }`}
          >
            Correções
          </button>
        </div>
      </div>

      {/* Tabela de Transações */}
      <div className="rounded-2xl border border-white/10 overflow-hidden bg-black/40">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-sm text-white/70 min-w-[700px]">
            <thead className="text-xs uppercase bg-white/5 text-white/50 border-b border-white/10">
              <tr>
                <th className="px-4 py-3 font-bold">Data & Hora</th>
                <th className="px-4 py-3 font-bold">Cliente</th>
                <th className="px-4 py-3 font-bold">Tipo</th>
                <th className="px-4 py-3 font-bold">Descrição / Motivo</th>
                <th className="px-4 py-3 text-right font-bold">Pontos</th>
                <th className="px-4 py-3 text-center font-bold">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-white/40 animate-pulse">
                    Carregando extrato de auditoria...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-white/40">
                    Nenhuma movimentação encontrada com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filtered.map(t => {
                  const pts = t.points ?? 0;
                  const isPositive = pts > 0;

                  return (
                    <tr key={t.id} className="hover:bg-white/[0.03] transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-xs font-mono text-white/60 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-white/30" />
                          {t.createdAt ? new Date(t.createdAt).toLocaleString('pt-BR') : '-'}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => handleClientClick(t.clientId)}
                          className="font-bold text-white hover:text-gold transition-colors flex items-center gap-1.5 text-left"
                        >
                          <span>{t.clientName || 'Cliente'}</span>
                          <ExternalLink className="w-3 h-3 text-white/30" />
                        </button>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        {getTransactionBadge(t.type, pts)}
                      </td>

                      <td className="px-4 py-3">
                        <span className="text-xs text-white/80 font-medium">
                          {t.description || 'Movimentação de pontos'}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <span className={`font-mono font-bold text-sm ${
                          isPositive ? 'text-emerald-400' : 'text-red-400'
                        }`}>
                          {isPositive ? `+${pts.toLocaleString('pt-BR')}` : pts.toLocaleString('pt-BR')} pts
                        </span>
                        {typeof t.balanceAfter === 'number' && (
                          <span className="text-[10px] text-white/30 font-mono block">
                            após: {t.balanceAfter.toLocaleString('pt-BR')} pts
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleClientClick(t.clientId)}
                          className="text-[11px] font-bold text-white/60 hover:text-gold bg-white/5 hover:bg-gold/10 border border-white/10 hover:border-gold/30 px-2.5 py-1 rounded-lg transition-all"
                        >
                          Ver Extrato
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
