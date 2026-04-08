
import React, { useState, useEffect } from 'react';
import { Order, City, OrderStatus } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { 
  BarChart3, 
  Download, 
  Trash2, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  FileSpreadsheet,
  TrendingUp
} from 'lucide-react';
import { STATUS_COLORS, CITIES } from '../constants';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

import { useOrders } from '../hooks/useOrders';
import { useNotifications } from '../hooks/useNotifications';
import OrderDetails from './OrderDetails';
import NotificationPanel from './NotificationPanel';

export default function AdminView() {
  const { orders, updateOrderStatus, clearDailyOrders } = useOrders();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications('Geral');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const stats = {
    total: orders.length,
    completed: orders.filter(o => o.status === 'Concluído').length,
    pending: orders.filter(o => o.status === 'Aguardando separação' || o.status === 'Em separação').length,
    divergence: orders.filter(o => o.status === 'Divergência').length
  };

  const handleExportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(orders.map(o => ({
      'Pedido': o.orderNumber,
      'Origem': o.originCity,
      'Destino': o.destinationCity,
      'Status': o.status,
      'Prioridade': o.priority,
      'Data Criação': new Date(o.createdAt).toLocaleString('pt-BR'),
      'Observações': o.observations
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pedidos");
    XLSX.writeFile(wb, `Malachias_Relatorio_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Relatório Excel exportado!');
  };

  const handleDeleteDaily = async () => {
    if (confirm('ATENÇÃO: Esta ação apagará todas as operações do dia e é irreversível. Confirmar?')) {
      await clearDailyOrders();
    }
  };

  const handleUpdateOrder = async (orderId: string, status: OrderStatus, note: string) => {
    await updateOrderStatus(orderId, status, 'Admin', 'Geral', note);
    setSelectedOrder(null);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-blue-600">Total de Pedidos</p>
                <h3 className="text-3xl font-bold text-blue-900">{stats.total}</h3>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-green-600">Concluídos</p>
                <h3 className="text-3xl font-bold text-green-900">{stats.completed}</h3>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-yellow-600">Pendentes</p>
                <h3 className="text-3xl font-bold text-yellow-900">{stats.pending}</h3>
              </div>
              <Clock className="w-8 h-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-red-50 border-red-200">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-red-600">Divergências</p>
                <h3 className="text-3xl font-bold text-red-900">{stats.divergence}</h3>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <div className="flex flex-wrap gap-4 justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900">Histórico Geral de Operações</h2>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleExportExcel} className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4" />
                Exportar Excel
              </Button>
              <Button variant="destructive" onClick={handleDeleteDaily} className="flex items-center gap-2">
                <Trash2 className="w-4 h-4" />
                Limpar Dia
              </Button>
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pedido</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Destino</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Prioridade</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map(order => (
                    <TableRow key={order.id}>
                      <TableCell className="font-bold">#{order.orderNumber}</TableCell>
                      <TableCell>{order.originCity}</TableCell>
                      <TableCell>{order.destinationCity}</TableCell>
                      <TableCell>
                        <Badge className={`${STATUS_COLORS[order.status]} text-white`}>
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {order.priority}
                          {order.status !== 'Concluído' && (Date.now() - order.updatedAt > 14400000) && (
                            <Badge variant="destructive" className="animate-pulse text-[10px] px-1 h-4">ATRASADO</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => setSelectedOrder(order)}>Ver</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <NotificationPanel 
            notifications={notifications}
            unreadCount={unreadCount}
            currentCity="Geral"
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
          currentCity="Geral"
        />
      )}
    </div>
  );
}
