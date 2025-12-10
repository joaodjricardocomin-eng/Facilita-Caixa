import React, { useState } from 'react';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';

interface SignUpProps {
  onBack: () => void;
  onRegister: (companyName: string, adminName: string, email: string, pass: string) => Promise<void>;
}

export const SignUp: React.FC<SignUpProps> = ({ onBack, onRegister }) => {
  const [formData, setFormData] = useState({
    companyName: '',
    adminName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }
    if (formData.password.length < 6) {
      setError("A senha deve ter no mínimo 6 caracteres.");
      return;
    }

    setIsLoading(true);

    try {
        await onRegister(formData.companyName, formData.adminName, formData.email, formData.password);
        // O redirecionamento é feito pelo componente pai (App.tsx) ao resolver a promise com sucesso
    } catch(e: any) {
        setIsLoading(false);
        console.error("SignUp Error:", e);
        // Exibe mensagem amigável ou o erro técnico
        setError(e.message || "Erro ao registrar. Verifique sua conexão.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4 animate-page-enter">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
        <button onClick={onBack} className="text-slate-400 hover:text-slate-600 mb-6 flex items-center gap-2">
          <ArrowLeft size={16} /> Voltar para Login
        </button>
        
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Criar Conta Empresarial</h2>
        <p className="text-slate-500 mb-6">Cadastre sua empresa e comece a gerenciar.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nome da Empresa</label>
            <input
              type="text"
              required
              className="w-full p-2 border border-slate-300 rounded-lg bg-white"
              value={formData.companyName}
              onChange={e => setFormData({...formData, companyName: e.target.value})}
              placeholder="Ex: Minha Contabilidade"
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Seu Nome (Gestor)</label>
            <input
              type="text"
              required
              className="w-full p-2 border border-slate-300 rounded-lg bg-white"
              value={formData.adminName}
              onChange={e => setFormData({...formData, adminName: e.target.value})}
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email de Acesso</label>
            <input
              type="email"
              required
              className="w-full p-2 border border-slate-300 rounded-lg bg-white"
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
              disabled={isLoading}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Senha</label>
                <input
                type="password"
                required
                className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                value={formData.password}
                onChange={e => setFormData({...formData, password: e.target.value})}
                placeholder="Mín. 6 chars"
                disabled={isLoading}
                />
             </div>
             <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Confirmar</label>
                <input
                type="password"
                required
                className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                value={formData.confirmPassword}
                onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
                disabled={isLoading}
                />
             </div>
          </div>
          
          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-start gap-2 animate-fade-in border border-red-100">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition font-medium mt-4 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? <Loader2 className="animate-spin" size={20}/> : 'Cadastrar Empresa'}
          </button>
        </form>
      </div>
    </div>
  );
};