
import React, { useState } from 'react';
import { Order, OrderStatus, OrderHistory } from '../types';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { STATUS_COLORS, PRIORITY_COLORS, CITY_COLORS } from '../constants';
import { City } from '../types';
import { Clock, MessageSquare, History as HistoryIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface OrderDetailsProps {
  order: Order;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (orderId: string, status: OrderStatus, note: string) => void;
  onDelete?: (orderId: string) => void;
  canEdit: boolean;
  currentCity: string;
}

export default function OrderDetails({ order, isOpen, onClose, onUpdate, onDelete, canEdit, currentCity }: OrderDetailsProps) {
  const [newStatus, setNewStatus] = useState<OrderStatus>(order.status);
  const [note, setNote] = useState('');
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const cityColor = currentCity !== 'Geral' ? CITY_COLORS[currentCity as City] : { primary: 'bg-blue-700' };
  const isDestination = currentCity === order.destinationCity;
  const isAdmin = currentCity === 'Geral'; // Admin city is set to 'Geral' in AdminView
  const hasPermission = isDestination || isAdmin;

  const handleUpdate = () => {
    onUpdate(order.id, newStatus, note);
    setNote('');
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex justify-between items-start pr-8">
            <div>
              <DialogTitle className="text-2xl font-bold">Pedido #{order.orderNumber}</DialogTitle>
              <div className="flex gap-2 mt-2">
                <Badge className={`${STATUS_COLORS[order.status]} text-white`}>{order.status}</Badge>
                <Badge className={PRIORITY_COLORS[order.priority]}>{order.priority}</Badge>
              </div>
            </div>
            <div className="text-right text-sm text-gray-500">
              <p>Origem: {order.originCity}</p>
              <p>Destino: {order.destinationCity}</p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Observações Iniciais
            </h4>
            <p className="text-sm text-gray-600">{order.observations || 'Nenhuma observação.'}</p>
          </div>

          {canEdit && (
            <div className="space-y-4 border-t pt-4">
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-bold text-gray-900">Atualizar Status</h4>
                {!hasPermission && (
                  <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50">
                    Somente {order.destinationCity} pode alterar o status
                  </Badge>
                )}
              </div>
              
              <div className={`grid grid-cols-2 gap-4 ${!hasPermission ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="space-y-2">
                  <Label>Novo Status</Label>
                  <Select value={newStatus} onValueChange={(v) => setNewStatus(v as OrderStatus)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Aguardando separação">Aguardando separação</SelectItem>
                      <SelectItem value="Em separação">Em separação</SelectItem>
                      <SelectItem value="Divergência">Divergência</SelectItem>
                      <SelectItem value="Concluído">Concluído</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Nota / Motivo</Label>
                  <Input 
                    placeholder="Ex: Peça não encontrada" 
                    value={note}
                    onChange={e => setNote(e.target.value)}
                  />
                </div>
              </div>
              {hasPermission && (
                <Button onClick={handleUpdate} className={`w-full ${cityColor.primary} hover:opacity-90`}>
                  Salvar Atualização
                </Button>
              )}
            </div>
          )}

          <div className="space-y-4 border-t pt-4">
            <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <HistoryIcon className="w-4 h-4" />
              Histórico de Movimentações
            </h4>
            <div className="space-y-3">
              {order.history.length === 0 ? (
                <p className="text-sm text-gray-500 italic">Nenhum histórico registrado.</p>
              ) : (
                order.history.map((h, i) => (
                  <div key={i} className="flex gap-3 text-sm">
                    <div className="mt-1">
                      <div className="w-2 h-2 rounded-full bg-blue-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <span className="font-bold text-gray-900">{h.status}</span>
                        <span className="text-xs text-gray-500">
                          {format(h.timestamp, "dd/MM HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                      <p className="text-gray-600">{h.note || 'Sem observações.'}</p>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider">Por: {h.user}</p>
                    </div>
                  </div>
                )).reverse()
              )}
              <div className="flex gap-3 text-sm">
                <div className="mt-1">
                  <div className="w-2 h-2 rounded-full bg-gray-300" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between">
                    <span className="font-bold text-gray-900">Pedido Criado</span>
                    <span className="text-xs text-gray-500">
                      {format(order.createdAt, "dd/MM HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                  <p className="text-gray-600">Aguardando processamento inicial.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="border-t pt-4 flex justify-between items-center bg-white">
          <div className="flex gap-2">
            {onDelete && (
              <Button 
                variant="ghost" 
                className="text-red-600 hover:text-red-700 hover:bg-red-50 font-bold"
                onClick={() => setIsDeleteConfirmOpen(true)}
              >
                Excluir Pedido
              </Button>
            )}
          </div>
          <Button variant="outline" onClick={onClose} className="font-bold">Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="text-red-600">Confirmar Exclusão</DialogTitle>
        </DialogHeader>
        <div className="py-2 text-sm text-gray-600">
          Tem certeza que deseja excluir o pedido <strong>#{order.orderNumber}</strong>? Esta ação é irreversível.
          Se você for ADM, a exclusão será processada após confirmação de senha na tela principal (se aplicável) ou diretamente aqui se o fluxo permitir.
          <p className="mt-2 text-xs font-bold text-red-500 italic">
            Nota: Use o botão de lixeira na tabela principal para excluir com validação de senha.
          </p>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setIsDeleteConfirmOpen(false)}>Cancelar</Button>
          <Button 
            className="bg-red-600 hover:bg-red-700"
            onClick={() => {
              if (onDelete) {
                onDelete(order.id);
                setIsDeleteConfirmOpen(false);
                onClose();
              }
            }}
          >
            Confirmar Exclusão
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>
  );
}
