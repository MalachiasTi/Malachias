
import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
import { toast } from 'sonner';

export function useAdminSettings() {
  const [adminPassword, setAdminPassword] = useState<string>('1234'); // Default password
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'admin'), (docSnap) => {
      if (docSnap.exists()) {
        setAdminPassword(docSnap.data().password || '1234');
      } else {
        // Initialize if not exists
        setDoc(doc(db, 'settings', 'admin'), { password: '1234' });
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const updatePassword = async (newPassword: string) => {
    try {
      await setDoc(doc(db, 'settings', 'admin'), { password: newPassword });
      toast.success('Senha de administrador atualizada com sucesso!');
    } catch (error) {
      console.error('Error updating password:', error);
      toast.error('Erro ao atualizar senha.');
    }
  };

  return { adminPassword, updatePassword, loading };
}
