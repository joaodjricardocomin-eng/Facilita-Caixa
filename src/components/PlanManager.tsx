import React, { useState } from 'react';
import { AppData, Plan } from '../types';
import { Plus, Trash2, Edit2, Layers, AlertTriangle, Search, Power } from 'lucide-react';

interface PlanManagerProps {
  data: AppData;
  setData: React.Dispatch<React.SetStateAction<AppData>>;
}

export const PlanManager: React.FC<PlanManagerProps> = ({ data, setData }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<Partial<Plan>>({ active: true });
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // State for delete confirmation modal
  const [planToDelete, setPlanToDelete] = useState<string | null>(null);

  const handleOpenModal = (plan?: Plan) => {
    if (plan) {
      setCurrentPlan({ ...plan });
      setIsEditing(true);
    } else {
      setCurrentPlan({ active: true });
      setIsEditing(false);
    }
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPlan.name || !currentPlan.monthlyFee || !currentPlan.serviceLimit) return;

    if (isEditing && currentPlan.id) {
      setData(prev => ({
        ...prev,
        plans: prev.plans.map(p => p.id === currentPlan.id ? { ...currentPlan, id: p.id } as Plan : p)
      }));
    } else {
      const newPlan: Plan = {
        id: `p${Date.now()}`,
        name: currentPlan.name!,
        monthlyFee: Number(currentPlan.monthlyFee),
        serviceLimit: Number(currentPlan.serviceLimit),
        active: currentPlan.active ?? true
      };

      setData(prev => ({
        ...prev,
        plans: [...prev.plans, newPlan]
      }));
    }
    setIsModalOpen(false);
  };

  const requestDelete = (id: string) => {
    const isUsed = data.clients.some(c => c.planId === id);
    if (isUsed) {
        alert("Não é possível excluir um plano que está em uso por clientes. Remova ou altere os clientes deste plano primeiro.");
        return;
    }
    setPlanToDelete(id);
  };

  const confirmDelete = () => {
    if (planToDelete) {
        setData(prev => ({
            ...prev,
            plans: prev.plans.filter(p => p.id !== planToDelete)
        }));
        setPlanToDelete(null);
    }
  };

  const filteredPlans = data.plans.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Planos e Limites</h1>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
        >
          <Plus size={20} /> Novo Plano
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 w-full md:w-1/3 relative">
         <Search className="absolute left-7 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
         <input 
            type="text" 
            placeholder="Buscar plano..." 
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
         />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPlans.map(plan => (
            <div key={plan.id} className={`bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between hover:shadow-md transition ${!plan.active ? 'opacity-75 bg-slate-50' : ''}`}>
                <div>
                    <div className="flex items-start justify-between mb-4">
                        <div className={`p-3 rounded-lg ${plan.active !== false ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-200 text-slate-500'}`}>
                            <Layers size={24} />
                        </div>
                        <div className="flex gap-2">
                             {!plan.active && (
                                <span className="text-xs font-bold text-slate-500 bg-slate-200 px-2 py-1 rounded self-start mt-1">INATIVO</span>
                             )}
                            <button 
                                type="button"
                                onClick={() => handleOpenModal(plan)} 
                                className="text-slate-400 hover:text-indigo-600"
                            >
                                <Edit2 size={18} />
                            </button>
                            <button 
                                type="button"
                                onClick={() => requestDelete(plan.id)} 
                                className="text-slate-400 hover:text-red-600"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 mb-1">{plan.name}</h3>
                    <div className={`text-3xl font-bold mb-4 ${plan.active !== false ? 'text-indigo-600' : 'text-slate-500'}`}>
                        R$ {plan.monthlyFee.toLocaleString('pt-BR')}
                        <span className="text-sm text-slate-400 font-normal"> /mês</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-lg p-3 text-center">
                        <span className="block text-xs text-slate-500 uppercase tracking-wide font-semibold">Limite de Serviços</span>
                        <span className="text-xl font-bold text-slate-800">{plan.serviceLimit}</span>
                    </div>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100">
                    <p className="text-xs text-center text-slate-500">
                        {data.clients.filter(c => c.planId === plan.id).length} clientes usando este plano
                    </p>
                </div>
            </div>
        ))}
      </div>

      {/* Modal de Cadastro/Edição */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            <h2 className="text-xl font-bold mb-4">{isEditing ? 'Editar Plano' : 'Novo Plano'}</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Plano</label>
                <input 
                  type="text" 
                  required 
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                  value={currentPlan.name || ''}
                  onChange={e => setCurrentPlan({...currentPlan, name: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Mensalidade (R$)</label>
                    <input 
                    type="number" 
                    required 
                    min="0"
                    step="0.01"
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                    value={currentPlan.monthlyFee !== undefined ? currentPlan.monthlyFee : ''}
                    onChange={e => setCurrentPlan({...currentPlan, monthlyFee: Number(e.target.value)})}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Limite de Serviços</label>
                    <input 
                    type="number" 
                    required 
                    min="1"
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                    value={currentPlan.serviceLimit !== undefined ? currentPlan.serviceLimit : ''}
                    onChange={e => setCurrentPlan({...currentPlan, serviceLimit: Number(e.target.value)})}
                    />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                 <button 
                    type="button"
                    onClick={() => setCurrentPlan(prev => ({...prev, active: !prev.active}))}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition ${currentPlan.active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}
                 >
                    <Power size={16} />
                    <span className="text-sm font-medium">{currentPlan.active ? 'Plano Ativo' : 'Plano Inativo'}</span>
                 </button>
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
      {planToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
                    <AlertTriangle size={24} />
                </div>
                <h2 className="text-xl font-bold text-slate-800 mb-2">Excluir Plano?</h2>
                <p className="text-slate-500 mb-6">
                    Tem certeza que deseja excluir este plano? Esta ação é irreversível e o plano não estará mais disponível para novos clientes.
                </p>
                <div className="flex gap-3 w-full">
                    <button 
                        onClick={() => setPlanToDelete(null)}
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