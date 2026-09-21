
import { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { collection, query, onSnapshot, addDoc, updateDoc, doc, deleteDoc, getDocs, writeBatch, orderBy, where, limit } from 'firebase/firestore';
import { Order, OrderStatus, Priority, City, OrderHistory } from '../types';
import { toast } from 'sonner';

import { playNotificationSound } from '../lib/notifications';

const CACHE_KEY = 'app_orders_cache_v2';

function loadCachedOrders(): Order[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn("Failed to load cached orders:", e);
  }
  return [];
}

function saveCachedOrders(orders: Order[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(orders));
  } catch (e) {
    console.warn("Failed to save cached orders:", e);
  }
}

export function useOrders() {
  const [orders, setOrders] = useState<Order[]>(() => loadCachedOrders());
  const [loading, setLoading] = useState(() => loadCachedOrders().length === 0);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const warnedQuota = useRef(false);

  useEffect(() => {
    let unsubscribe = () => {};

    try {
      const q = query(collection(db, 'orders'), orderBy('updatedAt', 'desc'), limit(150));
      unsubscribe = onSnapshot(q, (snapshot) => {
        const ordersData: Order[] = [];
        let hasNewOrder = false;

        snapshot.docChanges().forEach((change) => {
          if (change.type === "added" && !isFirstLoad) {
            hasNewOrder = true;
          }
        });

        snapshot.forEach((doc) => {
          ordersData.push({ id: doc.id, ...doc.data() } as Order);
        });

        if (hasNewOrder) {
          playNotificationSound();
          toast.info("Novo pedido recebido!");
        }

        saveCachedOrders(ordersData);
        setOrders(ordersData);
        setLoading(false);
        setIsFirstLoad(false);
      }, (error: any) => {
        console.warn("Firestore snapshot error (quota or network):", error);
        const cached = loadCachedOrders();
        if (cached.length > 0) {
          setOrders(cached);
        }
        setLoading(false);
        if (error?.code === 'resource-exhausted' && !warnedQuota.current) {
          warnedQuota.current = true;
          toast.warning("Aviso: Limite diário gratuito de leituras do Firebase atingido temporariamente. O modo de contingência local está ativo e você pode continuar criando e visualizando pedidos normalmente.");
        }
      });
    } catch (err) {
      console.warn("Error setting up onSnapshot:", err);
      const cached = loadCachedOrders();
      if (cached.length > 0) {
        setOrders(cached);
      }
      setLoading(false);
    }

    return () => unsubscribe();
  }, []);

  const createOrder = async (orderData: Omit<Order, 'id' | 'history' | 'status' | 'createdAt' | 'updatedAt'>): Promise<boolean> => {
    try {
      const now = Date.now();
      const trimmedOrderNumber = orderData.orderNumber ? orderData.orderNumber.trim() : '';

      if (!trimmedOrderNumber) {
        toast.error("Número do pedido não pode ser vazio.");
        return false;
      }

      // Check current state & cache
      const currentOrders = orders.length > 0 ? orders : loadCachedOrders();
      const existing = currentOrders.find(o => o.orderNumber && o.orderNumber.trim() === trimmedOrderNumber);
      if (existing) {
        // If it was a temporary local-only order that failed remote sync earlier, allow it to retry
        if (existing.id.startsWith('local_')) {
          console.warn("Atualizando/reenviando pedido local pendente:", trimmedOrderNumber);
        } else {
          toast.error(`O pedido #${trimmedOrderNumber} já existe no sistema.`);
          return false;
        }
      }

      const newOrder = {
        orderNumber: trimmedOrderNumber,
        originCity: orderData.originCity,
        destinationCity: orderData.destinationCity,
        priority: orderData.priority,
        observations: orderData.observations || '',
        status: 'Aguardando separação' as OrderStatus,
        createdAt: now,
        updatedAt: now,
        history: []
      };

      const tempId = 'local_' + now + '_' + Math.random().toString(36).substring(2, 9);
      const fullOrder: Order = { id: tempId, ...newOrder };

      // Optimistic update locally
      setOrders(prev => {
        const updated = [fullOrder, ...prev.filter(p => p.orderNumber !== trimmedOrderNumber)];
        saveCachedOrders(updated);
        return updated;
      });

      // Persist to Firestore
      try {
        const docRef = await addDoc(collection(db, 'orders'), newOrder);
        setOrders(prev => {
          const updated = prev.map(o => o.id === tempId ? { ...o, id: docRef.id } : o);
          saveCachedOrders(updated);
          return updated;
        });

        // Create notification
        try {
          await addDoc(collection(db, 'notifications'), {
            type: 'order_created',
            orderId: docRef.id,
            orderNumber: trimmedOrderNumber,
            fromCity: orderData.originCity,
            toCity: orderData.destinationCity,
            message: `Novo pedido #${trimmedOrderNumber} criado por ${orderData.originCity}`,
            timestamp: now,
            createdBy: orderData.originCity,
            readBy: [orderData.originCity],
            newStatus: 'Aguardando separação'
          });
        } catch (notifErr) {
          console.warn("Could not create notification document:", notifErr);
        }
      } catch (addDocErr) {
        console.warn("Remote addDoc failed, order preserved locally:", addDocErr);
      }

      toast.success("Pedido criado com sucesso!");
      return true;
    } catch (error) {
      console.warn("Error creating order:", error);
      const errMsg = error instanceof Error ? error.message : "Erro desconhecido";
      toast.error(`Erro ao criar pedido: ${errMsg}`);
      return false;
    }
  };

  const updateOrderStatus = async (orderId: string, status: OrderStatus, user: string, city: string, note?: string) => {
    try {
      const now = Date.now();
      const historyEntry: OrderHistory = {
        status,
        timestamp: now,
        user: `${user} (${city})`,
        note
      };

      const order = orders.find(o => o.id === orderId);
      if (!order) return;

      const newHistory = [...(order.history || []), historyEntry];

      // Optimistically update local state & cache
      setOrders(prev => {
        const updated = prev.map(o => o.id === orderId ? {
          ...o,
          status,
          updatedAt: now,
          history: newHistory
        } : o);
        saveCachedOrders(updated);
        return updated;
      });

      try {
        const orderRef = doc(db, 'orders', orderId);
        await updateDoc(orderRef, {
          status,
          updatedAt: now,
          history: newHistory
        });

        const isComplement = note?.startsWith('Complemento:');
        const notificationType = isComplement ? 'note_added' : 'status_changed';
        const notificationMessage = isComplement 
          ? `Pedido #${order.orderNumber}: Novo complemento de ${city}: ${note.replace('Complemento: ', '')}`
          : `Pedido #${order.orderNumber}: Status alterado para "${status}" por ${city}${note ? ` (${note})` : ''}`;

        await addDoc(collection(db, 'notifications'), {
          type: notificationType,
          orderId: orderId,
          orderNumber: order.orderNumber,
          fromCity: order.originCity,
          toCity: order.destinationCity,
          message: notificationMessage,
          timestamp: now,
          createdBy: city,
          readBy: [city],
          newStatus: status
        });
      } catch (remoteErr) {
        console.warn("Remote updateOrderStatus failed, preserved locally:", remoteErr);
      }

      toast.success(`Status atualizado: ${status}`);
    } catch (error) {
      console.warn("Error updating order:", error);
      const errMsg = error instanceof Error ? error.message : "Erro desconhecido";
      toast.error(`Erro ao atualizar status: ${errMsg}`);
    }
  };

  const clearDailyOrders = async (dateStr?: string) => {
    try {
      // Optimistically clear locally
      if (dateStr) {
        const selectedDateStr = new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR');
        setOrders(prev => {
          const updated = prev.filter(o => {
            if (!o.createdAt) return true;
            return new Date(o.createdAt).toLocaleDateString('pt-BR') !== selectedDateStr;
          });
          saveCachedOrders(updated);
          return updated;
        });
      } else {
        setOrders([]);
        saveCachedOrders([]);
      }

      let q = query(collection(db, 'orders'));
      if (dateStr) {
        const start = new Date(dateStr + 'T00:00:00').getTime();
        const end = start + 86400000;
        q = query(collection(db, 'orders'), where('createdAt', '>=', start), where('createdAt', '<', end));
      }

      const orderSnapshot = await getDocs(q);
      const orderDocs = orderSnapshot.docs;
      
      for (let i = 0; i < orderDocs.length; i += 500) {
        const batch = writeBatch(db);
        orderDocs.slice(i, i + 500).forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
      }

      let nq = query(collection(db, 'notifications'));
      if (dateStr) {
        const start = new Date(dateStr + 'T00:00:00').getTime();
        const end = start + 86400000;
        nq = query(collection(db, 'notifications'), where('timestamp', '>=', start), where('timestamp', '<', end));
      }
      
      const notifSnapshot = await getDocs(nq);
      const notifDocs = notifSnapshot.docs;

      for (let i = 0; i < notifDocs.length; i += 500) {
        const batch = writeBatch(db);
        notifDocs.slice(i, i + 500).forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
      }
      
      const dateMsg = dateStr ? `do dia ${new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR')}` : 'anteriores';
      toast.success(`Operações e notificações ${dateMsg} limpas com sucesso.`);
    } catch (error) {
      console.warn("Error clearing data:", error);
      toast.error("Erro ao limpar operações remotamente.");
    }
  };

  const deleteOrders = async (orderIds: string[]) => {
    try {
      // Optimistically delete locally
      setOrders(prev => {
        const updated = prev.filter(o => !orderIds.includes(o.id));
        saveCachedOrders(updated);
        return updated;
      });

      const batch = writeBatch(db);
      orderIds.forEach((id) => {
        batch.delete(doc(db, 'orders', id));
      });
      await batch.commit();
      toast.success(`${orderIds.length} pedidos excluídos com sucesso.`);
    } catch (error) {
      console.warn("Error deleting orders:", error);
      toast.error("Erro ao excluir pedidos no servidor.");
    }
  };

  const deleteOrder = async (orderId: string) => {
    try {
      // Optimistically delete locally
      setOrders(prev => {
        const updated = prev.filter(o => o.id !== orderId);
        saveCachedOrders(updated);
        return updated;
      });

      await deleteDoc(doc(db, 'orders', orderId));
      toast.success("Pedido excluído com sucesso.");
    } catch (error) {
      console.warn("Error deleting order:", error);
      toast.error("Erro ao excluir pedido no servidor.");
    }
  };

  return { orders, loading, createOrder, updateOrderStatus, clearDailyOrders, deleteOrder, deleteOrders };
}
