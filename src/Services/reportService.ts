// src/Services/reportService.ts
import { supabase } from "@/Config/supabaseClient";

// Helper: ensure date string -> Date
const toDate = (v: any) => (v ? new Date(v) : null);

export type Period = "daily" | "weekly" | "monthly" | "yearly";

// ----- FETCH PRODUCTIONS + PRODUCT NAME -----
export const fetchProductions = async () => {
    // 1. Fetch all productions
    const { data: productions, error: prodError } = await supabase
        .from("production")
        .select("*")
        .order("created_at", { ascending: false });

    if (prodError) throw prodError;

    // 2. Fetch product list for name mapping
    const { data: productList } = await supabase
        .from("products")
        .select("id, name");

    const productMap: Record<string, string> = {};
    (productList || []).forEach((p) => {
        productMap[p.id] = p.name;
    });

    // 3. Attach product name to each production
    return (productions || []).map((p: any) => ({
        id: p.id,
        product_id: p.product_id,
        productName: productMap[p.product_id] ?? "Unknown Product",
        production_code: p.production_code,
        po_number: p.po_number,
        color: p.color,
        total_quantity: p.total_quantity ?? 0,
        total_fabric: p.total_fabric ?? 0,
        average: p.average ?? 0,
        created_by: p.created_by,
        created_at: toDate(p.created_at),
    }));
};

export const fetchProductionOperations = async (productionId: string) => {
    if (!productionId) return [];
    const { data, error } = await supabase
        .from("production_operation")
        .select(`
      id,
      production_id,
      operation_id,
      worker_id,
      pieces_done,
      earnings,
      date,
      operations(name, amount_per_piece)
    `)
        .eq("production_id", productionId)
        .order("created_at", { ascending: true });

    if (error) throw error;
    return (data || []).map((r: any) => ({
        ...r,
        pieces_done: Number(r.pieces_done ?? 0),
        earnings: Number(r.earnings ?? 0),
        date: toDate(r.date),
    }));
};

// 1) fetch raw salary rows (no embedding)
export const fetchWorkerSalaries = async () => {
    const { data: rows, error } = await supabase
        .from("worker_salaries")
        .select("*")
        .order("date", { ascending: false });
    if (error) throw error;
    const list = rows || [];

    // 2) collect IDs to lookup related names safely
    const workerIds = Array.from(new Set(list.map((r: any) => r.worker_id).filter(Boolean)));
    const opIds = Array.from(new Set(list.map((r: any) => r.operation_id).filter(Boolean)));
    const productIds = Array.from(new Set(list.map((r: any) => r.product_id).filter(Boolean)));

    // 3) batch fetch lookups (if any)
    const [workersRes, opsRes, prodsRes] = await Promise.all([
        workerIds.length ? supabase.from("workers").select("id,name").in("id", workerIds) : Promise.resolve({ data: [] }),
        opIds.length ? supabase.from("operations").select("id,name,amount_per_piece").in("id", opIds) : Promise.resolve({ data: [] }),
        productIds.length ? supabase.from("products").select("id,name").in("id", productIds) : Promise.resolve({ data: [] }),
    ]);

    const workerMap: Record<string, any> = {};
    (workersRes.data || []).forEach((w: any) => { if (w?.id) workerMap[w.id] = w; });

    const opMap: Record<string, any> = {};
    (opsRes.data || []).forEach((o: any) => { if (o?.id) opMap[o.id] = o; });

    const productMap: Record<string, any> = {};
    (prodsRes.data || []).forEach((p: any) => { if (p?.id) productMap[p.id] = p; });

    // 4) map and normalize output for the caller
    return list.map((r: any) => ({
        ...r,
        pieces_done: Number(r.pieces_done ?? 0),
        total_amount: Number(r.total_amount ?? 0),
        amount_per_piece: Number(r.amount_per_piece ?? 0),
        date: toDate(r.date),
        workerName: r.worker_name ?? (r.worker_id ? (workerMap[r.worker_id]?.name ?? null) : null),
        operationName: r.operation_name ?? (r.operation_id ? (opMap[r.operation_id]?.name ?? null) : null),
        productName: r.product_name ?? (r.product_id ? (productMap[r.product_id]?.name ?? null) : null),
    }));
};

