import { useState, useEffect, useRef } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { SystemState } from '../types';
import { MOCK_SYSTEM_DATA } from '../constants';

export const useFirestoreSystem = () => {
  const [system, setSystem] = useState<SystemState>(MOCK_SYSTEM_DATA);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'saving' | 'error' | 'loading' | 'receiving'>('loading');
  
  // Refs to track state without triggering re-renders or stale closures in listeners
  const systemRef = useRef(system);
  const isFirstLoad = useRef(true);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRemoteUpdate = useRef(false);

  // Update ref whenever state changes
  useEffect(() => {
    systemRef.current = system;
  }, [system]);

  // 1. ESCUTAR MUDANÇAS DA NUVEM (Download Automático)
  useEffect(() => {
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
            
            // Compare remote data with CURRENT (Ref) local data
            // This prevents stale closures from overwriting new local changes with old initial state
            if (JSON.stringify(remoteData) !== JSON.stringify(systemRef.current)) {
                // If we are currently saving, we might ignore this to avoid echo, 
                // OR we might need to merge. For simple overwrite logic:
                if (syncStatus !== 'saving') {
                    console.log("Recebendo atualização da nuvem...");
                    setSyncStatus('receiving');
                    isRemoteUpdate.current = true; 
                    setSystem(remoteData);
                    setTimeout(() => setSyncStatus('synced'), 500);
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
                    console.error("Erro ao criar banco inicial:", err);
                    setSyncStatus('error');
                });
        }
        isFirstLoad.current = false;
    }, (error) => {
        console.error("Erro de conexão Firestore:", error.message);
        setSyncStatus('error'); 
        isFirstLoad.current = false;
    });

    return () => unsubscribe();
  }, []); 

  // 2. ENVIAR MUDANÇAS PARA NUVEM (Upload Automático)
  useEffect(() => {
    // Skip save if it's the first load or if the change came from the server
    if (isFirstLoad.current || isRemoteUpdate.current) {
        isRemoteUpdate.current = false;
        return;
    }

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    setSyncStatus('saving');

    // Debounce reduced to 1.0s for snappier sync
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        if (!db.app.options.apiKey) return;
        
        const systemDocRef = doc(db, "system", "main_v1");
        await setDoc(systemDocRef, system);
        setSyncStatus('synced');
      } catch (e) {
        console.error("Erro ao salvar no Firebase:", e);
        setSyncStatus('error');
      }
    }, 1000); 

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [system]);

  return { system, setSystem, syncStatus };
};