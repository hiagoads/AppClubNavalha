import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { ClientProfile } from '../types';
import { checkAndSyncClientRankBonuses } from '../utils/bonusSystem';

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
          // Force create the profile if we are logged in and it's missing!
          // Add a small delay to allow ClientAuth to create it first.
          setTimeout(async () => {
            try {
              if (!auth.currentUser) return;
              const checkDoc = await getDoc(doc(db, 'clients', u.uid));
              if (!checkDoc.exists()) {
                await setDoc(doc(db, 'clients', u.uid), {
                  username: u.displayName || u.email?.split('@')[0] || 'Cliente',
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
              }
            } catch(e: any) {
               if (e.code !== 'permission-denied') console.error("Could not auto-create profile", e);
               setClientProfile(null);
            }
          }, 3000);
        }
      }, (error) => {
        if (error.code !== 'permission-denied') console.error("Error fetching client profile:", error);
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
