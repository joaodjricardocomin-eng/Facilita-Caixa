import { supabase } from '../supabaseClient';
import { User, Role, AppData, Company } from '../types';

// --- AUTH HELPERS ---

export const registerOwnerAndCompany = async (
  companyName: string, 
  adminName: string, 
  email: string, 
  pass: string
): Promise<User | null> => {
  try {
    // 1. Create Auth User in Supabase
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password: pass,
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error("Erro ao criar usuário de autenticação.");

    // 2. Prepare Initial Data
    const newCompanyId = `comp-${Date.now()}`;
    const initialData: AppData = {
        users: [{ id: authData.user.id, name: adminName, email, password: pass, role: Role.MANAGER }],
        clients: [],
        plans: [{ id: 'p1', name: 'Plano Padrão', monthlyFee: 0, serviceLimit: 10, active: true }],
        records: [],
        cashFlow: [],
        companySettings: { name: companyName }
    };

    // 3. Insert into 'tenants' table (Our custom table for storing app data)
    const { error: dbError } = await supabase
      .from('tenants')
      .insert([
        { 
          owner_email: email,
          name: companyName,
          data: initialData
        }
      ]);

    if (dbError) throw dbError;

    // Return the user object so the app can log them in immediately
    return {
        id: authData.user.id,
        name: adminName,
        email: email,
        role: Role.MANAGER,
        // We fetch the companyId in the next step usually, but for now we rely on login
    };

  } catch (error: any) {
    console.error("Erro no registro:", error.message);
    throw error;
  }
};

export const performSupabaseLogin = async (email: string, password: string): Promise<User | null> => {
  try {
    // 1. Try Supabase Auth (For Owners/Managers created via SignUp)
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (!authError && authData.user) {
        // Logged in as Owner. Find their company.
        const { data: tenantData, error: tenantError } = await supabase
            .from('tenants')
            .select('*')
            .eq('owner_email', email)
            .single();

        if (tenantData) {
            // Find the specific user details inside the JSON data to get the Name
            const internalUser = (tenantData.data as AppData).users.find(u => u.email === email);
            return {
                id: authData.user.id,
                name: internalUser?.name || 'Administrador',
                email: email,
                role: Role.MANAGER, // Owners are always Managers
                companyId: tenantData.id.toString(), // Use the table ID
                password: password // Keep for session persistence
            };
        }
    }

    // 2. If Auth fails or User not found in Auth, check "Sub-users" inside the JSON data of all tenants
    // This allows employees created by the owner to login without a real Supabase Auth account
    const { data: allTenants, error: searchError } = await supabase
        .from('tenants')
        .select('*');

    if (searchError) throw searchError;

    for (const tenant of allTenants) {
        const appData = tenant.data as AppData;
        const foundUser = appData.users.find(u => u.email === email && u.password === password);
        
        if (foundUser) {
            return {
                ...foundUser,
                companyId: tenant.id.toString()
            };
        }
    }

    return null;
  } catch (error) {
    console.error("Login Error:", error);
    throw error;
  }
};

export const saveTenantDataSupabase = async (tenantId: string, newData: AppData) => {
    const { error } = await supabase
        .from('tenants')
        .update({ data: newData })
        .eq('id', tenantId);
    
    if (error) throw error;
};
