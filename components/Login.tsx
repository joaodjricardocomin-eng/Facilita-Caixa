import React, { useState } from 'react';
import { User, Role, SystemState } from '../types';
import { LayoutDashboard, KeyRound, UserPlus } from 'lucide-react';

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

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 1. Check Master Users (Array check)
    const masterUser = system.masterUsers.find(u => u.email === email && u.password === password);
    if (masterUser) {
        onLogin(masterUser);
        return;
    }

    // 2. Check Tenants
    let foundUser: User | null = null;
    let foundCompanyActive = false;

    // Search through all companies
    for (const company of system.companies) {
        const user = company.data.users.find(u => u.email === email && u.password === password);
        if (user) {
            foundUser = { ...user, companyId: company.id }; // Attach company ID context
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
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4 animate-page-enter">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
        <div className="flex items-center justify-center mb-8 text-indigo-600">
            <LayoutDashboard size={48} />
        </div>
        <h2 className="text-2xl font-bold text-center text-slate-800 mb-2">Facilita Caixa</h2>
        <p className="text-center text-slate-500 mb-6">Gestão contábil inteligente</p>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
              placeholder="seu@email.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Senha</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
              placeholder="••••••"
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          
          <div className="flex justify-end">
              <button 
                type="button" 
                onClick={onForgotPassword}
                className="text-sm text-indigo-600 hover:text-indigo-800"
              >
                Esqueceu a senha?
              </button>
          </div>

          <button
            type="submit"
            className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition font-medium"
          >
            Entrar
          </button>
        </form>

        <div className="mt-4 flex flex-col gap-3">
             <button 
                type="button" 
                onClick={onSignUp}
                className="w-full flex items-center justify-center gap-2 border border-indigo-600 text-indigo-600 py-2 rounded-lg hover:bg-indigo-50 transition font-medium"
            >
                <UserPlus size={18} />
                Criar Nova Conta
            </button>
        </div>
      </div>
    </div>
  );
};