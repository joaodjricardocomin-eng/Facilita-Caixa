import { SystemState, Role, PaymentStatus, CashFlowType, PaymentMethod, AppData } from './types';

// Helper to create initial company data
const createInitialData = (companyName: string, adminName: string, adminEmail: string): AppData => ({
  users: [
    { id: `u-${Date.now()}`, name: adminName, email: adminEmail, role: Role.MANAGER, password: '123' }
  ],
  companySettings: {
    name: companyName,
    address: 'Endereço não configurado',
    logoBase64: ''
  },
  plans: [
    { id: 'p1', name: 'Plano Básico', monthlyFee: 100, serviceLimit: 10, active: true },
  ],
  clients: [],
  records: [],
  cashFlow: []
});

// Initial Data for the "Demo Company"
const DEMO_DATA: AppData = {
  users: [
    { id: '1', name: 'Ana Silva', email: 'ana@facilita.com', role: Role.USER, password: '123' },
    { id: '2', name: 'Carlos Souza', email: 'carlos@facilita.com', role: Role.SUPERVISOR, password: '123' },
    { id: '3', name: 'Roberto Boss', email: 'roberto@facilita.com', role: Role.MANAGER, password: '123' },
    { id: 'demo', name: 'Usuário Demo', email: 'demo@teste.com', role: Role.MANAGER, password: '' },
  ],
  companySettings: {
    name: 'Facilita Contabilidade',
    address: 'Av. Paulista, 1000 - São Paulo, SP',
    logoBase64: ''
  },
  plans: [
    { id: 'p1', name: 'MEI Básico', monthlyFee: 150, serviceLimit: 5, active: true },
    { id: 'p2', name: 'Simples Nacional', monthlyFee: 450, serviceLimit: 20, active: true },
    { id: 'p3', name: 'Lucro Presumido', monthlyFee: 1200, serviceLimit: 50, active: true },
  ],
  clients: [
    { id: 'c1', name: 'Padaria do João', document: '12.345.678/0001-90', contact: 'João', planId: 'p2', active: true, dueDay: 10 },
    { id: 'c2', name: 'Tech Solutions', document: '98.765.432/0001-10', contact: 'Maria', planId: 'p3', active: true, dueDay: 5 },
    { id: 'c3', name: 'Consultório Dr. Pedro', document: '11.111.222/0001-33', contact: 'Pedro', planId: 'p1', active: true, dueDay: 20 },
    { id: 'c4', name: 'Mercado Livreiro', document: '44.555.666/0001-99', contact: 'Lucas', planId: 'p2', active: true, dueDay: 15 },
  ],
  records: [
    { id: 'r1', clientId: 'c1', month: '2023-10', servicesUsed: 15, usageHistory: [], status: PaymentStatus.PAID },
    { id: 'r2', clientId: 'c2', month: '2023-10', servicesUsed: 45, usageHistory: [], status: PaymentStatus.PAID },
    { id: 'r3', clientId: 'c3', month: '2023-10', servicesUsed: 2, usageHistory: [], status: PaymentStatus.LATE },
    // Current month (simulated)
    { id: 'r4', clientId: 'c1', month: '2023-11', servicesUsed: 22, usageHistory: [], status: PaymentStatus.PENDING },
    { id: 'r5', clientId: 'c2', month: '2023-11', servicesUsed: 10, usageHistory: [], status: PaymentStatus.PAID },
    { id: 'r6', clientId: 'c3', month: '2023-11', servicesUsed: 6, usageHistory: [], status: PaymentStatus.PENDING },
    { id: 'r7', clientId: 'c4', month: '2023-11', servicesUsed: 5, usageHistory: [], status: PaymentStatus.LATE },
  ],
  cashFlow: [
    { id: 'cf1', date: '2023-11-01', description: 'Mensalidade Tech Solutions', value: 1200, type: CashFlowType.INCOME, paymentMethod: PaymentMethod.PIX, observation: 'Pagamento antecipado' },
    { id: 'cf2', date: '2023-11-02', description: 'Mensalidade Padaria do João', value: 450, type: CashFlowType.INCOME, paymentMethod: PaymentMethod.BOLETO },
    { id: 'cf3', date: '2023-11-05', description: 'Licença Software Contábil', value: 250, type: CashFlowType.EXPENSE, paymentMethod: PaymentMethod.CARD, observation: 'Recorrente mensal' },
    { id: 'cf4', date: '2023-11-10', description: 'Material de Escritório', value: 80, type: CashFlowType.EXPENSE, paymentMethod: PaymentMethod.MONEY },
  ]
};

export const MOCK_SYSTEM_DATA: SystemState = {
  masterUsers: [
    {
      id: 'master-01',
      name: 'Administrador Master',
      email: 'admin@master.com',
      role: Role.MASTER,
      password: 'admin'
    }
  ],
  companies: [
    {
      id: 'comp-01',
      name: 'Facilita Contabilidade (Demo)',
      active: true,
      maxUsers: 5,
      planName: 'Pro',
      createdAt: '2023-01-01',
      data: DEMO_DATA
    },
    {
      id: 'comp-02',
      name: 'Empresa Teste Ltda',
      active: true,
      maxUsers: 2,
      planName: 'Basic',
      createdAt: '2023-11-15',
      data: createInitialData('Empresa Teste Ltda', 'João Teste', 'joao@teste.com')
    }
  ]
};

export const CURRENT_MONTH = '2023-11';