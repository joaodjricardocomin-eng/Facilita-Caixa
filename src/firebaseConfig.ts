import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Cast import.meta to any to support Vite env variables without explicit type definitions
const env = (import.meta as any).env;

// As chaves virão das variáveis de ambiente da Vercel ou do arquivo .env local
const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID
};

// Inicializa o App apenas se houver configuração, senão não quebra o build
const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);