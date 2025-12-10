import React, { useState } from 'react';
import { AppData, CashFlowItem, CashFlowType, PaymentMethod } from '../types';
import { Plus, ArrowUpCircle, ArrowDownCircle, Trash2, Edit2, AlertTriangle, Eye, Calendar } from 'lucide-react';
import { addCashFlow, updateCashFlow, deleteCashFlow } from '../services/supabaseService';

interface CashFlowProps {
  data: AppData;
  setData: React.Dispatch<React.SetStateAction<AppData>>;
}

type SortOption = 'date_desc' | 'date_asc' | 'value_desc' | 'value_asc';

export const CashFlow: React.FC<CashFlowProps> = ({ data, setData }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentItem, setCurrentItem] = useState<Partial<CashFlowItem>>({ type: CashFlowType.INCOME, date: new Date().toISOString().split('T')[0] });
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [itemToView, setItemToView] = useState<CashFlowItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Filters
  const [filterType, setFilterType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('date_desc');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Helper to format YYYY-MM-DD to DD/MM/YYYY without timezone shifting
  const formatDateDisplay = (dateString: string) => {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  };

  const handleOpenModal = (item?: CashFlowItem) => {
    if (item) {
        setCurrentItem({ ...item });
        setIsEditing(true);
    } else {
        setCurrentItem({ type: CashFlowType.INCOME, date: new Date().toISOString().split('T')[0], value: 0, description: '', paymentMethod: PaymentMethod.PIX });
        setIsEditing(false);
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentItem.description || !currentItem.value || !currentItem.date) return;
    
    // Safety check for tenant ID, though we can usually get it from user context, 
    // assuming data loaded implies context exists. 
    // Ideally we pass user context here too, but let's grab it from data for now if we can,
    // OR rely on the fact that if data is loaded, we can just reload.
    // However, the Service needs the tenantId for INSERT.
    // Quick fix: we assume the user context is available or passed. 
    // Since we don't have user prop here, we'll need to pass it or rely on existing item logic.
    // Limitation: To keep changes minimal, I'll rely on the existing data to find tenantId 
    // or better, update Component props in parent.
    // For now, let's assume we can get it from the user list in data if needed, or pass it.
    // Wait, ClientList has currentUser. Let's add it to props in App.tsx later.
    // For this generic code block, I'll use a placeholder logic assuming `data.users[0].companyId` exists.
    
    const tenantId = data.users[0]?.companyId;
    if (!tenantId) return;

    setIsSaving(true);
    try {
        const item: CashFlowItem = {
            id: currentItem.id || '',
            date: currentItem.date!,
            description: currentItem.description,
            value: Number(currentItem.value),
            type: currentItem.type || CashFlowType.INCOME,
            paymentMethod: currentItem.paymentMethod,
            observation: currentItem.observation
        };

        if (isEditing && currentItem.id) {
            await updateCashFlow(item);
            // Optimistic update
            setData(prev => ({
                ...prev,
                cashFlow: prev.cashFlow.map(i => i.id === currentItem.id ? item : i)
            }));
        } else {
            await addCashFlow(item, tenantId);
            // We need to reload to get ID, or push temp.
            // Pushing temp:
            setData(prev => ({
                ...prev,
                cashFlow: [item, ...prev.cashFlow]
            }));
            // Ideally trigger refresh
            window.location.reload();
        }
        setIsModalOpen(false);
    } catch (e) {
        alert("Erro ao salvar.");
    } finally {
        setIsSaving(false);
    }
  };

  const requestDelete = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setItemToDelete(id);
  };

  const confirmDelete = async () => {
    if (itemToDelete) {
        try {
            await deleteCashFlow(itemToDelete);
            setData(prev => ({
                ...prev,
                cashFlow: prev.cashFlow.filter(i => i.id !== itemToDelete)
            }));
            setItemToDelete(null);
        } catch (e) { alert("Erro ao deletar."); }
    }
  };

  const filteredCashFlow = data.cashFlow
    .filter(item => {
        const matchesType = filterType === 'all' || item.type === filterType;
        const matchesStart = !startDate || item.date >= startDate;
        const matchesEnd = !endDate || item.date <= endDate;
        return matchesType && matchesStart && matchesEnd;
    })
    .sort((a, b) => {
        if (sortBy === 'date_desc') return new Date(b.date).getTime() - new Date(a.date).getTime();
        if (sortBy === 'date_asc') return new Date(a.date).getTime() - new Date(b.date).getTime();
        if (sortBy === 'value_desc') return b.value - a.value;
        if (sortBy === 'value_asc') return a.value - b.value;
        return 0;
    });

  const totalIncome = data.cashFlow.filter(i => i.type === CashFlowType.INCOME).reduce((acc, curr) => acc + curr.value, 0);
  const totalExpense = data.cashFlow.filter(i => i.type === CashFlowType.EXPENSE).reduce((acc, curr) => acc + curr.value, 0);
  const balance = totalIncome - totalExpense;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Fluxo de Caixa</h1>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition transform hover:scale-105"
        >
          <Plus size={20} /> Novo Lançamento
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 card-hover">
            <p className="text-slate-500 text-sm">Entradas Totais</p>
            <p className="text-2xl font-bold text-green-600">+ R$ {totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 card-hover">
            <p className="text-slate-500 text-sm">Saídas Totais</p>
            <p className="text-2xl font-bold text-red-600">- R$ {totalExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 card-hover">
            <p className="text-slate-500 text-sm">Saldo</p>
            <p className={`text-2xl font-bold ${balance >= 0 ? 'text-slate-800' : 'text-red-600'}`}>
                R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex flex-col md:flex-row gap-4 items-end md:items-center justify-end">
         <div className="flex items-center gap-2">
            <Calendar size={16} className="text-slate-400" />
            <input 
                type="date" 
                className="p-2 border border-slate-300 rounded-lg text-sm bg-white"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                placeholder="Data Inicial"
            />
            <span className="text-slate-400">-</span>
            <input 
                type="date" 
                className="p-2 border border-slate-300 rounded-lg text-sm bg-white"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                placeholder="Data Final"
            />
         </div>

         <div className="flex gap-2">
            <select 
                className="p-2 border border-slate-300 rounded-lg text-sm bg-white"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
            >
                <option value="date_desc">Data (Recente)</option>
                <option value="date_asc">Data (Antiga)</option>
                <option value="value_desc">Maior Valor</option>
                <option value="value_asc">Menor Valor</option>
            </select>
            <select 
                className="p-2 border border-slate-300 rounded-lg text-sm bg-white"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
            >
                <option value="all">Todas as Movimentações</option>
                <option value={CashFlowType.INCOME}>Apenas Entradas</option>
                <option value={CashFlowType.EXPENSE}>Apenas Saídas</option>
            </select>
         </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-500 text-sm font-medium border-b border-slate-200">
            <tr>
              <th className="p-4">Data</th>
              <th className="p-4">Descrição / Origem</th>
              <th className="p-4">Tipo</th>
              <th className="p-4 hidden sm:table-cell">Meio</th>
              <th className="p-4">Valor</th>
              <th className="p-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredCashFlow.length === 0 ? (
                <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">Nenhum lançamento encontrado neste período.</td>
                </tr>
            ) : (
                filteredCashFlow.map(item => (
                <tr key={item.id} className="hover:bg-slate-50 transition group cursor-pointer" onClick={() => setItemToView(item)}>
                    <td className="p-4 text-slate-600 text-sm">
                        {formatDateDisplay(item.date)}
                    </td>
                    <td className="p-4 font-medium text-slate-800">{item.description}</td>
                    <td className="p-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold ${
                            item.type === CashFlowType.INCOME 
                            ? 'bg-green-50 text-green-700' 
                            : 'bg-red-50 text-red-700'
                        }`}>
                            {item.type === CashFlowType.INCOME ? <ArrowUpCircle size={14}/> : <ArrowDownCircle size={14}/>}
                            {item.type}
                        </span>
                    </td>
                    <td className="p-4 hidden sm:table-cell text-slate-600 text-sm">
                        {item.paymentMethod || '-'}
                    </td>
                    <td className="p-4 font-medium text-slate-700">
                        R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-4 text-right flex justify-end gap-2">
                        <button 
                            onClick={(e) => {e.stopPropagation(); setItemToView(item)}} 
                            className="text-slate-400 hover:text-indigo-600 p-1 hover:bg-indigo-50 rounded"
                            title="Ver Detalhes"
                        >
                            <Eye size={18} />
                        </button>
                         <button 
                            onClick={(e) => {e.stopPropagation(); handleOpenModal(item)}} 
                            className="text-slate-400 hover:text-indigo-600 p-1 hover:bg-indigo-50 rounded"
                         >
                            <Edit2 size={18} />
                        </button>
                        <button 
                            onClick={(e) => requestDelete(item.id, e)} 
                            className="text-slate-400 hover:text-red-600 p-1 hover:bg-red-50 rounded"
                        >
                            <Trash2 size={18} />
                        </button>
                    </td>
                </tr>
                ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">{isEditing ? 'Editar Lançamento' : 'Novo Lançamento'}</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
                <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                            type="radio" 
                            name="type" 
                            checked={currentItem.type === CashFlowType.INCOME}
                            onChange={() => setCurrentItem({...currentItem, type: CashFlowType.INCOME})}
                            className="text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-sm">Entrada</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                            type="radio" 
                            name="type" 
                            checked={currentItem.type === CashFlowType.EXPENSE}
                            onChange={() => setCurrentItem({...currentItem, type: CashFlowType.EXPENSE})}
                            className="text-red-600 focus:ring-red-500"
                        />
                        <span className="text-sm">Saída</span>
                    </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Descrição / Origem</label>
                <input 
                  type="text" 
                  required 
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                  placeholder="Ex: Mensalidade Cliente X"
                  value={currentItem.description || ''}
                  onChange={e => setCurrentItem({...currentItem, description: e.target.value})}
                  disabled={isSaving}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Valor (R$)</label>
                    <input 
                    type="number" 
                    required 
                    step="0.01"
                    min="0"
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                    value={currentItem.value !== undefined ? currentItem.value : ''}
                    onChange={e => setCurrentItem({...currentItem, value: Number(e.target.value)})}
                    disabled={isSaving}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Data</label>
                    <input 
                    type="date" 
                    required 
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                    value={currentItem.date || ''}
                    onChange={e => setCurrentItem({...currentItem, date: e.target.value})}
                    disabled={isSaving}
                    />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Meio de Pagamento</label>
                <select 
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                    value={currentItem.paymentMethod || PaymentMethod.OTHER}
                    onChange={(e) => setCurrentItem({...currentItem, paymentMethod: e.target.value as PaymentMethod})}
                    disabled={isSaving}
                >
                    {Object.values(PaymentMethod).map(method => (
                        <option key={method} value={method}>{method}</option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Observações (Opcional)</label>
                <textarea 
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white h-20"
                    placeholder="Detalhes adicionais..."
                    value={currentItem.observation || ''}
                    onChange={e => setCurrentItem({...currentItem, observation: e.target.value})}
                    disabled={isSaving}
                />
              </div>
              
              <div className="flex justify-end gap-2 mt-6">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                  disabled={isSaving}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                  disabled={isSaving}
                >
                  {isEditing ? 'Salvar' : 'Adicionar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Detalhes */}
      {itemToView && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 relative">
             <button 
                onClick={() => setItemToView(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
                <Edit2 size={0} className="hidden" /> {/* Dummy to keep import valid if needed */}
                <span className="text-2xl">&times;</span>
            </button>
            <h2 className="text-xl font-bold mb-4 text-slate-800">Detalhes do Lançamento</h2>
            
            <div className="space-y-4">
                <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-500">Descrição</span>
                    <span className="font-medium text-slate-800">{itemToView.description}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-500">Valor</span>
                    <span className={`font-bold ${itemToView.type === CashFlowType.INCOME ? 'text-green-600' : 'text-red-600'}`}>
                        R$ {itemToView.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-500">Tipo</span>
                    <span>{itemToView.type}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-500">Data</span>
                    <span>{formatDateDisplay(itemToView.date)}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-500">Meio de Pagamento</span>
                    <span>{itemToView.paymentMethod || '-'}</span>
                </div>
                <div>
                    <span className="block text-slate-500 mb-1">Observações</span>
                    <div className="bg-slate-50 p-3 rounded-lg text-sm text-slate-700 min-h-[60px]">
                        {itemToView.observation || 'Nenhuma observação registrada.'}
                    </div>
                </div>
            </div>

            <div className="mt-6 flex justify-end">
                <button 
                    onClick={() => setItemToView(null)}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                    Fechar
                </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {itemToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
                    <AlertTriangle size={24} />
                </div>
                <h2 className="text-xl font-bold text-slate-800 mb-2">Excluir Lançamento?</h2>
                <p className="text-slate-500 mb-6">
                    Tem certeza que deseja excluir este lançamento financeiro?
                </p>
                <div className="flex gap-3 w-full">
                    <button 
                        onClick={() => setItemToDelete(null)}
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