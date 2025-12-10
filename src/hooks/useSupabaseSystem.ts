import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { AppData } from '../types';
import { saveTenantDataSupabase } from '../services/supabaseService';

export const useSupabaseSystem = (companyId: string | undefined) => {
  const [data, setData] = useState<AppData | null>(null);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'saving' | 'loading' | 'error'>('loading');
  const saveTimeout = useRef<any>(null);
  const isRemoteUpdate = useRef(false);

  // 1. Load & Listen
  useEffect(() => {
    if (!companyId) {
        setSyncStatus('loading');
        return;
    }

    const loadInitial = async () => {
        try {
            const { data: tenant, error } = await supabase
                .from('tenants')
                .select('data')
                .eq('id', companyId)
                .single();
            
            if (error) throw error;
            if (tenant) {
                isRemoteUpdate.current = true;
                setData(tenant.data as AppData);
                setSyncStatus('synced');
            }
        } catch (e) {
            console.error(e);
            setSyncStatus('error');
        }
    };

    loadInitial();

    // Setup Realtime Subscription
    const channel = supabase
        .channel(`public:tenants:id=eq.${companyId}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tenants', filter: `id=eq.${companyId}` }, (payload) => {
            if (payload.new && payload.new.data) {
                // Check if the update is different from local to avoid overwrite loops
                if (syncStatus !== 'saving') {
                    console.log("Recebendo atualização remota Supabase...");
                    isRemoteUpdate.current = true;
                    setData(payload.new.data as AppData);
                }
            }
        })
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
  }, [companyId]);

  // 2. Save Logic
  const updateData = (action: React.SetStateAction<AppData>) => {
    setData(prev => {
        if (!prev) return null;
        const newData = typeof action === 'function' ? (action as any)(prev) : action;
        
        if (companyId) {
            setSyncStatus('saving');
            if (saveTimeout.current) clearTimeout(saveTimeout.current);
            
            saveTimeout.current = setTimeout(async () => {
                try {
                    await saveTenantDataSupabase(companyId, newData);
                    setSyncStatus('synced');
                } catch (e) {
                    console.error("Erro ao salvar no Supabase:", e);
                    setSyncStatus('error');
                }
            }, 1000);
        }
        return newData;
    });
  };

  return { data, updateData, syncStatus };
};
