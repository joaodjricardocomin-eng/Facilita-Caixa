import React, { useState } from 'react';
import { AppData, User, Role, Company } from './types';
import { CURRENT_MONTH } from './constants';
import { Login } from './components/Login';
import { SignUp } from './components/Auth/SignUp';
import { ForgotPassword } from './components/Auth/ForgotPassword';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { ClientList } from './components/ClientList';
import { MonthlyControl } from './components/MonthlyControl';
import { CashFlow } from './components/CashFlow';
import { PlanManager } from './components/PlanManager';
import { UserManager } from './components/UserManager';
import { Reports } from './components/Reports';
import { Settings } from './components/Settings';
import { CompanyManager } from './components/SuperAdmin/CompanyManager';
import { ProfileModal } from './components/ProfileModal';
import { useFirestoreSystem } from './hooks/useFirestoreSystem'; // Alterado para Firestore
import { Menu, CheckCircle, AlertOctagon, X, Cloud, RefreshCw, WifiOff, ArrowDownCircle } from 'lucide-react';

export const App: React.FC = () => {
  // --- STATE MANAGEMENT ---
  
  // 1. Dados do Sistema (Vindo do Firebase)
  const { system, setSystem, syncStatus } = useFirestoreSystem();
  
  // 2. Sessão Local
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // 3. Navegação e UI
  const [authView, setAuthView] = useState<'login' | 'signup' | 'forgot'>('login');
  const [currentView, setCurrentView] = useState('monthly');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // 4. Notificações Toast
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  const showNotification = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // --- ACTIONS ---

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    if (user.role === Role.MASTER) {
        setCurrentView('admin_dashboard');
    } else if (user.role === Role.MANAGER || user.role === Role.SUPERVISOR) {
        setCurrentView('dashboard');
    } else {
        setCurrentView('monthly');
    }
    showNotification(`Bem-vindo, ${user.name}!`, 'success');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setAuthView('login');
    setCurrentView('monthly');
    setIsProfileOpen(false);
  };

  const handleRegisterCompany = (companyName: string, adminName: string, email: string, pass: string) => {
      const newCompanyId = `comp-${Date.now()}`;
      const newCompany: Company = {
          id: newCompanyId,
          name: companyName,
          active: true,
          maxUsers: 3,
          planName: 'Trial',
          createdAt: new Date().toISOString(),
          data: {
              users: [{ id: `u-${Date.now()}`, name: adminName, email, password: pass, role: Role.MANAGER }],
              clients: [],
              plans: [{ id: 'p1', name: 'Plano Exemplo', monthlyFee: 0, serviceLimit: 10, active: true }],
              records: [],
              cashFlow: [],
              companySettings: { name: companyName }
          }
      };

      setSystem(prev => ({ ...prev, companies: [...prev.companies, newCompany] }));
      setAuthView('login');
      showNotification("Empresa cadastrada! Faça login.", 'success');
  };

  // --- DATA HELPERS (SaaS Multi-tenant) ---
  
  const getTenantData = (): AppData | null => {
      if (!currentUser?.companyId) return null;
      return system.companies.find(c => c.id === currentUser.companyId)?.data || null;
  };

  const setTenantData = (action: React.SetStateAction<AppData>) => {
      if (!currentUser?.companyId) return;
      
      setSystem(prevSystem => {
          const companyIndex = prevSystem.companies.findIndex(c => c.id === currentUser.companyId);
          if (companyIndex === -1) return prevSystem;

          const currentCompany = prevSystem.companies[companyIndex];
          const newData = typeof action === 'function' 
              ? (action as (prev: AppData) => AppData)(currentCompany.data)
              : action;

          const updatedCompany = { ...currentCompany, data: newData };
          const newCompanies = [...prevSystem.companies];
          newCompanies[companyIndex] = updatedCompany;

          return { ...prevSystem, companies: newCompanies };
      });
  };

  // --- PROFILE ACTIONS ---

  const handleSaveProfile = (name: string, password: string) => {
      if (!currentUser) return;

      if (currentUser.role === Role.MASTER) {
           setSystem(prev => ({
               ...prev,
               masterUsers: prev.masterUsers.map(u => u.id === currentUser.id ? { ...u, name, password } : u)
           }));
      } else {
           setTenantData(prev => ({
               ...prev,
               users: prev.users.map(u => u.id === currentUser.id ? { ...u, name, password } : u)
           }));
      }
      
      setCurrentUser(prev => prev ? { ...prev, name, password } : null);
      setIsProfileOpen(false);
      showNotification("Perfil atualizado com sucesso!", 'success');
  };

  const handleDeleteAccount = (password: string) => {
    if (!currentUser) return;
    if (password !== currentUser.password) {
        showNotification("Senha incorreta.", 'error');
        return;
    }

    if (window.confirm("Atenção: Esta ação excluirá sua conta do banco de dados. Continuar?")) {
        if (currentUser.role === Role.MASTER) {
            setSystem(prev => ({...prev, masterUsers: prev.masterUsers.filter(u => u.id !== currentUser.id)}));
        } else {
            setTenantData(prev => ({...prev, users: prev.users.filter(u => u.id !== currentUser.id)}));
        }
        handleLogout();
    }
  };

  // --- RENDER VIEW LOGIC ---

  if (syncStatus === 'loading') {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-500 gap-4">
              <RefreshCw className="animate-spin text-indigo-600" size={40} />
              <p>Conectando ao banco de dados...</p>
          </div>
      );
  }

  // Login / Cadastro
  if (!currentUser) {
      if (authView === 'signup') return <SignUp onBack={() => setAuthView('login')} onRegister={handleRegisterCompany} />;
      if (authView === 'forgot') return <ForgotPassword onBack={() => setAuthView('login')} />;
      
      return (
        <>
            <div className="fixed top-4 right-4 z-50 flex flex-col items-end gap-2 pointer-events-none">
               {syncStatus === 'synced' && <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded shadow flex items-center gap-1 border border-green-200"><Cloud size={12}/> Online</span>}
               {syncStatus === 'error' && <span className="text-xs bg-red-50 text-red-700 px-2 py-1 rounded shadow flex items-center gap-1 border border-red-200"><WifiOff size={12}/> Offline</span>}
            </div>
            <Login system={system} onLogin={handleLogin} onSignUp={() => setAuthView('signup')} onForgotPassword={() => setAuthView('forgot')} />
        </>
      );
  }

  // Área do Super Admin
  if (currentUser.role === Role.MASTER) {
      return (
          <>
             <CompanyManager system={system} setSystem={setSystem} onLogout={handleLogout} currentUser={currentUser} />
             <ProfileModal 
                isOpen={isProfileOpen} 
                onClose={() => setIsProfileOpen(false)} 
                currentUser={currentUser}
                onSave={handleSaveProfile}
                onDeleteAccount={handleDeleteAccount}
             />
          </>
      );
  }

  // Área da Empresa (Tenant)
  const tenantData = getTenantData();
  
  if (!tenantData) {
      return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
                <h2 className="text-xl font-bold text-slate-800">Erro de Carregamento</h2>
                <p className="text-slate-500 mb-4">Empresa não encontrada nos dados.</p>
                <button onClick={handleLogout} className="text-indigo-600 underline">Voltar</button>
            </div>
        </div>
      );
  }

  const renderTenantView = () => {
    switch (currentView) {
      case 'dashboard': return <Dashboard data={tenantData} currentUser={currentUser} currentMonth={CURRENT_MONTH} />;
      case 'reports': return <Reports data={tenantData} currentMonth={CURRENT_MONTH} />;
      case 'clients': return <ClientList data={tenantData} setData={setTenantData} currentUser={currentUser} />;
      case 'monthly': return <MonthlyControl data={tenantData} setData={setTenantData} currentMonth={CURRENT_MONTH} onNotification={showNotification} />;
      case 'cashflow': return <CashFlow data={tenantData} setData={setTenantData} />;
      case 'plans': return <PlanManager data={tenantData} setData={setTenantData} />;
      case 'users': return <UserManager data={tenantData} setData={setTenantData} currentUser={currentUser} />;
      case 'settings': return <Settings data={tenantData} setData={setTenantData} onNotification={showNotification} />;
      default: return <MonthlyControl data={tenantData} setData={setTenantData} currentMonth={CURRENT_MONTH} onNotification={showNotification} />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar 
        currentUser={currentUser}
        currentView={currentView}
        setView={setCurrentView}
        onLogout={handleLogout}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        onOpenProfile={() => setIsProfileOpen(true)}
      />

      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <div className="bg-white border-b border-slate-200 px-6 py-2 flex items-center justify-end gap-3 text-xs transition-colors duration-300">
            {syncStatus === 'saving' && <span className="flex items-center gap-2 text-indigo-600 font-medium"><RefreshCw size={12} className="animate-spin" /> Salvando na nuvem...</span>}
            {syncStatus === 'receiving' && <span className="flex items-center gap-2 text-blue-600 font-medium"><ArrowDownCircle size={12} className="animate-bounce" /> Recebendo atualizações...</span>}
            {syncStatus === 'synced' && <span className="flex items-center gap-2 text-green-600 font-medium"><Cloud size={14} /> Sistema Online</span>}
            {syncStatus === 'error' && <span className="flex items-center gap-2 text-red-600 font-medium"><WifiOff size={14} /> Sem conexão (Tentando reconectar...)</span>}
        </div>

        {toast && (
          <div className="absolute top-14 right-4 z-[100] animate-page-enter">
             <div className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border-l-4 bg-white ${toast.type === 'success' ? 'border-green-500 text-green-700' : 'border-red-500 text-red-700'}`}>
                {toast.type === 'success' ? <CheckCircle size={20} /> : <AlertOctagon size={20} />}
                <span className="font-medium text-sm">{toast.message}</span>
                <button onClick={() => setToast(null)} className="ml-2 opacity-50 hover:opacity-100"><X size={16} /></button>
             </div>
          </div>
        )}

        <div className="md:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between">
           <h1 className="font-bold text-slate-800">Facilita Caixa</h1>
           <button onClick={() => setIsSidebarOpen(true)} className="text-slate-600"><Menu size={24} /></button>
        </div>

        <div className="flex-1 overflow-auto bg-slate-50/50">
          <div key={currentView} className="animate-page-enter min-h-full">
            {renderTenantView()}
          </div>
        </div>
      </main>

      <ProfileModal 
        isOpen={isProfileOpen} 
        onClose={() => setIsProfileOpen(false)} 
        currentUser={currentUser}
        onSave={handleSaveProfile}
        onDeleteAccount={handleDeleteAccount}
      />
    </div>
  );
};