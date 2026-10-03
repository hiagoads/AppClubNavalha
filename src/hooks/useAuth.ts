import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { ClientProfile } from '../types';
import { checkAndSyncClientRankBonuses } from '../utils/bonusSystem';
import { sanitizeUsername } from '../utils';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [clientProfile, setClientProfile] = useState<ClientProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | undefined;
    
    const unsubscribeAuth = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      
      if (!u) {
        setIsAdmin(false);
        setClientProfile(null);
        if (unsubscribeProfile) {
          unsubscribeProfile();
          unsubscribeProfile = undefined;
        }
        setLoading(false);
        return;
      }

      // Check if admin
      let adminStatus = false;
      if (u.email === 'slvhiago2@gmail.com') {
        adminStatus = true;
      } else {
        try {
          const adminDoc = await getDoc(doc(db, 'admins', u.uid));
          if (adminDoc.exists()) {
            adminStatus = true;
          }
        } catch (e) {
          // not an admin or no permissions
        }
      }
      setIsAdmin(adminStatus);

      // Listen to client profile in real-time
      if (unsubscribeProfile) unsubscribeProfile();
      
      unsubscribeProfile = onSnapshot(doc(db, 'clients', u.uid), async (clientDoc) => {
        if (clientDoc.exists()) {
          const profileData = { id: clientDoc.id, ...clientDoc.data() } as ClientProfile;
          setClientProfile(profileData);
          checkAndSyncClientRankBonuses(clientDoc.id, profileData).catch(() => {});
        } else {
          // Se o documento ainda está carregando do cache ou se o usuário é administrador, não auto-cria perfil de cliente
          if (adminStatus || (clientDoc as any).metadata?.fromCache) {
            setClientProfile(null);
            return;
          }

          // Se o servidor confirmou que o documento realmente não existe para este usuário cliente
          try {
            if (!auth.currentUser || auth.currentUser.uid !== u.uid) return;
            const baseName = u.displayName || u.email?.split('@')[0] || 'cliente';
            const sanitized = sanitizeUsername(baseName) || 'cliente';
            const validUsername = sanitized.length < 5 ? (sanitized + 'club').slice(0, 15) : sanitized;
            await setDoc(doc(db, 'clients', u.uid), {
              username: validUsername,
              email: u.email || '',
              avatarUrl: '',
              whatsapp: '',
              firstName: '',
              lastName: '',
              dateOfBirth: '',
              points: 0,
              seasonalPoints: 0,
              weeklyPoints: 0,
              createdAt: new Date().toISOString()
            });
            // Snapshot will re-fire automatically when setDoc succeeds
          } catch(e: any) {
            if (e?.code !== 'permission-denied') console.warn("Notice: client profile auto-creation pending:", e?.message || e);
            setClientProfile(null);
          }
        }
      }, (error) => {
        if (error?.code !== 'permission-denied') console.warn("Notice fetching client profile:", error?.message || error);
        setClientProfile(null);
      });

      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  return { user, isAdmin, clientProfile, loading };
}
