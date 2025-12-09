import React, { useState } from 'react';
import { AppData, User, Role } from '../types';
import { Plus, Trash2, Edit2, Shield, AlertTriangle, X, Info } from 'lucide-react';

interface UserManagerProps {
  data: AppData;
  setData: React.Dispatch<React.SetStateAction<AppData>>;
  currentUser: User;
}

export const UserManager: React.FC<UserManagerProps> = ({ data, setData, currentUser }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Partial<User>>({});
  const [isEditMode, setIsEditMode] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  
  // New State for Self Delete Alert
  const [showSelfDeleteAlert, setShowSelfDeleteAlert] = useState(false);

  const handleOpenModal = (user?: User) => {
    if (user) {
      setEditingUser({ ...user });
      setIsEditMode(true);
    } else {
      setEditingUser({ role: Role.USER });
      setIsEditMode(false);
    }
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser.name || !editingUser.email || !editingUser.role) return;

    if (isEditMode && editingUser.id) {
      setData(prev => ({
        ...prev,
        users: prev.users.map(u => u.id === editingUser.id ? { ...editingUser, id: u.id } as User : u)
      }));
    } else {
      const newUser: User = {
        id: `u${Date.now()}`,
        name: editingUser.name!,
        email: editingUser.email!,
        role: editingUser.role!,
        password: editingUser.password || '123456', // Default password
      };
      setData(prev => ({
        ...prev,
        users: [...prev.users, newUser]
      }));
    }
    setIsModalOpen(false);
  };

  const requestDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (id === currentUser.id) {
        setShowSelfDeleteAlert(true);
        return;
    }
    setUserToDelete(id);
  };

  const confirmDelete = () => {
    if (userToDelete) {
        setData(prev => ({
            ...prev,
            users: prev.users.filter(u => u.id !== userToDelete)
        }));
        setUserToDelete(null);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Gerenciar Usuários</h1>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition transform hover:scale-105"
        >
          <Plus size={20} /> Novo Usuário
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-500 text-sm font-medium border-b border-slate-200">
            <tr>
              <th className="p-4">Nome</th>
              <th className="p-4">Email</th>
              <th className="p-4">Função</th>
              <th className="p-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.users.map(user => (
              <tr key={user.id} className="hover:bg-slate-50 transition">
                <td className="p-4 font-medium text-slate-800">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                            {user.name.charAt(0)}
                        </div>
                        {user.name}
                        {user.id === currentUser.id && <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">Você</span>}
                    </div>
                </td>
                <td className="p-4 text-slate-600">{user.email}</td>
                <td className="p-4">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold
                    ${user.role === Role.MANAGER ? 'bg-purple-50 text-purple-700' : 
                      user.role === Role.SUPERVISOR ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-700'}
                  `}>
                    <Shield size={12} />
                    {user.role}
                  </span>
                </td>
                <td className="p-4 text-right flex justify-end gap-2">
                  <button onClick={() => handleOpenModal(user)} className="text-slate-400 hover:text-indigo-600 p-1 hover:bg-indigo-50 rounded">
                    <Edit2 size={18} />
                  </button>
                  <button onClick={(e) => requestDelete(user.id, e)} className="text-slate-400 hover:text-red-600 p-1 hover:bg-red-50 rounded">
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">{isEditMode ? 'Editar Usuário' : 'Novo Usuário'}</h2>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome</label>
                <input 
                  type="text" 
                  required 
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                  value={editingUser.name || ''}
                  onChange={e => setEditingUser({...editingUser, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input 
                  type="email" 
                  required 
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                  value={editingUser.email || ''}
                  onChange={e => setEditingUser({...editingUser, email: e.target.value})}
                />
              </div>
              {!isEditMode && (
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Senha Inicial</label>
                    <input 
                    type="text" 
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                    placeholder="Padrão: 123456"
                    value={editingUser.password || ''}
                    onChange={e => setEditingUser({...editingUser, password: e.target.value})}
                    />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Função</label>
                <select 
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white disabled:bg-slate-100 disabled:text-slate-500"
                  value={editingUser.role || Role.USER}
                  onChange={e => setEditingUser({...editingUser, role: e.target.value as Role})}
                  disabled={editingUser.id === currentUser.id} // Disable changing own role
                >
                  <option value={Role.USER}>Assistente</option>
                  <option value={Role.SUPERVISOR}>Supervisor</option>
                  <option value={Role.MANAGER}>Gestor</option>
                </select>
                {editingUser.id === currentUser.id && (
                    <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                        <AlertTriangle size={12} /> Você não pode alterar sua própria função.
                    </p>
                )}
              </div>
              
              <div className="flex justify-end gap-2 mt-6">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
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
          </div>
        </div>
      )}

      {/* Modal de Alerta de Auto-Exclusão */}
      {showSelfDeleteAlert && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 relative border-l-4 border-amber-500">
                  <div className="flex items-start gap-3">
                      <div className="p-2 bg-amber-100 text-amber-600 rounded-full">
                          <Info size={24} />
                      </div>
                      <div>
                          <h3 className="text-lg font-bold text-slate-800">Ação não permitida</h3>
                          <p className="text-slate-600 text-sm mt-2">
                              Você não pode excluir sua própria conta nesta tela de gerenciamento.
                          </p>
                          <p className="text-slate-500 text-sm mt-2">
                              Para excluir sua conta permanentemente, acesse seu <b>Perfil</b> no menu lateral e procure a opção na zona de perigo.
                          </p>
                      </div>
                  </div>
                  <div className="mt-6 flex justify-end">
                      <button 
                          onClick={() => setShowSelfDeleteAlert(false)}
                          className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition font-medium text-sm"
                      >
                          Entendi
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Modal de Confirmação de Exclusão (Outros Usuários) */}
      {userToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
                    <AlertTriangle size={24} />
                </div>
                <h2 className="text-xl font-bold text-slate-800 mb-2">Excluir Usuário?</h2>
                <p className="text-slate-500 mb-6">
                    Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.
                </p>
                <div className="flex gap-3 w-full">
                    <button 
                        onClick={() => setUserToDelete(null)}
                        className="flex-1 px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition font-medium"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={confirmDelete}
                        className="flex-1 px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg transition font-medium"
                    >
                        Excluir
                    </button>
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};