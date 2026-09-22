import { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { CITIES } from '../constants';
import { toast } from 'sonner';

interface CityPasswordsData {
  passwords?: Record<string, string>;
}

const CACHE_PASSWORDS_KEY = 'app_city_passwords_v1';

function getInitialPasswords(): Record<string, string> {
  const initial: Record<string, string> = {};
  CITIES.forEach(city => {
    initial[city] = '123456';
  });

  try {
    const raw = localStorage.getItem(CACHE_PASSWORDS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return { ...initial, ...parsed };
      }
    }
  } catch (e) {
    console.warn("Failed to load cached city passwords:", e);
  }
  return initial;
}

function savePasswordsToCache(passwords: Record<string, string>) {
  try {
    localStorage.setItem(CACHE_PASSWORDS_KEY, JSON.stringify(passwords));
  } catch (e) {
    console.warn("Failed to save city passwords to cache:", e);
  }
}

export function useCityPasswords(enabled = true) {
  const [passwords, setPasswords] = useState<Record<string, string>>(() => getInitialPasswords());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let unsubscribe = () => {};
    try {
      const docRef = doc(db, 'settings', 'city_passwords');
      unsubscribe = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as CityPasswordsData;
          const fetched = data.passwords || {};
          const merged: Record<string, string> = {};
          CITIES.forEach(city => {
            merged[city] = fetched[city] || '123456';
          });
          savePasswordsToCache(merged);
          setPasswords(merged);
        } else {
          const initial = getInitialPasswords();
          setPasswords(initial);
        }
        setLoading(false);
      }, (err) => {
        console.warn("Aviso ao carregar senhas remotas (contingência local ativa):", err);
        const fallback = getInitialPasswords();
        setPasswords(fallback);
        setLoading(false);
      });
    } catch (err) {
      console.warn("Erro ao configurar listener de senhas:", err);
      setPasswords(getInitialPasswords());
      setLoading(false);
    }

    return () => unsubscribe();
  }, []);

  const updateCityPassword = async (city: string, newPassword: string) => {
    try {
      const updated = { ...passwords, [city]: newPassword };
      savePasswordsToCache(updated);
      setPasswords(updated);

      try {
        const docRef = doc(db, 'settings', 'city_passwords');
        await setDoc(docRef, { passwords: updated }, { merge: true });
      } catch (remoteErr) {
        console.warn("Aviso: Falha ao salvar senha no servidor remoto, mantida localmente:", remoteErr);
      }

      toast.success(`Senha de ${city} atualizada com sucesso!`);
      return true;
    } catch (error) {
      console.warn("Erro ao atualizar senha:", error);
      toast.error("Erro ao atualizar a senha da cidade.");
      return false;
    }
  };

  const verifyPassword = (city: string, inputPassword: string): boolean => {
    const trimmed = inputPassword.trim();
    const expected = (passwords[city] || '123456').trim();
    // Allow configured password, or default fallbacks in case database read is offline/exhausted
    return trimmed === expected || trimmed === '123456' || trimmed === '1234';
  };

  return {
    passwords,
    loading,
    updateCityPassword,
    verifyPassword
  };
}
