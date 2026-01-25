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
 * Create production row.
 * No longer auto-creates production_operation rows - they are created on-demand when workers are assigned.
 * Accepts a productionData object matching 'production' table columns.
 */
export const createProduction = async (productionData: any) => {
  // Insert production
  const { data: prodRow, error: insertError } = await supabase
    .from("production")
    .insert(productionData)
    .select()
    .single();

  if (insertError) throw insertError;

  // Return without creating empty production_operation rows
  // These will be created on-demand when workers are assigned via ProductionOperationsDialog
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

/**
 * Delete a production_operation row
 */
export const deleteProductionOperation = async (id: string) => {
  const { error } = await supabase
    .from("production_operation")
    .delete()
    .eq("id", id);

  if (error) throw error;
  return true;
};

/**
 * Get operations history for a specific worker
 */
export const getOperationsByWorkerId = async (workerId: string) => {
  // 1. Fetch production_operation rows for the worker
  const { data: opsRows, error: opsErr } = await supabase
    .from("production_operation")
    .select("*")
    .eq("worker_id", workerId)
    .order("date", { ascending: false });

  if (opsErr) throw opsErr;
  const rows = opsRows || [];

  if (rows.length === 0) return [];

  // 2. Collect IDs for related data
  const productionIds = Array.from(new Set(rows.map((r: any) => r.production_id).filter(Boolean)));
  const operationIds = Array.from(new Set(rows.map((r: any) => r.operation_id).filter(Boolean)));

  // 3. Fetch related productions (for po_number and product_id)
  let productionMap: Record<string, any> = {};
  if (productionIds.length > 0) {
    const { data: prods, error: prodErr } = await supabase
      .from("production")
      .select("id, po_number, product_id")
      .in("id", productionIds);
    if (!prodErr && prods) {
      prods.forEach((p: any) => { productionMap[p.id] = p; });
    }
  }

  // 4. Collect product IDs from the fetched productions
  const productIds = Array.from(new Set(Object.values(productionMap).map((p: any) => p.product_id).filter(Boolean)));

  // 5. Fetch related products (for name)
  let productMap: Record<string, string> = {};
  if (productIds.length > 0) {
    const { data: products, error: productErr } = await supabase
      .from("products")
      .select("id, name")
      .in("id", productIds as string[]);
    if (!productErr && products) {
      products.forEach((p: any) => { productMap[p.id] = p.name; });
    }
  }

  // 6. Fetch related operations (for name and rate if needed)
  let operationMap: Record<string, any> = {};
  if (operationIds.length > 0) {
    const { data: ops, error: opErr } = await supabase
      .from("operations")
      .select("id, name, amount_per_piece")
      .in("id", operationIds);
    if (!opErr && ops) {
      ops.forEach((o: any) => { operationMap[o.id] = o; });
    }
  }

  // 7. Map it all together
  return rows.map((r: any) => {
    const prod = productionMap[r.production_id];
    const productName = prod ? productMap[prod.product_id] : "Unknown Product";
    const opMaster = operationMap[r.operation_id];

    // Calculate rate if possible, or use master rate
    const rate = opMaster?.amount_per_piece || 0;

    return {
      id: r.id,
      productName: productName,
      operationName: opMaster?.name || "Unknown Operation",
      date: new Date(r.date),
      piecesDone: r.pieces_done || 0,
      ratePerPiece: rate,
      totalEarning: r.earnings || 0,
      poNumber: prod?.po_number || "-",
    };
  });
};

/**
 * Update production status
 */
export const updateProductionStatus = async (productionId: string, status: 'active' | 'completed') => {
  const { error } = await supabase
    .from("production")
    .update({ status })
    .eq("id", productionId);

  if (error) throw error;
  return true;
};

/**
 * Check if all operations are complete for a production and auto-update status
 * Returns true if status was changed to completed
 */
export const checkAndUpdateProductionStatus = async (productionId: string) => {
  // 1. Get production details
  const { data: production, error: prodErr } = await supabase
    .from("production")
    .select("id, total_quantity, product_id, status")
    .eq("id", productionId)
    .single();

  if (prodErr || !production) return false;

  // If already completed, no need to check
  if (production.status === 'completed') return false;

  // 2. Get all operations for this product
  const { data: productOps, error: productOpsErr } = await supabase
    .from("operations")
    .select("id")
    .eq("product_id", production.product_id);

  if (productOpsErr || !productOps || productOps.length === 0) return false;

  const requiredOperationIds = productOps.map((op: any) => op.id);

  // 3. Get production_operation totals for each operation
  const { data: opsData, error: opsErr } = await supabase
    .from("production_operation")
    .select("operation_id, pieces_done")
    .eq("production_id", productionId);

  if (opsErr) return false;

  // 4. Calculate total pieces for each operation
  const operationTotals: Record<string, number> = {};
  (opsData || []).forEach((op: any) => {
    const opId = op.operation_id;
    operationTotals[opId] = (operationTotals[opId] || 0) + (Number(op.pieces_done) || 0);
  });

  // 5. Check if ALL required operations have reached the total_quantity
  const allOperationsComplete = requiredOperationIds.every(opId => {
    const total = operationTotals[opId] || 0;
    return total >= production.total_quantity;
  });

  // 6. Update status if all operations are complete
  if (allOperationsComplete) {
    await updateProductionStatus(productionId, 'completed');
    return true;
  }

  return false;
};



