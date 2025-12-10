import React, { useState } from 'react';
import { SystemState, Company, Role, User } from '../../types';
import { Building, Power, Trash2, Edit2, LogOut, Plus, Search, ShieldCheck } from 'lucide-react';
import { createCompany, updateCompanyMetadata, deleteCompany, addMasterUser, removeMasterUser } from '../../services/firestoreService';

interface CompanyManagerProps {
  system: SystemState; // We still pass the "View" of the system
  onLogout: () => void;
  currentUser?: User;
}

export const CompanyManager: React.FC<CompanyManagerProps> = ({ system, onLogout, currentUser }) => {
  const [activeTab, setActiveTab] = useState<'companies' | 'admins'>('companies');
  const [searchTerm, setSearchTerm] = useState('');
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Partial<Company>>({});
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ name: '', email: '', password: '' });

  const filteredCompanies = system.companies.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.id.includes(searchTerm)
  );

  const handleToggleStatus = async (company: Company) => {
    try {
        await updateCompanyMetadata(company.id, { active: !company.active });
    } catch (e) {
        alert("Erro ao atualizar status");
    }
  };

  const handleDeleteCompany = async (companyId: string) => {
    if (window.confirm("Tem certeza que deseja excluir esta empresa e TODOS os seus dados?")) {
        try {
            await deleteCompany(companyId);
        } catch (e) {
            alert("Erro ao excluir empresa");
        }
    }
  };

  const handleEditCompany = (company: Company) => {
      setEditingCompany(company);
      setIsCompanyModalOpen(true);
  };

  const handleSaveCompany = async () => {
      if (editingCompany.id) {
          try {
            await updateCompanyMetadata(editingCompany.id, {
                name: editingCompany.name,
                planName: editingCompany.planName,
                maxUsers: editingCompany.maxUsers
            });
            setIsCompanyModalOpen(false);
            setEditingCompany({});
          } catch(e) {
              alert("Erro ao salvar");
          }
      }
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newAdmin.name || !newAdmin.email || !newAdmin.password) return;

      const newMaster: User = {
          id: `master-${Date.now()}`,
          name: newAdmin.name,
          email: newAdmin.email,
          role: Role.MASTER,
          password: newAdmin.password
      };

      try {
        await addMasterUser(newMaster);
        setIsAdminModalOpen(false);
        setNewAdmin({ name: '', email: '', password: '' });
      } catch (e) {
          alert("Erro ao criar admin");
      }
  };

  const handleDeleteAdmin = async (id: string) => {
      if (system.masterUsers.length <= 1) {
          alert("Não é possível excluir o último administrador.");
          return;
      }
      if (currentUser && currentUser.id === id) {
           alert("Você não pode excluir sua própria conta aqui.");
           return;
      }
      if (window.confirm("Tem certeza que deseja remover este administrador?")) {
          try {
            await removeMasterUser(id);
          } catch(e) {
              alert("Erro ao remover admin");
          }
      }
  };

  const totalUsers = system.companies.reduce((acc, c) => acc + c.data.users.length, 0);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col animate-page-enter">
      {/* Header */}
      <header className="bg-slate-900 text-white p-4 shadow-md">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-3">
                <div className="bg-indigo-500 p-2 rounded-lg">
                    <Building size={24} />
                </div>
                <div>
                    <h1 className="text-xl font-bold">Painel Master</h1>
                    <p className="text-xs text-slate-400">Gestão Multi-Empresas (DB v2)</p>
                </div>
            </div>
            <div className="flex items-center gap-4">
                <button 
                    onClick={onLogout}
                    className="p-2 bg-slate-800 hover:bg-red-900/50 text-red-400 rounded-lg transition"
                    title="Sair"
                >
                    <LogOut size={20} />
                </button>
            </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
          <div className="max-w-7xl mx-auto flex gap-6 px-6">
              <button 
                onClick={() => setActiveTab('companies')}
                className={`py-4 px-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'companies' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
              >
                  Gerenciar Empresas
              </button>
              <button 
                onClick={() => setActiveTab('admins')}
                className={`py-4 px-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'admins' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
              >
                  Gerenciar Administradores
              </button>
          </div>
      </div>

      {/* Content */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
         
         {activeTab === 'companies' ? (
             <>
                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <p className="text-slate-500 text-sm font-medium">Empresas Cadastradas</p>
                        <p className="text-3xl font-bold text-slate-800">{system.companies.length}</p>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <p className="text-slate-500 text-sm font-medium">Empresas Ativas</p>
                        <p className="text-3xl font-bold text-green-600">{system.companies.filter(c => c.active).length}</p>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <p className="text-slate-500 text-sm font-medium">Usuários Totais (SaaS)</p>
                        <p className="text-3xl font-bold text-indigo-600">{totalUsers}</p>
                    </div>
                </div>

                {/* Companies List */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
                        <h2 className="text-lg font-bold text-slate-800">Tenants do Sistema</h2>
                        <div className="relative w-full md:w-1/3">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                                type="text" 
                                placeholder="Buscar empresa..." 
                                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-500 text-sm font-medium">
                            <tr>
                                <th className="p-4">Empresa</th>
                                <th className="p-4 text-center">Plano SaaS</th>
                                <th className="p-4 text-center">Usuários</th>
                                <th className="p-4 text-center">Status</th>
                                <th className="p-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredCompanies.map(company => (
                                <tr key={company.id} className="hover:bg-slate-50 transition">
                                    <td className="p-4">
                                        <div className="font-medium text-slate-800">{company.name}</div>
                                        <div className="text-xs text-slate-500">ID: {company.id}</div>
                                    </td>
                                    <td className="p-4 text-center">
                                        <span className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded text-xs font-bold">
                                            {company.planName}
                                        </span>
                                    </td>
                                    <td className="p-4 text-center text-sm text-slate-600">
                                        {company.data?.users?.length || 0} / {company.maxUsers}
                                    </td>
                                    <td className="p-4 text-center">
                                        <button 
                                            onClick={() => handleToggleStatus(company)}
                                            className={`px-3 py-1 rounded-full text-xs font-bold flex items-center justify-center gap-1 mx-auto w-24
                                                ${company.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}
                                            `}
                                        >
                                            <Power size={12} />
                                            {company.active ? 'ATIVO' : 'INATIVO'}
                                        </button>
                                    </td>
                                    <td className="p-4 text-right flex justify-end gap-2">
                                        <button 
                                            onClick={() => handleEditCompany(company)}
                                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                                        >
                                            <Edit2 size={18} />
                                        </button>
                                        <button 
                                            onClick={() => handleDeleteCompany(company.id)}
                                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
             </>
         ) : (
             <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                 <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                     <div>
                        <h2 className="text-lg font-bold text-slate-800">Administradores Master</h2>
                        <p className="text-sm text-slate-500">Estes usuários têm controle total sobre o sistema SaaS.</p>
                     </div>
                     <button 
                        onClick={() => setIsAdminModalOpen(true)}
                        className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
                     >
                        <Plus size={18} /> Novo Admin
                     </button>
                 </div>
                 
                 <table className="w-full text-left">
                     <thead className="bg-slate-50 text-slate-500 text-sm font-medium">
                         <tr>
                             <th className="p-4">Nome</th>
                             <th className="p-4">Email</th>
                             <th className="p-4 text-right">Ações</th>
                         </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                         {system.masterUsers.map(user => (
                             <tr key={user.id} className="hover:bg-slate-50 transition">
                                 <td className="p-4 font-medium text-slate-800 flex items-center gap-2">
                                     <ShieldCheck size={18} className="text-indigo-600" />
                                     {user.name} {currentUser?.id === user.id && <span className="text-xs bg-slate-200 px-1.5 rounded text-slate-600">Você</span>}
                                 </td>
                                 <td className="p-4 text-slate-600">{user.email}</td>
                                 <td className="p-4 text-right">
                                     <button 
                                         onClick={() => handleDeleteAdmin(user.id)}
                                         disabled={system.masterUsers.length <= 1}
                                         className={`p-2 rounded-lg transition ${system.masterUsers.length <= 1 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-400 hover:text-red-600 hover:bg-red-50'}`}
                                     >
                                         <Trash2 size={18} />
                                     </button>
                                 </td>
                             </tr>
                         ))}
                     </tbody>
                 </table>
             </div>
         )}
      </main>

      {/* Edit Company Modal */}
      {isCompanyModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 animate-fade-in">
                  <h2 className="text-xl font-bold mb-4">Editar Empresa</h2>
                  <div className="space-y-4">
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Nome</label>
                          <input 
                            type="text" 
                            className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                            value={editingCompany.name || ''}
                            onChange={e => setEditingCompany({...editingCompany, name: e.target.value})}
                          />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Plano SaaS</label>
                            <input 
                                type="text" 
                                className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                                value={editingCompany.planName || ''}
                                onChange={e => setEditingCompany({...editingCompany, planName: e.target.value})}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Máx. Usuários</label>
                            <input 
                                type="number" 
                                className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                                value={editingCompany.maxUsers || 0}
                                onChange={e => setEditingCompany({...editingCompany, maxUsers: Number(e.target.value)})}
                            />
                          </div>
                      </div>
                      <div className="flex justify-end gap-2 mt-6">
                          <button onClick={() => setIsCompanyModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
                          <button onClick={handleSaveCompany} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Salvar</button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* New Admin Modal */}
      {isAdminModalOpen && (
           <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
           <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 animate-fade-in">
               <h2 className="text-xl font-bold mb-4">Novo Administrador Master</h2>
               <form onSubmit={handleAddAdmin} className="space-y-4">
                   <div>
                       <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo</label>
                       <input 
                         type="text" 
                         required
                         className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                         value={newAdmin.name}
                         onChange={e => setNewAdmin({...newAdmin, name: e.target.value})}
                       />
                   </div>
                   <div>
                       <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                       <input 
                         type="email" 
                         required
                         className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                         value={newAdmin.email}
                         onChange={e => setNewAdmin({...newAdmin, email: e.target.value})}
                       />
                   </div>
                   <div>
                       <label className="block text-sm font-medium text-slate-700 mb-1">Senha de Acesso</label>
                       <input 
                         type="text" 
                         required
                         className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                         value={newAdmin.password}
                         onChange={e => setNewAdmin({...newAdmin, password: e.target.value})}
                       />
                   </div>
                   <div className="flex justify-end gap-2 mt-6">
                       <button type="button" onClick={() => setIsAdminModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
                       <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Adicionar Admin</button>
                   </div>
               </form>
           </div>
       </div>
      )}
    </div>
  );
};