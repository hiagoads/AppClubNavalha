import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { DEFAULT_THRESHOLDS, getActiveThresholds, setActiveThresholds } from '../utils/tierSystem';
import { DEFAULT_RANK_BONUSES, RankBonusDefinition, getActiveRankBonuses, setActiveRankBonuses } from '../utils/bonusSystem';

export interface RewardItem {
  id: string;
  title: string;
  points: number;
  icon?: string;
}

export function calculateSeasonDates(startDateStr?: string, durationMonths: number = 3) {
  let start: Date;
  if (startDateStr) {
    const parts = startDateStr.split('-');
    if (parts.length === 3) {
      start = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    } else {
      start = new Date(startDateStr);
    }
  } else {
    const now = new Date();
    start = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  if (isNaN(start.getTime())) {
    const now = new Date();
    start = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  const end = new Date(start);
  end.setMonth(end.getMonth() + durationMonths);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffTime = end.getTime() - today.getTime();
  const daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

  const formatDate = (d: Date) => {
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return {
    startDateFormatted: formatDate(start),
    endDateFormatted: formatDate(end),
    startDateRaw: start.toISOString().split('T')[0],
    endDateRaw: end.toISOString().split('T')[0],
    daysRemaining,
    isExpired: diffTime <= 0
  };
}

export const DEFAULT_REWARDS: RewardItem[] = [
  { id: 'game_30', title: '30 Minutos de Videogame', points: 900, icon: 'gamepad' },
  { id: 'eyebrow', title: 'Sobrancelha na Faixa', points: 1500, icon: 'scissors' },
  { id: 'discount_10', title: '10% OFF no Corte', points: 2000, icon: 'gift' },
  { id: 'free_cut', title: 'Corte Grátis', points: 5000, icon: 'award' },
];

export function useGamificationSettings() {
  const [thresholds, setThresholds] = useState<number[]>(() => {
    const active = getActiveThresholds();
    return Array.isArray(active) && active.length >= 8 ? active : DEFAULT_THRESHOLDS;
  });
  const [rewards, setRewards] = useState<RewardItem[]>(DEFAULT_REWARDS);
  const [rankBonuses, setRankBonuses] = useState<RankBonusDefinition[]>(getActiveRankBonuses() || DEFAULT_RANK_BONUSES);
  const [seasonStartDate, setSeasonStartDate] = useState<string>('');
  const [seasonDurationMonths, setSeasonDurationMonths] = useState<number>(3);
  const [currentSeasonNumber, setCurrentSeasonNumber] = useState<number>(1);
  const [currentWeekNumber, setCurrentWeekNumber] = useState<number>(1);
  const [lastWeekPodium, setLastWeekPodium] = useState<any[]>([]);
  const [lastWeekRanking, setLastWeekRanking] = useState<any[]>([]);
  const [lastWeekClosedAt, setLastWeekClosedAt] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'gamification'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.tierThresholds && Array.isArray(data.tierThresholds) && data.tierThresholds.length >= 8) {
          setThresholds(data.tierThresholds);
          setActiveThresholds(data.tierThresholds);
        }
        if (data.rewards && Array.isArray(data.rewards)) {
          setRewards(data.rewards);
        }
        if (data.rankBonuses && Array.isArray(data.rankBonuses)) {
          setRankBonuses(data.rankBonuses);
          setActiveRankBonuses(data.rankBonuses);
        }
        if (data.seasonStartDate) {
          setSeasonStartDate(data.seasonStartDate);
        }
        if (data.seasonDurationMonths) {
          setSeasonDurationMonths(Number(data.seasonDurationMonths));
        }
        if (data.currentSeasonNumber) {
          setCurrentSeasonNumber(Number(data.currentSeasonNumber));
        }
        if (data.currentWeekNumber) {
          setCurrentWeekNumber(Number(data.currentWeekNumber));
        }
        if (data.lastWeekPodium && Array.isArray(data.lastWeekPodium)) {
          setLastWeekPodium(data.lastWeekPodium);
        }
        if (data.lastWeekRanking && Array.isArray(data.lastWeekRanking)) {
          setLastWeekRanking(data.lastWeekRanking);
        }
        if (data.lastWeekClosedAt) {
          setLastWeekClosedAt(data.lastWeekClosedAt);
        }
      }
      setLoading(false);
    }, (err) => {
      if (err.code !== "permission-denied") console.error(err);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const dates = calculateSeasonDates(seasonStartDate, seasonDurationMonths);

  return { 
    thresholds,
    tierThresholds: thresholds,
    rewards, 
    rankBonuses,
    seasonStartDate, 
    seasonDurationMonths, 
    currentSeasonNumber,
    currentWeekNumber,
    lastWeekPodium,
    lastWeekRanking,
    lastWeekClosedAt,
    seasonDates: dates,
    loading 
  };
}
