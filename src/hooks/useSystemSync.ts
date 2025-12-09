import { useState, useEffect, useRef } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { SystemState } from '../types';
import { MOCK_SYSTEM_DATA } from '../constants';

export const useSystemSync = () => {
  // Estado inicial vazio até carregar do servidor
  const [system, setSystem] = useState<SystemState>(MOCK_SYSTEM_DATA);
  
  // Status da sincronização para feedback visual
  const [syncStatus, setSyncStatus] = useState<'synced' | 'saving' | 'error' | 'loading' | 'receiving'>('loading');
  
  // Refs para controle de fluxo (evitar loops infinitos de leitura/escrita)
  const isFirstLoad = useRef(true);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRemoteUpdate = useRef(false);

  // 1. ESCUTAR MUDANÇAS (Download em tempo real)
  useEffect(() => {
    // Referência ao documento único que armazena todo o sistema
    const systemDocRef = doc(db, "system", "main_v1");

    console.log("Iniciando conexão com Firebase...");

    const unsubscribe = onSnapshot(systemDocRef, (docSnap) => {
        if (docSnap.exists()) {
            const remoteData = docSnap.data() as SystemState;
            
            // Verifica se o dado mudou comparado ao estado local atual
            if (JSON.stringify(remoteData) !== JSON.stringify(system)) {
                // Se não estamos no meio de um salvamento local, aceitamos a mudança externa
                if (syncStatus !== 'saving') {
                    console.log("Dados recebidos da nuvem.");
                    setSyncStatus('receiving');
                    isRemoteUpdate.current = true; // Marca flag para não salvar de volta imediatamente
                    setSystem(remoteData);
                    
                    // Pequeno delay para mostrar o status "Recebendo" na UI
                    setTimeout(() => setSyncStatus('synced'), 800);
                }
            } else {
                if (syncStatus === 'loading') setSyncStatus('synced');
            }
        } else {
            console.log("Documento não encontrado. Inicializando banco de dados...");
            // Se o banco estiver vazio, cria o documento inicial
            setDoc(systemDocRef, MOCK_SYSTEM_DATA)
                .then(() => {
                    setSystem(MOCK_SYSTEM_DATA);
                    setSyncStatus('synced');
                })
                .catch((err) => {
                    console.error("Erro ao criar dados iniciais:", err);
                    setSyncStatus('error');
                });
        }
        isFirstLoad.current = false;
    }, (error) => {
        console.error("Erro fatal na conexão Firebase:", error);
        setSyncStatus('error');
    });

    // Cleanup ao desmontar
    return () => unsubscribe();
  }, []); 

  // 2. ENVIAR MUDANÇAS (Upload automático com Debounce)
  useEffect(() => {
    // Ignora o primeiro render ou atualizações que vieram do próprio servidor
    if (isFirstLoad.current || isRemoteUpdate.current) {
        isRemoteUpdate.current = false;
        return;
    }

    // Limpa o timer anterior se houver (Debounce)
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    setSyncStatus('saving');

    // Aguarda 1.5s de inatividade do usuário antes de enviar para o banco
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const systemDocRef = doc(db, "system", "main_v1");
        await setDoc(systemDocRef, system);
        setSyncStatus('synced');
        console.log("Dados salvos com sucesso.");
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
