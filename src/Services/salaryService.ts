import { supabase } from "@/Config/supabaseClient";
import { getMonthlyAttendanceSummary } from "./attendanceService";

export const getWorkerSalaries = async () => {
    // Parallel fetch: Salaries and Advances
    const [salariesRes, advancesRes] = await Promise.all([
        supabase.from("worker_salaries").select("*").order("date", { ascending: false }),
        supabase.from("worker_advances").select("*").order("date", { ascending: false })
    ]);

    if (salariesRes.error) throw salariesRes.error;
    if (advancesRes.error) console.warn("Failed to fetch worker advances", advancesRes.error); // Warn but continue

    const salaryRows = salariesRes.data || [];
    const advanceRows = advancesRes.data || [];

    // fetch lookups
    const [{ data: workers }, { data: products }, { data: operations }] = await Promise.all([
        supabase.from("workers").select("id,name"),
        supabase.from("products").select("id,name"),
        supabase.from("operations").select("id,name,amount_per_piece"),
    ]);

    const workerMap: Record<string, any> = {};
    const productMap: Record<string, any> = {};
    const opMap: Record<string, any> = {};

    (workers || []).forEach((w: any) => { if (w && w.id) workerMap[w.id] = w; });
    (products || []).forEach((p: any) => { if (p && p.id) productMap[p.id] = p; });
    (operations || []).forEach((o: any) => { if (o && o.id) opMap[o.id] = o; });

    // Map Salaries
    const mappedSalaries = salaryRows.map((r: any) => ({
        id: r.id,
        workerId: r.worker_id,
        workerName: workerMap[r.worker_id]?.name || null,
        productId: r.product_id,
        productName: productMap[r.product_id]?.name || null,
        date: r.date ? new Date(r.date) : new Date(),
        operationId: r.operation_id,
        operationName: opMap[r.operation_id]?.name || null,
        piecesDone: Number(r.pieces_done || 0),
        amountPerPiece: Number(r.amount_per_piece || 0),
        totalAmount: Number(r.total_amount || 0),
        paid: !!r.paid,
        paidDate: r.paid_date ? new Date(r.paid_date) : undefined,
        paidBy: r.paid_by_employee_id || undefined,
        type: 'salary' // marker
    }));

    // Map Advances as "Salary" records with negative amount for calculation compatibility
    const mappedAdvances = advanceRows.map((a: any) => ({
        id: a.id.toString(), // Ensure ID string compatibility if BigInt
        workerId: a.worker_id,
        workerName: workerMap[a.worker_id]?.name || null,
        productId: null,
        productName: "ADVANCE",
        date: a.date ? new Date(a.date) : new Date(),
        operationId: null,
        operationName: a.note || "Advance Payment",
        piecesDone: 0,
        amountPerPiece: 0,
        totalAmount: -Math.abs(Number(a.amount || 0)), // Negative for deduction
        paid: false, // Advances don't have "paid" status usually, or are always "paid out"? 
        // For salary calculation, they adhere to "paid" status of the salary slip?
        // Let's assume false until salary is finalized. or just N/A.
        paidDate: undefined,
        type: 'advance'
    }));

    // Merge and Sort
    return [...mappedSalaries, ...mappedAdvances].sort((a, b) => b.date.getTime() - a.date.getTime());
};

