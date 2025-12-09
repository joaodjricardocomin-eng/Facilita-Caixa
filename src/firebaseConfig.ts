import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCb2_-n5WSyAcRHPaBabmv7PjzlN9XjYtU",
  authDomain: "facilita-caixa-cont.firebaseapp.com",
  projectId: "facilita-caixa-cont",
  storageBucket: "facilita-caixa-cont.firebasestorage.app",
  messagingSenderId: "53427641738",
  appId: "1:53427641738:web:2d2071107198aa84767c73",
  measurementId: "G-3KD4VR6EYB"
};

// Inicializa o App
const app = initializeApp(firebaseConfig);

// Exporta os serviços do Firebase
export const db = getFirestore(app);
export const auth = getAuth(app);