export interface AttendanceRow {
    person_type: "employee" | "worker" | string;  // ← allow string
    person_id: string;
    date: string;
    status: "present" | "absent" | "leave" | string; // ← allow string
    marked_by_employee_id: string | null;
}
