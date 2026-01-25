// src/Services/dashboardService.ts
import { supabase } from "@/Config/supabaseClient";

// ----------------------------
// TYPES
// ----------------------------

export interface ProductionProgressItem {
    id: string;
    productName: string;
    po_number: string;
    progress: number; // percentage
    totalQuantity: number;
    completedPieces: number;
}

export interface RecentOperationItem {
    id: string;
    workerId?: string | null;
    workerName?: string | null;
    operationId?: string | null;
    operationName?: string | null;
    productId?: string | null;
    productName?: string | null;
    pieces: number;
    earnings: number;
    date?: string | null;
}

/**
 * Fetch dashboard data - safe queries, no ambiguous relation embedding.
 */
export const getDashboardData = async (userId?: string | null, isAdmin = false) => {
    try {
        // WORKERS
        const { data: allWorkers } = await supabase.from("workers").select("id,name");
        const totalWorkers = (allWorkers || []).length;
        const activeWorkers = (allWorkers || []).filter((w: any) => w?.is_active ?? true).length;

        // PRODUCTS
        let activeProducts = 0;
        try {
            const { data: products } = await supabase.from("products").select("id").order("created_at", { ascending: false });
            activeProducts = (products || []).length;
        } catch {
            activeProducts = 0;
        }

        // TODAY'S PRODUCTION (sum of pieces_done on production_operation for today)
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

        const todayStart = startOfDay.toISOString();
        const todayEnd = endOfDay.toISOString();

        const { data: todaysOps } = await supabase
            .from("production_operation")
            .select("pieces_done")
            .gte("created_at", todayStart) // Use created_at (timestamp) if available, falling back to date logic if needed
            .lt("created_at", todayEnd);

        // Fallback: If production_operation uses 'date' column (date only), the query above on created_at is better if created_at exists and is correct.
        // Checking productionService, it inserts 'created_at'.
        // However, existing code used 'date'. Let's check if 'date' column is Date or Timestamp.
        // productionService inserts 'date': new Date().toISOString().split("T")[0].
        // If we want accurate "Today" checks, we should query 'created_at' which is full timestamp.
        // Reverting to use 'created_at' for accuracy if the table supports it. 
        // Based on productionService.ts line 145: created_at: new Date().toISOString()
        // So created_at is available and is a timestamp.

        const todaysProduction = (todaysOps || []).reduce((s: any, r: any) => s + Number(r.pieces_done ?? 0), 0);

        // PENDING PAYMENTS (sum of unpaid worker_salaries.total_amount)
        const { data: unpaidRows } = await supabase
            .from("worker_salaries")
            .select("total_amount")
            .eq("paid", false);
        const pendingPayments = (unpaidRows || []).reduce((s: any, r: any) => s + Number(r.total_amount ?? 0), 0);

        // WORKER OPS TODAY (count of production_operation rows created today)
        const opsQuery = supabase
            .from("production_operation")
            .select("id", { count: 'exact', head: true })
            .gte("created_at", todayStart)
            .lt("created_at", todayEnd);

        // Request is for "count of operation across all production", so we do NOT filter by user.
        // Request is for "count of operation across all production", so we do NOT filter by user.
        // This ensures Supervisors (who are not Admins but also not Workers performing the ops) see the global count.
        // if (!isAdmin && userId) { opsQuery.eq("worker_id", userId); }

        const { count: workOpsCount } = await opsQuery;
        const workersOpsToday = workOpsCount || 0;


        // PRODUCTION PROGRESS: compute percentage per active production (pieces completed / total_quantity)
        // Only fetch active productions
        const { data: productions } = await supabase
            .from("production")
            .select("id,product_id,total_quantity,po_number,status")
            .neq("status", "completed") // Filter out completed productions
            .order("created_at", { ascending: false })
            .limit(20); // Limit to recent active productions

        // Map production id -> pieces completed (from production_operation)
        const productionIds = (productions || []).map((p: any) => p.id).filter(Boolean);
        let progressMap: Record<string, number> = {};
        if (productionIds.length > 0) {
            const { data: opAggregates } = await supabase
                .from("production_operation")
                .select("production_id, pieces_done")
                .in("production_id", productionIds);
            (opAggregates || []).forEach((r: any) => {
                if (!r || !r.production_id) return;
                progressMap[r.production_id] = (progressMap[r.production_id] || 0) + Number(r.pieces_done || 0);
            });
        }

        // fetch product names and operation counts for display/calculation
        const productIds = Array.from(new Set((productions || []).map((p: any) => p.product_id).filter(Boolean)));
        let productMap: Record<string, string> = {};
        let opCountMap: Record<string, number> = {};

        if (productIds.length > 0) {
            // Get product names
            const { data: prods } = await supabase.from("products").select("id,name").in("id", productIds);
            (prods || []).forEach((p: any) => { if (p?.id) productMap[p.id] = p.name; });

            // Get operation counts per product
            const { data: ops } = await supabase
                .from("operations")
                .select("product_id")
                .in("product_id", productIds);

            (ops || []).forEach((o: any) => {
                opCountMap[o.product_id] = (opCountMap[o.product_id] || 0) + 1;
            });
        }

        const productionProgress = (productions || []).map((p: any) => {
            const totalQty = Number(p.total_quantity ?? 0);
            const opCount = opCountMap[p.product_id] || 0;

            // If no operations, default to 1 to avoid division by zero (though logically should be 0 progress if 0 ops) or raw quantity
            // Better: If opCount is 0, totalWorkRequired is just totals? No, if 0 ops, technically 0 work.
            // Let's assume at least 1 op for calculation if map is empty, or handle gracefully.
            const divisorOps = opCount > 0 ? opCount : 1;

            const totalRequired = totalQty * divisorOps;
            const completed = Number(progressMap[p.id] ?? 0);

            const percent = totalRequired > 0 ? Math.round((completed / totalRequired) * 100) : 0;
            return {
                id: p.id,
                productName: productMap[p.product_id] ?? `Prod ${p.id}`,
                po_number: p.po_number || "N/A",
                progress: Math.min(Math.max(percent, 0), 100),
            } as ProductionProgressItem;
        });

        // RECENT WORKER OPS: fetch latest worker_salaries (no embedding)
        const { data: recentRows } = await supabase
            .from("worker_salaries")
            .select("id,worker_id,operation_id,product_id,pieces_done,total_amount,date")
            .order("date", { ascending: false })
            .limit(10);

        const recent = (recentRows || []);

        // collect worker/operation/product ids for lookups
        const workerIds = Array.from(new Set(recent.map((r: any) => r.worker_id).filter(Boolean)));
        const opIds = Array.from(new Set(recent.map((r: any) => r.operation_id).filter(Boolean)));
        const recentProdIds = Array.from(new Set(recent.map((r: any) => r.product_id).filter(Boolean)));

        // fetch lookups
        const [workersLookup, opsLookup, productsLookup] = await Promise.all([
            workerIds.length ? supabase.from("workers").select("id,name").in("id", workerIds) : { data: [] },
            opIds.length ? supabase.from("operations").select("id,name,amount_per_piece").in("id", opIds) : { data: [] },
            recentProdIds.length ? supabase.from("products").select("id,name").in("id", recentProdIds) : { data: [] },
        ]);

        const workerMap: Record<string, any> = {};
        (workersLookup.data || []).forEach((w: any) => { if (w?.id) workerMap[w.id] = w; });

        const opMap: Record<string, any> = {};
        (opsLookup.data || []).forEach((o: any) => { if (o?.id) opMap[o.id] = o; });

        const prodMap: Record<string, any> = {};
        (productsLookup.data || []).forEach((p: any) => { if (p?.id) prodMap[p.id] = p; });

        const recentWorkerOps: RecentOperationItem[] = recent.map((r: any) => ({
            id: r.id,
            workerId: r.worker_id ?? null,
            workerName: r.worker_id ? (workerMap[r.worker_id]?.name ?? r.worker_id) : null,
            operationId: r.operation_id ?? null,
            operationName: r.operation_id ? (opMap[r.operation_id]?.name ?? r.operation_id) : null,
            productId: r.product_id ?? null,
            productName: r.product_id ? (prodMap[r.product_id]?.name ?? r.product_id) : null,
            pieces: Number(r.pieces_done ?? 0),
            earnings: Number(r.total_amount ?? 0),
            date: r.date ? String(r.date) : null,
        }));

        return {
            workers: {
                total: totalWorkers,
                active: activeWorkers,
            },
            activeProducts,
            todaysProduction,
            pendingPayments,
            workersOpsToday,
            productionProgress,
            recentWorkerOps
        };
    } catch (err) {
        console.error("getDashboardData error", err);
        // Return defaults to avoid crashing UI
        return {
            workers: { total: 0, active: 0 },
            activeProducts: 0,
            todaysProduction: 0,
            pendingPayments: 0,
            workersOpsToday: 0,
            productionProgress: [] as ProductionProgressItem[],
            recentWorkerOps: [] as RecentOperationItem[],
        };
    }
};
