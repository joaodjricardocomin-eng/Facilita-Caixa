import { supabase } from '../supabaseClient';
import { User, Role, AppData, Client, CashFlowItem, Plan, MonthlyRecord, UsageLog } from '../types';

// --- AUTH & INITIALIZATION ---

export const registerOwnerAndCompany = async (
  companyName: string, 
  adminName: string, 
  email: string, 
  pass: string
): Promise<User | null> => {
  try {
    // 1. Auth SignUp
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password: pass,
      options: { data: { full_name: adminName } }
    });

    if (authError) throw new Error(authError.message);
    if (!authData.user) throw new Error("Erro na criação do usuário.");

    // 2. Create Tenant
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert([{ name: companyName, owner_email: email }])
      .select()
      .single();

    if (tenantError) throw new Error("Erro ao criar empresa: " + tenantError.message);

    // 3. Create Profile linked to Tenant
    const { error: profileError } = await supabase
      .from('profiles')
      .insert([{
        id: authData.user.id, // Links to Auth
        tenant_id: tenant.id,
        name: adminName,
        email: email,
        role: Role.MANAGER
      }]);

    if (profileError) throw new Error("Erro ao criar perfil: " + profileError.message);

    return {
        id: authData.user.id,
        name: adminName,
        email: email,
        role: Role.MANAGER,
        companyId: tenant.id
    };

  } catch (error: any) {
    console.error("Registration Error:", error);
    throw error;
  }
};

export const performSupabaseLogin = async (email: string, password: string): Promise<User | null> => {
  // 1. Auth Login
  const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password });
  
  if (error || !authData.user) {
      console.error("Login failed:", error?.message);
      throw new Error("Email ou senha incorretos.");
  }

  // 2. Get Profile to find Company ID
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authData.user.id)
    .single();

  if (profileError || !profile) {
      // Fallback: Check if user exists but profile implies master or error
      throw new Error("Perfil de usuário não encontrado para esta conta.");
  }

  return {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      role: profile.role as Role,
      companyId: profile.tenant_id,
      password: password // Keep for local session re-auth if needed, though insecure practice normally
  };
};

// --- DATA LOADING (Relational -> AppData Object) ---

export const loadCompanyData = async (companyId: string): Promise<AppData> => {
    // Parallel fetching for performance
    const [
        { data: settings },
        { data: profiles },
        { data: plans },
        { data: clients },
        { data: records },
        { data: cashFlow }
    ] = await Promise.all([
        supabase.from('tenants').select('*').eq('id', companyId).single(),
        supabase.from('profiles').select('*').eq('tenant_id', companyId),
        supabase.from('plans').select('*').eq('tenant_id', companyId),
        supabase.from('clients').select('*').eq('tenant_id', companyId),
        // Fetch records with nested usage logs using Supabase relational query
        supabase.from('monthly_records').select('*, usage_logs(*)').eq('tenant_id', companyId),
        supabase.from('cash_flow').select('*').eq('tenant_id', companyId),
    ]);

    // Map DB types to App Types
    return {
        companySettings: {
            name: settings?.name || 'Minha Empresa',
            address: settings?.address || '',
            logoBase64: settings?.logo_url || ''
        },
        users: (profiles || []).map((p: any) => ({
            id: p.id,
            name: p.name,
            email: p.email,
            role: p.role as Role,
            companyId: p.tenant_id
        })),
        plans: (plans || []).map((p: any) => ({
            id: p.id,
            name: p.name,
            monthlyFee: Number(p.monthly_fee),
            serviceLimit: p.service_limit,
            active: p.active
        })),
        clients: (clients || []).map((c: any) => ({
            id: c.id,
            name: c.name,
            document: c.document,
            contact: c.contact,
            planId: c.plan_id,
            dueDay: c.due_day,
            active: c.active
        })),
        records: (records || []).map((r: any) => ({
            id: r.id,
            clientId: r.client_id,
            month: r.month,
            servicesUsed: r.services_used,
            status: r.status,
            notes: r.notes,
            usageHistory: (r.usage_logs || []).map((l: any) => ({
                id: l.id,
                date: l.date,
                description: l.description,
                quantity: l.quantity
            }))
        })),
        cashFlow: (cashFlow || []).map((c: any) => ({
            id: c.id,
            date: c.date,
            description: c.description,
            value: Number(c.value),
            type: c.type,
            paymentMethod: c.payment_method,
            observation: c.observation
        }))
    };
};

// --- CRUD OPERATIONS ---

