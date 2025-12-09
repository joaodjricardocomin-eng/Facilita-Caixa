import React, { useState } from 'react';
import { ArrowLeft, Mail } from 'lucide-react';

interface ForgotPasswordProps {
  onBack: () => void;
}

export const ForgotPassword: React.FC<ForgotPasswordProps> = ({ onBack }) => {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulação de envio
    setTimeout(() => {
        setSent(true);
    }, 1000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4 animate-page-enter">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
        <button onClick={onBack} className="text-slate-400 hover:text-slate-600 mb-6 flex items-center gap-2">
          <ArrowLeft size={16} /> Voltar para Login
        </button>
        
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Recuperar Senha</h2>
        <p className="text-slate-500 mb-6">Insira seu email para receber as instruções.</p>

        {sent ? (
             <div className="text-center py-6">
                <div className="mx-auto w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                    <Mail size={32} />
                </div>
                <h3 className="text-lg font-bold text-slate-800">Email Enviado!</h3>
                <p className="text-slate-600 mt-2 text-sm">
                    Verifique sua caixa de entrada (e spam) para redefinir sua senha.
                </p>
                <button onClick={onBack} className="mt-6 text-indigo-600 font-medium hover:underline">
                    Voltar ao Login
                </button>
             </div>
        ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email Cadastrado</label>
                <input
                type="email"
                required
                className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com"
                />
            </div>

            <button
                type="submit"
                className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition font-medium"
            >
                Enviar Link de Recuperação
            </button>
            </form>
        )}
      </div>
    </div>
  );
};