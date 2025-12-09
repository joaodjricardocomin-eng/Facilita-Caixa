import React, { useState } from 'react';
import { User, SystemState } from '../types';
import { LayoutDashboard, UserPlus, Cloud, AlertCircle, Loader2 } from 'lucide-react';

interface LoginProps {
  system: SystemState;
  onLogin: (user: User) => void;
  onSignUp: () => void;
  onForgotPassword: () => void;
}

export const Login: React.FC<LoginProps> = ({ system, onLogin, onSignUp, onForgotPassword }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Simula validação (os dados já estão na memória via Hook)
    setTimeout(() => {
        // 1. Verifica Master Users
        const masterUser = system.masterUsers.find(u => u.email === email && u.password === password);
        if (masterUser) {
            setIsLoading(false);
            onLogin(masterUser);
            return;
        }

        // 2. Verifica Usuários das Empresas
        let foundUser: User | null = null;
        let foundCompanyActive = false;

        for (const company of system.companies) {
            const user = company.data.users.find(u => u.email === email && u.password === password);
            if (user) {
                foundUser = { ...user, companyId: company.id };
                foundCompanyActive = company.active;
                break;
            }
        }

        if (foundUser) {
            if (!foundCompanyActive) {
                setError('Esta empresa foi desativada pelo administrador.');
            } else {
                onLogin(foundUser);
            }
        } else {
            setError('Email ou senha incorretos.');
        }
        setIsLoading(false);
    }, 500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4 animate-page-enter">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md border border-slate-200">
        <div className="flex items-center justify-center mb-6 text-indigo-600">
            <div className="p-4 bg-indigo-50 rounded-full">
                <LayoutDashboard size={40} />
            </div>
        </div>
        <h2 className="text-2xl font-bold text-center text-slate-800 mb-2">Facilita Caixa</h2>
        <p className="text-center text-slate-500 mb-8 flex items-center justify-center gap-1 text-sm">
            <Cloud size={14} className="text-green-500"/> Sistema na Nuvem
        </p>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email Corporativo</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white transition"
              placeholder="seu@email.com"
              disabled={isLoading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Senha de Acesso</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white transition"
              placeholder="••••••"
              disabled={isLoading}
            />
          </div>
          
          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-start gap-2 animate-fade-in">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>{error}</span>
            </div>
          )}
          
          <div className="flex justify-end">
              <button 
                type="button" 
                onClick={onForgotPassword}
                className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                disabled={isLoading}
              >
                Esqueceu a senha?
              </button>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition font-medium flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-indigo-200"
          >
            {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'Acessar Sistema'}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-100">
             <button 
                type="button" 
                onClick={onSignUp}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 text-slate-600 py-2 rounded-lg hover:bg-slate-50 transition font-medium border border-transparent hover:border-slate-200"
            >
                <UserPlus size={18} />
                Criar Nova Conta
            </button>
        </div>
      </div>
    </div>
  );
};