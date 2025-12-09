import React, { useState, useEffect } from 'react';
import { User, Role } from '../types';
import { X, Trash2, AlertTriangle } from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onSave: (name: string, password: string) => void;
  onDeleteAccount: (password: string) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ 
  isOpen, onClose, currentUser, onSave, onDeleteAccount 
}) => {
  const [profileForm, setProfileForm] = useState<{name: string, password: string}>({ name: '', password: '' });
  const [isDeleteAccountMode, setIsDeleteAccountMode] = useState(false);
  const [deleteConfirmationPassword, setDeleteConfirmationPassword] = useState('');

  // Reseta o formulário quando o modal abre
  useEffect(() => {
    if (isOpen && currentUser) {
        setProfileForm({ name: currentUser.name, password: currentUser.password || '' });
        setIsDeleteAccountMode(false);
        setDeleteConfirmationPassword('');
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[100] animate-page-enter">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Editar Perfil</h2>
                <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>
            
            {!isDeleteAccountMode ? (
                <>
                    <form onSubmit={(e) => { e.preventDefault(); onSave(profileForm.name, profileForm.password); }} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Nome</label>
                            <input 
                                type="text" 
                                required 
                                className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                                value={profileForm.name}
                                onChange={e => setProfileForm({...profileForm, name: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Nova Senha</label>
                            <input 
                                type="password" 
                                className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                                value={profileForm.password}
                                onChange={e => setProfileForm({...profileForm, password: e.target.value})}
                                placeholder="Deixe em branco para manter"
                            />
                        </div>
                        <div className="flex justify-end gap-2 mt-6">
                            <button 
                                type="button" 
                                onClick={onClose}
                                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                            >
                                Cancelar
                            </button>
                            <button 
                                type="submit" 
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                            >
                                Salvar
                            </button>
                        </div>
                    </form>
                    <div className="mt-8 pt-6 border-t border-slate-100">
                        <button 
                            type="button"
                            onClick={() => setIsDeleteAccountMode(true)}
                            className="text-red-500 text-sm hover:text-red-700 hover:underline flex items-center gap-1"
                        >
                            <Trash2 size={14} /> Excluir minha conta
                        </button>
                    </div>
                </>
            ) : (
                <div className="space-y-4">
                    <div className="p-3 bg-red-50 text-red-700 rounded-lg border border-red-100 flex items-start gap-3">
                        <AlertTriangle size={24} className="shrink-0" />
                        <div className="text-sm">
                            <p className="font-bold">Zona de Perigo</p>
                            <p>Tem certeza que deseja excluir sua conta? Esta ação é irreversível.</p>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Confirme sua senha para continuar</label>
                        <input 
                            type="password" 
                            className="w-full p-2 border border-red-300 rounded-lg bg-white focus:ring-red-500 focus:border-red-500"
                            value={deleteConfirmationPassword}
                            onChange={e => setDeleteConfirmationPassword(e.target.value)}
                            placeholder="Sua senha atual"
                        />
                    </div>
                    <div className="flex flex-col gap-2 mt-4">
                        <button 
                            onClick={() => onDeleteAccount(deleteConfirmationPassword)}
                            className="w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition font-medium"
                        >
                            Confirmar Exclusão
                        </button>
                        <button 
                            onClick={() => { setIsDeleteAccountMode(false); setDeleteConfirmationPassword(''); }}
                            className="w-full text-slate-600 py-2 hover:bg-slate-50 rounded-lg"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};
