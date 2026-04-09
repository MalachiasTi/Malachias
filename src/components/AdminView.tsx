
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
  TrendingUp,
  Settings,
  Lock,
  Eye,
  EyeOff
} from 'lucide-react';
import { STATUS_COLORS, CITIES, CITY_COLORS } from '../constants';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

import { useOrders } from '../hooks/useOrders';
import { useNotifications } from '../hooks/useNotifications';
import { useAdminSettings } from '../hooks/useAdminSettings';
import OrderDetails from './OrderDetails';
import NotificationPanel from './NotificationPanel';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from './ui/dialog';

export default function AdminView() {
  const currentCity: City = 'Pirassununga';
  const { orders, updateOrderStatus, clearDailyOrders } = useOrders();
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotifications } = useNotifications(currentCity);
  const { adminPassword, updatePassword } = useAdminSettings();
  
  const cityColor = CITY_COLORS[currentCity];
  
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [filter, setFilter] = useState<'all' | 'completed' | 'pending' | 'divergence'>('all');
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [clearPasswordInput, setClearPasswordInput] = useState('');

  const stats = {
    total: orders.length,
    completed: orders.filter(o => o.status === 'Concluído').length,
    pending: orders.filter(o => o.status === 'Aguardando separação' || o.status === 'Em separação').length,
    divergence: orders.filter(o => o.status === 'Divergência').length
  };

  const filteredOrders = orders.filter(o => {
    if (filter === 'all') return true;
    if (filter === 'completed') return o.status === 'Concluído';
    if (filter === 'pending') return o.status === 'Aguardando separação' || o.status === 'Em separação';
    if (filter === 'divergence') return o.status === 'Divergência';
    return true;
  });

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
    if (clearPasswordInput !== adminPassword) {
      toast.error('Senha de administrador incorreta.');
      return;
    }
    
    await clearDailyOrders();
    setIsClearConfirmOpen(false);
    setClearPasswordInput('');
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 4) {
      toast.error('A senha deve ter pelo menos 4 caracteres.');
      return;
    }
    await updatePassword(newPassword);
    setNewPassword('');
    setIsSettingsOpen(false);
  };

  const handleUpdateOrder = async (orderId: string, status: OrderStatus, note: string) => {
    await updateOrderStatus(orderId, status, 'Admin', currentCity, note);
    setSelectedOrder(null);
  };

  const handleSelectOrderFromNotification = (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (order) {
      setSelectedOrder(order);
    } else {
      toast.error("Pedido não encontrado ou já foi removido.");
    }
  };

  return (
    <div className="space-y-6">
      <div className={`bg-white p-5 rounded-xl border-2 ${cityColor.border} shadow-sm`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card 
            className={`bg-white border-slate-200 shadow-none cursor-pointer transition-all hover:${cityColor.border.replace('border-', 'border-')} ${filter === 'all' ? `ring-2 ${cityColor.primary.replace('bg-', 'ring-')} border-transparent` : ''}`}
            onClick={() => setFilter('all')}
          >
            <CardContent className="pt-5">
              <div className="flex justify-between items-center">
                <div>
                  <p className={`text-xs font-bold ${cityColor.text} mb-1 uppercase tracking-wider`}>Total de Pedidos</p>
                  <h3 className="text-2xl font-bold text-slate-900">{stats.total}</h3>
                </div>
                <div className={`${cityColor.bg} p-2 rounded-lg`}>
                  <TrendingUp className={`w-6 h-6 ${cityColor.text}`} />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card 
            className={`bg-green-50/30 border-green-100 shadow-none cursor-pointer transition-all hover:border-green-400 ${filter === 'completed' ? 'ring-2 ring-green-500 border-transparent' : ''}`}
            onClick={() => setFilter('completed')}
          >
            <CardContent className="pt-5">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs font-bold text-green-600 mb-1 uppercase tracking-wider">Concluídos</p>
                  <h3 className="text-2xl font-bold text-slate-900">{stats.completed}</h3>
                </div>
                <div className="bg-green-100 p-2 rounded-lg">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className={`bg-yellow-50/30 border-yellow-100 shadow-none cursor-pointer transition-all hover:border-yellow-400 ${filter === 'pending' ? 'ring-2 ring-yellow-500 border-transparent' : ''}`}
            onClick={() => setFilter('pending')}
          >
            <CardContent className="pt-5">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs font-bold text-yellow-600 mb-1 uppercase tracking-wider">Pendentes</p>
                  <h3 className="text-2xl font-bold text-slate-900">{stats.pending}</h3>
                </div>
                <div className="bg-yellow-100 p-2 rounded-lg">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className={`bg-red-50/30 border-red-100 shadow-none cursor-pointer transition-all hover:border-red-400 ${filter === 'divergence' ? 'ring-2 ring-red-500 border-transparent' : ''}`}
            onClick={() => setFilter('divergence')}
          >
            <CardContent className="pt-5">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs font-bold text-red-600 mb-1 uppercase tracking-wider">Divergências</p>
                  <h3 className="text-2xl font-bold text-slate-900">{stats.divergence}</h3>
                </div>
                <div className="bg-red-100 p-2 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <div className="flex flex-wrap gap-4 justify-between items-center">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Histórico Geral de Operações 
              {filter !== 'all' && (
                <span className="ml-2 text-sm font-medium text-slate-400">
                  (Filtrado: {filter === 'completed' ? 'Concluídos' : filter === 'pending' ? 'Pendentes' : 'Divergências'})
                </span>
              )}
            </h2>
            <div className="flex gap-3">
              <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2 font-bold border-slate-300">
                    <Settings className="w-4 h-4" />
                    Configurações
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Lock className={`w-5 h-5 ${cityColor.text}`} />
                      Alterar Senha ADM
                    </DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="new-password">Nova Senha</Label>
                      <div className="relative">
                        <Input
                          id="new-password"
                          type={showPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Digite a nova senha"
                          className="pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4 text-slate-400" /> : <Eye className="h-4 w-4 text-slate-400" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleChangePassword} className={`${cityColor.primary} hover:opacity-90`}>
                      Salvar Nova Senha
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Button variant="outline" onClick={handleExportExcel} className="flex items-center gap-2 font-bold border-slate-300">
                <FileSpreadsheet className="w-4 h-4" />
                Exportar Excel
              </Button>

              <Dialog open={isClearConfirmOpen} onOpenChange={setIsClearConfirmOpen}>
                <DialogTrigger asChild>
                  <Button 
                    variant="ghost" 
                    className="flex items-center gap-2 font-bold bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                    Limpar Dia
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle className="text-red-600 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5" />
                      Confirmar Limpeza Total
                    </DialogTitle>
                  </DialogHeader>
                  <div className="py-4 space-y-4">
                    <p className="text-sm text-slate-600">
                      Esta ação apagará <strong>TODOS</strong> os pedidos e notificações do sistema. Esta operação é irreversível.
                    </p>
                    <div className="space-y-2">
                      <Label htmlFor="clear-password">Senha de Administrador</Label>
                      <Input
                        id="clear-password"
                        type="password"
                        value={clearPasswordInput}
                        onChange={(e) => setClearPasswordInput(e.target.value)}
                        placeholder="Digite a senha para confirmar"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsClearConfirmOpen(false)}>Cancelar</Button>
                    <Button onClick={handleDeleteDaily} className="bg-red-600 hover:bg-red-700">
                      Confirmar Exclusão
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <Card className="border-none shadow-xl overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="font-bold text-slate-900 py-4">Pedido</TableHead>
                    <TableHead className="font-bold text-slate-900 py-4">Origem</TableHead>
                    <TableHead className="font-bold text-slate-900 py-4">Destino</TableHead>
                    <TableHead className="font-bold text-slate-900 py-4">Status</TableHead>
                    <TableHead className="font-bold text-slate-900 py-4">Prioridade</TableHead>
                    <TableHead className="font-bold text-slate-900 py-4">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map(order => (
                    <TableRow key={order.id} className="hover:bg-slate-50/50 transition-colors">
                      <TableCell className="font-bold text-slate-900">#{order.orderNumber}</TableCell>
                      <TableCell className="font-medium text-slate-600">{order.originCity}</TableCell>
                      <TableCell className="font-medium text-slate-600">{order.destinationCity}</TableCell>
                      <TableCell>
                        <Badge className={`${STATUS_COLORS[order.status]} text-white border-0 px-2 py-0.5 rounded-lg font-bold shadow-sm text-[10px]`}>
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium text-slate-600 text-xs">
                        <div className="flex items-center gap-2">
                          {order.priority}
                          {order.status !== 'Concluído' && (Date.now() - order.updatedAt > 14400000) && (
                            <Badge variant="destructive" className="animate-pulse text-[9px] px-1 h-3.5">ATRASADO</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => setSelectedOrder(order)} className={`font-bold text-slate-600 hover:${cityColor.text} h-8 px-2 text-xs`}>Ver</Button>
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
    </div>
  );
}
