
import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, onSnapshot, addDoc, updateDoc, doc, deleteDoc, getDocs, writeBatch, orderBy } from 'firebase/firestore';
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

  const createOrder = async (orderData: Omit<Order, 'id' | 'history' | 'status' | 'createdAt' | 'updatedAt'>) => {
    try {
      const now = Date.now();
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
        readBy: [orderData.originCity]
      });

      toast.success("Pedido criado com sucesso!");
    } catch (error) {
      console.error("Error creating order:", error);
      toast.error("Erro ao criar pedido.");
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

      // Create notification for status change
      await addDoc(collection(db, 'notifications'), {
        type: 'status_changed',
        orderId: orderId,
        orderNumber: order.orderNumber,
        fromCity: order.originCity,
        toCity: order.destinationCity,
        message: `Pedido #${order.orderNumber}: Status alterado para "${status}" por ${city}${note ? ` (${note})` : ''}`,
        timestamp: now,
        createdBy: city,
        readBy: [city]
      });

      toast.success(`Status atualizado: ${status}`);
    } catch (error) {
      console.error("Error updating order:", error);
      toast.error("Erro ao atualizar status.");
    }
  };

  const clearDailyOrders = async () => {
    try {
      // Clear orders
      const orderSnapshot = await getDocs(collection(db, 'orders'));
      const orderDocs = orderSnapshot.docs;
      
      for (let i = 0; i < orderDocs.length; i += 500) {
        const batch = writeBatch(db);
        orderDocs.slice(i, i + 500).forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
      }

      // Clear notifications
      const notifSnapshot = await getDocs(collection(db, 'notifications'));
      const notifDocs = notifSnapshot.docs;

      for (let i = 0; i < notifDocs.length; i += 500) {
        const batch = writeBatch(db);
        notifDocs.slice(i, i + 500).forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
      }
      
      toast.success("Operações e notificações do dia limpas com sucesso.");
    } catch (error) {
      console.error("Error clearing data:", error);
      toast.error("Erro ao limpar operações.");
    }
  };

  return { orders, loading, createOrder, updateOrderStatus, clearDailyOrders };
}
