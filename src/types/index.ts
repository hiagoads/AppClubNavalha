export enum BookingStatus {
  WAITING = 'waiting',
  CHECKING_IN = 'checking-in', // Notified/Arrived
  IN_SERVICE = 'in-service',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  MISSED = 'missed',
  CANCELLED = 'cancelled'
}

export enum BookingType {
  WALK_IN = 'walk-in',
  SCHEDULED = 'scheduled'
}

export interface Barber {
  id: string;
  name: string;
  photoUrl?: string;
  isActive: boolean;
  specialties: string[];
}

export interface BarberBreak {
  id: string;
  startTime: number; // Start time in milliseconds
  duration: number; // in mins
  barberId?: string; // which barber, defaulting to any/all ('any' or specific ID)
  type?: 'now' | 'after_current' | 'scheduled';
  targetBookingId?: string;
  reason?: string;
  createdAt?: string | number;
}

export interface Service {
  id: string;
  name: string;
  duration: number; // in mins
  price: number;
  promoPrice?: number;
  isActive: boolean;
  imageUrl?: string;
  isProduct?: boolean;
}

export interface Booking {
  id: string;
  clientName: string;
  clientWhatsapp: string;
  serviceId: string;
  barberId: string; // 'any' or specific ID
  originalBarberId?: string;
  type: BookingType;
  scheduledTime?: string;
  scheduledDate?: string;
  status: BookingStatus;
  checkInTime?: string;
  createdAt: string;
  serviceStartTime?: string;
  estimatedEndTime?: string;
  delayOffset?: number;
  priority?: number;
  pausedAt?: string;
  totalPausedDuration?: number;
  expectedPrice?: number | null; 
  price?: number | null; // Snapshotted price after completion
  isPaid?: boolean;
  // Notification Flags
  notifiedJoined?: boolean;
  notifiedPos2?: boolean;
  notifiedApproaching?: boolean;
  notifiedTurnArrived?: boolean;
  notifiedLost?: boolean;
  notifiedCompleted?: boolean;
  pushSubscription?: any;
}

export interface ClientStats {
  whatsapp: string;
  name: string;
  totalSpent: number;
  cutsCount: number;
  lastVisit: string;
}

export interface ClientBonus {
  id: string;
  rankKey?: string;
  title: string;
  type: 'unlimited_vip' | 'vip_hours' | 'popsicle' | 'discount_50' | 'points';
  totalHours?: number; // For vip_hours
  usedHours?: number; // For vip_hours
  isRedeemed?: boolean; // For single-use bonuses
  createdAt: string;
}

export interface SeasonPodiumMember {
  position: number;
  username: string;
  avatarUrl?: string;
  points: number;
  reward?: string;
  tierName?: string;
}

export interface PastSeason {
  id: string;
  seasonNumber: number;
  title: string;
  startDate: string;
  endDate: string;
  totalParticipants: number;
  totalSeasonalPoints: number;
  topPodium: SeasonPodiumMember[];
  ranking?: SeasonPodiumMember[];
  createdAt: string;
}

export interface ClientProfile {
  id: string; // The uid from auth
  username: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  email: string;
  whatsapp: string;
  avatarUrl?: string;
  points: number;
  seasonalPoints?: number;
  weeklyPoints?: number;
  level?: number;
  lifetimePoints?: number;
  bonuses?: ClientBonus[];
  createdAt: string;
}

export type VipConsoleType = 'arcade' | 'ps2' | 'ps3' | 'ps4' | 'ps5' | 'xbox' | 'retro' | 'other';
export type VipStationStatus = 'available' | 'occupied' | 'maintenance';

export interface VipActiveSession {
  clientId: string;
  clientName: string;
  clientAvatar?: string;
  clientWhatsapp?: string;
  startTime: string; // ISO string
  endTime: string;   // ISO string
  totalMinutes: number;
  bonusTypeUsed?: 'vip_hours' | 'unlimited_vip' | 'courtesy' | 'manual';
  bonusId?: string;
  startedBy?: string;
}

export interface VipStation {
  id: string;
  name: string;
  consoleModel: string;
  consoleType: VipConsoleType;
  status: VipStationStatus;
  order: number;
  currentSession?: VipActiveSession | null;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface VipSessionHistory {
  id: string;
  stationId: string;
  stationName: string;
  consoleModel: string;
  clientId: string;
  clientName: string;
  clientAvatar?: string;
  clientWhatsapp?: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  bonusTypeUsed?: string;
  endedAt: string;
  endedBy?: string;
}

export interface PointTransaction {
  id: string;
  clientId: string;
  clientName?: string;
  clientAvatar?: string;
  points: number;
  type: 'earned' | 'redeem' | 'manual_add' | 'manual_remove' | 'rank_bonus' | 'correction';
  description: string;
  balanceAfter?: number;
  createdAt: string;
}
