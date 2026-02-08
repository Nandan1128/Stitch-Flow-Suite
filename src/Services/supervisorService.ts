import { supabase } from "@/Config/supabaseClient";
// Fix bcrypt random for browser (legacy code removed)

export interface Supervisor {
    id: string;
    name: string;
    email: string;
    isActive: boolean;
    createdAt: Date;
}

/**
 * Fetch all supervisors from the employees table (role='supervisor')
 */
export const getSupervisors = async (): Promise<Supervisor[]> => {
    try {
        const { data, error } = await supabase
            .from("employees")
            .select("*")
            .eq("role", "supervisor")
            .order("created_at", { ascending: false });

        if (error) throw error;

        return (data || []).map((r: any) => ({
            id: r.id,
            name: r.name,
            email: r.email,
            isActive: r.is_active ?? true,
            createdAt: r.created_at ? new Date(r.created_at) : new Date(),
        }));
    } catch (err) {
        console.error("getSupervisors error:", err);
        return [];
    }
};

/**
 * Add a new supervisor to employees table with role='supervisor'
 * Returns both the created employee (supervisor) and the created app_user row
 */
export const addSupervisor = async (
    payload: {
        name: string;
        email?: string | null;
        employee_code?: string | null;
        mobile_number?: string | null;
        emergency_number?: string | null;
        current_address?: string | null;
        permanent_address?: string | null;
        id_proof?: string | null;
        id_proof_image_url?: string | null;
        bank_account_detail?: string | null;
        bank_image_url?: string | null;
        salary_amount?: number | null;
        salary_id?: string | null;
        role?: string | null;
        is_supervisor?: boolean | null;
        profile_image_url?: string | null;
        is_active?: boolean | null;
        password?: string | null;
    }
): Promise<{ data: { supervisor: Supervisor; user: any } | null; error: any }> => {
    console.log("addSupervisor START with payload:", { ...payload, password: "REDACTED" });
    try {
        // 0️⃣ Validate: Email must be unique
        if (payload.email) {
            const alreadyExists = await checkEmailExists(payload.email);
            if (alreadyExists) {
                console.log("Email already exists validation hit for:", payload.email);
                return {
                    data: null,
                    error: { message: "Email already exists. Please use another email." }
                };
            }
        }

        console.log("Proceeding to create Auth User and insert employee...");

        // 1. Sign Up the user in Supabase Auth
        // NOTE: This might log the admin out if "Confirm Email" is disabled in Supabase.
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: payload.email!,
            password: payload.password || "password123", // Default if missing, though UI should require it
            options: {
                data: {
                    name: payload.name,
                    role: 'supervisor' // Add metadata
                }
            }
        });

        if (authError) {
            console.error("Supabase Auth SignUp Error:", authError);
            return { data: null, error: authError };
        }

        if (!authData.user) {
            return { data: null, error: { message: "Failed to create auth user (no user returned)." } };
        }

        const newUserId = authData.user.id;

        // map payload -> employees table columns per provided schema
        const insertRow: any = {
            name: payload.name,
            employee_code: payload.employee_code ?? null,
            email: payload.email ?? null,
            mobile_number: payload.mobile_number ?? null,
            emergency_number: payload.emergency_number ?? null,
            current_address: payload.current_address ?? null,
            permanent_address: payload.permanent_address ?? null,
            id_proof: payload.id_proof ?? null,
            id_proof_image_url: payload.id_proof_image_url ?? null,
            bank_account_detail: payload.bank_account_detail ?? null,
            bank_image_url: payload.bank_image_url ?? null,
            salary_amount: payload.salary_amount ?? 0,
            // salary_id is NOT in the schema based on your earlier logs, ignoring or putting in if needed
            role: "supervisor",
            is_active: payload.is_active ?? true,
            profile_image_url: payload.profile_image_url ?? null
        };

        const { data: empData, error: empError } = await supabase
            .from("employees")
            .insert(insertRow)
            .select()
            .single();

        if (empError) {
            console.error("Error inserting employee:", empError);
            // ROLLBACK Auth user if possible? Hard to do from client without service role. implies manual cleanup.
            return { data: null, error: empError };
        }

        const newEmployee = empData;

        // 3. Insert into app_users
        // We use the Auth User ID as the app_users.id to link them
        const appUserRow = {
            id: newUserId, // LINK TO AUTH USER
            username: payload.name,
            email: payload.email,
            // password_hash: hash, // No longer keeping hash
            role: "supervisor",
            employee_id: newEmployee.id,
            created_at: new Date().toISOString()
        };

        const { data: userData, error: userError } = await supabase
            .from("app_users")
            .insert(appUserRow)
            .select()
            .single();

        if (userError) {
            console.error("Error inserting app_user:", userError);
            return { data: null, error: userError };
        }

        return {
            data: {
                supervisor: {
                    id: newEmployee.id,
                    name: newEmployee.name,
                    email: newEmployee.email,
                    isActive: newEmployee.is_active ?? true,
                    createdAt: newEmployee.created_at
                        ? new Date(newEmployee.created_at)
                        : new Date(),
                },
                user: userData ?? null,
            },
            error: null,
        };
    } catch (err) {
        console.error("addSupervisor catch error:", err);
        return { data: null, error: err };
    }
};

