import { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { CITIES } from '../constants';
import { toast } from 'sonner';

interface CityPasswordsData {
  passwords?: Record<string, string>;
}

export function useCityPasswords() {
  const [passwords, setPasswords] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const docRef = doc(db, 'settings', 'city_passwords');
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as CityPasswordsData;
        const fetched = data.passwords || {};
        // Garantir valor padrão '123456' para cidades que ainda não tenham senha definida
        const merged: Record<string, string> = {};
        CITIES.forEach(city => {
          merged[city] = fetched[city] || '123456';
        });
        setPasswords(merged);
      } else {
        // Se o documento não existir, todas usam '123456'
        const initial: Record<string, string> = {};
        CITIES.forEach(city => {
          initial[city] = '123456';
        });
        setPasswords(initial);
      }
      setLoading(false);
    }, (err) => {
      console.error("Erro ao carregar senhas das cidades:", err);
      // Fallback
      const initial: Record<string, string> = {};
      CITIES.forEach(city => {
        initial[city] = '123456';
      });
      setPasswords(initial);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const updateCityPassword = async (city: string, newPassword: string) => {
    try {
      const docRef = doc(db, 'settings', 'city_passwords');
      const updated = { ...passwords, [city]: newPassword };
      await setDoc(docRef, { passwords: updated }, { merge: true });
      toast.success(`Senha de ${city} atualizada com sucesso!`);
      return true;
    } catch (error) {
      console.error("Erro ao atualizar senha:", error);
      toast.error("Erro ao atualizar a senha da cidade.");
      return false;
    }
  };

  const verifyPassword = (city: string, inputPassword: string): boolean => {
    const expected = passwords[city] || '123456';
    return inputPassword.trim() === expected;
  };

  return {
    passwords,
    loading,
    updateCityPassword,
    verifyPassword
  };
}
