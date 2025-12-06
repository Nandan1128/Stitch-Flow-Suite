// src/Services/productionService.ts
import { supabase } from "@/Config/supabaseClient";

/**
 * Get all products (used to choose product when creating production)
 */
export const getProducts = async () => {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
};

/**
 * Get all productions (include product name by left-joining products)
 * We'll fetch products separately and map so code is robust if FK relationship name differs.
 */
export const getProductions = async () => {
  // 1) fetch productions
  const { data: prodData, error: prodError } = await supabase
    .from("production")
    .select("*")
    .order("created_at", { ascending: false });

  if (prodError) throw prodError;
  const productions = prodData ?? [];

  if (productions.length === 0) {
    return [];
  }

  // 2) collect product_ids used by these productions
  const productIds = Array.from(
    new Set(productions.map((p: any) => p.product_id).filter(Boolean))
  );

  // 3) fetch product names (if you want productName)
  const { data: products } = await supabase
    .from("products")
    .select("id,name")
    .in("id", productIds.length ? productIds : ["-none-"]); // avoid empty IN
  const prodMap: Record<string, string> = {};
  (products || []).forEach((p: any) => {
    if (p?.id) prodMap[p.id] = p.name;
  });

  // 4) fetch operation counts grouped by product_id from operations table
  //    PostgREST supports select with aggregate via `select('product_id, count(*)')` only when using views or RPC.
  //    Simpler: ask operations where product_id in (...) and aggregate client-side
  let opCounts: Record<string, number> = {};
  if (productIds.length > 0) {
    const { data: ops, error: opsErr } = await supabase
      .from("operations")
      .select("id, product_id") // fetch rows, we'll count per product_id
      .in("product_id", productIds);

    if (!opsErr && Array.isArray(ops)) {
      opCounts = ops.reduce((acc: Record<string, number>, row: any) => {
        const pid = row.product_id;
        if (!pid) return acc;
        acc[pid] = (acc[pid] || 0) + 1;
        return acc;
      }, {});
    }
  }

  // 5) map production with productName and operationsCount
  return productions.map((p: any) => ({
    ...p,
    productName: p.product_id ? prodMap[p.product_id] ?? null : null,
    operationsCount: p.product_id ? (opCounts[p.product_id] || 0) : 0,
  }));
};



/**
 * Get single production by id and include its production_operation rows
 */
export const getProductionById = async (id: string) => {
  const { data: production, error: prodError } = await supabase
    .from("production")
    .select("*")
    .eq("id", id)
    .single();

  if (prodError) throw prodError;

  const operations = await getOperationsByProductionId(id);

  // fetch product name
  let productName = null;
  if (production.product_id) {
    const { data: p } = await supabase.from("products").select("name").eq("id", production.product_id).single();
    if (p) productName = p.name;
  }

  return {
    ...production,
    productName,
    operations,
  };
};

/**
 * Create production row and automatically copy operations from product's operations
 * into production_operation table (so each production has its own production_operation entries).
 * Accepts a productionData object matching 'production' table columns.
 */
export const createProduction = async (productionData: any) => {
  // 1) insert production
  const { data: prodRow, error: insertError } = await supabase
    .from("production")
    .insert(productionData)
    .select()
    .single();

  if (insertError) throw insertError;

  const productionId = prodRow.id;

  // 2) fetch operations for this product (operation master table)
  const { data: ops, error: opError } = await supabase
    .from("operations")
    .select("*")
    .eq("product_id", productionData.product_id);

  if (opError) throw opError;

  // 3) insert production_operation rows
  if (ops && ops.length > 0) {
    const formatted = ops.map((o: any) => ({
      production_cutting_id: null,
      operation_id: o.id,
      worker_id: null,
      worker_name: null,
      pieces_done: 0,
      earnings: 0,
      date: new Date().toISOString().split("T")[0], // date string
      supervisor_employee_id: null,
      production_id: productionId,
      created_at: new Date().toISOString(),
    }));

    const { error: insertOpsError } = await supabase
      .from("production_operation")
      .insert(formatted);

    if (insertOpsError) throw insertOpsError;
  }

  return prodRow;
};

/**
 * Get production_operation rows by production id
 */
export const getOperationsByProductionId = async (productionId: string) => {
  // Step 1 - fetch production_operation rows
  const { data: opsRows, error: opsErr } = await supabase
    .from("production_operation")
    .select("*")
    .eq("production_id", productionId)
    .order("created_at", { ascending: true });

  if (opsErr) throw opsErr;
  const rows = opsRows || [];

  // Step 2 - collect operation master ids referenced and fetch names/rates
  const opIds = Array.from(new Set(rows.map((r: any) => r.operation_id).filter(Boolean)));
  let opMap: Record<string, any> = {};
  if (opIds.length > 0) {
    const { data: masterOps, error: masterErr } = await supabase
      .from("operations")
      .select("id,name,amount_per_piece")
      .in("id", opIds);
     if (!masterErr && Array.isArray(masterOps)) {
       masterOps.forEach((m: any) => { if (m?.id) opMap[m.id] = m; });
     }
   }

   // Merge operation master info into each production_operation row under an `operations` property.
   return (rows || []).map((r: any) => {
     const master = r.operation_id ? opMap[r.operation_id] : undefined;
     return {
       ...r,
       operations: master ? { name: master.name, amount_per_piece: master.amount_per_piece } : undefined,
     };
   });
 };

/**
 * Assign worker and set pieces for a production operation.
 * If production_operation row exists (it should), update it.
 * Accepts productionId, operationId (production_operation id), workerId, piecesDone
 */
export const assignWorkerToOperation = async (
  productionId: string,
  operationRecordId: string,
  workerId: string | null,
  piecesDone: number | null,
  workerName?: string
) => {
  const updates: any = {};
  if (workerId !== undefined) updates.worker_id = workerId || null;
  if (workerName !== undefined) updates.worker_name = workerName || null;
  if (piecesDone !== undefined && piecesDone !== null) updates.pieces_done = piecesDone;
  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("production_operation")
    .update(updates)
    .eq("id", operationRecordId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Insert a new production_operation row for a production
 */
export const insertProductionOperation = async (payload: any) => {
  // expect snake_case keys matching DB: production_id, operation_id, worker_id, worker_name, pieces_done, earnings, date, created_at
  const { data, error } = await supabase
    .from("production_operation")
    .insert([payload])
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Update production row
 */
export const updateProduction = async (id: string, updates: any) => {
  const { data, error } = await supabase
    .from("production")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
};


