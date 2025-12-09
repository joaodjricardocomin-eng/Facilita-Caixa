import React, { useState } from 'react';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';

interface SignUpProps {
  onBack: () => void;
  onRegister: (companyName: string, adminName: string, email: string, pass: string) => void;
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }
    if (formData.password.length < 3) {
      setError("A senha deve ter no mínimo 3 caracteres.");
      return;
    }

    setIsLoading(true);

    // Simula cadastro
    setTimeout(() => {
        onRegister(formData.companyName, formData.adminName, formData.email, formData.password);
        setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4 animate-page-enter">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
        <button onClick={onBack} className="text-slate-400 hover:text-slate-600 mb-6 flex items-center gap-2">
          <ArrowLeft size={16} /> Voltar para Login
        </button>
        
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Criar Nova Conta</h2>
        <p className="text-slate-500 mb-6">Comece a gerenciar seu escritório hoje.</p>

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
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Seu Nome</label>
            <input
              type="text"
              required
              className="w-full p-2 border border-slate-300 rounded-lg bg-white"
              value={formData.adminName}
              onChange={e => setFormData({...formData, adminName: e.target.value})}
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
                placeholder="Mín. 3 chars"
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
                />
             </div>
          </div>
          
          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2 animate-fade-in">
                <AlertCircle size={16} />
                {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition font-medium mt-4 flex items-center justify-center gap-2"
          >
            {isLoading ? <Loader2 className="animate-spin" size={20}/> : 'Cadastrar Empresa'}
          </button>
        </form>
      </div>
    </div>
  );
};
