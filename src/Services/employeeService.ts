import { supabase } from "../Config/supabaseClient";

// -------------------------
// Create Employee
// -------------------------
export const createEmployee = async (employeeData: any) => {
  const { data, error } = await supabase
    .from("employees")
    .insert(employeeData)
    .select();

  if (error) throw error;
  return data[0];
};

// -------------------------
// Get All Employees
// -------------------------
export const getEmployees = async () => {
  const { data, error } = await supabase
    .from("employees")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching employees:", error);
    throw error;
  }

  return data;
};

export const toggleEmployeeStatus = async (id: string) => {
  // Get current status
  const { data: employee, error: fetchError } = await supabase
    .from("employees")
    .select("is_active")
    .eq("id", id)
    .single();

  if (fetchError) throw fetchError;

  const newStatus = !employee.is_active;

  // Update to the opposite status
  const { data, error } = await supabase
    .from("employees")
    .update({ is_active: newStatus })
    .eq("id", id);

  if (error) throw error;
  return data;
};



export const updateEmployee = async (id: string, updates: any) => {
  const { data, error } = await supabase
    .from("employees")
    .update(updates)
    .eq("id", id);

  if (error) throw error;
  return data;
};
// -------------------------
// Get Single Employee
// -------------------------
export const getEmployeeById = async (id: string) => {
  const { data, error } = await supabase
    .from("employees")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
};


// -------------------------
// Delete Employee
// -------------------------
export const deleteEmployee = async (id: string) => {
  const { error } = await supabase
    .from("employees")
    .delete()
    .eq("id", id);

  if (error) throw error;
  return true;
};
