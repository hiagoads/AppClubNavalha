import { useState, useEffect, useCallback, useRef } from 'react';
import { reconcileAllClientsPointsAndTiers, ReconcileResult } from '../utils/pointsReconciler';
import { useGamificationSettings } from './useGamificationSettings';
import toast from 'react-hot-toast';

export function useGamificationAutoSync(options?: { enabled?: boolean; intervalMs?: number; silent?: boolean }) {
  const { enabled = true, intervalMs = 60000 } = options || {};
  const { thresholds, lastWeekClosedAt, rankBonuses } = useGamificationSettings();

  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [lastResult, setLastResult] = useState<ReconcileResult | null>(null);

  const isSyncingRef = useRef(false);

  const runSync = useCallback(async (isManual = false) => {
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;
    setIsSyncing(true);

    try {
      const res = await reconcileAllClientsPointsAndTiers({
        thresholds,
        lastWeekClosedAt,
        rankBonuses
      });
      setLastSyncedAt(new Date());
      setLastResult(res);

      if (isManual) {
        if (res.updatedCount > 0) {
          toast.success(
            `Sincronização concluída! ${res.checkedCount} clientes verificados. ${res.updatedCount} cliente(s) tiveram ranking/patente corrigidos!`,
            { duration: 5000, icon: '⚡' }
          );
        } else {
          toast.success(
            `Tudo certo! ${res.checkedCount} clientes verificados. Todas as pontuações da semana e patentes já estão 100% atualizadas!`,
            { duration: 4000, icon: '✅' }
          );
        }
      }
      return res;
    } catch (err) {
      console.error('Erro na sincronização de gamificação:', err);
      if (isManual) {
        toast.error('Erro ao sincronizar pontuações.');
      }
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
  }, [thresholds, lastWeekClosedAt, rankBonuses]);

  useEffect(() => {
    if (!enabled) return;

    // Executa verificação inicial após 2 segundos
    const initialTimer = setTimeout(() => {
      runSync(false);
    }, 2000);

    // Verificação periódica a cada minuto (60.000 ms)
    const intervalTimer = setInterval(() => {
      runSync(false);
    }, intervalMs);

    // Quando o usuário volta para a aba
    const handleFocus = () => {
      runSync(false);
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(intervalTimer);
      window.removeEventListener('focus', handleFocus);
    };
  }, [enabled, intervalMs, runSync]);

  return {
    isSyncing,
    lastSyncedAt,
    lastResult,
    triggerManualSync: () => runSync(true)
  };
}