export const markWorkerSalariesPaid = async (
    ids?: string[],
    paidBy?: string,
    workerId?: string,
    month?: number,
    year?: number
) => {
    const payload: any = {
        paid: true,
        paid_date: new Date().toISOString(),
    };
    if (paidBy) payload.paid_by_employee_id = paidBy;

    const isUuid = (v: string) => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(v);

    // If ids were provided -> update by id list
    if (Array.isArray(ids) && ids.length > 0) {
        const validIds = ids.filter(id => typeof id === 'string' && isUuid(id));
        if (validIds.length === 0) {
            return { data: [], error: { message: 'No valid UUID ids provided' } };
        }

        const { data, error } = await supabase
            .from('worker_salaries')
            .update(payload)
            .in('id', validIds)
            .select();

        console.log("SERVICE → update-by-ids returned:", { data, error });
        return { data, error };
    }

    // Otherwise, if workerId + month/year provided, update by worker_id and date range
    if (workerId && typeof month === 'number' && typeof year === 'number') {
        if (!isUuid(workerId)) {
            return { data: [], error: { message: 'workerId is not a UUID; aborting update to avoid DB error' } };
        }
        const from = new Date(year, month, 1).toISOString();
        const to = new Date(year, month + 1, 1).toISOString();

        const { data, error } = await supabase
            .from('worker_salaries')
            .update(payload)
            .eq('worker_id', workerId)
            .gte('date', from)
            .lt('date', to)
            .select();

        console.log("SERVICE → update-by-worker returned:", { data, error });
        return { data, error };
    }

    return { data: [], error: { message: 'No target provided for update' } };
};

export const getWorkerOperations = async (workerId: string, month?: number, year?: number) => {
    if (!workerId) return [];

    const isUuid = (v: string) => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(v);

    // build range if month+year provided
    let query = supabase.from("worker_salaries").select("*").eq("worker_id", workerId).order("date", { ascending: false });

    if (typeof month === "number" && typeof year === "number") {
        const from = new Date(year, month, 1).toISOString();
        const to = new Date(year, month + 1, 1).toISOString();
        query = query.gte("date", from).lt("date", to);
    }

    const { data, error } = await query;
    if (error) throw error;

    const rows = data || [];

    // fetch lookups for names / rate defaults
    const [{ data: products }, { data: operations }] = await Promise.all([
        supabase.from("products").select("id,name"),
        supabase.from("operations").select("id,name,amount_per_piece"),
    ]);

    const productMap: Record<string, any> = {};
    const opMap: Record<string, any> = {};
    (products || []).forEach((p: any) => { if (p?.id) productMap[p.id] = p; });
    (operations || []).forEach((o: any) => { if (o?.id) opMap[o.id] = o; });

    return (rows || []).map((r: any) => {
        const pieces = Number(r.pieces_done || 0);
        const rateFromRow = Number(r.amount_per_piece || 0);
        const opRate = opMap[r.operation_id]?.amount_per_piece;
        const rate = rateFromRow || Number(opRate || 0);
        const total = Number(r.total_amount ?? pieces * rate);

        return {
            id: r.id,
            productName: productMap[r.product_id]?.name || null,
            date: r.date ? new Date(r.date) : new Date(),
            pieces,
            ratePerPiece: rate,
            total,
            // ID fields needed for update/delete
            workerId: r.worker_id,
            operationId: r.operation_id, // master operation ID
        };
    });
};

