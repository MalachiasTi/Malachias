
import React from 'react';
import { AppNotification, City } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { Bell, BellOff, CheckCheck, Clock, ArrowRight, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { CITY_COLORS } from '../constants';

interface NotificationPanelProps {
  notifications: AppNotification[];
  unreadCount: number;
  currentCity: City | 'Geral';
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
  onSelectOrder: (orderId: string) => void;
}

export default function NotificationPanel({ 
  notifications, 
  unreadCount, 
  currentCity,
  onMarkAsRead,
  onMarkAllAsRead,
  onClearAll,
  onSelectOrder
}: NotificationPanelProps) {
  const cityColor = currentCity !== 'Geral' ? CITY_COLORS[currentCity as City] : { primary: 'bg-blue-700', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'Em separação': return 'bg-amber-100 text-amber-600';
      case 'Concluído': return 'bg-emerald-100 text-emerald-600';
      case 'Divergência': return 'bg-red-100 text-red-600';
      default: return 'bg-slate-100 text-slate-500';
    }
  };

  return (
    <Card className="h-full flex flex-col shadow-xl border-slate-200 rounded-xl overflow-hidden max-h-[calc(100vh-250px)]">
      <CardHeader className="pb-3 border-b bg-slate-50/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`${cityColor.bg} p-1.5 rounded-lg`}>
              <Bell className={`w-4 h-4 ${cityColor.text}`} />
            </div>
            <CardTitle className="text-base font-bold text-slate-900">Notificações</CardTitle>
            {unreadCount > 0 && (
              <Badge className="bg-red-500 text-white border-0 font-bold px-1.5 h-5 min-w-[20px] flex items-center justify-center rounded-full text-[10px]">
                {unreadCount}
              </Badge>
            )}
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onMarkAllAsRead}
            className={`${cityColor.text} hover:${cityColor.text} hover:${cityColor.bg} font-bold text-[10px] h-7 px-2`}
          >
            <CheckCheck className="w-3 h-3 mr-1" />
            Ler tudo
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0 flex flex-col overflow-hidden">
        <ScrollArea className="flex-1">
          <div className="p-3 space-y-3">
            <AnimatePresence mode="popLayout">
              {notifications.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-10 text-slate-400"
                >
                  <BellOff className="w-10 h-10 mb-2 opacity-20" />
                  <p className="text-xs font-bold">Sem notificações</p>
                </motion.div>
              ) : (
                notifications.map((n) => (
                  <motion.div
                    key={n.id}
                    layout
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={`p-3 rounded-lg border transition-all cursor-pointer hover:shadow-sm active:scale-[0.98] ${
                      n.readBy.includes(currentCity) 
                        ? 'bg-white border-slate-100 opacity-60' 
                        : `bg-white ${cityColor.border.replace('border-', 'border-')} shadow-sm ring-1 ${cityColor.bg}/50`
                    }`}
                    onClick={() => {
                      if (!n.readBy.includes(currentCity)) onMarkAsRead(n.id);
                      onSelectOrder(n.orderId);
                    }}
                  >
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Badge className={`${CITY_COLORS[n.fromCity].primary} text-white border-0 px-1.5 py-0 text-[9px] font-bold uppercase`}>
                            {n.fromCity}
                          </Badge>
                          <ArrowRight className="w-2.5 h-2.5 text-slate-400" />
                          <Badge className={`${CITY_COLORS[n.toCity].primary} text-white border-0 px-1.5 py-0 text-[9px] font-bold uppercase`}>
                            {n.toCity}
                          </Badge>
                        </div>
                        <span className="text-[9px] font-bold text-slate-400">
                          #{n.orderNumber}
                        </span>
                      </div>

                      <div className="flex gap-2">
                        <div className={`mt-0.5 w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${
                          n.type === 'order_created' && !n.readBy.includes(currentCity) ? cityColor.bg : getStatusColor(n.newStatus).split(' ')[0]
                        }`}>
                          {n.type === 'order_created' && !n.readBy.includes(currentCity) ? (
                            <div className={`${cityColor.primary} w-4 h-4 rounded flex items-center justify-center`}>
                              <span className="text-[7px] text-white font-bold">NEW</span>
                            </div>
                          ) : (
                            <Clock className={`w-3 h-3 ${getStatusColor(n.newStatus).split(' ')[1]}`} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-0.5">
                            <span className="font-bold text-slate-900 text-xs truncate">
                              {n.type === 'order_created' ? 'Novo Pedido' : 'Atualização'}
                            </span>
                            <span className="text-[9px] font-medium text-slate-400 flex items-center gap-1 shrink-0 ml-2">
                              {format(n.timestamp, 'HH:mm', { locale: ptBR })}
                            </span>
                          </div>
                          <p className="text-[11px] font-medium text-slate-600 leading-snug line-clamp-2">
                            {n.message}
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </ScrollArea>
        {notifications.length > 0 && (
          <div className="p-3 border-t bg-gray-50/50">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClearAll}
              className="w-full text-xs text-gray-500 hover:text-red-600 h-9 flex items-center justify-center gap-2"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Limpar histórico
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
