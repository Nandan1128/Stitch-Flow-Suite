// src/Services/workerService.ts
import { supabase } from "@/Config/supabaseClient";

const BUCKET = "factory-images";

/**
 * Upload a single file to storage under a specific folder and return public URL.
 */
export async function uploadWorkerImage(folder: string, file?: File | null) {
  // If file does not exist → skip upload and return null safely
  if (!file) return null;

  // If file.type is missing → also skip safely
  if (!file.type || !file.type.includes("/")) {
    console.warn("Invalid file type, skipping upload:", file);
    return null;
  }

  // Extract extension safely
  const ext = file.type.split("/")[1]; // jpeg/jpg/png

  const fileName = `${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const storagePath = `${folder}/${fileName}`;

  // Upload file
  const { error } = await supabase.storage
    .from("factory-images")
    .upload(storagePath, file, {
      upsert: false,
      cacheControl: "3600",
      contentType: file.type,
    });

  if (error) throw error;

  // Return public URL
  const { data } = supabase.storage
    .from("factory-images")
    .getPublicUrl(storagePath);

  return data.publicUrl;
}




/**
 * Insert worker row
 * Expects snake_case DB column names
 */
export async function insertWorker(worker: any) {
  const { data, error } = await supabase
    .from("workers")
    .insert([worker])
    .select()
    .single();

  if (error) {
    console.error("Error inserting worker into DB:", error);
    throw error;
  }
  return data;
}

/**
 * Fetch all workers (raw DB rows)
 */
// export async function getWorkers() {
//   const { data, error } = await supabase
//     .from("workers")
//     .select("*")
//     .order("created_at", { ascending: false });

//   if (error) throw error;

//   return data.map((w) => ({
//     ...w,
//     profileImageUrl: w.profile_image_url,
//     idProofImageUrl: w.id_proof_image_url,
//     bankImageUrl: w.bank_image_url,
//     workerId: w.worker_code,
//     createdAt: w.created_at ? new Date(w.created_at) : null,
//   }));
// }
export const getWorkers = async () => {
  const { data, error } = await supabase
    .from("workers")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching workers:", error);
    throw error;
  }

  return data;
}


/**
 * Update worker (partial updates)
 */
export async function updateWorker(id: string, updates: any) {
  const { data, error } = await supabase
    .from("workers")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Toggle worker active state if you add such column later.
 * Currently not in DB; kept for future.
 */
export async function toggleWorkerStatus(id: string) {
  // if is_active column exists, use this:
  const { data: existing, error: fetchErr } = await supabase
    .from("workers")
    .select("is_active")
    .eq("id", id)
    .single();

  if (fetchErr) throw fetchErr;

  const { data, error } = await supabase
    .from("workers")
    .update({ is_active: !existing.is_active })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}