/**
 * Check if an email exists in either employees or app_users
 */
export const checkEmailExists = async (email: string): Promise<boolean> => {
    try {
        // Check employees table
        const { count: empCount } = await supabase
            .from("employees")
            .select("id", { count: "exact", head: true })
            .eq("email", email);

        if (empCount && empCount > 0) return true;

        // Check app_users table
        const { count: userCount } = await supabase
            .from("app_users")
            .select("id", { count: "exact", head: true })
            .eq("email", email);

        return userCount && userCount > 0;
    } catch (err) {
        console.error("checkEmailExists error:", err);
        return false;
    }
};


/**
 * Update supervisor information in employees table
 */
export const updateSupervisor = async (
    id: string,
    payload: {
        name?: string;
        email?: string;
    }
): Promise<{ data: Supervisor | null; error: any }> => {
    try {
        const updates: any = {};
        if (payload.name) updates.name = payload.name;
        if (payload.email) updates.email = payload.email;

        const { data, error } = await supabase
            .from("employees")
            .update(updates)
            .eq("id", id)
            .eq("role", "supervisor")
            .select()
            .single();

        if (error) {
            return { data: null, error };
        }

        return {
            data: {
                id: data.id,
                name: data.name,
                email: data.email,
                isActive: data.is_active ?? true,
                createdAt: data.created_at ? new Date(data.created_at) : new Date(),
            },
            error: null,
        };
    } catch (err) {
        console.error("updateSupervisor error:", err);
        return { data: null, error: err };
    }
};

/**
 * Toggle supervisor active status in employees table
 */
export const toggleSupervisorStatus = async (
    id: string,
    isActive: boolean
): Promise<{ data: Supervisor | null; error: any }> => {
    try {
        const { data, error } = await supabase
            .from("employees")
            .update({ is_active: !isActive })
            .eq("id", id)
            .eq("role", "supervisor")
            .select()
            .single();

        if (error) {
            return { data: null, error };
        }

        return {
            data: {
                id: data.id,
                name: data.name,
                email: data.email,
                isActive: data.is_active ?? true,
                createdAt: data.created_at ? new Date(data.created_at) : new Date(),
            },
            error: null,
        };
    } catch (err) {
        console.error("toggleSupervisorStatus error:", err);
        return { data: null, error: err };
    }
};

/**
 * Delete a supervisor from employees table
 */
export const deleteSupervisor = async (id: string): Promise<{ error: any }> => {
    try {
        const { error } = await supabase
            .from("employees")
            .delete()
            .eq("id", id)
            .eq("role", "supervisor");

        if (error) {
            return { error };
        }

        return { error: null };
    } catch (err) {
        console.error("deleteSupervisor error:", err);
        return { error: err };
    }
};

/**
 * Update supervisor password
 */
export const updateSupervisorPassword = async (
    employeeId: string,
    newPassword: string
): Promise<{ error: any }> => {
    try {
        // 1. Hash the new password - REMOVED (Migrated to Supabase Auth)
        // const passwordHash = await bcrypt.hash(newPassword, 10);

        console.warn("Password update from Admin panel not supported with Supabase Auth (client-side). User must use Forgot Password flow.");
        return { error: new Error("To reset password, please use the 'Forgot Password' functionality or update via Supabase Dashboard.") };
    } catch (err) {
        console.error("updateSupervisorPassword error:", err);
        return { error: err };
    }
};
