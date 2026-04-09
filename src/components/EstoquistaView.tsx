
import React, { useState, useEffect } from 'react';
import { City, Order, OrderStatus, Priority } from '../types';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { 
  PlusCircle, 
  Search, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Clock, 
  AlertCircle, 
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { CITIES, STATUS_COLORS, PRIORITY_COLORS } from '../constants';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { motion, AnimatePresence } from 'motion/react';
import { useOrders } from '../hooks/useOrders';
import { useNotifications } from '../hooks/useNotifications';
import OrderDetails from './OrderDetails';
import NotificationPanel from './NotificationPanel';
import { CITY_COLORS } from '../constants';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog';

interface EstoquistaViewProps {
  currentCity: City;
  role: string;
}

export default function EstoquistaView({ currentCity, role }: EstoquistaViewProps) {
  const { orders, createOrder, updateOrderStatus } = useOrders();
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotifications } = useNotifications(currentCity);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  
  const cityColor = CITY_COLORS[currentCity];

  const [newOrder, setNewOrder] = useState({
    orderNumber: '',
    destinationCity: '' as City | '',
    priority: 'Normal' as Priority,
    observations: ''
  });

  const [searchNumber, setSearchNumber] = useState('');
  const [complementNote, setComplementNote] = useState('');
  const [foundOrder, setFoundOrder] = useState<Order | null>(null);

  const [isConfirming, setIsConfirming] = useState(false);

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrder.orderNumber || !newOrder.destinationCity) {
      toast.error('Preencha os campos obrigatórios.');
      return;
    }

    if (orders.some(o => o.orderNumber === newOrder.orderNumber)) {
      toast.error('Número de pedido já existe.');
      return;
    }

    setIsConfirming(true);
  };

  const confirmCreateOrder = async () => {
    await createOrder({
      orderNumber: newOrder.orderNumber,
      originCity: currentCity,
      destinationCity: newOrder.destinationCity as City,
      priority: newOrder.priority,
      observations: newOrder.observations
    });
    
    setNewOrder({ orderNumber: '', destinationCity: '', priority: 'Normal', observations: '' });
    setIsConfirming(false);
  };

  const handleUpdateOrder = async (orderId: string, status: OrderStatus, note: string) => {
    await updateOrderStatus(orderId, status, role, currentCity, note);
    setSelectedOrder(null);
  };

  const handleSearch = () => {
    const order = orders.find(o => o.orderNumber === searchNumber);
    if (order) {
      setFoundOrder(order);
      toast.success('Pedido encontrado!');
    } else {
      toast.error('Pedido não encontrado.');
      setFoundOrder(null);
    }
  };

  const handleComplement = async () => {
    if (!foundOrder || !complementNote) return;
    await updateOrderStatus(foundOrder.id, foundOrder.status, role, currentCity, `Complemento: ${complementNote}`);
    setComplementNote('');
    setSearchNumber('');
    setFoundOrder(null);
  };

  const handleSelectOrderFromNotification = (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (order) {
      setSelectedOrder(order);
    } else {
      toast.error("Pedido não encontrado ou já foi removido.");
    }
  };

  const sentOrders = orders.filter(o => o.originCity === currentCity);
  const receivedOrders = orders.filter(o => o.destinationCity === currentCity);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="space-y-6 lg:col-span-1">
          <Card className={`border-t-4 ${cityColor.border.replace('border-', 'border-t-')}`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PlusCircle className={`w-5 h-5 ${cityColor.text}`} />
                Novo Pedido
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateOrder} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="orderNumber">Número do Pedido</Label>
                  <Input 
                    id="orderNumber" 
                    placeholder="Ex: 12345" 
                    value={newOrder.orderNumber}
                    onChange={e => setNewOrder({...newOrder, orderNumber: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="destCity">Cidade Destino</Label>
                  <Select 
                    value={newOrder.destinationCity} 
                    onValueChange={v => setNewOrder({...newOrder, destinationCity: v as City})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {CITIES.filter(c => c !== currentCity).map(city => (
                        <SelectItem key={city} value={city}>{city}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priority">Prioridade</Label>
                  <Select 
                    value={newOrder.priority} 
                    onValueChange={v => setNewOrder({...newOrder, priority: v as Priority})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Prioridade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Baixa">Baixa</SelectItem>
                      <SelectItem value="Normal">Normal</SelectItem>
                      <SelectItem value="Urgente">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="obs">Observações</Label>
                  <Input 
                    id="obs" 
                    placeholder="Opcional" 
                    value={newOrder.observations}
                    onChange={e => setNewOrder({...newOrder, observations: e.target.value})}
                  />
                </div>
                <Button type="submit" className={`w-full ${cityColor.primary} hover:opacity-90`}>
                  Criar Pedido
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className={`border-t-4 ${cityColor.border.replace('border-', 'border-t-')}`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className={`w-5 h-5 ${cityColor.text}`} />
                Complementar Pedido
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input 
                  placeholder="Nº Pedido" 
                  value={searchNumber}
                  onChange={e => setSearchNumber(e.target.value)}
                />
                <Button variant="outline" onClick={handleSearch}>Buscar</Button>
              </div>
              
              {foundOrder && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-4 pt-4 border-t"
                >
                  <div className="text-sm">
                    <p className="font-bold">Pedido #{foundOrder.orderNumber}</p>
                    <p className="text-gray-500">{foundOrder.originCity} → {foundOrder.destinationCity}</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Informação Adicional</Label>
                    <Input 
                      placeholder="Ex: Adicionar 2 filtros" 
                      value={complementNote}
                      onChange={e => setComplementNote(e.target.value)}
                    />
                  </div>
                  <Button className={`w-full ${cityColor.primary} hover:opacity-90`} onClick={handleComplement}>
                    Salvar Complemento
                  </Button>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="received" className="h-full">
            <Card className="h-full border-none shadow-xl overflow-hidden rounded-2xl">
              <CardHeader className="space-y-6 bg-slate-50/50 pb-6">
                <TabsList className="grid w-full grid-cols-2 bg-slate-200/50 p-1 rounded-xl">
                  <TabsTrigger value="received" className="flex items-center gap-2 font-bold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm py-2.5">
                    <ArrowDownLeft className="w-4 h-4" />
                    Recebidos ({receivedOrders.length})
                  </TabsTrigger>
                  <TabsTrigger value="sent" className="flex items-center gap-2 font-bold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm py-2.5">
                    <ArrowUpRight className="w-4 h-4" />
                    Enviados ({sentOrders.length})
                  </TabsTrigger>
                </TabsList>
                <CardTitle className="text-xl font-bold text-slate-900 tracking-tight">Gerenciamento de Pedidos</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <TabsContent value="received" className="m-0">
                  <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow className="hover:bg-transparent border-b">
                        <TableHead className="font-bold text-slate-900 py-3 pl-6">Pedido</TableHead>
                        <TableHead className="font-bold text-slate-900 py-3">Origem</TableHead>
                        <TableHead className="font-bold text-slate-900 py-3">Prioridade</TableHead>
                        <TableHead className="font-bold text-slate-900 py-3">Status</TableHead>
                        <TableHead className="font-bold text-slate-900 py-3 pr-6">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {receivedOrders.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-10 text-slate-400 font-medium text-sm">
                            Nenhum pedido recebido no momento.
                          </TableCell>
                        </TableRow>
                      ) : (
                        receivedOrders.map(order => (
                          <TableRow key={order.id} className="hover:bg-slate-50/50 transition-colors border-b last:border-0">
                            <TableCell className="font-bold text-slate-900 pl-6">#{order.orderNumber}</TableCell>
                            <TableCell className="font-medium text-slate-600 text-sm">{order.originCity}</TableCell>
                            <TableCell>
                              <Badge className={`${PRIORITY_COLORS[order.priority]} border-0 font-bold px-2 py-0.5 rounded-lg text-[10px]`}>
                                {order.priority}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={`${STATUS_COLORS[order.status]} text-white border-0 px-2 py-0.5 rounded-lg font-bold shadow-sm text-[10px]`}>
                                {order.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="pr-6">
                              <Button variant="ghost" size="sm" onClick={() => setSelectedOrder(order)} className={`font-bold text-slate-600 hover:${cityColor.text} h-8 px-2 text-xs`}>Ver Detalhes</Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TabsContent>

                <TabsContent value="sent" className="m-0">
                  <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow className="hover:bg-transparent border-b">
                        <TableHead className="font-bold text-slate-900 py-3 pl-6">Pedido</TableHead>
                        <TableHead className="font-bold text-slate-900 py-3">Destino</TableHead>
                        <TableHead className="font-bold text-slate-900 py-3">Prioridade</TableHead>
                        <TableHead className="font-bold text-slate-900 py-3">Status</TableHead>
                        <TableHead className="font-bold text-slate-900 py-3 pr-6">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sentOrders.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-10 text-slate-400 font-medium text-sm">
                            Nenhum pedido enviado no momento.
                          </TableCell>
                        </TableRow>
                      ) : (
                        sentOrders.map(order => (
                          <TableRow key={order.id} className="hover:bg-slate-50/50 transition-colors border-b last:border-0">
                            <TableCell className="font-bold text-slate-900 pl-6">#{order.orderNumber}</TableCell>
                            <TableCell className="font-medium text-slate-600 text-sm">{order.destinationCity}</TableCell>
                            <TableCell>
                              <Badge className={`${PRIORITY_COLORS[order.priority]} border-0 font-bold px-2 py-0.5 rounded-lg text-[10px]`}>
                                {order.priority}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={`${STATUS_COLORS[order.status]} text-white border-0 px-2 py-0.5 rounded-lg font-bold shadow-sm text-[10px]`}>
                                {order.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="pr-6">
                              <Button variant="ghost" size="sm" onClick={() => setSelectedOrder(order)} className={`font-bold text-slate-600 hover:${cityColor.text} h-8 px-2 text-xs`}>Editar</Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TabsContent>
              </CardContent>
            </Card>
          </Tabs>
        </div>

        <div className="lg:col-span-1">
          <NotificationPanel 
            notifications={notifications}
            unreadCount={unreadCount}
            currentCity={currentCity}
            onMarkAsRead={markAsRead}
            onMarkAllAsRead={markAllAsRead}
            onClearAll={clearNotifications}
            onSelectOrder={handleSelectOrderFromNotification}
          />
        </div>
      </div>

      {selectedOrder && (
        <OrderDetails 
          order={selectedOrder}
          isOpen={!!selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onUpdate={handleUpdateOrder}
          canEdit={true}
          currentCity={currentCity}
        />
      )}

      <Dialog open={isConfirming} onOpenChange={setIsConfirming}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="w-5 h-5" />
              Confirmar Envio de Pedido
            </DialogTitle>
            <DialogDescription className="pt-2">
              Você está prestes a enviar o pedido <span className="font-bold text-slate-900">#{newOrder.orderNumber}</span> para a unidade de <span className="font-bold text-slate-900">{newOrder.destinationCity}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-slate-50 p-4 rounded-lg space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Origem:</span>
              <span className="font-bold">{currentCity}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Destino:</span>
              <span className="font-bold">{newOrder.destinationCity}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Prioridade:</span>
              <Badge className={`${PRIORITY_COLORS[newOrder.priority as Priority]} border-0 font-bold px-2 py-0.5 rounded-lg text-[10px]`}>
                {newOrder.priority}
              </Badge>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsConfirming(false)} className="flex-1">
              Cancelar
            </Button>
            <Button onClick={confirmCreateOrder} className={`flex-1 ${cityColor.primary} hover:opacity-90`}>
              Confirmar e Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
