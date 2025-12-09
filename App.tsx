import React, { useState, useEffect } from 'react';
import { AppData, User, Role, SystemState, Company } from './types';
import { MOCK_SYSTEM_DATA, CURRENT_MONTH } from './constants';
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
import { Menu, CheckCircle, AlertOctagon, X, Trash2, AlertTriangle } from 'lucide-react';

const App: React.FC = () => {
  // Global System State
  const [system, setSystem] = useState<SystemState>(MOCK_SYSTEM_DATA);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // Navigation State
  const [authView, setAuthView] = useState<'login' | 'signup' | 'forgot'>('login');
  const [currentView, setCurrentView] = useState('monthly');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Profile Modal State
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileForm, setProfileForm] = useState<{name: string, password: string}>({ name: '', password: '' });
  
  // Account Deletion State within Profile
  const [isDeleteAccountMode, setIsDeleteAccountMode] = useState(false);
  const [deleteConfirmationPassword, setDeleteConfirmationPassword] = useState('');

  // Notification State
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  // Persistence
  useEffect(() => {
    const savedSystem = localStorage.getItem('facilita_system_v2');
    if (savedSystem) {
      try {
        setSystem(JSON.parse(savedSystem));
      } catch (e) {
        console.error("Failed to parse system data", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('facilita_system_v2', JSON.stringify(system));
  }, [system]);

  const showNotification = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Auth Handling
  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setProfileForm({ name: user.name, password: user.password || '' });
    if (user.role === Role.MASTER) {
        setCurrentView('admin_dashboard');
    } else if (user.role === Role.MANAGER || user.role === Role.SUPERVISOR) {
        setCurrentView('dashboard');
    } else {
        setCurrentView('monthly');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setAuthView('login');
    setCurrentView('monthly');
    setIsProfileOpen(false);
    setIsDeleteAccountMode(false);
    setDeleteConfirmationPassword('');
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

      setSystem(prev => ({
          ...prev,
          companies: [...prev.companies, newCompany]
      }));

      setAuthView('login');
      showNotification("Empresa cadastrada com sucesso! Faça login.", 'success');
  };

  // Tenant Data Management Helper
  // We need to provide a setData function that looks like SetStateAction<AppData> to children
  // But internally updates the correct company in the SystemState
  const getTenantData = (): AppData | null => {
      if (!currentUser?.companyId) return null;
      const company = system.companies.find(c => c.id === currentUser.companyId);
      return company ? company.data : null;
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

  // Profile Save
  const handleSaveProfile = (e: React.FormEvent) => {
      e.preventDefault();
      if (!currentUser) return;

      if (currentUser.role === Role.MASTER) {
           setSystem(prev => ({
               ...prev,
               masterUsers: prev.masterUsers.map(u => u.id === currentUser.id ? { ...u, name: profileForm.name, password: profileForm.password } : u)
           }));
      } else {
           // Update User in Tenant
           setTenantData(prev => ({
               ...prev,
               users: prev.users.map(u => u.id === currentUser.id ? { ...u, name: profileForm.name, password: profileForm.password } : u)
           }));
      }
      
      setCurrentUser(prev => prev ? { ...prev, name: profileForm.name, password: profileForm.password } : null);
      setIsProfileOpen(false);
      showNotification("Perfil atualizado com sucesso!", 'success');
  };

  // Delete Own Account Logic
  const handleDeleteAccount = () => {
    if (!currentUser) return;

    if (deleteConfirmationPassword !== currentUser.password) {
        showNotification("Senha incorreta.", 'error');
        return;
    }

    if (window.confirm("Esta é sua última confirmação. Sua conta será excluída permanentemente. Deseja continuar?")) {
        // Logic to remove user from system
        if (currentUser.role === Role.MASTER) {
             setSystem(prev => ({
                 ...prev,
                 masterUsers: prev.masterUsers.filter(u => u.id !== currentUser.id)
             }));
        } else if (currentUser.companyId) {
             // Remove from specific tenant
             setSystem(prevSystem => {
                const companyIndex = prevSystem.companies.findIndex(c => c.id === currentUser.companyId);
                if (companyIndex === -1) return prevSystem;

                const currentCompany = prevSystem.companies[companyIndex];
                const updatedUsers = currentCompany.data.users.filter(u => u.id !== currentUser.id);

                // Edge case: If it was the last user, maybe deactivate company? 
                // For now, we just remove the user.
                const updatedCompany = { ...currentCompany, data: { ...currentCompany.data, users: updatedUsers } };
                const newCompanies = [...prevSystem.companies];
                newCompanies[companyIndex] = updatedCompany;

                return { ...prevSystem, companies: newCompanies };
             });
        }
        
        handleLogout();
        // Delay alert slightly so UI updates first
        setTimeout(() => alert("Sua conta foi excluída com sucesso."), 100);
    }
  };

  // RENDER LOGIC

  // 1. Unauthenticated Views
  if (!currentUser) {
      if (authView === 'signup') return <SignUp onBack={() => setAuthView('login')} onRegister={handleRegisterCompany} />;
      if (authView === 'forgot') return <ForgotPassword onBack={() => setAuthView('login')} />;
      return <Login system={system} onLogin={handleLogin} onSignUp={() => setAuthView('signup')} onForgotPassword={() => setAuthView('forgot')} />;
  }

  // 2. Super Admin View
  if (currentUser.role === Role.MASTER) {
      return (
          <>
             <CompanyManager system={system} setSystem={setSystem} onLogout={handleLogout} currentUser={currentUser} />
             {/* Profile Modal for Master */}
             {isProfileOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[100] animate-page-enter">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 overflow-y-auto max-h-[90vh]">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Editar Perfil</h2>
                            <button onClick={() => setIsProfileOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                        </div>
                        
                        {!isDeleteAccountMode ? (
                            <>
                                <form onSubmit={handleSaveProfile} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Nome</label>
                                        <input 
                                        type="text" 
                                        required 
                                        className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                                        value={profileForm.name}
                                        onChange={e => setProfileForm({...profileForm, name: e.target.value})}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Nova Senha</label>
                                        <input 
                                        type="password" 
                                        className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                                        value={profileForm.password}
                                        onChange={e => setProfileForm({...profileForm, password: e.target.value})}
                                        placeholder="Deixe em branco para manter"
                                        />
                                    </div>
                                    <div className="flex justify-end gap-2 mt-6">
                                        <button 
                                        type="button" 
                                        onClick={() => setIsProfileOpen(false)}
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
                                <div className="mt-8 pt-6 border-t border-slate-100">
                                    <button 
                                        type="button"
                                        onClick={() => setIsDeleteAccountMode(true)}
                                        className="text-red-500 text-sm hover:text-red-700 hover:underline flex items-center gap-1"
                                    >
                                        <Trash2 size={14} /> Excluir minha conta
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="space-y-4">
                                <div className="p-3 bg-red-50 text-red-700 rounded-lg border border-red-100 flex items-start gap-3">
                                    <AlertTriangle size={24} className="shrink-0" />
                                    <div className="text-sm">
                                        <p className="font-bold">Zona de Perigo</p>
                                        <p>Ao excluir sua conta, você perderá acesso ao painel Master permanentemente.</p>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Confirme sua senha</label>
                                    <input 
                                        type="password" 
                                        className="w-full p-2 border border-red-300 rounded-lg bg-white focus:ring-red-500 focus:border-red-500"
                                        value={deleteConfirmationPassword}
                                        onChange={e => setDeleteConfirmationPassword(e.target.value)}
                                        placeholder="Sua senha atual"
                                    />
                                </div>
                                <div className="flex flex-col gap-2 mt-4">
                                    <button 
                                        onClick={handleDeleteAccount}
                                        className="w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition font-medium"
                                    >
                                        Confirmar Exclusão
                                    </button>
                                    <button 
                                        onClick={() => { setIsDeleteAccountMode(false); setDeleteConfirmationPassword(''); }}
                                        className="w-full text-slate-600 py-2 hover:bg-slate-50 rounded-lg"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
             )}
          </>
      );
  }

  // 3. Tenant App View
  const tenantData = getTenantData();
  if (!tenantData) return <div>Erro ao carregar dados da empresa.</div>;

  const renderTenantView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard data={tenantData} currentUser={currentUser} currentMonth={CURRENT_MONTH} />;
      case 'reports':
        return <Reports data={tenantData} currentMonth={CURRENT_MONTH} />;
      case 'clients':
        return <ClientList data={tenantData} setData={setTenantData} currentUser={currentUser} />;
      case 'monthly':
        return <MonthlyControl data={tenantData} setData={setTenantData} currentMonth={CURRENT_MONTH} currentUser={currentUser} onNotification={showNotification} />;
      case 'cashflow':
        return <CashFlow data={tenantData} setData={setTenantData} />;
      case 'plans':
        return <PlanManager data={tenantData} setData={setTenantData} />;
      case 'users':
        return <UserManager data={tenantData} setData={setTenantData} currentUser={currentUser} />;
      case 'settings':
        return <Settings data={tenantData} setData={setTenantData} onNotification={showNotification} />;
      default:
        return <MonthlyControl data={tenantData} setData={setTenantData} currentMonth={CURRENT_MONTH} currentUser={currentUser} onNotification={showNotification} />;
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
        onOpenProfile={() => {
            setProfileForm({ name: currentUser.name, password: currentUser.password || '' });
            setIsProfileOpen(true);
            setIsDeleteAccountMode(false);
            setDeleteConfirmationPassword('');
        }}
      />

      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Toast Notification */}
        {toast && (
          <div className="absolute top-4 right-4 z-[100] animate-page-enter">
             <div className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border-l-4 bg-white ${toast.type === 'success' ? 'border-green-500 text-green-700' : 'border-red-500 text-red-700'}`}>
                {toast.type === 'success' ? <CheckCircle size={20} /> : <AlertOctagon size={20} />}
                <span className="font-medium text-sm">{toast.message}</span>
                <button onClick={() => setToast(null)} className="ml-2 opacity-50 hover:opacity-100"><X size={16} /></button>
             </div>
          </div>
        )}

        {/* Mobile Header */}
        <div className="md:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between">
           <h1 className="font-bold text-slate-800">Facilita Caixa</h1>
           <button onClick={() => setIsSidebarOpen(true)} className="text-slate-600">
             <Menu size={24} />
           </button>
        </div>

        <div className="flex-1 overflow-auto bg-slate-50/50">
          {/* Use key to trigger animation on view change */}
          <div key={currentView} className="animate-page-enter min-h-full">
            {renderTenantView()}
          </div>
        </div>
      </main>

      {/* Profile Modal */}
      {isProfileOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-page-enter">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-4">
                 <h2 className="text-xl font-bold">Editar Perfil</h2>
                 <button onClick={() => setIsProfileOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>
            
            {!isDeleteAccountMode ? (
                <>
                    <form onSubmit={handleSaveProfile} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Nome</label>
                            <input 
                            type="text" 
                            required 
                            className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                            value={profileForm.name}
                            onChange={e => setProfileForm({...profileForm, name: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Nova Senha</label>
                            <input 
                            type="password" 
                            className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                            value={profileForm.password}
                            onChange={e => setProfileForm({...profileForm, password: e.target.value})}
                            placeholder="Deixe em branco para manter"
                            />
                        </div>
                        <div className="flex justify-end gap-2 mt-6">
                            <button 
                            type="button" 
                            onClick={() => setIsProfileOpen(false)}
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
                    
                    <div className="mt-8 pt-6 border-t border-slate-100">
                        <button 
                            type="button"
                            onClick={() => setIsDeleteAccountMode(true)}
                            className="text-red-500 text-sm hover:text-red-700 hover:underline flex items-center gap-1"
                        >
                            <Trash2 size={14} /> Excluir minha conta
                        </button>
                    </div>
                </>
            ) : (
                <div className="space-y-4">
                    <div className="p-3 bg-red-50 text-red-700 rounded-lg border border-red-100 flex items-start gap-3">
                        <AlertTriangle size={24} className="shrink-0" />
                        <div className="text-sm">
                            <p className="font-bold">Zona de Perigo</p>
                            <p>Tem certeza que deseja excluir sua conta? Esta ação é irreversível.</p>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Confirme sua senha para continuar</label>
                        <input 
                            type="password" 
                            className="w-full p-2 border border-red-300 rounded-lg bg-white focus:ring-red-500 focus:border-red-500"
                            value={deleteConfirmationPassword}
                            onChange={e => setDeleteConfirmationPassword(e.target.value)}
                            placeholder="Sua senha atual"
                        />
                    </div>
                    <div className="flex flex-col gap-2 mt-4">
                        <button 
                            onClick={handleDeleteAccount}
                            className="w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition font-medium"
                        >
                            Confirmar Exclusão
                        </button>
                        <button 
                            onClick={() => { setIsDeleteAccountMode(false); setDeleteConfirmationPassword(''); }}
                            className="w-full text-slate-600 py-2 hover:bg-slate-50 rounded-lg"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;