// src/Services/attendanceService.ts
import { supabase } from "@/Config/supabaseClient";

export type AttendanceRow = {
    id?: string;
    person_type: "employee" | "worker";
    person_id: string;
    date: string;
    status: "present" | "absent" | "leave";
    shift?: string | null;
    marked_by_employee_id?: string | null;
    created_at?: string;
};

export const getActiveEmployees = async () => {
    const { data, error } = await supabase
        .from("employees")
        .select("id, name, is_active")
        .eq("is_active", true)
        .order("name", { ascending: true });

    if (error) {
        console.error("getActiveEmployees error", error);
        return [];
    }
    return data || [];
};

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


export const upsertAttendanceBulk = async (rows: AttendanceRow[]) => {
    if (!rows.length) return { data: [], error: null };

    console.log("DEBUG attendance rows:", rows);

    const { data, error } = await supabase
        .from("attendance")
        .upsert(rows, {
            onConflict: "person_type, person_id, date",
        })
        .select();

    if (error) {
        console.error("upsertAttendanceBulk error:", error);
        return { data: null, error };
    }

    return { data, error: null };
};

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
    // Correct month formatting
    const monthStr = String(month).padStart(2, "0");

    // 🔥 FIX #1 — Correct last day calculation (prevents "2025-13-01" bug)
    const lastDay = new Date(year, month, 0).getDate();

    // 🔥 FIX #2 — Correct date range
    const fromIso = `${year}-${monthStr}-01`;
    const toIso = `${year}-${monthStr}-${lastDay}`;

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
    const absent  = data.filter((r) => r.status === "absent").length;
    const leave   = data.filter((r) => r.status === "leave").length;

    return {
        totalDays: lastDay,
        present,
        absent,
        leave,
        percentage: present / lastDay, // optional usage
    };
};


export const getAttendanceForMonth = async (month: number, year: number) => {
    try {
        const from = new Date(year, month - 1, 1).toISOString().slice(0, 10);
        const to = new Date(year, month, 1).toISOString().slice(0, 10);

        const { data, error } = await supabase
            .from("attendance")
            .select("*")
            .eq("person_type", "employee")
            .gte("date", from)
            .lt("date", to);

        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error("getAttendanceForMonth error", err);
        return [];
    }
};

// Optional: alias for readability
export const bulkUpdateAttendance = upsertAttendanceBulk;