export const getEmployeeSalaries = async () => {
    // Parallel fetch: Salaries and Advances
    const [salariesRes, advancesRes] = await Promise.all([
        supabase.from("employee_salaries").select("*").order("created_at", { ascending: false }),
        supabase.from("employee_advances").select("*")
    ]);

    if (salariesRes.error) throw salariesRes.error;
    // We treat advances as supplementary; if fetch fails, we might just miss them, but better to warn.
    if (advancesRes.error) console.warn("Failed to fetch employee advances", advancesRes.error);

    const rows = salariesRes.data || [];
    const advanceRows = advancesRes.data || [];

    // Aggregate advances by Employee + Month (YYYY-MM)
    // Map key: "employeeId_YYYY-MM"
    const advanceMap: Record<string, number> = {};

    advanceRows.forEach((adv: any) => {
        if (!adv.date || !adv.employee_id) return;
        const d = new Date(adv.date);
        const key = `${adv.employee_id}_${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        advanceMap[key] = (advanceMap[key] || 0) + Number(adv.amount || 0);
    });

    return (rows || []).map((r: any) => {
        // parse salary_month (expected to be text like "2023-04" or other human formats)
        const raw = r.salary_month;
        let monthDate: Date;
        if (typeof raw === "string") {
            // yyyy-mm or yyyy-mm-dd
            const isoMatch = raw.match(/^(\d{4})-(\d{2})(?:-(\d{2}))?/);
            if (isoMatch) {
                const y = Number(isoMatch[1]);
                const m = Math.max(0, Number(isoMatch[2]) - 1);
                const d = isoMatch[3] ? Number(isoMatch[3]) : 1;
                monthDate = new Date(y, m, d);
            } else {
                // fallback to Date constructor
                monthDate = new Date(raw);
            }
        } else {
            monthDate = r.created_at ? new Date(r.created_at) : new Date();
        }

        // Calculate Dynamic Advance
        const monthKey = `${r.employee_id}_${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}`;
        const ledgerAdvance = advanceMap[monthKey] || 0;
        const storedAdvance = Number(r.advance ?? 0);
        const totalAdvance = storedAdvance + ledgerAdvance;

        const gross = Number(r.gross_salary ?? r.salary ?? 0);

        return {
            id: r.id,
            employeeId: r.employee_id,
            employeeName: r.employee_name ?? null,
            month: monthDate,
            salary: gross,
            advance: totalAdvance, // Display total
            netSalary: gross - totalAdvance, // Recalculate Net
            paid: !!r.paid,
            paidDate: r.paid_date ? new Date(r.paid_date) : undefined,
            paidBy: r.paid_by_employee_id || undefined,
        };
    });
};

export const markEmployeeSalariesPaid = async (ids?: string[], paidBy?: string) => {
    const payload: any = {
        paid: true,
        paid_date: new Date().toISOString(),
    };
    if (paidBy) payload.paid_by_employee_id = paidBy;

    const isUuid = (v: string) => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(v);

    if (Array.isArray(ids) && ids.length > 0) {
        const validIds = ids.filter(id => typeof id === 'string' && isUuid(id));
        if (validIds.length === 0) {
            return { data: [], error: { message: 'No valid UUID ids provided' } };
        }

        const { data, error } = await supabase
            .from('employee_salaries')
            .update(payload)
            .in('id', validIds)
            .select();

        return { data, error };
    }

    return { data: [], error: { message: 'No target provided for update' } };
};

export const getEmployees = async () => {
    // Single safe fetch: select all columns and normalize any salary-like field client-side.
    try {
        const { data, error } = await supabase.from("employees").select("*");
        if (error) {
            console.warn("getEmployees: failed selecting employees:", error);
            return [];
        }

        return (data || []).map((r: any) => {
            const base =
                (typeof r.base_salary === "number" ? r.base_salary : undefined) ??
                (typeof r.basic_salary === "number" ? r.basic_salary : undefined) ??
                (typeof r.gross_salary === "number" ? r.gross_salary : undefined) ??
                (typeof r.salary === "number" ? r.salary : undefined) ??
                (typeof r.baseSalary === "number" ? r.baseSalary : undefined);

            return {
                id: r.id,
                name: r.name,
                base_salary: typeof base === "number" ? base : undefined,
            };
        });
    } catch (err) {
        console.warn("getEmployees fallback error:", err);
        return [];
    }
};

/**
 * Insert a new employee salary row into employee_salaries.
 * Accepts employeeId, salaryMonth (Date | string), grossSalary, advance, netSalary, paid (opt), employeeName (opt).
 * Returns { data, error }.
 */
export const createEmployeeSalary = async (payload: {
    employeeId: string;
    salaryMonth: Date | string;
    grossSalary?: number;
    advance?: number;
    netSalary?: number;
    paid?: boolean;
    paidDate?: Date | string | null;
    employeeName?: string | null;
}) => {
    const fmtMonth = (m: Date | string) => {
        if (m instanceof Date) {
            return `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}`;
        }
        const str = String(m);
        const isoMatch = str.match(/^(\d{4})-(\d{2})/);
        if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}`;
        const dt = new Date(str);
        return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
    };

    const body: any = {
        employee_id: payload.employeeId,
        salary_month: fmtMonth(payload.salaryMonth),
        gross_salary: payload.grossSalary ?? 0,
        advance: payload.advance ?? 0,
        net_salary: payload.netSalary ?? 0,
        paid: !!payload.paid,
        paid_date: payload.paidDate ? (payload.paidDate instanceof Date ? payload.paidDate.toISOString() : payload.paidDate) : null,
        employee_name: payload.employeeName ?? null,
    };

    const { data, error } = await supabase
        .from("employee_salaries")
        .insert([body])
        .select();

    // friendly unique-constraint error handling
    if (error) {
        const msg = String(error.message || "").toLowerCase();
        if (msg.includes("unique") || String(error.details || "").toLowerCase().includes("unique")) {
            return { data: null, error: { message: "A salary for this employee and month already exists." } };
        }
        return { data: null, error };
    }

    return { data, error: null };
};

