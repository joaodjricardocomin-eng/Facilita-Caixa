import React, { useState, useEffect, useRef } from 'react';
import { doc, onSnapshot, collection } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { AppData, Company, User } from '../types';
import { initializeDatabase, saveTenantData } from '../services/firestoreService';

// Hook simplificado para gerenciar dados de UMA empresa (Tenant)
export const useTenantData = (companyId: string | undefined) => {
  const [data, setData] = useState<AppData | null>(null);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'saving' | 'loading' | 'error'>('loading');
  const saveTimeout = useRef<any>(null);
  const isRemoteUpdate = useRef(false);

  // Load / Sync Logic
  useEffect(() => {
    if (!companyId) return;

    setSyncStatus('loading');
    const unsub = onSnapshot(doc(db, 'companies', companyId), (docSnap) => {
      if (docSnap.exists()) {
        const company = docSnap.data() as Company;
        // Evita loop se a gente acabou de salvar
        if (syncStatus !== 'saving') {
            isRemoteUpdate.current = true;
            setData(company.data);
            setSyncStatus('synced');
        }
      } else {
        setSyncStatus('error');
      }
    }, (err) => {
        console.error(err);
        setSyncStatus('error');
    });

    return () => unsub();
  }, [companyId]);

  // Save Logic (Debounced)
  const updateData = (action: React.SetStateAction<AppData>) => {
    setData(prev => {
        if (!prev) return null;
        const newData = typeof action === 'function' ? (action as any)(prev) : action;
        
        // Trigger Save
        if (companyId) {
            setSyncStatus('saving');
            if (saveTimeout.current) clearTimeout(saveTimeout.current);
            
            saveTimeout.current = setTimeout(async () => {
                try {
                    await saveTenantData(companyId, newData);
                    setSyncStatus('synced');
                } catch (e) {
                    console.error(e);
                    setSyncStatus('error');
                }
            }, 1000);
        }
        return newData;
    });
  };

  return { data, updateData, syncStatus };
};

// Hook para o Master (Admin) ver tudo
export const useMasterSystem = () => {
    const [companies, setCompanies] = useState<Company[]>([]);
    const [masterUsers, setMasterUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Init DB structure if empty
        initializeDatabase();

        // 1. Listen to Companies
        const unsubComp = onSnapshot(collection(db, 'companies'), (snap) => {
            const comps = snap.docs.map(d => d.data() as Company);
            setCompanies(comps);
            setLoading(false);
        });

        // 2. Listen to Masters
        const unsubMaster = onSnapshot(doc(db, 'master', 'config'), (snap) => {
            if (snap.exists()) {
                setMasterUsers(snap.data().users);
            }
        });

        return () => {
            unsubComp();
            unsubMaster();
        };
    }, []);

    return { companies, masterUsers, loading };
};