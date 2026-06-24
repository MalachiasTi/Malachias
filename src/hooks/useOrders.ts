
import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, onSnapshot, addDoc, updateDoc, doc, deleteDoc, getDocs, writeBatch, orderBy, where } from 'firebase/firestore';
import { Order, OrderStatus, Priority, City, OrderHistory } from '../types';
import { toast } from 'sonner';

import { playNotificationSound } from '../lib/notifications';

export function useOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFirstLoad, setIsFirstLoad] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'orders'), orderBy('updatedAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
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

      setOrders(ordersData);
      setLoading(false);
      setIsFirstLoad(false);
    }, (error) => {
      console.error("Error fetching orders:", error);
      toast.error("Erro ao carregar pedidos em tempo real.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const createOrder = async (orderData: Omit<Order, 'id' | 'history' | 'status' | 'createdAt' | 'updatedAt'>): Promise<boolean> => {
    try {
      const now = Date.now();

      // Check local state first for ultra-fast response
      if (orders.some(o => o.orderNumber === orderData.orderNumber)) {
        toast.error(`O pedido #${orderData.orderNumber} já existe.`);
        return false;
      }

      // Query database to prevent race conditions or double submits
      const q = query(collection(db, 'orders'), where('orderNumber', '==', orderData.orderNumber));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        toast.error(`O pedido #${orderData.orderNumber} já existe.`);
        return false;
      }

      const newOrder: Omit<Order, 'id'> = {
        ...orderData,
        status: 'Aguardando separação',
        createdAt: now,
        updatedAt: now,
        history: []
      };
      const docRef = await addDoc(collection(db, 'orders'), newOrder);
      
      // Create notification
      await addDoc(collection(db, 'notifications'), {
        type: 'order_created',
        orderId: docRef.id,
        orderNumber: orderData.orderNumber,
        fromCity: orderData.originCity,
        toCity: orderData.destinationCity,
        message: `Novo pedido #${orderData.orderNumber} criado por ${orderData.originCity}`,
        timestamp: now,
        createdBy: orderData.originCity,
        readBy: [orderData.originCity],
        newStatus: 'Aguardando separação'
      });

      toast.success("Pedido criado com sucesso!");
      return true;
    } catch (error) {
      console.error("Error creating order:", error);
      toast.error("Erro ao criar pedido.");
      return false;
    }
  };

  const updateOrderStatus = async (orderId: string, status: OrderStatus, user: string, city: string, note?: string) => {
    try {
      const orderRef = doc(db, 'orders', orderId);
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

      // Create notification for status change or complement
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

      toast.success(`Status atualizado: ${status}`);
    } catch (error) {
      console.error("Error updating order:", error);
      const errMsg = error instanceof Error ? error.message : "Erro desconhecido";
      toast.error(`Erro ao atualizar status: ${errMsg}`);
    }
  };

  const clearDailyOrders = async (dateStr?: string) => {
    try {
      let q = query(collection(db, 'orders'));
      
      if (dateStr) {
        // Create range for the day in local time
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

      // Clear notifications for those orders specifically? 
      // Current behavior clears ALL notifications. Let's make notifications also date-specific if possible.
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
      console.error("Error clearing data:", error);
      toast.error("Erro ao limpar operações.");
    }
  };

  const deleteOrders = async (orderIds: string[]) => {
    try {
      const batch = writeBatch(db);
      orderIds.forEach((id) => {
        batch.delete(doc(db, 'orders', id));
      });
      await batch.commit();
      toast.success(`${orderIds.length} pedidos excluídos com sucesso.`);
    } catch (error) {
      console.error("Error deleting orders:", error);
      toast.error("Erro ao excluir pedidos selecionados.");
    }
  };

  const deleteOrder = async (orderId: string) => {
    try {
      await deleteDoc(doc(db, 'orders', orderId));
      toast.success("Pedido excluído com sucesso.");
    } catch (error) {
      console.error("Error deleting order:", error);
      toast.error("Erro ao excluir pedido.");
    }
  };

  return { orders, loading, createOrder, updateOrderStatus, clearDailyOrders, deleteOrder, deleteOrders };
}
