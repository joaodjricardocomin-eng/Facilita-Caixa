import React, { useState } from 'react';
import { AppData, Client, Role, User } from '../types';
import { Plus, Trash2, Edit2, AlertTriangle, Search, Filter } from 'lucide-react';

interface ClientListProps {
  data: AppData;
  setData: React.Dispatch<React.SetStateAction<AppData>>;
  currentUser: User;
}

type SortOption = 'name' | 'dueDay' | 'plan';

export const ClientList: React.FC<ClientListProps> = ({ data, setData, currentUser }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentClient, setCurrentClient] = useState<Partial<Client>>({ active: true, dueDay: 10 });
  const [isEditing, setIsEditing] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<string | null>(null);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('name');
  const [filterPlan, setFilterPlan] = useState<string>('all');
  const [filterDueDay, setFilterDueDay] = useState<string>('all');

  const handleOpenModal = (client?: Client) => {
    if (client) {
      setCurrentClient({ ...client });
      setIsEditing(true);
    } else {
      setCurrentClient({ active: true, dueDay: 10 });
      setIsEditing(false);
    }
    setIsModalOpen(true);
  };

  const handleSaveClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentClient.name || !currentClient.planId) return;

    if (isEditing && currentClient.id) {
      // Edit Mode
      setData(prev => ({
        ...prev,
        clients: prev.clients.map(c => c.id === currentClient.id ? { ...currentClient, id: c.id } as Client : c)
      }));
    } else {
      // Create Mode
      const newClient: Client = {
        id: `c${Date.now()}`,
        name: currentClient.name!,
        document: currentClient.document || '',
        contact: currentClient.contact || '',
        planId: currentClient.planId!,
        active: currentClient.active ?? true,
        dueDay: Number(currentClient.dueDay) || 10,
      };

      setData(prev => ({
        ...prev,
        clients: [...prev.clients, newClient]
      }));
    }
    
    setIsModalOpen(false);
  };

  const requestDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentUser.role === Role.USER) {
      alert("Apenas Supervisores ou Gestores podem excluir clientes.");
      return;
    }
    setClientToDelete(id);
  };

  const confirmDelete = () => {
    if (clientToDelete) {
        setData(prev => ({
            ...prev,
            clients: prev.clients.filter(c => c.id !== clientToDelete)
        }));
        setClientToDelete(null);
    }
  };

  // Filter and Sort Logic
  const filteredClients = data.clients
    .filter(client => {
        const plan = data.plans.find(p => p.id === client.planId);
        const matchesSearch = 
            client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            client.document.toLowerCase().includes(searchTerm.toLowerCase()) ||
            client.contact.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (plan?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesPlan = filterPlan === 'all' || client.planId === filterPlan;
        const matchesDueDay = filterDueDay === 'all' || client.dueDay.toString() === filterDueDay;

        return matchesSearch && matchesPlan && matchesDueDay;
    })
    .sort((a, b) => {
        if (sortOption === 'name') return a.name.localeCompare(b.name);
        if (sortOption === 'dueDay') return a.dueDay - b.dueDay;
        if (sortOption === 'plan') {
            const planA = data.plans.find(p => p.id === a.planId)?.name || '';
            const planB = data.plans.find(p => p.id === b.planId)?.name || '';
            return planA.localeCompare(planB);
        }
        return 0;
    });

  const dueDays = Array.from(new Set(data.clients.map(c => c.dueDay))).sort((a,b) => Number(a) - Number(b));

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Clientes</h1>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition transform hover:scale-105"
        >
          <Plus size={20} /> Novo Cliente
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex flex-col md:flex-row gap-4 items-end md:items-center justify-between">
         <div className="w-full md:w-1/3 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
                type="text" 
                placeholder="Buscar por nome, doc, plano..." 
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
            />
         </div>
         
         <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <select 
                className="p-2 border border-slate-300 rounded-lg text-sm bg-white"
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as SortOption)}
            >
                <option value="name">Ordem Alfabética</option>
                <option value="dueDay">Dia de Vencimento</option>
                <option value="plan">Por Plano</option>
            </select>

            <select 
                className="p-2 border border-slate-300 rounded-lg text-sm bg-white"
                value={filterPlan}
                onChange={(e) => setFilterPlan(e.target.value)}
            >
                <option value="all">Todos os Planos</option>
                {data.plans.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                ))}
            </select>

            <select 
                className="p-2 border border-slate-300 rounded-lg text-sm bg-white"
                value={filterDueDay}
                onChange={(e) => setFilterDueDay(e.target.value)}
            >
                <option value="all">Todos Vencimentos</option>
                {dueDays.map(day => (
                    <option key={day} value={day}>Dia {day}</option>
                ))}
            </select>
         </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-500 text-sm font-medium border-b border-slate-200">
            <tr>
              <th className="p-4">Cliente</th>
              <th className="p-4 hidden md:table-cell">Documento</th>
              <th className="p-4">Plano</th>
              <th className="p-4 text-center">Vencimento</th>
              <th className="p-4 hidden sm:table-cell">Contato</th>
              <th className="p-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredClients.length === 0 ? (
                <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">Nenhum cliente encontrado.</td>
                </tr>
            ) : (
                filteredClients.map(client => {
                const plan = data.plans.find(p => p.id === client.planId);
                return (
                    <tr key={client.id} className="hover:bg-slate-50 transition">
                    <td className="p-4 font-medium text-slate-800">{client.name}</td>
                    <td className="p-4 hidden md:table-cell text-slate-600">{client.document}</td>
                    <td className="p-4 text-slate-600">
                        <span className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded-md text-xs font-semibold">
                        {plan?.name}
                        </span>
                    </td>
                    <td className="p-4 text-slate-600 text-center">Dia {client.dueDay}</td>
                    <td className="p-4 hidden sm:table-cell text-slate-600">{client.contact}</td>
                    <td className="p-4 text-right flex justify-end gap-2">
                        <button 
                            onClick={() => handleOpenModal(client)}
                            className="text-slate-400 hover:text-indigo-600 p-1 hover:bg-indigo-50 rounded"
                        >
                            <Edit2 size={18} />
                        </button>
                        {currentUser.role !== Role.USER && (
                        <button 
                            type="button"
                            onClick={(e) => requestDelete(client.id, e)}
                            className="text-slate-400 hover:text-red-600 p-1 hover:bg-red-50 rounded"
                        >
                            <Trash2 size={18} />
                        </button>
                        )}
                    </td>
                    </tr>
                );
                })
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            <h2 className="text-xl font-bold mb-4">{isEditing ? 'Editar Cliente' : 'Novo Cliente'}</h2>
            <form onSubmit={handleSaveClient} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome</label>
                <input 
                  type="text" 
                  required 
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                  value={currentClient.name || ''}
                  onChange={e => setCurrentClient({...currentClient, name: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Documento (CPF/CNPJ)</label>
                    <input 
                    type="text" 
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                    value={currentClient.document || ''}
                    onChange={e => setCurrentClient({...currentClient, document: e.target.value})}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Dia de Vencimento</label>
                    <input 
                    type="number" 
                    min="1"
                    max="31"
                    required
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                    value={currentClient.dueDay || ''}
                    onChange={e => setCurrentClient({...currentClient, dueDay: Number(e.target.value)})}
                    />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Plano</label>
                <select 
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                  required
                  value={currentClient.planId || ''}
                  onChange={e => setCurrentClient({...currentClient, planId: e.target.value})}
                >
                  <option value="">Selecione...</option>
                  {data.plans.map(p => (
                    <option key={p.id} value={p.id}>{p.name} - R${p.monthlyFee}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Contato</label>
                <input 
                  type="text" 
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                  value={currentClient.contact || ''}
                  onChange={e => setCurrentClient({...currentClient, contact: e.target.value})}
                />
              </div>
              
              <div className="flex items-center gap-2">
                <input 
                    type="checkbox"
                    id="active"
                    checked={currentClient.active}
                    onChange={e => setCurrentClient({...currentClient, active: e.target.checked})}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                />
                <label htmlFor="active" className="text-sm font-medium text-slate-700">Cliente Ativo</label>
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

      {/* Modal de Confirmação de Exclusão */}
      {clientToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
                    <AlertTriangle size={24} />
                </div>
                <h2 className="text-xl font-bold text-slate-800 mb-2">Excluir Cliente?</h2>
                <p className="text-slate-500 mb-6">
                    Tem certeza que deseja excluir este cliente? Todos os registros e históricos associados a ele serão perdidos.
                </p>
                <div className="flex gap-3 w-full">
                    <button 
                        onClick={() => setClientToDelete(null)}
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