import { db } from '../firebaseConfig';
import { collection, doc, getDocs, getDoc, setDoc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { User, Company, Role, SystemState, AppData } from '../types';
import { MOCK_SYSTEM_DATA } from '../constants';

// --- INITIALIZATION ---
export const initializeDatabase = async () => {
  try {
    // 1. Check/Create Master Config
    const masterRef = doc(db, 'master', 'config');
    const masterSnap = await getDoc(masterRef);
    if (!masterSnap.exists()) {
      await setDoc(masterRef, { users: MOCK_SYSTEM_DATA.masterUsers });
    }

    // 2. Check/Create Demo Company
    const demoCompany = MOCK_SYSTEM_DATA.companies[0];
    const compRef = doc(db, 'companies', demoCompany.id);
    const compSnap = await getDoc(compRef);
    if (!compSnap.exists()) {
      await setDoc(compRef, demoCompany);
    }
    console.log("Banco de dados inicializado/verificado.");
  } catch (error) {
    console.error("Erro ao inicializar DB:", error);
  }
};

// --- AUTH SERVICES ---
export const performLogin = async (email: string, password: string): Promise<User | null> => {
  try {
    // 1. Check Master Collection
    const masterRef = doc(db, 'master', 'config');
    const masterSnap = await getDoc(masterRef);
    if (masterSnap.exists()) {
      const masters = masterSnap.data().users as User[];
      const foundMaster = masters.find(u => u.email === email && u.password === password);
      if (foundMaster) return foundMaster;
    }

    // 2. Check Companies Collection
    // Note: In a large production app, we would use a 'users' collection group or index. 
    // For this scale, iterating active companies is acceptable and safer for consistency.
    const companiesRef = collection(db, 'companies');
    const querySnapshot = await getDocs(companiesRef);
    
    for (const doc of querySnapshot.docs) {
      const company = doc.data() as Company;
      if (!company.active) continue; // Skip inactive companies

      const foundUser = company.data.users.find(u => u.email === email && u.password === password);
      if (foundUser) {
        return { ...foundUser, companyId: company.id };
      }
    }

    return null;
  } catch (error) {
    console.error("Login Error:", error);
    throw error;
  }
};

// --- MASTER ACTIONS ---
export const fetchAllCompanies = async (): Promise<Company[]> => {
  const companiesRef = collection(db, 'companies');
  const snap = await getDocs(companiesRef);
  return snap.docs.map(d => d.data() as Company);
};

export const fetchMasterUsers = async (): Promise<User[]> => {
  const masterRef = doc(db, 'master', 'config');
  const snap = await getDoc(masterRef);
  return snap.exists() ? snap.data().users : [];
};

export const createCompany = async (company: Company) => {
  await setDoc(doc(db, 'companies', company.id), company);
};

export const updateCompanyMetadata = async (companyId: string, updates: Partial<Company>) => {
  await updateDoc(doc(db, 'companies', companyId), updates);
};

export const deleteCompany = async (companyId: string) => {
  await deleteDoc(doc(db, 'companies', companyId));
};

export const addMasterUser = async (newUser: User) => {
  const masterRef = doc(db, 'master', 'config');
  const snap = await getDoc(masterRef);
  if (snap.exists()) {
    const currentUsers = snap.data().users as User[];
    await updateDoc(masterRef, { users: [...currentUsers, newUser] });
  }
};

export const removeMasterUser = async (userId: string) => {
  const masterRef = doc(db, 'master', 'config');
  const snap = await getDoc(masterRef);
  if (snap.exists()) {
    const currentUsers = snap.data().users as User[];
    const newUsers = currentUsers.filter(u => u.id !== userId);
    await updateDoc(masterRef, { users: newUsers });
  }
};

// --- TENANT ACTIONS ---
export const saveTenantData = async (companyId: string, newData: AppData) => {
  const compRef = doc(db, 'companies', companyId);
  await updateDoc(compRef, { data: newData });
};