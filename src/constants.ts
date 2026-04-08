
import { City, Role, OrderStatus, Priority } from './types';

export const CITIES: City[] = [
  'Pirassununga',
  'Porto Ferreira',
  'Palmeiras',
  'Descalvado',
  'Santa Rita'
];

export const CITY_COLORS: Record<City, { primary: string, bg: string, text: string, border: string }> = {
  'Pirassununga': { primary: 'bg-blue-700', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  'Porto Ferreira': { primary: 'bg-emerald-700', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  'Palmeiras': { primary: 'bg-purple-700', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  'Descalvado': { primary: 'bg-orange-700', bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  'Santa Rita': { primary: 'bg-rose-700', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' }
};

export const ROLES: Role[] = [
  'Estoquista',
  'Administrador'
];

export const STATUS_COLORS: Record<OrderStatus, string> = {
  'Aguardando separação': 'bg-gray-500',
  'Em separação': 'bg-yellow-500',
  'Divergência': 'bg-red-500',
  'Concluído': 'bg-green-500'
};

export const PRIORITY_COLORS: Record<Priority, string> = {
  'Baixa': 'bg-blue-200 text-blue-800',
  'Normal': 'bg-gray-200 text-gray-800',
  'Urgente': 'bg-orange-200 text-orange-800'
};
