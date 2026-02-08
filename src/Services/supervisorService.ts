import { supabase } from "@/Config/supabaseClient";
import { BarChart } from "lucide-react";
import bcrypt from "bcryptjs"

// Fix bcrypt random for browser
bcrypt.setRandomFallback((len) => {
    const buf = new Uint8Array(len);
    return Array.from(window.crypto.getRandomValues(buf));
});

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

        console.log("Proceeding to insert employee...");

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
            salary_amount:
                typeof payload.salary_amount === "number" ? payload.salary_amount : null,
            salary_id: payload.salary_id ?? null,
            role: payload.role ?? "supervisor",
            is_supervisor: payload.is_supervisor ?? true,
            profile_image_url: payload.profile_image_url ?? null,
            is_active: payload.is_active ?? true,
            created_at: new Date().toISOString(),
        };


        const { data: employee, error } = await supabase
            .from("employees")
            .insert([insertRow])
            .select()
            .single();

        if (error) {
            console.error("Employee insert error:", error);
            return { data: null, error };
        }
        const passwordHash = await bcrypt.hash(payload.password, 10);

        // Ensure employee exists and has id
        if (!employee || !employee.id) {
            const e = new Error("Employee record missing id after insert");
            console.error(e);
            return { data: null, error: e };
        }

        // 2️⃣ Create login user in app_users via RPC
        console.log("Calling create_supervisor_user RPC with:", {
            p_name: payload.name,
            p_email: payload.email,
            p_employee_id: employee.id,
            p_password: "REDACTED",
        });

        const { data: user, error: userError } = await supabase.rpc(
            "create_supervisor_user",
            {
                p_name: payload.name, // Re-added p_name
                p_email: payload.email,
                p_password: payload.password, // Pass plaintext - SQL function hashes it
                p_employee_id: employee.id,
            }
        );

        if (userError) {
            console.error("App User RPC Error details:", userError);

            // rollback orphan employee
            const { error: rollbackError } = await supabase.from("employees").delete().eq("id", employee.id);
            if (rollbackError) console.error("Rollback failed:", rollbackError);

            return { data: null, error: userError };
        }

        // return cleaned objects
        return {
            data: {
                supervisor: {
                    id: employee.id,
                    name: employee.name,
                    email: employee.email,
                    isActive: employee.is_active ?? true,
                    createdAt: employee.created_at
                        ? new Date(employee.created_at)
                        : new Date(),
                },
                user: user ?? null,
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
        // 1. Hash the new password
        const passwordHash = await bcrypt.hash(newPassword, 10);

        // 2. Find the app_user linked to this supervisor (employee)
        const { data: user, error: userFetchError } = await supabase
            .from('app_users')
            .select('id')
            .eq('employee_id', employeeId)
            .single();

        if (userFetchError || !user) {
            console.error("User not found for employee:", employeeId);
            return { error: new Error("User account not found for this supervisor") };
        }

        // 3. Update the password_hash in app_users
        const { error: updateError } = await supabase
            .from('app_users')
            .update({ password_hash: passwordHash })
            .eq('id', user.id);

        if (updateError) {
            return { error: updateError };
        }

        return { error: null };
    } catch (err) {
        console.error("updateSupervisorPassword error:", err);
        return { error: err };
    }
};
