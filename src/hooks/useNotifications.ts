
import { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { collection, query, onSnapshot, updateDoc, doc, orderBy, limit, arrayUnion, where, writeBatch, getDocs } from 'firebase/firestore';
import { AppNotification, City } from '../types';
import { toast } from 'sonner';
import { showSystemNotification, playNotificationSound } from '../lib/notifications';

export function useNotifications(currentCity: City | 'Geral') {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const isFirstLoad = useRef(true);
  const notifiedIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Show notifications relevant to the current city or all for Admin
    const q = query(
      collection(db, 'notifications'),
      orderBy('timestamp', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs: AppNotification[] = [];
      let unread = 0;
      let newlyNotified = false;

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

          // Trigger system notification if it's new and we haven't notified for it in this session
          // We only do this after the first load to avoid notifying for existing old notifications
          if (!isFirstLoad.current && !notifiedIds.current.has(doc.id) && !data.readBy.includes(currentCity)) {
            if (currentCity === 'Geral' || data.toCity === currentCity || data.fromCity === currentCity) {
              const title = data.type === 'order_created' 
                ? 'Novo Pedido Recebido' 
                : data.type === 'note_added'
                  ? 'Complemento de Pedido'
                  : 'Atualização de Pedido';
              showSystemNotification(title, data.message);
              playNotificationSound();
              newlyNotified = true;
            }
          }
          notifiedIds.current.add(doc.id);
        }
      });

      if (isFirstLoad.current) {
        isFirstLoad.current = false;
      }

      setNotifications(notifs);
      setUnreadCount(unread);
    }, (error) => {
      console.warn("Aviso ao buscar notificações em tempo real (contingência):", error);
    });

    return () => unsubscribe();
  }, [currentCity]);

  const markAsRead = async (notificationId: string) => {
    setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, readBy: [...n.readBy.filter(c => c !== currentCity), currentCity] } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
    try {
      const notifRef = doc(db, 'notifications', notificationId);
      await updateDoc(notifRef, {
        readBy: arrayUnion(currentCity)
      });
    } catch (error) {
      console.warn("Aviso ao marcar notificação como lida remotamente:", error);
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
    setNotifications([]);
    setUnreadCount(0);
    try {
      const batch = writeBatch(db);
      notifications.forEach((n) => {
        const ref = doc(db, 'notifications', n.id);
        batch.delete(ref);
      });
      await batch.commit();
      toast.success("Histórico de notificações limpo.");
    } catch (error) {
      console.warn("Aviso ao limpar notificações no servidor:", error);
      toast.success("Histórico de notificações limpo localmente.");
    }
  };

  return { notifications, unreadCount, markAsRead, markAllAsRead, clearNotifications };
}
