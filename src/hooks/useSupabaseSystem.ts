import React, { useState, useEffect } from 'react';
import { AppData } from '../types';
import { loadCompanyData } from '../services/supabaseService';

export const useSupabaseSystem = (companyId: string | undefined) => {
  const [data, setData] = useState<AppData | null>(null);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'saving' | 'loading' | 'error'>('loading');

  const refreshData = async () => {
      if (!companyId) return;
      try {
          setSyncStatus('loading');
          const newData = await loadCompanyData(companyId);
          setData(newData);
          setSyncStatus('synced');
      } catch (e) {
          console.error("Sync Error:", e);
          setSyncStatus('error');
      }
  };

  useEffect(() => {
    if (!companyId) {
        setSyncStatus('loading');
        return;
    }
    refreshData();
  }, [companyId]);

  // Wrapper updateData that mimics the old behavior but warns
  // Ideally, components should call setData locally AND call service methods
  const updateData = (action: React.SetStateAction<AppData>) => {
    setData(prev => {
        if (!prev) return null;
        const newData = typeof action === 'function' ? (action as any)(prev) : action;
        // In relational mode, we don't save the WHOLE state anymore.
        // Components must handle the API calls. 
        // This set state just updates the UI optimistically.
        return newData;
    });
  };

  return { data, updateData, syncStatus, refreshData };
};