import React, { useCallback, useState } from 'react';
import { AppData, MonthlyRecord, PaymentStatus, UsageLog, CashFlowItem, CashFlowType, PaymentMethod } from '../types';
import { AlertCircle, RefreshCcw, Plus, History, X, Trash2, AlertTriangle, Search, DollarSign } from 'lucide-react';

interface MonthlyControlProps {
  data: AppData;
  setData: React.Dispatch<React.SetStateAction<AppData>>;
  currentMonth: string;
  onNotification?: (message: string, type: 'success' | 'error') => void;
}

export const MonthlyControl: React.FC<MonthlyControlProps> = ({ data, setData, currentMonth, onNotification }) => {
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isAddServiceModalOpen, setIsAddServiceModalOpen] = useState(false);
  const [selectedClientForModal, setSelectedClientForModal] = useState<string | null>(null);
  
  // State for Add Service Form
  const [newServiceDesc, setNewServiceDesc] = useState('');
  const [newServiceQty, setNewServiceQty] = useState(1);

  // State for Over Limit Handling
  const [isOverLimitModalOpen, setIsOverLimitModalOpen] = useState(false);
  const [pendingServiceLog, setPendingServiceLog] = useState<{desc: string, qty: number} | null>(null);
  const [extraChargeValue, setExtraChargeValue] = useState(0);
  const [extraChargeMethod, setExtraChargeMethod] = useState<PaymentMethod>(PaymentMethod.PIX);

  // State for Log Deletion
  const [logToDelete, setLogToDelete] = useState<string | null>(null);

  // State for Filters
  const [searchTerm, setSearchTerm] = useState('');

  // State for Renew Modal
  const [renewClient, setRenewClient] = useState<{id: string, name: string, planValue: number} | null>(null);
  const [renewPaymentMethod, setRenewPaymentMethod] = useState<PaymentMethod>(PaymentMethod.PIX);

  const getRecord = (clientId: string) => {
    return data.records.find(r => r.clientId === clientId && r.month === currentMonth);
  };

  const handleUpdateRecord = useCallback((clientId: string, field: keyof MonthlyRecord, value: any) => {
    setData(prev => {
      const existingIndex = prev.records.findIndex(r => r.clientId === clientId && r.month === currentMonth);
      let newRecords = [...prev.records];

      if (existingIndex >= 0) {
        newRecords[existingIndex] = { ...newRecords[existingIndex], [field]: value };
      } else {
        const newRecord: MonthlyRecord = {
          id: `r${Date.now()}`,
          clientId,
          month: currentMonth,
          servicesUsed: 0,
          usageHistory: [],
          status: PaymentStatus.PENDING,
          [field]: value
        };
        newRecords.push(newRecord);
      }
      return { ...prev, records: newRecords };
    });
  }, [setData, currentMonth]);

  const initiateRenew = (clientId: string) => {
    const client = data.clients.find(c => c.id === clientId);
    const plan = data.plans.find(p => p.id === client?.planId);
    
    if (client && plan) {
        setRenewClient({
            id: clientId,
            name: client.name,
            planValue: plan.monthlyFee
        });
    }
  };

  const confirmRenew = (addToCashFlow: boolean) => {
      if (!renewClient) return;
      
      const clientId = renewClient.id;
      const note = `Renovado manualmente em ${new Date().toLocaleDateString('pt-BR')}`;
      
      setData(prev => {
        // 1. Update Monthly Record (Reset)
        const existingIndex = prev.records.findIndex(r => r.clientId === clientId && r.month === currentMonth);
        let newRecords = [...prev.records];

        if (existingIndex >= 0) {
            const oldUsage = newRecords[existingIndex].servicesUsed;
            const historyNote = `[Ciclo Fechado: ${oldUsage} serviços]`;

            newRecords[existingIndex] = { 
                ...newRecords[existingIndex], 
                status: PaymentStatus.PENDING,
                servicesUsed: 0,
                usageHistory: [], 
                notes: newRecords[existingIndex].notes ? `${newRecords[existingIndex].notes} | ${historyNote} | ${note}` : `${historyNote} | ${note}`
            };
        } else {
             const newRecord: MonthlyRecord = {
                id: `r${Date.now()}`,
                clientId,
                month: currentMonth,
                servicesUsed: 0,
                usageHistory: [],
                status: PaymentStatus.PENDING,
                notes: note
            };
            newRecords.push(newRecord);
        }

        // 2. Add to Cash Flow if requested
        let newCashFlow = [...prev.cashFlow];
        if (addToCashFlow) {
            const cfItem: CashFlowItem = {
                id: `cf-renew-${Date.now()}`,
                date: new Date().toISOString().split('T')[0],
                description: `Mensalidade - ${renewClient.name}`,
                value: renewClient.planValue,
                type: CashFlowType.INCOME,
                paymentMethod: renewPaymentMethod,
                observation: 'Lançado automaticamente via renovação mensal'
            };
            newCashFlow = [cfItem, ...newCashFlow].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        }

        return { ...prev, records: newRecords, cashFlow: newCashFlow };
    });
    setRenewClient(null);
    if(onNotification) onNotification("Renovação realizada com sucesso!", 'success');
  };

  const openAddServiceModal = (clientId: string) => {
    setSelectedClientForModal(clientId);
    setNewServiceDesc('');
    setNewServiceQty(1);
    setIsAddServiceModalOpen(true);
  };

  const handleAddService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientForModal || !newServiceDesc || newServiceQty <= 0) return;

    // Check Limit Logic
    const client = data.clients.find(c => c.id === selectedClientForModal);
    const plan = data.plans.find(p => p.id === client?.planId);
    const record = getRecord(selectedClientForModal);
    const currentUsage = record?.servicesUsed || 0;
    const limit = plan?.serviceLimit || 0;

    if (limit > 0 && (currentUsage + newServiceQty > limit)) {
        // Limit Exceeded Interception
        setPendingServiceLog({ desc: newServiceDesc, qty: newServiceQty });
        setExtraChargeValue(0); // Reset or set a default
        setIsAddServiceModalOpen(false); // Close normal modal
        setIsOverLimitModalOpen(true); // Open Alert Modal
        return;
    }

    // Normal Process
    processAddService(newServiceDesc, newServiceQty);
    setIsAddServiceModalOpen(false);
  };

  const processAddService = (desc: string, qty: number) => {
      if (!selectedClientForModal) return;

      setData(prev => {
        const existingIndex = prev.records.findIndex(r => r.clientId === selectedClientForModal && r.month === currentMonth);
        let newRecords = [...prev.records];
        
        const newLog: UsageLog = {
            id: `log${Date.now()}`,
            date: new Date().toLocaleDateString('pt-BR'),
            description: desc,
            quantity: Number(qty)
        };

        if (existingIndex >= 0) {
            const currentRecord = newRecords[existingIndex];
            const updatedHistory = [...(currentRecord.usageHistory || []), newLog];
            const updatedTotal = updatedHistory.reduce((acc, item) => acc + item.quantity, 0);

            newRecords[existingIndex] = { 
                ...currentRecord, 
                usageHistory: updatedHistory,
                servicesUsed: updatedTotal
            };
        } else {
            // Create record if first time
            const newRecord: MonthlyRecord = {
                id: `r${Date.now()}`,
                clientId: selectedClientForModal,
                month: currentMonth,
                servicesUsed: Number(qty),
                usageHistory: [newLog],
                status: PaymentStatus.PENDING,
            };
            newRecords.push(newRecord);
        }
        return { ...prev, records: newRecords };
    });
  };

  const confirmExtraCharge = (shouldCharge: boolean) => {
    if (!pendingServiceLog || !selectedClientForModal) return;

    processAddService(pendingServiceLog.desc, pendingServiceLog.qty);

    if (shouldCharge) {
        const clientName = data.clients.find(c => c.id === selectedClientForModal)?.name || 'Cliente';
        const cfItem: CashFlowItem = {
            id: `cf-extra-${Date.now()}`,
            date: new Date().toISOString().split('T')[0],
            description: `Serviço Adicional - ${pendingServiceLog.desc} (${clientName})`,
            value: Number(extraChargeValue),
            type: CashFlowType.INCOME,
            paymentMethod: extraChargeMethod,
            observation: 'Cobrança por limite excedido'
        };

        setData(prev => ({
            ...prev,
            cashFlow: [cfItem, ...prev.cashFlow].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        }));

        if(onNotification) onNotification("Serviço registrado e cobrança lançada no caixa!", 'success');
    } else {
        if(onNotification) onNotification("Serviço registrado sem cobrança adicional.", 'success');
    }

    setIsOverLimitModalOpen(false);
    setPendingServiceLog(null);
  };

  const handleConfirmDeleteLog = () => {
      if (!selectedClientForModal || !logToDelete) return;

      setData(prev => {
        const existingIndex = prev.records.findIndex(r => r.clientId === selectedClientForModal && r.month === currentMonth);
        if (existingIndex < 0) return prev;

        const currentRecord = prev.records[existingIndex];
        const updatedHistory = currentRecord.usageHistory.filter(log => log.id !== logToDelete);
        const updatedTotal = updatedHistory.reduce((acc, item) => acc + item.quantity, 0);

        const newRecords = [...prev.records];
        newRecords[existingIndex] = {
            ...currentRecord,
            usageHistory: updatedHistory,
            servicesUsed: updatedTotal
        };

        return { ...prev, records: newRecords };
      });
      setLogToDelete(null);
  };

  const openHistoryModal = (clientId: string) => {
    setSelectedClientForModal(clientId);
    setIsHistoryModalOpen(true);
  };

  const getStatusColor = (status: PaymentStatus) => {
    switch (status) {
      case PaymentStatus.PAID: return 'bg-green-100 text-green-700 border-green-200';
      case PaymentStatus.LATE: return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-amber-50 text-amber-700 border-amber-200';
    }
  };

  const filteredClients = data.clients.filter(c => {
    const plan = data.plans.find(p => p.id === c.planId);
    return (
        c.active &&
        (c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
         (plan?.name || '').toLowerCase().includes(searchTerm.toLowerCase()))
    );
  });

  const selectedClientRecord = selectedClientForModal ? getRecord(selectedClientForModal) : null;
  const selectedClientName = selectedClientForModal ? data.clients.find(c => c.id === selectedClientForModal)?.name : '';

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Controle Mensal</h1>
          <p className="text-slate-500">Referência: {currentMonth}</p>
        </div>
        <div className="relative w-full md:w-1/3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
                type="text" 
                placeholder="Buscar cliente ou plano..." 
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
            />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
        <table className="w-full text-left min-w-[800px]">
          <thead className="bg-slate-50 text-slate-500 text-sm font-medium border-b border-slate-200">
            <tr>
              <th className="p-4 w-1/4 text-left">Cliente / Plano</th>
              <th className="p-4 w-1/6 text-center">Limite Serviços</th>
              <th className="p-4 w-1/6 text-center">Uso Atual</th>
              <th className="p-4 w-1/4 text-center">Status Pagamento</th>
              <th className="p-4 w-1/5 text-left">Observações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredClients.map(client => {
              const plan = data.plans.find(p => p.id === client.planId);
              const record = getRecord(client.id);
              const usage = record?.servicesUsed || 0;
              const limit = plan?.serviceLimit || 0;
              const isOverLimit = usage > limit;
              const status = record?.status || PaymentStatus.PENDING;

              return (
                <tr key={client.id} className="hover:bg-slate-50 transition">
                  <td className="p-4">
                    <div className="font-medium text-slate-800">{client.name}</div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span>{plan?.name}</span>
                        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                        <span>Venc: dia {client.dueDay || 10}</span>
                    </div>
                  </td>
                  <td className="p-4 text-slate-600 font-medium text-center">
                    {limit}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-2">
                        <div className={`relative flex items-center justify-between w-24 p-1 border rounded-lg bg-white ${isOverLimit ? 'border-red-300 bg-red-50' : 'border-slate-300'}`}>
                            <span className={`pl-2 font-medium ${isOverLimit ? 'text-red-700' : 'text-slate-700'}`}>{usage}</span>
                            
                            <div className="flex gap-1">
                                <button 
                                    onClick={() => openHistoryModal(client.id)}
                                    title="Ver Histórico"
                                    className="p-1 text-slate-400 hover:text-indigo-600 rounded hover:bg-slate-100"
                                >
                                    <History size={14} />
                                </button>
                                <button 
                                    onClick={() => openAddServiceModal(client.id)}
                                    title="Adicionar Uso"
                                    className="p-1 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded"
                                >
                                    <Plus size={14} />
                                </button>
                            </div>
                        </div>

                      {isOverLimit && (
                         <div className="relative group">
                            <AlertCircle size={18} className="text-red-500 cursor-help" />
                            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition z-10">
                              Limite excedido!
                            </span>
                         </div>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-2">
                        <select
                        className={`w-full p-2 border rounded-lg appearance-none cursor-pointer font-medium text-sm ${getStatusColor(status)}`}
                        value={status}
                        onChange={(e) => handleUpdateRecord(client.id, 'status', e.target.value)}
                        >
                        <option value={PaymentStatus.PENDING}>Pendente</option>
                        <option value={PaymentStatus.PAID}>Pago</option>
                        <option value={PaymentStatus.LATE}>Atrasado</option>
                        </select>
                        <button 
                            onClick={() => initiateRenew(client.id)}
                            title="Renovar acesso (Zerar uso para próximo ciclo)"
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                        >
                            <RefreshCcw size={18} />
                        </button>
                    </div>
                  </td>
                  <td className="p-4">
                     <input 
                        type="text"
                        placeholder="Adicionar nota..."
                        className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-100 outline-none transition"
                        value={record?.notes || ''}
                        onChange={(e) => handleUpdateRecord(client.id, 'notes', e.target.value)}
                     />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal: Adicionar Serviço */}
      {isAddServiceModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 relative">
            <button 
                onClick={() => setIsAddServiceModalOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
                <X size={20} />
            </button>
            <h3 className="text-lg font-bold text-slate-800 mb-1">Adicionar Serviço</h3>
            <p className="text-sm text-slate-500 mb-4">Cliente: {selectedClientName}</p>
            
            <form onSubmit={handleAddService} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Descrição do Serviço</label>
                    <input 
                        type="text"
                        required
                        className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                        placeholder="Ex: Emissão de Nota Fiscal"
                        value={newServiceDesc}
                        onChange={(e) => setNewServiceDesc(e.target.value)}
                        autoFocus
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Quantidade</label>
                    <input 
                        type="number"
                        min="1"
                        required
                        className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                        value={newServiceQty}
                        onChange={(e) => setNewServiceQty(Number(e.target.value))}
                    />
                </div>
                <div className="pt-2">
                    <button 
                        type="submit"
                        className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition"
                    >
                        Adicionar ao Histórico
                    </button>
                </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Limite Excedido (Cobrança Extra) */}
      {isOverLimitModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60] animate-fade-in">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 relative border-l-8 border-amber-500">
                  <div className="flex items-start gap-4 mb-4">
                      <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
                          <AlertTriangle size={24} />
                      </div>
                      <div>
                          <h3 className="text-lg font-bold text-slate-800">Limite Excedido!</h3>
                          <p className="text-sm text-slate-500 mt-1">
                              Este lançamento fará o cliente ultrapassar o limite contratado. Deseja registrar uma cobrança adicional no Fluxo de Caixa?
                          </p>
                      </div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-lg mb-4">
                      <label className="block text-sm font-medium text-slate-700 mb-2">Valor do Serviço Adicional</label>
                      <input 
                          type="number" 
                          className="w-full p-2 border border-slate-300 rounded-lg bg-white mb-3"
                          placeholder="R$ 0,00"
                          value={extraChargeValue}
                          onChange={e => setExtraChargeValue(Number(e.target.value))}
                      />
                      
                      <label className="block text-sm font-medium text-slate-700 mb-2">Meio de Pagamento</label>
                      <select 
                          className="w-full p-2 border border-slate-300 rounded-lg bg-white text-sm"
                          value={extraChargeMethod}
                          onChange={(e) => setExtraChargeMethod(e.target.value as PaymentMethod)}
                      >
                          {Object.values(PaymentMethod).map(method => (
                              <option key={method} value={method}>{method}</option>
                          ))}
                      </select>
                  </div>

                  <div className="flex gap-2">
                       <button 
                          onClick={() => confirmExtraCharge(true)}
                          className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition font-medium text-sm flex items-center justify-center gap-2"
                       >
                           <DollarSign size={16} /> Confirmar com Cobrança
                       </button>
                  </div>
                   <button 
                          onClick={() => confirmExtraCharge(false)}
                          className="w-full mt-2 text-slate-500 hover:text-slate-800 py-2 transition text-sm underline"
                       >
                           Apenas registrar o serviço (Sem cobrança)
                   </button>
                   <button 
                          onClick={() => { setIsOverLimitModalOpen(false); setPendingServiceLog(null); }}
                          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
                   >
                       <X size={20} />
                   </button>
              </div>
          </div>
      )}

      {/* Modal: Histórico de Uso */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in">
           <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 relative max-h-[80vh] flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">Histórico de Uso</h3>
                        <p className="text-sm text-slate-500">{selectedClientName} - {currentMonth}</p>
                    </div>
                    <button 
                        onClick={() => setIsHistoryModalOpen(false)}
                        className="text-slate-400 hover:text-slate-600"
                    >
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto pr-2">
                    {!selectedClientRecord?.usageHistory || selectedClientRecord.usageHistory.length === 0 ? (
                        <div className="text-center py-8 text-slate-400">
                            Nenhum serviço registrado neste mês.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {selectedClientRecord.usageHistory.map((log, index) => (
                                <div key={log.id || index} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100 group">
                                    <div className="flex-1">
                                        <p className="font-medium text-slate-800">{log.description}</p>
                                        <p className="text-xs text-slate-400">{log.date}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full text-sm">
                                            +{log.quantity}
                                        </div>
                                        <button 
                                            onClick={() => setLogToDelete(log.id)}
                                            className="text-slate-300 hover:text-red-500 p-1 rounded-full hover:bg-red-50 transition"
                                            title="Remover lançamento"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Total Utilizado</span>
                    <span className="text-xl font-bold text-slate-800">{selectedClientRecord?.servicesUsed || 0}</span>
                </div>
           </div>
        </div>
      )}

      {/* Modal Confirmação Exclusão Log */}
      {logToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60] animate-fade-in">
             <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
                <div className="flex flex-col items-center text-center">
                    <div className="w-10 h-10 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-3">
                        <AlertTriangle size={20} />
                    </div>
                    <h2 className="text-lg font-bold text-slate-800 mb-2">Remover Lançamento?</h2>
                    <p className="text-sm text-slate-500 mb-6">
                        Isso removerá o serviço do histórico e recalculará o total. Confirmar?
                    </p>
                    <div className="flex gap-3 w-full">
                        <button 
                            onClick={() => setLogToDelete(null)}
                            className="flex-1 px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition text-sm font-medium"
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={handleConfirmDeleteLog}
                            className="flex-1 px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg transition text-sm font-medium"
                        >
                            Remover
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Modal Renovação */}
      {renewClient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in">
             <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                <div className="flex flex-col items-center text-center">
                    <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-4">
                        <RefreshCcw size={24} />
                    </div>
                    <h2 className="text-xl font-bold text-slate-800 mb-2">Renovar Acesso?</h2>
                    <p className="text-slate-500 mb-6">
                        Isso zerará o consumo atual do cliente <b>{renewClient.name}</b> para iniciar um novo ciclo.
                    </p>
                    
                    <div className="bg-slate-50 p-4 rounded-lg w-full mb-6 text-left">
                        <label className="block text-sm font-semibold text-slate-700 mb-3">
                            Lançar no Fluxo de Caixa?
                        </label>
                        <div className="space-y-3">
                             <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-600">Valor do Plano:</span>
                                <span className="font-bold text-slate-800">R$ {renewClient.planValue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                             </div>
                             <div>
                                <span className="text-sm text-slate-600 block mb-1">Meio de Pagamento:</span>
                                <select 
                                    className="w-full p-2 border border-slate-300 rounded bg-white text-sm"
                                    value={renewPaymentMethod}
                                    onChange={(e) => setRenewPaymentMethod(e.target.value as PaymentMethod)}
                                >
                                    {Object.values(PaymentMethod).map(method => (
                                        <option key={method} value={method}>{method}</option>
                                    ))}
                                </select>
                             </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 w-full">
                         <button 
                            onClick={() => confirmRenew(true)}
                            className="w-full px-4 py-3 bg-green-600 text-white hover:bg-green-700 rounded-lg transition font-medium flex items-center justify-center gap-2"
                        >
                            <DollarSign size={18} /> Renovar e Lançar no Caixa
                        </button>
                        <button 
                            onClick={() => confirmRenew(false)}
                            className="w-full px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition font-medium"
                        >
                            Apenas Renovar (Sem Financeiro)
                        </button>
                        <button 
                            onClick={() => setRenewClient(null)}
                            className="w-full px-4 py-2 text-slate-400 hover:text-slate-600 text-sm"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};