/**
 * Utility: check if a date falls in the given period relative to `target` (usually now)
 */
const inPeriod = (d: Date | null, period: Period, target = new Date()) => {
    if (!d) return false;
    const a = d;
    const b = target;
    if (period === "daily") return a.toDateString() === b.toDateString();
    if (period === "weekly") {
        const getWeek = (dt: Date) => {
            const oneJan = new Date(dt.getFullYear(), 0, 1);
            return Math.ceil((((dt as any) - (oneJan as any)) / 86400000 + oneJan.getDay() + 1) / 7);
        };
        return a.getFullYear() === b.getFullYear() && getWeek(a) === getWeek(b);
    }
    if (period === "monthly") return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
    if (period === "yearly") return a.getFullYear() === b.getFullYear();
    return false;
};

export const calculateCustomReport = (
    operations: any[],
    startDate: string,
    endDate: string,
    costPerPiece: number
) => {
    if (!startDate || !endDate) {
        return {
            productionQuantity: 0,
            operationExpense: 0,
            rawMaterialCost: 0,
            totalExpense: 0,
            efficiency: 0,
        };
    }

    const s = new Date(startDate);
    const e = new Date(endDate);

    const rows = operations.filter((op) => {
        const d = new Date(op.date);
        return d >= s && d <= e;
    });

    const productionQuantity = rows.reduce((s, r) => s + r.pieces_done, 0);
    const operationExpense = rows.reduce((s, r) => s + r.earnings, 0);
    const totalExpense = operationExpense;

    const efficiency = rows.length > 0
        ? Math.round((productionQuantity / (rows.length * 10)) * 100)
        : 0;

    return {
        productionQuantity,
        operationExpense,
        totalExpense,
        efficiency,
    };
};

export const calculateProductionReport = (
    operations: any[],
    period: Period,
    costPerPiece: number
) => {
    // filter rows by period
    const rows = operations.filter((r) => inPeriod(r.date, period));

    const productionQuantity = rows.reduce((s, r) => s + Number(r.pieces_done ?? 0), 0);
    const operationExpense = rows.reduce((s, r) => s + Number(r.earnings ?? 0), 0);

    // rawMaterialCost is domain-specific; we try to infer: if production has total_quantity & product data, you can replace
    const rawMaterialCost = productionQuantity * costPerPiece; // placeholder — calculate from product master or external table if available

    const totalExpense = operationExpense;

    // simple efficiency metric if you have target/ability: for now compute as pieces per operation * 100 / arbitrary target
    const efficiency = productionQuantity > 0
        ? Math.round((productionQuantity / Math.max(1, rows.length * 10)) * 100)
        : 0;

    return {
        productionQuantity,
        operationExpense,
        totalExpense,
        efficiency,
    };
};

export const calculateOperationsChartData = (operations: any[], period: Period) => {
    const rows = operations.filter((r) => inPeriod(r.date, period));
    const grouped: Record<string, { name: string; cost: number; pieces: number }> = {};
    rows.forEach((r) => {
        const opName = r.operations?.name ?? r.operation_id ?? "Unknown";
        if (!grouped[opName]) grouped[opName] = { name: opName, cost: 0, pieces: 0 };
        grouped[opName].cost += Number(r.earnings ?? 0);
        grouped[opName].pieces += Number(r.pieces_done ?? 0);
    });
    return Object.values(grouped).map((g) => ({ name: g.name, cost: g.cost, pieces: g.pieces }));
};

