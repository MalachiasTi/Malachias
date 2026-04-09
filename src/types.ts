
export type City = 'Pirassununga' | 'Porto Ferreira' | 'Palmeiras' | 'Descalvado' | 'Santa Rita';

export type Role = 'Estoquista' | 'Administrador';

export type OrderStatus = 'Aguardando separação' | 'Em separação' | 'Divergência' | 'Concluído';

export type Priority = 'Baixa' | 'Normal' | 'Urgente';

export interface OrderHistory {
  status: OrderStatus;
  timestamp: number;
  user: string;
  note?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  originCity: City;
  destinationCity: City;
  status: OrderStatus;
  priority: Priority;
  observations: string;
  createdAt: number;
  updatedAt: number;
  history: OrderHistory[];
}

export interface AppNotification {
  id: string;
  type: 'order_created' | 'status_changed' | 'note_added';
  orderId: string;
  orderNumber: string;
  fromCity: City;
  toCity: City;
  message: string;
  timestamp: number;
  createdBy: string; // The city or 'Admin' that performed the action
  readBy: string[]; // List of city names that have seen this
  newStatus?: OrderStatus;
}

export interface UserSession {
  city: City;
  role: Role;
  isAdmin: boolean;
}