// Clients
export const upsertClient = async (client: Client, tenantId: string) => {
    const payload = {
        tenant_id: tenantId,
        name: client.name,
        document: client.document,
        contact: client.contact,
        plan_id: client.planId,
        due_day: client.dueDay,
        active: client.active
    };
    
    if (client.id && !client.id.startsWith('c')) {
        await supabase.from('clients').update(payload).eq('id', client.id);
    } else {
        await supabase.from('clients').insert(payload);
    }
};

export const deleteClient = async (id: string) => {
    await supabase.from('clients').delete().eq('id', id);
};

// Plans
export const upsertPlan = async (plan: Plan, tenantId: string) => {
    const payload = {
        tenant_id: tenantId,
        name: plan.name,
        monthly_fee: plan.monthlyFee,
        service_limit: plan.serviceLimit,
        active: plan.active
    };
    if (plan.id && !plan.id.startsWith('p')) {
        await supabase.from('plans').update(payload).eq('id', plan.id);
    } else {
        await supabase.from('plans').insert(payload);
    }
};

export const deletePlan = async (id: string) => {
    await supabase.from('plans').delete().eq('id', id);
};

// CashFlow
export const addCashFlow = async (item: CashFlowItem, tenantId: string) => {
    await supabase.from('cash_flow').insert({
        tenant_id: tenantId,
        date: item.date,
        description: item.description,
        value: item.value,
        type: item.type,
        payment_method: item.paymentMethod,
        observation: item.observation
    });
};

export const updateCashFlow = async (item: CashFlowItem) => {
    await supabase.from('cash_flow').update({
        date: item.date,
        description: item.description,
        value: item.value,
        type: item.type,
        payment_method: item.paymentMethod,
        observation: item.observation
    }).eq('id', item.id);
};

export const deleteCashFlow = async (id: string) => {
    await supabase.from('cash_flow').delete().eq('id', id);
};

// Users (Profiles)
export const syncUserMapping = async (tenantId: string, user: User) => {
    // Note: Creating a user here only creates the profile entry locally for viewing.
    // In a real production Supabase app, you would use Supabase Admin API or Invite logic.
    // For this implementation, we just store the profile reference.
    
    // Check if profile exists by email (if they signed up already)
    const { data: existing } = await supabase.from('profiles').select('id').eq('email', user.email).single();
    
    if (existing) {
        await supabase.from('profiles').update({ role: user.role, tenant_id: tenantId }).eq('id', existing.id);
    } else {
        // Warning: Usually you can't insert into profiles without a matching auth.users.id via Trigger.
        // We will assume the user has to Sign Up themselves first, or we use a function.
        // For now, we skip if no auth ID exists to prevent FK violation.
        console.warn("Usuário criado na UI. Ele deve se registrar com o mesmo email para aparecer.");
    }
};

export const removeUserMapping = async (email: string) => {
    // Only works if RLS allows (Manager role)
    await supabase.from('profiles').delete().eq('email', email);
};

// Monthly Records & Usage
export const ensureMonthlyRecord = async (record: MonthlyRecord, tenantId: string): Promise<string> => {
    // Check if exists first by unique key (client + month)
    const { data: existing } = await supabase.from('monthly_records')
        .select('id')
        .eq('client_id', record.clientId)
        .eq('month', record.month)
        .single();

    if (existing) {
        await supabase.from('monthly_records').update({
            status: record.status,
            notes: record.notes,
            services_used: record.servicesUsed
        }).eq('id', existing.id);
        return existing.id;
    } else {
        const { data } = await supabase.from('monthly_records').insert({
            tenant_id: tenantId,
            client_id: record.clientId,
            month: record.month,
            status: record.status,
            services_used: record.servicesUsed,
            notes: record.notes
        }).select().single();
        return data.id;
    }
};

export const addUsageLog = async (log: UsageLog, recordId: string, tenantId: string) => {
    await supabase.from('usage_logs').insert({
        tenant_id: tenantId,
        record_id: recordId,
        date: log.date,
        description: log.description,
        quantity: log.quantity
    });
    
    // Auto-update services_used count on parent record?
    // We can do it via a trigger in SQL or client side update. 
    // Client side for simplicity here:
    // (This is handled by the caller usually updating the parent record count)
};

export const deleteUsageLog = async (logId: string) => {
    await supabase.from('usage_logs').delete().eq('id', logId);
};

// Settings
export const updateCompanySettings = async (tenantId: string, settings: any) => {
    await supabase.from('tenants').update({
        name: settings.name,
        address: settings.address,
        logo_url: settings.logoBase64
    }).eq('id', tenantId);
};

// Placeholder to prevent breakages, though deprecated
export const saveTenantDataSupabase = async (_id: string, _data: AppData) => {
    console.warn("saveTenantDataSupabase deprecated. Use individual table operations.");
};