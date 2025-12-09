import React, { useState, useEffect, useRef } from 'react';
import { AppData } from '../types';
import { Building, Upload, Save, Trash2, Download, Database, AlertTriangle } from 'lucide-react';

interface SettingsProps {
  data: AppData;
  setData: React.Dispatch<React.SetStateAction<AppData>>;
  onNotification: (message: string, type: 'success' | 'error') => void;
}

export const Settings: React.FC<SettingsProps> = ({ data, setData, onNotification }) => {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (data.companySettings) {
      setName(data.companySettings.name || '');
      setAddress(data.companySettings.address || '');
      setLogoPreview(data.companySettings.logoBase64 || null);
    }
  }, [data]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setLogoPreview(null);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setData(prev => ({
      ...prev,
      companySettings: {
        name,
        address,
        logoBase64: logoPreview || undefined
      }
    }));
    onNotification('Configurações salvas com sucesso!', 'success');
  };

  // --- Backup Functions ---
  const handleExportData = () => {
    const dataStr = JSON.stringify(data, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup_facilita_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    onNotification('Backup baixado com sucesso! Salve este arquivo no seu servidor.', 'success');
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        
        // Basic validation check
        if (json.users && json.clients && json.records) {
            if(window.confirm("ATENÇÃO: Isso irá substituir TODOS os dados atuais pelos dados do arquivo. Deseja continuar?")) {
                setData(json as AppData);
                onNotification('Dados restaurados com sucesso!', 'success');
            }
        } else {
            onNotification('Arquivo de backup inválido.', 'error');
        }
      } catch (err) {
        console.error(err);
        onNotification('Erro ao ler o arquivo.', 'error');
      }
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6 flex items-center gap-3">
        <div className="p-3 bg-indigo-100 text-indigo-600 rounded-lg">
           <Building size={24} />
        </div>
        <div>
           <h1 className="text-2xl font-bold text-slate-800">Configurações da Empresa</h1>
           <p className="text-slate-500">Gerencie dados e backups</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Company Settings */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
            <h2 className="text-lg font-bold text-slate-800 mb-6 border-b border-slate-100 pb-2">Dados Institucionais</h2>
            <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Logo Section */}
                <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50">
                    <h3 className="text-sm font-medium text-slate-700 mb-4">Logomarca</h3>
                    {logoPreview ? (
                        <div className="relative group">
                            <img 
                                src={logoPreview} 
                                alt="Logo Preview" 
                                className="h-32 object-contain mb-4 rounded-lg bg-white shadow-sm p-2" 
                            />
                            <button 
                                type="button"
                                onClick={handleRemoveLogo}
                                className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow hover:bg-red-600 transition"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center text-slate-400 mb-4">
                            <Upload size={48} className="mb-2 opacity-50" />
                            <span className="text-xs">Nenhuma imagem selecionada</span>
                        </div>
                    )}
                    <label className="cursor-pointer bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50 transition text-sm font-medium shadow-sm">
                        Selecionar Imagem
                        <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={handleLogoUpload}
                        />
                    </label>
                </div>

                {/* Fields Section */}
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Nome da Empresa</label>
                        <input 
                            type="text" 
                            required
                            className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="Ex: Facilita Contabilidade"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Endereço / Cabeçalho</label>
                        <textarea 
                            className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none h-32 resize-none bg-white"
                            value={address}
                            onChange={e => setAddress(e.target.value)}
                            placeholder="Ex: Rua das Flores, 123 - Centro&#10;São Paulo - SP&#10;CNPJ: 00.000.000/0001-00"
                        />
                    </div>
                </div>
            </div>

            <div className="pt-6 border-t border-slate-100 flex justify-end">
                <button 
                    type="submit"
                    className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition font-medium shadow-sm"
                >
                    <Save size={20} /> Salvar Alterações
                </button>
            </div>
            </form>
        </div>

        {/* Data Management Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
            <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-2">
                <Database className="text-indigo-600" size={20} />
                <h2 className="text-lg font-bold text-slate-800">Gerenciamento de Dados (Backup)</h2>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-start gap-3">
                <AlertTriangle className="text-blue-600 shrink-0 mt-0.5" size={20} />
                <div className="text-sm text-blue-800">
                    <p className="font-bold mb-1">Como usar no Servidor:</p>
                    <p>Como este sistema roda no navegador, os dados ficam salvos apenas no computador atual.</p>
                    <p className="mt-1">Para compartilhar dados via servidor:</p>
                    <ol className="list-decimal list-inside ml-2 mt-1 space-y-1">
                        <li>Clique em <b>Baixar Backup</b> e salve o arquivo na pasta do servidor.</li>
                        <li>No outro computador, clique em <b>Restaurar Backup</b> e selecione esse arquivo.</li>
                    </ol>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4">
                <button 
                    onClick={handleExportData}
                    className="flex-1 flex items-center justify-center gap-3 bg-white border-2 border-slate-200 text-slate-700 px-6 py-4 rounded-xl hover:border-indigo-500 hover:text-indigo-600 transition group"
                >
                    <div className="bg-slate-100 p-2 rounded-lg group-hover:bg-indigo-50 transition">
                        <Download size={24} />
                    </div>
                    <div className="text-left">
                        <span className="block font-bold">Baixar Backup</span>
                        <span className="text-xs text-slate-500">Salvar dados atuais em arquivo</span>
                    </div>
                </button>

                <label className="flex-1 flex items-center justify-center gap-3 bg-white border-2 border-slate-200 text-slate-700 px-6 py-4 rounded-xl hover:border-indigo-500 hover:text-indigo-600 transition group cursor-pointer">
                    <div className="bg-slate-100 p-2 rounded-lg group-hover:bg-indigo-50 transition">
                        <Upload size={24} />
                    </div>
                    <div className="text-left">
                        <span className="block font-bold">Restaurar Backup</span>
                        <span className="text-xs text-slate-500">Carregar dados de um arquivo</span>
                    </div>
                    <input 
                        ref={fileInputRef}
                        type="file" 
                        accept=".json"
                        className="hidden"
                        onChange={handleImportData}
                    />
                </label>
            </div>
        </div>
      </div>
    </div>
  );
};