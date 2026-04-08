
import React from 'react';
import { AppNotification, City } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { Bell, BellOff, CheckCheck, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';

interface NotificationPanelProps {
  notifications: AppNotification[];
  unreadCount: number;
  currentCity: City | 'Geral';
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
}

export default function NotificationPanel({ 
  notifications, 
  unreadCount, 
  currentCity,
  onMarkAsRead,
  onMarkAllAsRead
}: NotificationPanelProps) {
  return (
    <Card className="h-full flex flex-col shadow-lg border-blue-100">
      <CardHeader className="flex flex-row items-center justify-between py-4 space-y-0">
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <Bell className="w-5 h-5 text-blue-700" />
          Notificações
          {unreadCount > 0 && (
            <Badge variant="destructive" className="ml-1 px-2 py-0.5 text-[10px] animate-pulse">
              {unreadCount}
            </Badge>
          )}
        </CardTitle>
        {unreadCount > 0 && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onMarkAllAsRead}
            className="text-xs text-blue-600 hover:text-blue-800 h-8 px-2"
          >
            <CheckCheck className="w-3 h-3 mr-1" />
            Ler tudo
          </Button>
        )}
      </CardHeader>
      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea className="h-[400px] px-4">
          <div className="space-y-3 py-4">
            <AnimatePresence initial={false}>
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <BellOff className="w-8 h-8 mb-2 opacity-20" />
                  <p className="text-sm italic">Nenhuma notificação</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <motion.div
                    key={n.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={`p-3 rounded-lg border text-sm transition-all ${
                      n.readBy.includes(currentCity) 
                        ? 'bg-white border-gray-100 opacity-70' 
                        : 'bg-blue-50 border-blue-100 shadow-sm'
                    }`}
                    onClick={() => !n.readBy.includes(currentCity) && onMarkAsRead(n.id)}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className={`font-bold ${n.readBy.includes(currentCity) ? 'text-gray-700' : 'text-blue-900'}`}>
                        {n.type === 'order_created' ? '🆕 Novo Pedido' : '🔄 Atualização'}
                      </span>
                      <span className="text-[10px] text-gray-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(n.timestamp, "HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    <p className="text-gray-600 leading-tight mb-2">{n.message}</p>
                    <div className="flex justify-between items-center">
                      <Badge variant="outline" className="text-[9px] h-4 px-1 uppercase tracking-tighter">
                        #{n.orderNumber}
                      </Badge>
                      {!n.readBy.includes(currentCity) && (
                        <div className="w-2 h-2 rounded-full bg-blue-600" />
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
