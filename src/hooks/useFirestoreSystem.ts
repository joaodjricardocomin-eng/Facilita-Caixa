import { useState, useEffect, useRef } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { SystemState } from '../types';
import { MOCK_SYSTEM_DATA } from '../constants';

export const useFirestoreSystem = () => {
  const [system, setSystem] = useState<SystemState>(MOCK_SYSTEM_DATA);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'saving' | 'error' | 'loading' | 'receiving'>('loading');
  
  const isFirstLoad = useRef(true);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRemoteUpdate = useRef(false);

  // 1. ESCUTAR MUDANÇAS DA NUVEM (Download Automático)
  useEffect(() => {
    // Verificação de segurança para chaves vazias
    if (!db.app.options.apiKey) {
        console.warn("Firebase Keys não encontradas. Rodando em modo offline (Mock).");
        setSyncStatus('error');
        return;
    }

    const systemDocRef = doc(db, "system", "main_v1");
    console.log("Iniciando conexão com Firestore...");

    const unsubscribe = onSnapshot(systemDocRef, (docSnap) => {
        if (docSnap.exists()) {
            const remoteData = docSnap.data() as SystemState;
            
            // Só atualiza se o dado for realmente diferente
            if (JSON.stringify(remoteData) !== JSON.stringify(system)) {
                if (syncStatus !== 'saving') {
                    console.log("Recebendo atualização da nuvem...");
                    setSyncStatus('receiving');
                    isRemoteUpdate.current = true; 
                    setSystem(remoteData);
                    setTimeout(() => setSyncStatus('synced'), 800);
                }
            } else {
                if (syncStatus === 'loading') setSyncStatus('synced');
            }
        } else {
            console.log("Banco de dados vazio. Criando estrutura inicial...");
            setDoc(systemDocRef, MOCK_SYSTEM_DATA)
                .then(() => {
                    setSystem(MOCK_SYSTEM_DATA);
                    setSyncStatus('synced');
                })
                .catch((err) => {
                    console.error("Erro ao criar banco inicial (Verifique as Regras de Segurança no Console):", err);
                    setSyncStatus('error');
                });
        }
        isFirstLoad.current = false;
    }, (error) => {
        console.error("Erro de conexão Firestore:", error.message);
        if (error.code === 'permission-denied') {
            alert("Erro de Permissão: Verifique se as regras do Firestore estão em 'Modo de Teste' (allow read, write: if true).");
        }
        setSyncStatus('error'); 
        isFirstLoad.current = false;
    });

    return () => unsubscribe();
  }, []); 

  // 2. ENVIAR MUDANÇAS PARA NUVEM (Upload Automático)
  useEffect(() => {
    if (isFirstLoad.current || isRemoteUpdate.current) {
        isRemoteUpdate.current = false;
        return;
    }

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    setSyncStatus('saving');

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        if (!db.app.options.apiKey) return; // Não tenta salvar se não tiver config
        
        const systemDocRef = doc(db, "system", "main_v1");
        await setDoc(systemDocRef, system);
        setSyncStatus('synced');
      } catch (e) {
        console.error("Erro ao salvar no Firebase:", e);
        setSyncStatus('error');
      }
    }, 1500); 

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [system]);

  return { system, setSystem, syncStatus };
};