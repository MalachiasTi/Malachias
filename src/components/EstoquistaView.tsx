
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
import { PlusCircle, Search, ArrowUpRight, ArrowDownLeft, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { CITIES, STATUS_COLORS, PRIORITY_COLORS } from '../constants';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { motion } from 'motion/react';
import { useOrders } from '../hooks/useOrders';
import { useNotifications } from '../hooks/useNotifications';
import OrderDetails from './OrderDetails';
import NotificationPanel from './NotificationPanel';
import { CITY_COLORS } from '../constants';

interface EstoquistaViewProps {
  currentCity: City;
  role: string;
}

export default function EstoquistaView({ currentCity, role }: EstoquistaViewProps) {
  const { orders, createOrder, updateOrderStatus } = useOrders();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications(currentCity);
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

    await createOrder({
      orderNumber: newOrder.orderNumber,
      originCity: currentCity,
      destinationCity: newOrder.destinationCity as City,
      priority: newOrder.priority,
      observations: newOrder.observations
    });
    
    setNewOrder({ orderNumber: '', destinationCity: '', priority: 'Normal', observations: '' });
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
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Gerenciamento de Pedidos</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="received">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="received" className="flex items-center gap-2">
                    <ArrowDownLeft className="w-4 h-4" />
                    Recebidos ({receivedOrders.length})
                  </TabsTrigger>
                  <TabsTrigger value="sent" className="flex items-center gap-2">
                    <ArrowUpRight className="w-4 h-4" />
                    Enviados ({sentOrders.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="received">
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Pedido</TableHead>
                          <TableHead>Origem</TableHead>
                          <TableHead>Prioridade</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {receivedOrders.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                              Nenhum pedido recebido.
                            </TableCell>
                          </TableRow>
                        ) : (
                          receivedOrders.map(order => (
                            <TableRow key={order.id}>
                              <TableCell className="font-medium">#{order.orderNumber}</TableCell>
                              <TableCell>{order.originCity}</TableCell>
                              <TableCell>
                                <Badge className={PRIORITY_COLORS[order.priority]}>
                                  {order.priority}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge className={`${STATUS_COLORS[order.status]} text-white`}>
                                  {order.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Button variant="outline" size="sm" onClick={() => setSelectedOrder(order)}>Ver Detalhes</Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>

                <TabsContent value="sent">
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Pedido</TableHead>
                          <TableHead>Destino</TableHead>
                          <TableHead>Prioridade</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sentOrders.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                              Nenhum pedido enviado.
                            </TableCell>
                          </TableRow>
                        ) : (
                          sentOrders.map(order => (
                            <TableRow key={order.id}>
                              <TableCell className="font-medium">#{order.orderNumber}</TableCell>
                              <TableCell>{order.destinationCity}</TableCell>
                              <TableCell>
                                <Badge className={PRIORITY_COLORS[order.priority]}>
                                  {order.priority}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge className={`${STATUS_COLORS[order.status]} text-white`}>
                                  {order.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Button variant="outline" size="sm" onClick={() => setSelectedOrder(order)}>Editar</Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <NotificationPanel 
            notifications={notifications}
            unreadCount={unreadCount}
            currentCity={currentCity}
            onMarkAsRead={markAsRead}
            onMarkAllAsRead={markAllAsRead}
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
    </div>
  );
}
