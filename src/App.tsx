
import React, { useState, useEffect } from 'react';
import { City, Role, UserSession } from './types';
import { CITIES, ROLES } from './constants';
import { Button } from './components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner';
import { Building2, UserCircle2, ShieldCheck, LogOut, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import EstoquistaView from './components/EstoquistaView';
import AdminView from './components/AdminView';
import { CITY_COLORS } from './constants';

export default function App() {
  const [session, setSession] = useState<UserSession | null>(null);
  const [selectedCity, setSelectedCity] = useState<City | ''>('');
  const [selectedRole, setSelectedRole] = useState<Role | ''>('');
  const [isAdminConfirming, setIsAdminConfirming] = useState(false);

  const cityColor = session ? CITY_COLORS[session.city] : null;

  const handleLogin = () => {
    if (!selectedCity || !selectedRole) {
      toast.error('Selecione uma cidade e um modo de acesso.');
      return;
    }

    if (selectedRole === 'Administrador') {
      setIsAdminConfirming(true);
      return;
    }

    setSession({
      city: selectedCity as City,
      role: selectedRole as Role,
      isAdmin: false
    });
    toast.success(`Bem-vindo, Malachias ${selectedCity}!`);
  };

  const confirmAdmin = () => {
    setSession({
      city: selectedCity as City,
      role: 'Administrador',
      isAdmin: true
    });
    setIsAdminConfirming(false);
    toast.success('Modo Administrador ativado.');
  };

  const handleLogout = () => {
    setSession(null);
    setSelectedCity('');
    setSelectedRole('');
    toast.info('Sessão encerrada.');
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Toaster position="top-center" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <Card className="border-t-4 border-t-blue-700 shadow-xl">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Building2 className="w-8 h-8 text-blue-700" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900">Malachias AutoPendencias</CardTitle>
              <CardDescription>Selecione sua unidade e modo de acesso</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 flex flex-col items-center">
              <div className="space-y-2 w-full text-center">
                <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Cidade</label>
                <Select value={selectedCity} onValueChange={(v) => setSelectedCity(v as City)}>
                  <SelectTrigger className="w-full justify-center text-center">
                    <SelectValue placeholder="Selecione a cidade" />
                  </SelectTrigger>
                  <SelectContent>
                    {CITIES.map(city => (
                      <SelectItem 
                        key={city} 
                        value={city}
                        className={`${CITY_COLORS[city].text} font-bold focus:bg-gray-100`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${CITY_COLORS[city].primary}`} />
                          {city}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 w-full text-center">
                <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Modo de Acesso</label>
                <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as Role)}>
                  <SelectTrigger className="w-full justify-center text-center">
                    <SelectValue placeholder="Selecione o modo" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map(role => (
                      <SelectItem key={role} value={role}>{role}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                className={`w-full ${selectedCity ? CITY_COLORS[selectedCity as City].primary : 'bg-blue-700'} hover:opacity-90 text-white font-bold py-6 transition-colors duration-300`}
                onClick={handleLogin}
              >
                Entrar no Sistema
              </Button>
            </CardFooter>
          </Card>
        </motion.div>

        <AnimatePresence>
          {isAdminConfirming && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-lg p-6 max-w-sm w-full shadow-2xl"
              >
                <div className="flex items-center gap-3 mb-4 text-orange-600">
                  <ShieldCheck className="w-6 h-6" />
                  <h3 className="text-lg font-bold">Confirmação de Administrador</h3>
                </div>
                <p className="text-gray-600 mb-6">
                  Você está tentando acessar o modo administrador. Deseja continuar?
                </p>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => setIsAdminConfirming(false)}>
                    Cancelar
                  </Button>
                  <Button className="flex-1 bg-orange-600 hover:bg-orange-700" onClick={confirmAdmin}>
                    Confirmar
                  </Button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              <Building2 className="w-6 h-6 text-blue-700" />
              <span className="font-bold text-xl text-gray-900 hidden sm:inline">Malachias AutoPendencias</span>
              <span className="font-bold text-xl text-gray-900 sm:hidden">Malachias</span>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-gray-900">{session.city}</p>
                <p className="text-xs text-gray-500">{session.role}</p>
              </div>
              <div className="h-8 w-px bg-gray-200 mx-2 hidden sm:block"></div>
              <Button variant="ghost" size="icon" onClick={handleLogout} className="text-gray-500 hover:text-red-600">
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>
      
      <div className={`${cityColor?.primary || 'bg-blue-700'} text-white py-2 px-4 shadow-inner transition-colors duration-500`}>
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 text-sm font-bold uppercase tracking-widest">
          <Building2 className="w-4 h-4" />
          Você está logado na unidade: <span className="underline decoration-2 underline-offset-4">{session.city}</span>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {session.role === 'Administrador' && <AdminView />}
        {session.role === 'Estoquista' && <EstoquistaView currentCity={session.city} role={session.role} />}
      </main>
    </div>
  );
}
