
import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, onSnapshot, updateDoc, doc, orderBy, limit, arrayUnion, where, writeBatch, getDocs } from 'firebase/firestore';
import { AppNotification, City } from '../types';
import { toast } from 'sonner';

export function useNotifications(currentCity: City | 'Geral') {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Show notifications relevant to the current city or all for Admin
    const q = query(
      collection(db, 'notifications'),
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs: AppNotification[] = [];
      let unread = 0;

      snapshot.forEach((doc) => {
        const data = doc.data() as AppNotification;
        const isRelevant = currentCity === 'Geral' || 
                          (data.toCity === currentCity && data.createdBy !== currentCity) ||
                          (data.fromCity === currentCity && data.createdBy !== currentCity);
        
        if (isRelevant) {
          notifs.push({ ...data, id: doc.id });
          if (!data.readBy.includes(currentCity)) {
            unread++;
          }
        }
      });

      setNotifications(notifs);
      setUnreadCount(unread);
    }, (error) => {
      console.error("Error fetching notifications:", error);
    });

    return () => unsubscribe();
  }, [currentCity]);

  const markAsRead = async (notificationId: string) => {
    try {
      const notifRef = doc(db, 'notifications', notificationId);
      await updateDoc(notifRef, {
        readBy: arrayUnion(currentCity)
      });
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    // For simplicity, we'll just mark the ones currently in state
    const unreadNotifs = notifications.filter(n => !n.readBy.includes(currentCity));
    for (const n of unreadNotifs) {
      await markAsRead(n.id);
    }
  };

  const clearNotifications = async () => {
    try {
      const batch = writeBatch(db);
      // We only clear the ones currently visible in the panel for safety, 
      // or we could query all relevant ones. Let's clear the ones in state.
      notifications.forEach((n) => {
        const ref = doc(db, 'notifications', n.id);
        batch.delete(ref);
      });
      await batch.commit();
      toast.success("Histórico de notificações limpo.");
    } catch (error) {
      console.error("Error clearing notifications:", error);
      toast.error("Erro ao limpar notificações.");
    }
  };

  return { notifications, unreadCount, markAsRead, markAllAsRead, clearNotifications };
}
