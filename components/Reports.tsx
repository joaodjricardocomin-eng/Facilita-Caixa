import React, { useState } from 'react';
import { AppData, CashFlowType, PaymentStatus, PaymentMethod } from '../types';
import { FileText, Download, Users, Layers, Calculator, DollarSign, Calendar, Filter, Check } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ReportsProps {
  data: AppData;
  currentMonth: string;
}

type ReportType = 'clients' | 'monthly' | 'cashflow' | 'plans' | null;
type PlanFilter = 'all' | 'active' | 'inactive';

export const Reports: React.FC<ReportsProps> = ({ data, currentMonth }) => {
  const [selectedReport, setSelectedReport] = useState<ReportType>('cashflow');
  
  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [cashFlowType, setCashFlowType] = useState<string>('all');
  
  // Multi-select for Payment Methods
  const [selectedMethods, setSelectedMethods] = useState<PaymentMethod[]>([]);
  
  const [planStatus, setPlanStatus] = useState<PlanFilter>('all');

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const toggleMethod = (method: PaymentMethod) => {
    setSelectedMethods(prev => 
      prev.includes(method) 
        ? prev.filter(m => m !== method)
        : [...prev, method]
    );
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    const settings = data.companySettings;
    
    // -- HEADER GENERATION --
    const pageWidth = doc.internal.pageSize.width;
    doc.setFillColor(79, 70, 229); // Indigo 600
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    let titleX = 14;

    // Logo Handling with Aspect Ratio
    if (settings?.logoBase64) {
        try {
            const imgProps = doc.getImageProperties(settings.logoBase64);
            const maxWidth = 50;
            const maxHeight = 25;
            const imgRatio = imgProps.width / imgProps.height;
            
            let w = maxWidth;
            let h = w / imgRatio;
            
            if (h > maxHeight) {
                h = maxHeight;
                w = h * imgRatio;
            }
            
            // Center logo vertically in the header area (approx height 40)
            const yPos = 5 + (30 - h) / 2;
            
            doc.addImage(settings.logoBase64, 'PNG', 14, yPos > 5 ? yPos : 5, w, h);
            titleX = 14 + w + 10;
        } catch (e) {
            console.error("Error adding logo", e);
            titleX = 14;
        }
    }

    doc.setTextColor(255, 255, 255);
    
    doc.setFontSize(22);
    doc.text(settings?.name || "Facilita Caixa", titleX, 18);
    
    doc.setFontSize(10);
    const addressLines = doc.splitTextToSize(settings?.address || "Relatório Gerencial", 100);
    doc.text(addressLines, titleX, 26);
    
    // Subtitle / Report Info
    doc.setTextColor(0, 0, 0);
    let reportTitle = "";
    let filterDesc = "";

    // -- CONTENT GENERATION --
    if (selectedReport === 'cashflow') {
        reportTitle = "Fluxo de Caixa";
        
        let filteredData = [...data.cashFlow];

        // Date Filter logic
        if (startDate && !endDate) {
            filteredData = filteredData.filter(i => i.date === startDate);
            filterDesc += `Data: ${startDate.split('-').reverse().join('/')}`;
        } else if (startDate && endDate) {
            filteredData = filteredData.filter(i => i.date >= startDate && i.date <= endDate);
            filterDesc += `Período: ${startDate.split('-').reverse().join('/')} a ${endDate.split('-').reverse().join('/')}`;
        } else {
            filterDesc += "Período: Completo";
        }

        // Type Filter
        if (cashFlowType !== 'all') {
             filteredData = filteredData.filter(i => i.type === cashFlowType);
             filterDesc += ` | Tipo: ${cashFlowType}`;
        }

        // Method Filter (Multi-select)
        if (selectedMethods.length > 0) {
            filteredData = filteredData.filter(i => i.paymentMethod && selectedMethods.includes(i.paymentMethod));
            filterDesc += ` | Meios: ${selectedMethods.join(', ')}`;
        } else {
            filterDesc += ` | Meios: Todos`;
        }
        
        // Sorting
        filteredData.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        const tableData = filteredData.map(item => [
            item.date.split('-').reverse().join('/'),
            item.description,
            item.type,
            item.paymentMethod || '-',
            formatCurrency(item.value)
        ]);

        autoTable(doc, {
            startY: 55,
            head: [['Data', 'Descrição', 'Tipo', 'Meio', 'Valor']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [79, 70, 229] },
            columnStyles: { 4: { halign: 'right' } }
        });

        // Totais
        const income = filteredData.filter(i => i.type === CashFlowType.INCOME).reduce((a, b) => a + b.value, 0);
        const expense = filteredData.filter(i => i.type === CashFlowType.EXPENSE).reduce((a, b) => a + b.value, 0);
        const balance = income - expense;

        const finalY = (doc as any).lastAutoTable.finalY + 10;
        doc.setFontSize(10);
        doc.text(`Entradas: ${formatCurrency(income)}`, 14, finalY);
        doc.text(`Saídas: ${formatCurrency(expense)}`, 14, finalY + 5);
        doc.setFont(undefined, 'bold');
        doc.text(`Saldo do Período: ${formatCurrency(balance)}`, 14, finalY + 12);
    } 
    else if (selectedReport === 'clients') {
        reportTitle = "Relatório de Clientes";
        filterDesc = "Todos os Clientes Ativos e Inativos";

        const tableData = data.clients.map(client => {
            const plan = data.plans.find(p => p.id === client.planId);
            return [
                client.name,
                client.document,
                plan?.name || '-',
                formatCurrency(plan?.monthlyFee || 0),
                `Dia ${client.dueDay}`,
                client.active ? 'Ativo' : 'Inativo'
            ];
        });

        autoTable(doc, {
            startY: 55,
            head: [['Nome', 'Documento', 'Plano', 'Valor', 'Vencimento', 'Status']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [79, 70, 229] },
        });
    }
    else if (selectedReport === 'monthly') {
        reportTitle = `Controle Mensal - ${currentMonth}`;
        filterDesc = "Status de consumo e pagamentos do mês";

        const tableData = data.records
            .filter(r => r.month === currentMonth)
            .map(record => {
                const client = data.clients.find(c => c.id === record.clientId);
                const plan = data.plans.find(p => p.id === client?.planId);
                return [
                client?.name || '-',
                plan?.name || '-',
                `${record.servicesUsed} / ${plan?.serviceLimit || 0}`,
                record.status,
                record.notes || '-'
                ];
            });

        autoTable(doc, {
            startY: 55,
            head: [['Cliente', 'Plano', 'Uso / Limite', 'Status Pagto', 'Observações']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [79, 70, 229] },
        });
    }
    else if (selectedReport === 'plans') {
        reportTitle = "Planos e Limites";
        
        let filteredPlans = [...data.plans];
        if (planStatus === 'active') {
            filteredPlans = filteredPlans.filter(p => p.active !== false);
            filterDesc = "Filtro: Apenas Ativos";
        } else if (planStatus === 'inactive') {
            filteredPlans = filteredPlans.filter(p => p.active === false);
             filterDesc = "Filtro: Apenas Inativos";
        } else {
             filterDesc = "Filtro: Todos";
        }

        const tableData = filteredPlans.map(plan => {
            const clientCount = data.clients.filter(c => c.planId === plan.id).length;
            return [
                plan.name,
                formatCurrency(plan.monthlyFee),
                plan.serviceLimit,
                clientCount,
                plan.active !== false ? 'Ativo' : 'Inativo'
            ];
        });

        autoTable(doc, {
            startY: 55,
            head: [['Nome do Plano', 'Valor Mensal', 'Limite', 'Clientes', 'Status']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [79, 70, 229] },
             columnStyles: {
                1: { halign: 'right' },
                2: { halign: 'center' },
                3: { halign: 'center' }
            }
        });
    }

    // Print Title and Metadata below header
    doc.setFontSize(16);
    doc.text(reportTitle, 14, 48);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(filterDesc, 14, 53);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}`, pageWidth - 14, 53, { align: 'right' });


    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text('Página ' + String(i) + ' de ' + String(pageCount), doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 10, {
            align: 'center'
        });
    }

    doc.save(`relatorio_${selectedReport}_${new Date().getTime()}.pdf`);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Central de Relatórios</h1>
        <p className="text-slate-500">Configure os filtros e gere relatórios personalizados em PDF.</p>
      </div>

      <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
         {/* 1. Sector Selection */}
         <div className="bg-slate-50 p-6 border-b border-slate-200">
            <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">1. Escolha o Tipo de Relatório</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button 
                    onClick={() => setSelectedReport('cashflow')}
                    className={`p-4 rounded-lg border-2 flex flex-col items-center gap-2 transition ${selectedReport === 'cashflow' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 hover:border-indigo-300 bg-white'}`}
                >
                    <DollarSign size={24} />
                    <span className="font-medium">Fluxo de Caixa</span>
                </button>
                <button 
                    onClick={() => setSelectedReport('clients')}
                    className={`p-4 rounded-lg border-2 flex flex-col items-center gap-2 transition ${selectedReport === 'clients' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 hover:border-indigo-300 bg-white'}`}
                >
                    <Users size={24} />
                    <span className="font-medium">Clientes</span>
                </button>
                 <button 
                    onClick={() => setSelectedReport('monthly')}
                    className={`p-4 rounded-lg border-2 flex flex-col items-center gap-2 transition ${selectedReport === 'monthly' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 hover:border-indigo-300 bg-white'}`}
                >
                    <Calculator size={24} />
                    <span className="font-medium">Controle Mensal</span>
                </button>
                 <button 
                    onClick={() => setSelectedReport('plans')}
                    className={`p-4 rounded-lg border-2 flex flex-col items-center gap-2 transition ${selectedReport === 'plans' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 hover:border-indigo-300 bg-white'}`}
                >
                    <Layers size={24} />
                    <span className="font-medium">Planos</span>
                </button>
            </div>
         </div>

         {/* 2. Filters Configuration */}
         <div className="p-6">
             <label className="block text-sm font-bold text-slate-700 mb-4 uppercase tracking-wide">2. Configure os Filtros</label>
             
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {selectedReport === 'cashflow' && (
                    <>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-600 flex items-center gap-2"><Calendar size={16}/> Data Inicial</label>
                            <input 
                                type="date" 
                                className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                                value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                            />
                             <p className="text-xs text-slate-400">Deixe vazio para ver tudo</p>
                        </div>
                        <div className="space-y-2">
                             <label className="text-sm font-medium text-slate-600 flex items-center gap-2"><Calendar size={16}/> Data Final</label>
                            <input 
                                type="date" 
                                className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                                value={endDate}
                                onChange={e => setEndDate(e.target.value)}
                            />
                            <p className="text-xs text-slate-400">Preencha se quiser um período</p>
                        </div>
                        <div className="space-y-2">
                             <label className="text-sm font-medium text-slate-600 flex items-center gap-2"><Filter size={16}/> Filtros Extras</label>
                             <select 
                                className="w-full p-2 border border-slate-300 rounded-lg mb-2 bg-white"
                                value={cashFlowType}
                                onChange={e => setCashFlowType(e.target.value)}
                             >
                                 <option value="all">Tipos: Todos</option>
                                 <option value={CashFlowType.INCOME}>Apenas Entradas</option>
                                 <option value={CashFlowType.EXPENSE}>Apenas Saídas</option>
                             </select>
                             
                             <div>
                                <label className="text-xs font-semibold text-slate-500 mb-1 block">Meios de Pagamento</label>
                                <div className="flex flex-wrap gap-2">
                                    {Object.values(PaymentMethod).map(method => {
                                        const isSelected = selectedMethods.includes(method);
                                        return (
                                            <button
                                                key={method}
                                                onClick={() => toggleMethod(method)}
                                                className={`text-xs px-3 py-1.5 rounded-full border transition flex items-center gap-1
                                                    ${isSelected 
                                                        ? 'bg-indigo-600 text-white border-indigo-600' 
                                                        : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                                                    }`}
                                            >
                                                {method}
                                                {isSelected && <Check size={10} />}
                                            </button>
                                        );
                                    })}
                                </div>
                                <p className="text-xs text-slate-400 mt-1">
                                    {selectedMethods.length === 0 ? 'Todos selecionados' : `${selectedMethods.length} selecionado(s)`}
                                </p>
                             </div>
                        </div>
                    </>
                )}

                {selectedReport === 'plans' && (
                     <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-600 flex items-center gap-2"><Filter size={16}/> Status do Plano</label>
                        <select 
                        className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                        value={planStatus}
                        onChange={e => setPlanStatus(e.target.value as PlanFilter)}
                        >
                            <option value="all">Todos</option>
                            <option value="active">Somente Ativos</option>
                            <option value="inactive">Somente Inativos</option>
                        </select>
                    </div>
                )}

                {(selectedReport === 'clients' || selectedReport === 'monthly') && (
                     <div className="col-span-3 text-slate-500 text-sm italic bg-slate-50 p-3 rounded">
                         Este relatório não possui filtros adicionais no momento. Será gerada a lista completa atual.
                     </div>
                )}
             </div>
         </div>

         {/* 3. Action */}
         <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end">
            <button 
                onClick={generatePDF}
                className="flex items-center gap-3 bg-indigo-600 text-white px-8 py-3 rounded-lg hover:bg-indigo-700 transition font-bold shadow-md transform hover:scale-105"
            >
                <Download size={20} />
                Gerar Relatório PDF
            </button>
         </div>
      </div>
    </div>
  );
};