export const calculateWorkerPerformance = (salaries: any[], period: Period) => {
    const rows = salaries.filter((r) => inPeriod(r.date, period));
    const map: Record<string, any> = {};
    rows.forEach((r) => {
        const id = r.worker_id ?? r.workerName ?? "unknown";
        if (!map[id]) map[id] = { workerId: id, workerName: r.workerName ?? "Unknown", totalPieces: 0, earnings: 0, operations: 0 };
        map[id].totalPieces += Number(r.pieces_done ?? 0);
        map[id].earnings += Number(r.total_amount ?? 0);
        map[id].operations += 1;
    });
    return Object.values(map).map((m) => ({
        employeeId: m.workerId,
        employeeName: m.workerName,
        totalPiecesCompleted: m.totalPieces,
        totalOperations: m.operations,
        efficiency: m.totalPieces > 0 ? Math.round((m.totalPieces / Math.max(1, m.operations * 10)) * 100) : 0,
        earnings: m.earnings,
    }));
};
// // Fetch cost for a product
// export const fetchProductCost = async (productId: string) => {
//     if (!productId) return { costPerPiece: 0 };

//     const { data, error } = await supabase
//         .from("products")
//         .select("material_cost, thread_cost, other_costs")
//         .eq("id", productId)
//         .single();

//     if (error) return { costPerPiece: 0 };

//     const costPerPiece =
//         Number(data.material_cost ?? 0) +
//         Number(data.thread_cost ?? 0) +
//         Number(data.other_costs ?? 0);

//     return { costPerPiece };
// };

/**
 * Calculate finished pieces for a production
 * A finished piece is counted when ALL operations have been completed for that quantity
 * Returns the minimum quantity across all operations (bottleneck operation)
 */
export const calculateFinishedPieces = (operations: any[], productId: string) => {
    if (!operations || operations.length === 0) return 0;

    // Group operations by operation_id and sum the pieces_done
    const operationTotals: Record<string, number> = {};

    operations.forEach((op) => {
        const opId = op.operation_id || op.operations?.id;
        if (opId) {
            operationTotals[opId] = (operationTotals[opId] || 0) + (Number(op.pieces_done) || 0);
        }
    });

    // If no operations have been done, return 0
    const totals = Object.values(operationTotals);
    if (totals.length === 0) return 0;

    // The minimum across all operations is the number of finished pieces
    // Because all operations must be completed for a piece to be finished
    return Math.min(...totals);
};


/**
 * Fetch operation-wise report data
 * Returns all production operations with product name, PO number, operation name, and worker name
 */
export const fetchOperationWiseReport = async () => {
    // 1. Fetch all production_operation rows
    const { data: opsRows, error: opsErr } = await supabase
        .from("production_operation")
        .select("*")
        .order("date", { ascending: false });

    if (opsErr) throw opsErr;
    const rows = opsRows || [];

    if (rows.length === 0) return [];

    // 2. Collect IDs for related data
    const productionIds = Array.from(new Set(rows.map((r: any) => r.production_id).filter(Boolean)));
    const operationIds = Array.from(new Set(rows.map((r: any) => r.operation_id).filter(Boolean)));
    const workerIds = Array.from(new Set(rows.map((r: any) => r.worker_id).filter(Boolean)));

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

    // 6. Fetch related operations (for name and rate)
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

    // 7. Fetch related workers (for name)
    let workerMap: Record<string, string> = {};
    if (workerIds.length > 0) {
        const { data: workers, error: workerErr } = await supabase
            .from("workers")
            .select("id, name")
            .in("id", workerIds);
        if (!workerErr && workers) {
            workers.forEach((w: any) => { workerMap[w.id] = w.name; });
        }
    }

    // 8. Map it all together
    return rows.map((r: any) => {
        const prod = productionMap[r.production_id];
        const productName = prod ? productMap[prod.product_id] : "Unknown Product";
        const opMaster = operationMap[r.operation_id];
        const workerName = r.worker_name || (r.worker_id ? workerMap[r.worker_id] : "Unknown Worker");

        return {
            id: r.id,
            productName: productName,
            poNumber: prod?.po_number || "-",
            operationName: opMaster?.name || "Unknown Operation",
            workerName: workerName,
            date: toDate(r.date),
            quantity: r.pieces_done || 0,
            rate: opMaster?.amount_per_piece || 0,
            total: r.earnings || 0,
            productId: prod?.product_id || null,
            operationId: r.operation_id || null,
            workerId: r.worker_id || null,
        };
    });
};

