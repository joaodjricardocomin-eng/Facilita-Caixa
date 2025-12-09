import React from 'react';
import { User, Role } from '../types';
import { LayoutDashboard, Users, Calculator, LogOut, X, DollarSign, Layers, UserCog, FileText, Settings } from 'lucide-react';

interface SidebarProps {
  currentUser: User;
  currentView: string;
  setView: (view: string) => void;
  onLogout: () => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onOpenProfile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  currentUser, currentView, setView, onLogout, isOpen, setIsOpen, onOpenProfile
}) => {
  
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: [Role.SUPERVISOR, Role.MANAGER] },
    { id: 'reports', label: 'Relatórios', icon: FileText, roles: [Role.SUPERVISOR, Role.MANAGER] },
    { id: 'cashflow', label: 'Fluxo de Caixa', icon: DollarSign, roles: [Role.SUPERVISOR, Role.MANAGER] },
    { id: 'plans', label: 'Planos e Limites', icon: Layers, roles: [Role.SUPERVISOR, Role.MANAGER] },
    { id: 'monthly', label: 'Controle Mensal', icon: Calculator, roles: [Role.USER, Role.SUPERVISOR, Role.MANAGER] },
    { id: 'clients', label: 'Clientes', icon: Users, roles: [Role.USER, Role.SUPERVISOR, Role.MANAGER] },
    { id: 'users', label: 'Usuários', icon: UserCog, roles: [Role.MANAGER] },
    { id: 'settings', label: 'Configurações', icon: Settings, roles: [Role.MANAGER] },
  ];

  const filteredItems = menuItems.filter(item => item.roles.includes(currentUser.role));

  const baseClasses = "fixed md:static inset-y-0 left-0 z-40 w-64 bg-slate-900 text-white transform transition-transform duration-200 ease-in-out flex flex-col";
  const visibilityClasses = isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0";

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Content */}
      <div className={`${baseClasses} ${visibilityClasses}`}>
        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Facilita Caixa</h1>
            <p className="text-xs text-slate-400 mt-1">Gestão Contábil</p>
          </div>
          <button onClick={() => setIsOpen(false)} className="md:hidden text-slate-400">
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {filteredItems.map(item => (
            <button
              key={item.id}
              onClick={() => {
                setView(item.id);
                setIsOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                currentView === item.id 
                  ? 'bg-indigo-600 text-white' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <item.icon size={20} />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button 
            onClick={onOpenProfile}
            className="w-full flex items-center gap-3 mb-4 px-2 hover:bg-slate-800 p-2 rounded-lg transition-colors text-left"
          >
            <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center text-xs font-bold text-white">
              {currentUser.name.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium truncate text-white">{currentUser.name}</p>
              <p className="text-xs text-slate-500 truncate">{currentUser.role}</p>
            </div>
          </button>
          <button 
            onClick={onLogout}
            className="w-full flex items-center gap-2 px-4 py-2 text-red-400 hover:bg-slate-800 hover:text-red-300 rounded-lg transition-colors text-sm"
          >
            <LogOut size={18} /> Sair
          </button>
        </div>
      </div>
    </>
  );
};