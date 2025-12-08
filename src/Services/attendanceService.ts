// src/Services/attendanceService.ts
import { supabase } from "@/Config/supabaseClient";

export type AttendanceRow = {
    id?: string;
    person_type: "employee" | "worker" | string;
    person_id: string;
    date: string; // yyyy-mm-dd
    status: "present" | "absent" | "leave";
    shift?: string | null;
    marked_by_employee_id?: string | null;
    created_at?: string;
};

export const getActiveEmployees = async (): Promise<{ id: string; name: string; is_active?: boolean }[]> => {
    const { data, error } = await supabase
        .from("employees")
        .select("id,name,is_active")
        .eq("is_active", true)
        .order("name", { ascending: true });

    if (error) {
        console.error("getActiveEmployees error", error);
        return [];
    }
    return (data || []) as any[];
};

/**
 * Fetch attendance rows for a specific date (YYYY-MM-DD).
 */
export const getAttendanceByDate = async (dateIso: string) => {
    const { data, error } = await supabase
        .from("attendance")
        .select("*")
        .eq("date", dateIso)
        .eq("person_type", "employee");

    if (error) {
        console.error("getAttendanceByDate error", error);
        return [];
    }
    return data as AttendanceRow[];
};

/**
 * Bulk upsert attendance rows.
 * Uses unique constraint (person_type, person_id, date) as conflict target.
 */
export const upsertAttendanceBulk = async (rows: AttendanceRow[]) => {
    if (!Array.isArray(rows) || rows.length === 0) return { data: [], error: null };

    // Ensure date string formatting safe: keep rows.date as 'YYYY-MM-DD'
    const { data, error } = await supabase
        .from("attendance")
        .upsert(rows, { onConflict: "person_type,person_id,date", }) // PostgREST upsert on unique constraint
        .select();

    if (error) {
        console.error("upsertAttendanceBulk error", error);
        return { data: null, error };
    }

    return { data, error: null };
};

/**
 * Fetch attendance rows for a given employee for month-range (used by salary generation)
 * from (inclusive) fromIso to (exclusive) toIso.
 */
export const getAttendanceForEmployeeInRange = async (employeeId: string, fromIso: string, toIso: string) => {
    const { data, error } = await supabase
        .from("attendance")
        .select("*")
        .eq("person_type", "employee")
        .eq("person_id", employeeId)
        .gte("date", fromIso)
        .lt("date", toIso);

    if (error) {
        console.error("getAttendanceForEmployeeInRange error", error);
        return [];
    }
    return data as AttendanceRow[];
};

export const getMonthlyAttendanceSummary = async (employeeId: string, month: number, year: number) => {
    // Convert month/year to ISO range
    const fromIso = `${year}-${String(month).padStart(2, "0")}-01`;
    const toIsoDate = new Date(year, month, 0).getDate();
    const toIso = `${year}-${String(month).padStart(2, "0")}-${toIsoDate}`;

    const { data, error } = await supabase
        .from("attendance")
        .select("status, date")
        .eq("person_type", "employee")
        .eq("person_id", employeeId)
        .gte("date", fromIso)
        .lte("date", toIso);

    if (error) {
        console.error("getMonthlyAttendanceSummary error", error);
        return null;
    }

    const present = data.filter((r) => r.status === "present").length;
    const absent = data.filter((r) => r.status === "absent").length;
    const leave = data.filter((r) => r.status === "leave").length;

    return {
        totalDays: toIsoDate,
        present,
        absent,
        leave,
        percentage: present / toIsoDate,
    };
};

