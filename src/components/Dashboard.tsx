import React, { useState } from 'react';
import { AppData, PaymentStatus, Role, User } from '../types';
import { getFinancialInsights } from '../services/geminiService';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { BrainCircuit, DollarSign, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';

interface DashboardProps {
  data: AppData;
  currentUser: User;
  currentMonth: string;
}

const COLORS = ['#10B981', '#F59E0B', '#EF4444']; // Green, Amber, Red

export const Dashboard: React.FC<DashboardProps> = ({ data, currentUser, currentMonth }) => {
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  // Computed Metrics
  const monthRecords = data.records.filter(r => r.month === currentMonth);
  
  const totalRevenue = monthRecords
    .filter(r => r.status === PaymentStatus.PAID)
    .reduce((acc, r) => {
      const client = data.clients.find(c => c.id === r.clientId);
      const plan = data.plans.find(p => p.id === client?.planId);
      return acc + (plan?.monthlyFee || 0);
    }, 0);

  const potentialRevenue = monthRecords.reduce((acc, r) => {
    const client = data.clients.find(c => c.id === r.clientId);
    const plan = data.plans.find(p => p.id === client?.planId);
    return acc + (plan?.monthlyFee || 0);
  }, 0);

  const pendingCount = monthRecords.filter(r => r.status === PaymentStatus.PENDING).length;
  const lateCount = monthRecords.filter(r => r.status === PaymentStatus.LATE).length;
  const paidCount = monthRecords.filter(r => r.status === PaymentStatus.PAID).length;

  const overLimitClients = monthRecords.filter(r => {
    const client = data.clients.find(c => c.id === r.clientId);
    const plan = data.plans.find(p => p.id === client?.planId);
    return plan && r.servicesUsed > plan.serviceLimit;
  }).length;

  const chartData = [
    { name: 'Pago', value: paidCount },
    { name: 'Pendente', value: pendingCount },
    { name: 'Atrasado', value: lateCount },
  ];

  const handleGenerateInsight = async () => {
    setLoadingAi(true);
    const summary = `
      Mês: ${currentMonth}
      Receita Confirmada: R$ ${totalRevenue}
      Receita Potencial Total: R$ ${potentialRevenue}
      Clientes Pagos: ${paidCount}
      Clientes Pendentes: ${pendingCount}
      Clientes Inadimplentes: ${lateCount}
      Clientes Estouraram Limite de Serviço: ${overLimitClients}
      Total de Clientes Ativos: ${data.clients.filter(c => c.active).length}
    `;
    
    const result = await getFinancialInsights(summary);
    setAiAnalysis(result);
    setLoadingAi(false);
  };

  if (currentUser.role === Role.USER) {
    return (
      <div className="p-8 text-center text-slate-500 animate-fade-in">
        <h2 className="text-2xl font-bold mb-2">Bem-vindo, {currentUser.name}</h2>
        <p>Acesse o menu lateral para gerenciar clientes e lançamentos.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">Dashboard Geral - {currentMonth}</h1>
        <button 
          onClick={handleGenerateInsight}
          disabled={loadingAi}
          className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2 rounded-lg hover:opacity-90 transition disabled:opacity-50 shadow-md transform hover:scale-105"
        >
          {loadingAi ? <Loader2 className="animate-spin" size={20} /> : <BrainCircuit size={20} />}
          {loadingAi ? 'Analisando...' : 'Consultor IA'}
        </button>
      </div>

      {/* AI Analysis Section */}
      {aiAnalysis && (
        <div className="bg-white p-6 rounded-xl border border-indigo-100 shadow-sm animate-fade-in">
           <h3 className="text-lg font-semibold text-indigo-800 mb-3 flex items-center gap-2">
             <BrainCircuit size={20} /> Análise Inteligente
           </h3>
           <div className="prose prose-slate max-w-none whitespace-pre-line text-sm text-slate-700">
             {aiAnalysis}
           </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 card-hover">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-500">Receita Confirmada</h3>
            <div className="p-2 bg-green-100 rounded-full text-green-600"><DollarSign size={20} /></div>
          </div>
          <p className="text-3xl font-bold text-slate-800">R$ {totalRevenue.toLocaleString('pt-BR')}</p>
          <p className="text-xs text-slate-400 mt-1">de R$ {potentialRevenue.toLocaleString('pt-BR')} previstos</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 card-hover">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-500">Inadimplência</h3>
            <div className="p-2 bg-red-100 rounded-full text-red-600"><AlertTriangle size={20} /></div>
          </div>
          <p className="text-3xl font-bold text-slate-800">{lateCount}</p>
          <p className="text-xs text-slate-400 mt-1">clientes em atraso</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 card-hover">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-500">Limites Excedidos</h3>
            <div className="p-2 bg-amber-100 rounded-full text-amber-600"><AlertTriangle size={20} /></div>
          </div>
          <p className="text-3xl font-bold text-slate-800">{overLimitClients}</p>
          <p className="text-xs text-slate-400 mt-1">clientes usaram mais que o plano</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 card-hover">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-500">Pagamentos Pendentes</h3>
            <div className="p-2 bg-blue-100 rounded-full text-blue-600"><CheckCircle size={20} /></div>
          </div>
          <p className="text-3xl font-bold text-slate-800">{pendingCount}</p>
          <p className="text-xs text-slate-400 mt-1">aguardando baixa</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart Section */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-80 card-hover">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Status de Pagamentos</h3>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {chartData.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <RechartsTooltip />
              <Legend verticalAlign="bottom" height={36}/>
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Activity / Alerts */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 overflow-y-auto h-80 card-hover">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Alertas Importantes</h3>
          <div className="space-y-4">
            {overLimitClients > 0 && (
              <div className="p-4 bg-amber-50 rounded-lg border-l-4 border-amber-500">
                <p className="text-sm font-medium text-amber-800">Uso Excessivo de Serviços</p>
                <p className="text-sm text-amber-700 mt-1">
                  {overLimitClients} clientes consumiram mais serviços do que o contratado este mês. Verifique para possível upgrade de plano.
                </p>
              </div>
            )}
            {lateCount > 0 && (
              <div className="p-4 bg-red-50 rounded-lg border-l-4 border-red-500">
                <p className="text-sm font-medium text-red-800">Inadimplência Crítica</p>
                <p className="text-sm text-red-700 mt-1">
                  Existem {lateCount} pagamentos marcados como atrasados. É recomendado contato imediato.
                </p>
              </div>
            )}
            {pendingCount === 0 && lateCount === 0 && (
              <div className="p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
                <p className="text-sm font-medium text-green-800">Tudo em dia!</p>
                <p className="text-sm text-green-700 mt-1">
                  Não há pendências críticas no momento.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};