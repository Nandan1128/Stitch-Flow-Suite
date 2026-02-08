import { supabase } from "../Config/supabaseClient";

export const createOperation = async (operation: any) => {
  const { data, error } = await supabase
    .from("operations")
    .insert(operation)
    .select();

  if (error) throw error;
  return data[0];
};

export const getOperationsByProduct = async (productId: string) => {
  const { data, error } = await supabase
    .from("operations")
    .select("*")
    .eq("product_id", productId);

  if (error) throw error;
  return data;
};