export const updateEmployeeSalary = async (id: string, updates: {
    salaryMonth?: Date | string;
    grossSalary?: number;
    advance?: number;
    netSalary?: number;
    paid?: boolean;
    paidDate?: Date | string | null;
    employeeName?: string | null;
}) => {
    if (!id) return { data: null, error: { message: "Missing id" } };

    const fmtMonth = (m?: Date | string) => {
        if (!m) return undefined;
        if (m instanceof Date) return `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}`;
        const str = String(m);
        const isoMatch = str.match(/^(\d{4})-(\d{2})/);
        if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}`;
        const dt = new Date(str);
        return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
    };

    const payload: any = {};
    if (typeof updates.grossSalary === "number") payload.gross_salary = updates.grossSalary;
    if (typeof updates.advance === "number") payload.advance = updates.advance;
    if (typeof updates.netSalary === "number") payload.net_salary = updates.netSalary;
    if (typeof updates.paid === "boolean") payload.paid = updates.paid;
    if (updates.paidDate) payload.paid_date = updates.paidDate instanceof Date ? updates.paidDate.toISOString() : updates.paidDate;
    if (typeof updates.employeeName === "string") payload.employee_name = updates.employeeName;
    const formattedMonth = fmtMonth(updates.salaryMonth);
    if (formattedMonth) payload.salary_month = formattedMonth;

    const { data, error } = await supabase
        .from("employee_salaries")
        .update(payload)
        .eq("id", id)
        .select();

    if (error) {
        return { data: null, error };
    }

    return { data, error: null };
};

export const addWorkerSalary = async (payload: {
    worker_id: string | null;
    product_id?: string | null;
    operation_id?: string | null;
    pieces_done?: number;
    amount_per_piece?: number;
    total_amount?: number;
    date?: string | Date;
    created_by?: string | null;
}) => {
    const body: any = {
        worker_id: payload.worker_id,
        product_id: payload.product_id ?? null,
        operation_id: payload.operation_id ?? null,
        pieces_done: Number(payload.pieces_done ?? 0),
        amount_per_piece: Number(payload.amount_per_piece ?? 0),
        total_amount: typeof payload.total_amount === "number"
            ? payload.total_amount
            : (Number(payload.pieces_done ?? 0) * Number(payload.amount_per_piece ?? 0)),
        date: payload.date ? (payload.date instanceof Date ? payload.date.toISOString() : String(payload.date)) : new Date().toISOString(),
        paid: false,
        paid_date: null,
        created_at: new Date().toISOString(),
    };

    try {
        const { data, error } = await supabase
            .from("worker_salaries")
            .insert([body])
            .select()
            .single();

        if (error) {
            // Return friendly error shape (caller handles logging/toast)
            return { data: null, error };
        }
        return { data, error: null };
    } catch (err: any) {
        return { data: null, error: err };
    }
};


export const autoGenerateEmployeeSalary = async (targetMonth?: number, targetYear?: number) => {
    try {
        const now = new Date();
        // Use provided month/year or default to current
        const monthNumber = targetMonth || (now.getMonth() + 1);
        const yearNumber = targetYear || now.getFullYear();

        const salaryMonth = `${yearNumber}-${String(monthNumber).padStart(2, "0")}`;

        // Total days in this month (1–28/29/30/31)
        const calendarDays = new Date(yearNumber, monthNumber, 0).getDate();

        // 1️⃣ Fetch all active employees
        const { data: employees, error: empErr } = await supabase
            .from("employees")
            .select("id, name, salary_amount, is_active");

        if (empErr) return { error: empErr, data: null };

        const results = [];

        for (const emp of employees || []) {
            try {
                if (!emp.is_active) continue;

                const baseSalary = Number(emp.salary_amount || 0);

                // 2️⃣ Fetch summary (present/absent/leave)
                const summary = await getMonthlyAttendanceSummary(
                    emp.id,
                    monthNumber,
                    yearNumber
                );

                if (!summary) {
                    results.push({
                        employee: emp.name,
                        error: "Attendance summary not found",
                        data: null,
                    });
                    continue;
                }

                const { present, leave, absent, totalDays: attendanceDays } = summary;

                // 3️⃣ Detect incomplete attendance (warn only)
                // If generating for a past month, we expect full month attendance. 
                // If current month, we expect up to yesterday/today.
                let expectedDaysSoFar = calendarDays;
                if (yearNumber === now.getFullYear() && monthNumber === (now.getMonth() + 1)) {
                    expectedDaysSoFar = now.getDate();
                }
                const attendanceIncomplete = attendanceDays < expectedDaysSoFar;

                // 4️⃣ Salary calculations
                // FIX: Use "Negative Attendance" logic. 
                // Since data might be sparse (only absences marked), we assume "Base - Absent".
                const dailySalary = baseSalary / calendarDays;

                // Deduct only for explicit ABSENT days.
                // Leave is treated as Paid (Present) in this simple model unless explicitly unpaid.
                const deduction = absent * dailySalary;

                const grossSalaryRaw = Math.max(0, baseSalary - deduction);

                // Round final salary
                const grossSalary = Math.round(grossSalaryRaw);

                // 5️⃣ Check existing salary row
                const { data: existingSalary, error: existErr } = await supabase
                    .from("employee_salaries")
                    .select("*")
                    .eq("employee_id", emp.id)
                    .eq("salary_month", salaryMonth)
                    .maybeSingle();

                if (existErr) {
                    results.push({
                        employee: emp.name,
                        error: existErr.message,
                        summary,
                    });
                    continue;
                }

                // 6️⃣ If salary exists AND paid → do not modify
                if (existingSalary && existingSalary.paid) {
                    results.push({
                        employee: emp.name,
                        skipped: true,
                        reason: "Salary already paid — cannot update",
                        summary,
                    });
                    continue;
                }

                // 7️⃣ If salary exists and NOT paid → update in place
                if (existingSalary && !existingSalary.paid) {
                    const advance = Number(existingSalary.advance || 0);
                    const netSalary = grossSalary - advance;

                    const { data: updated, error: updErr } = await supabase
                        .from("employee_salaries")
                        .update({
                            gross_salary: grossSalary,
                            net_salary: netSalary,
                        })
                        .eq("id", existingSalary.id)
                        .select()
                        .single();

                    results.push({
                        employee: emp.name,
                        updated: true,
                        summary,
                        attendanceIncomplete,
                        salary: updated,
                    });

                    continue;
                }

                // 8️⃣ Create new salary row
                const payload = {
                    employeeId: emp.id,
                    salaryMonth,
                    grossSalary,
                    advance: 0,
                    netSalary: grossSalary,
                    paid: false,
                    employeeName: emp.name,
                };

                const res = await createEmployeeSalary(payload);

                results.push({
                    employee: emp.name,
                    created: true,
                    summary,
                    attendanceIncomplete,
                    salary: res,
                });
            } catch (loopErr) {
                // Catch per-employee errors so loop continues safely
                results.push({
                    employee: emp.name,
                    error: loopErr?.message || String(loopErr),
                });
            }
        }

        return { data: results, error: null };
    } catch (err) {
        return { data: null, error: err };
    }
};


export const getPaidEmployeeIdsForMonth = async (month: number, year: number) => {
    const monthStr = `${year}-${String(month).padStart(2, "0")}`;

    const { data, error } = await supabase
        .from("employee_salaries")
        .select("employee_id")
        .eq("salary_month", monthStr)
        .eq("paid", true);

    if (error) {
        console.error("getPaidEmployeeIdsForMonth error", error);
        return [];
    }

    return (data || []).map((r: any) => r.employee_id);
};

export const deleteWorkerSalary = async (workerId: string, operationId: string, date: string) => {
    // Delete based on worker, operation(master), and date
    // Note: this deletes ALL matching records if duplicates exist for same day/op
    const { error } = await supabase
        .from("worker_salaries")
        .delete()
        .eq("worker_id", workerId)
        .eq("operation_id", operationId)
        .eq("date", date);

    if (error) throw error;
    return true;
};

export const updateWorkerSalaryByOps = async (
    workerId: string,
    operationId: string,
    date: string,
    updates: { pieces_done?: number; total_amount?: number }
) => {
    // Update based on match
    const payload: any = {};
    if (updates.pieces_done !== undefined) payload.pieces_done = updates.pieces_done;
    if (updates.total_amount !== undefined) payload.total_amount = updates.total_amount;

    const { data, error } = await supabase
        .from("worker_salaries")
        .update(payload)
        .eq("worker_id", workerId)
        .eq("operation_id", operationId)
        .eq("date", date)
        .select();

    if (error) throw error;
    return data;
};

export const addEmployeeAdvance = async (payload: { employeeId: string; amount: number; date: Date; note?: string }) => {
    // 1. Insert into employee_advances ledger
    const { data: ledgerData, error: ledgerError } = await supabase.from("employee_advances").insert([{
        employee_id: payload.employeeId,
        amount: payload.amount,
        note: payload.note,
        date: payload.date.toISOString(),
        created_at: new Date().toISOString()
    }]).select();

    if (ledgerError) {
        return { error: ledgerError };
    }

    // 2. Ensure salary record exists so the advance is visible (via aggregation in getEmployeeSalaries)
    const m = payload.date.getMonth() + 1;
    const y = payload.date.getFullYear();
    const salaryMonth = `${y}-${String(m).padStart(2, "0")}`;

    const { data: salaryRecord, error: fetchErr } = await supabase
        .from("employee_salaries")
        .select("*")
        .eq("employee_id", payload.employeeId)
        .eq("salary_month", salaryMonth)
        .maybeSingle();

    if (fetchErr) {
        console.error("Error checking employee salary on advance add", fetchErr);
        // Return success for the advance even if salary check fails
        return { data: ledgerData, error: null };
    }

    if (!salaryRecord) {
        // Create new salary record (if not exists yet)
        const employees = await getEmployees();
        const emp = employees.find((e: any) => e.id === payload.employeeId);
        const base = emp?.base_salary || 0;

        // Init with base salary. 
        // 'Advance' column in DB stays 0. 
        // Aggregation in getEmployeeSalaries will add the ledger amount.
        await createEmployeeSalary({
            employeeId: payload.employeeId,
            salaryMonth: payload.date,
            grossSalary: base,
            advance: 0,
            netSalary: base, // Initially base, aggregation will deduct
            employeeName: emp?.name
        });
    }

    return { data: ledgerData, error: null };
};

export const addWorkerAdvance = async (payload: { workerId: string; amount: number; date: Date; note?: string }) => {
    // Insert into worker_advances table
    // Note: table schema uses 'id' serial (bigint) and 'worker_id' uuid
    const { data, error } = await supabase
        .from("worker_advances")
        .insert([{
            worker_id: payload.workerId,
            amount: payload.amount,
            date: payload.date.toISOString(),
            note: payload.note
        }])
        .select()
        .single();

    if (error) return { data: null, error };

    // Return mapped object compatible with WorkerSalary interface for UI update
    return {
        data: {
            id: data.id.toString(), // BigInt to string
            worker_id: data.worker_id,
            total_amount: -Math.abs(Number(data.amount)),
            pieces_done: 0,
            date: data.date,
            note: data.note,
            type: 'advance'
        },
        error: null
    };
};
