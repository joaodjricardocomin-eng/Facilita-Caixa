import React, { useState, useEffect } from 'react';
import { AppData, User, Role, Company, SystemState } from './types';
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
import { useSupabaseSystem } from './hooks/useSupabaseSystem';
import { registerOwnerAndCompany } from './services/supabaseService';
import { Menu, CheckCircle, AlertOctagon, X, Cloud, RefreshCw, WifiOff, ArrowDownCircle, Trash2, AlertTriangle, Database } from 'lucide-react';

const APP_USER_KEY = 'facilita_current_user_v2';

export const App: React.FC = () => {
  // --- STATE MANAGEMENT ---
  
  // 1. Session & Navigation
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const savedUser = localStorage.getItem(APP_USER_KEY);
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (e) { return null; }
  });
  
  const [authView, setAuthView] = useState<'login' | 'signup' | 'forgot'>('login');
  const [currentView, setCurrentView] = useState('monthly');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Profile State
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileForm, setProfileForm] = useState<{name: string, password: string}>({ name: '', password: '' });
  const [isDeleteAccountMode, setIsDeleteAccountMode] = useState(false);
  const [deleteConfirmationPassword, setDeleteConfirmationPassword] = useState('');

  // Toast
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  // --- DATA HOOKS (SUPABASE) ---
  // Load Tenant Data based on logged user company ID
  const { data: tenantData, updateData: setTenantData, syncStatus } = useSupabaseSystem(currentUser?.companyId);

  // Persistence for Session
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(APP_USER_KEY, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(APP_USER_KEY);
    }
  }, [currentUser]);

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
    setIsDeleteAccountMode(false);
    setDeleteConfirmationPassword('');
  };

  const handleRegisterCompany = async (companyName: string, adminName: string, email: string, pass: string) => {
      // Allow the error to propagate to SignUp component for display
      await registerOwnerAndCompany(companyName, adminName, email, pass);
      setAuthView('login');
      showNotification("Empresa e Login criados! Acesse com suas credenciais.", 'success');
  };

  // --- PROFILE ACTIONS ---

  const handleSaveProfile = (e: React.FormEvent) => {
      e.preventDefault();
      if (!currentUser) return;

      const name = profileForm.name;
      const password = profileForm.password;

      // Optimistic Update Local State
      setCurrentUser({ ...currentUser, name, password });

      if (tenantData) {
        // Update User in Supabase JSON
        const updatedUsers = tenantData.users.map(u => u.id === currentUser.id ? { ...u, name, password } : u);
        setTenantData(prev => ({...prev, users: updatedUsers}));
        showNotification("Perfil atualizado na nuvem!", 'success');
      }
      setIsProfileOpen(false);
  };

  const handleDeleteAccount = () => {
    // Basic impl for demo
    handleLogout();
  };

  // --- RENDER LOGIC ---

  // 1. Unauthenticated
  if (!currentUser) {
      if (authView === 'signup') return <SignUp onBack={() => setAuthView('login')} onRegister={handleRegisterCompany} />;
      if (authView === 'forgot') return <ForgotPassword onBack={() => setAuthView('login')} />;
      
      // Pass empty system since login now handles its own logic via service
      return <Login system={{masterUsers: [], companies: []}} onLogin={handleLogin} onSignUp={() => setAuthView('signup')} onForgotPassword={() => setAuthView('forgot')} />;
  }

  // 2. Tenant App View
  if ((syncStatus === 'loading' && !tenantData) || !tenantData) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4 p-6">
            {syncStatus === 'error' ? (
                <div className="bg-white p-8 rounded-xl shadow-lg max-w-md text-center border border-red-100">
                    <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Database size={32} />
                    </div>
                    <h2 className="text-xl font-bold text-slate-800 mb-2">Erro de Conexão</h2>
                    <p className="text-slate-500 text-sm mb-6">
                        Não foi possível carregar os dados da empresa. Isso geralmente ocorre se as permissões do banco de dados (RLS) não estiverem configuradas corretamente.
                    </p>
                    <div className="flex flex-col gap-3">
                        <button onClick={() => window.location.reload()} className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition flex items-center justify-center gap-2">
                            <RefreshCw size={18} /> Tentar Novamente
                        </button>
                        <button onClick={handleLogout} className="text-slate-500 hover:text-slate-800 text-sm py-2">
                            Voltar para Login
                        </button>
                    </div>
                </div>
            ) : (
                <>
                    <RefreshCw className="animate-spin text-indigo-600" size={40} />
                    <p className="text-slate-500 font-medium animate-pulse">Sincronizando com a nuvem...</p>
                </>
            )}
        </div>
      );
  }

  const renderTenantView = () => {
    const data = tenantData;

    switch (currentView) {
      case 'dashboard': return <Dashboard data={data} currentUser={currentUser} currentMonth={CURRENT_MONTH} />;
      case 'reports': return <Reports data={data} currentMonth={CURRENT_MONTH} />;
      case 'clients': return <ClientList data={data} setData={setTenantData} currentUser={currentUser} />;
      case 'monthly': return <MonthlyControl data={data} setData={setTenantData} currentMonth={CURRENT_MONTH} currentUser={currentUser} onNotification={showNotification} />;
      case 'cashflow': return <CashFlow data={data} setData={setTenantData} />;
      case 'plans': return <PlanManager data={data} setData={setTenantData} />;
      case 'users': return <UserManager data={data} setData={setTenantData} currentUser={currentUser} />;
      case 'settings': return <Settings data={data} setData={setTenantData} onNotification={showNotification} />;
      default: return <MonthlyControl data={data} setData={setTenantData} currentMonth={CURRENT_MONTH} currentUser={currentUser} onNotification={showNotification} />;
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
        <div className="bg-white border-b border-slate-200 px-6 py-2 flex items-center justify-end gap-3 text-xs transition-colors duration-300 shadow-sm z-10">
            {syncStatus === 'saving' && <span className="flex items-center gap-2 text-indigo-600 font-medium"><RefreshCw size={12} className="animate-spin" /> Salvando...</span>}
            {syncStatus === 'synced' && <span className="flex items-center gap-2 text-green-600 font-medium"><Cloud size={14} /> Online</span>}
            {syncStatus === 'error' && <span className="flex items-center gap-2 text-red-600 font-medium"><WifiOff size={14} /> Offline</span>}
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
        onSave={(name, pass) => handleSaveProfile({ preventDefault: () => {} } as any)} 
        onDeleteAccount={handleDeleteAccount}
      />
    </div>
  );
};