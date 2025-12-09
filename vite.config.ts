import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  define: {
    // Injeta a variável de ambiente de forma segura para o navegador
    'process.env': {
      API_KEY: process.env.API_KEY || ''
    }
  }
});