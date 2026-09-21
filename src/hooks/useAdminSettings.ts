
import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
import { toast } from 'sonner';

const ADMIN_PWD_KEY = 'app_admin_pwd_v1';

export function useAdminSettings(enabled = true) {
  const [adminPassword, setAdminPassword] = useState<string>(() => {
    try {
      return localStorage.getItem(ADMIN_PWD_KEY) || '1234';
    } catch {
      return '1234';
    }
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let unsubscribe = () => {};
    try {
      unsubscribe = onSnapshot(doc(db, 'settings', 'admin'), (docSnap) => {
        if (docSnap.exists()) {
          const pwd = docSnap.data().password || '1234';
          setAdminPassword(pwd);
          try {
            localStorage.setItem(ADMIN_PWD_KEY, pwd);
          } catch {}
        } else {
          // Initialize if not exists
          setDoc(doc(db, 'settings', 'admin'), { password: '1234' }).catch(() => {});
        }
        setLoading(false);
      }, (err) => {
        console.warn("Could not fetch admin settings (quota/offline):", err);
        setLoading(false);
      });
    } catch (e) {
      console.warn("Error subscribing to admin settings:", e);
      setLoading(false);
    }

    return () => unsubscribe();
  }, []);

  const updatePassword = async (newPassword: string) => {
    try {
      setAdminPassword(newPassword);
      try {
        localStorage.setItem(ADMIN_PWD_KEY, newPassword);
      } catch {}

      try {
        await setDoc(doc(db, 'settings', 'admin'), { password: newPassword });
      } catch (remoteErr) {
        console.warn("Aviso: Falha ao salvar senha admin no servidor remoto, salva localmente:", remoteErr);
      }
      toast.success('Senha de administrador atualizada com sucesso!');
    } catch (error) {
      console.warn('Error updating password:', error);
      toast.error('Erro ao atualizar senha.');
    }
  };

  return { adminPassword, updatePassword, loading };
}
