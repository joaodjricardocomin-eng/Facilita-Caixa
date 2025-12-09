import { useState, useEffect, useRef } from 'react';
import { SystemState } from '../types';
import { MOCK_SYSTEM_DATA } from '../constants';

const STORAGE_KEY = 'facilita_caixa_db_v1';

export const useLocalStorageSystem = () => {
  // Estado inicial
  const [system, setSystem] = useState<SystemState>(MOCK_SYSTEM_DATA);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'saving' | 'error' | 'loading'>('loading');
  
  const isFirstLoad = useRef(true);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 1. Carregar dados ao iniciar
  useEffect(() => {
    const loadData = () => {
      try {
        const savedData = localStorage.getItem(STORAGE_KEY);
        if (savedData) {
          setSystem(JSON.parse(savedData));
        } else {
          // Se não existir, salva o mock inicial
          localStorage.setItem(STORAGE_KEY, JSON.stringify(MOCK_SYSTEM_DATA));
          setSystem(MOCK_SYSTEM_DATA);
        }
        setSyncStatus('synced');
      } catch (error) {
        console.error("Erro ao carregar dados locais:", error);
        setSyncStatus('error');
      }
    };

    // Simula um pequeno delay de carregamento para UX
    setTimeout(loadData, 500);
  }, []);

  // 2. Salvar dados quando houver mudança
  useEffect(() => {
    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      return;
    }

    setSyncStatus('saving');
    
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(system));
        setSyncStatus('synced');
      } catch (error) {
        console.error("Erro ao salvar dados:", error);
        setSyncStatus('error');
      }
    }, 800); // Delay para evitar salvar a cada tecla digitada

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [system]);

  return { system, setSystem, syncStatus };
};
