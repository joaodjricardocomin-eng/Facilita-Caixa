import express from 'express';
import path from 'path';
import compression from 'compression';
import { fileURLToPath } from 'url';

// Configuração para ES Modules no Node
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Habilitar compressão Gzip para performance
app.use(compression());

// Servir arquivos estáticos da pasta 'dist' (gerada pelo build)
// Se você mudar o output do vite, mude o caminho aqui.
app.use(express.static(path.join(__dirname, 'dist')));

// Rota coringa para SPA (Single Page Application)
// Redireciona qualquer requisição que não seja arquivo estático para o index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`
  🚀 Servidor Facilita Caixa rodando!
  ------------------------------------
  Local:   http://localhost:${PORT}
  Porta:   ${PORT}
  Ambiente: Produção
  ------------------------------------
  `);
});
