export enum Role {
  USER = 'Assistente',
  SUPERVISOR = 'Supervisor',
  MANAGER = 'Gestor',
  MASTER = 'Super Admin' 
}

export enum PaymentStatus {
  PENDING = 'Pendente',
  PAID = 'Pago',
  LATE = 'Atrasado'
}

export enum CashFlowType {
  INCOME = 'Entrada',
  EXPENSE = 'Saída'
}

export enum PaymentMethod {
  MONEY = 'Dinheiro',
  CARD = 'Cartão',
  PIX = 'Pix',
  BOLETO = 'Boleto',
  LINK = 'Link',
  OTHER = 'Outro'
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  password?: string; // Not stored in our DB anymore, handled by Supabase Auth
  companyId?: string; 
}

export interface Plan {
  id: string;
  name: string;
  monthlyFee: number;
  serviceLimit: number;
  active?: boolean;
}

export interface Client {
  id: string;
  name: string;
  document: string;
  contact: string;
  planId: string;
  active: boolean;
  dueDay: number;
}

export interface UsageLog {
  id: string;
  date: string;
  description: string;
  quantity: number;
}

export interface MonthlyRecord {
  id: string;
  clientId: string;
  month: string;
  servicesUsed: number;
  usageHistory: UsageLog[]; 
  status: PaymentStatus;
  notes?: string;
}

export interface CashFlowItem {
  id: string;
  date: string;
  description: string;
  value: number;
  type: CashFlowType;
  paymentMethod?: PaymentMethod;
  observation?: string;
}

export interface CompanySettings {
  name: string;
  address?: string;
  logoBase64?: string; // Now logo_url in DB, mapped in service
}

// Data specific to a single company
export interface AppData {
  users: User[];
  plans: Plan[];
  clients: Client[];
  records: MonthlyRecord[];
  cashFlow: CashFlowItem[];
  companySettings?: CompanySettings;
}

// SaaS / Multi-tenant Structures
export interface Company {
  id: string;
  name: string;
  active: boolean;
  maxUsers: number;
  planName: string;
  createdAt: string;
  data: AppData; 
}

export interface SystemState {
  masterUsers: User[];
  companies: Company[];
}