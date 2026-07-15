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
  barberId?: string; // which barber, defaulting to any/all
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
