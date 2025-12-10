import { supabase } from '../supabaseClient';
import { User, Role, AppData } from '../types';

// --- AUTH HELPERS ---

export const registerOwnerAndCompany = async (
  companyName: string, 
  adminName: string, 
  email: string, 
  pass: string
): Promise<User | null> => {
  try {
    // 1. Create Auth User in Supabase
    // Note: If 'Enable Email Confirmations' is ON in Supabase, this user won't be able to login via Auth immediately.
    // However, our fallback logic in performSupabaseLogin allows them to login via the DB record immediately if needed.
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password: pass,
    });

    if (authError) {
        console.error("Auth SignUp Error:", authError);
        // We continue even if Auth fails (e.g. user already exists in Auth but not in Tenants), 
        // OR we throw. Usually throwing is better to inform user.
        throw new Error(authError.message);
    }

    if (!authData.user) throw new Error("Erro ao criar usuário de autenticação.");

    // 2. Prepare Initial Data
    const initialData: AppData = {
        users: [{ id: authData.user.id, name: adminName, email, password: pass, role: Role.MANAGER }],
        clients: [],
        plans: [{ id: 'p1', name: 'Plano Padrão', monthlyFee: 0, serviceLimit: 10, active: true }],
        records: [],
        cashFlow: [],
        companySettings: { name: companyName }
    };

    // 3. Insert into 'tenants' table
    const { error: dbError } = await supabase
      .from('tenants')
      .insert([
        { 
          owner_email: email,
          name: companyName,
          data: initialData
        }
      ]);

    if (dbError) {
        console.error("DB Insert Error:", dbError);
        throw new Error("Erro ao criar registro da empresa. Verifique se o banco de dados está configurado.");
    }

    return {
        id: authData.user.id,
        name: adminName,
        email: email,
        role: Role.MANAGER,
    };

  } catch (error: any) {
    console.error("Erro no registro:", error.message || error);
    throw error;
  }
};

export const performSupabaseLogin = async (email: string, password: string): Promise<User | null> => {
  // Normalize email
  const cleanEmail = email.trim().toLowerCase();
  let authUser = null;

  // 1. TENTATIVA 1: Supabase Auth (Para Donos)
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ 
        email: cleanEmail, 
        password 
    });
    
    if (!error && data.user) {
        authUser = data.user;
    } else {
        console.log("Auth nativo falhou (esperado para sub-usuários):", error?.message);
    }
  } catch (e) {
    console.warn("Erro ao tentar Auth nativo, tentando busca no banco...", e);
  }

  // 2. Se logou no Auth, busca a empresa desse dono
  if (authUser) {
    const { data: tenantData } = await supabase
        .from('tenants')
        .select('*')
        .eq('owner_email', cleanEmail) // Filtra pelo email do dono
        .single();

    if (tenantData) {
        const appData = tenantData.data as AppData;
        // Tenta achar o nome atualizado dentro do JSON
        const internalUser = appData.users?.find(u => u.email.toLowerCase() === cleanEmail);
        
        return {
            id: authUser.id,
            name: internalUser?.name || 'Administrador',
            email: cleanEmail,
            role: Role.MANAGER, 
            companyId: tenantData.id.toString(),
            password: password 
        };
    }
  }

  // 3. TENTATIVA 2: Busca Manual no Banco (Fallback)
  // Útil para: Funcionários (que não têm Auth Supabase) OU Donos com email não confirmado
  
  const { data: allTenants, error: searchError } = await supabase
      .from('tenants')
      .select('*');

  if (searchError) {
      console.error("Erro ao buscar tenants:", searchError);
      throw new Error("Erro de conexão com o banco de dados.");
  }

  if (allTenants) {
      for (const tenant of allTenants) {
          const appData = tenant.data as AppData;
          
          if (appData && Array.isArray(appData.users)) {
              // Busca usuário com email e senha correspondentes dentro do JSON
              const foundUser = appData.users.find(u => 
                  u.email.toLowerCase() === cleanEmail && 
                  u.password === password
              );
              
              if (foundUser) {
                  console.log("Usuário encontrado via busca interna no JSON");
                  return {
                      ...foundUser,
                      companyId: tenant.id.toString()
                  };
              }
          }
      }
  }

  return null;
};

export const saveTenantDataSupabase = async (tenantId: string, newData: AppData) => {
    const { error } = await supabase
        .from('tenants')
        .update({ data: newData })
        .eq('id', tenantId);
    
    if (error) throw error;
};