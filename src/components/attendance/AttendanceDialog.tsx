// src/components/attendance/AttendanceDialog.tsx
import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { getActiveEmployees, getAttendanceByDate, upsertAttendanceBulk } from "@/Services/attendanceService";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";

type Props = {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    markedByEmployeeId?: string | null;
};

export const AttendanceDialog: React.FC<Props> = ({ open, onOpenChange, markedByEmployeeId = null }) => {
    const { toast } = useToast();

    const [date, setDate] = useState<Date>(new Date());
    const [employees, setEmployees] = useState<{ id: string; name: string }[]>([]);
    const [loading, setLoading] = useState(false);
    const [attendanceMap, setAttendanceMap] =
        useState<Record<string, "present" | "absent" | "leave">>({});

    // Reset date every time dialog opens (fixes corrupted date like "2025-12-acce")
    useEffect(() => {
        if (open) {
            setDate(new Date());
        }
    }, [open]);

    // Load employees + attendance for selected date
    useEffect(() => {
        if (!open) return;

        (async () => {
            setLoading(true);
            try {
                const emps = await getActiveEmployees();
                setEmployees(emps.map((e) => ({ id: e.id, name: e.name })));

                if (!(date instanceof Date) || isNaN(date.getTime())) return;

                // const iso = date.toISOString().split("T")[0];
                let iso = "1970-01-01";

                if (date instanceof Date && !isNaN(date.getTime())) {
                    // Fix: Use local date to avoid timezone issues (e.g. previous day)
                    const y = date.getFullYear();
                    const m = String(date.getMonth() + 1).padStart(2, "0");
                    const d = String(date.getDate()).padStart(2, "0");
                    iso = `${y}-${m}-${d}`;
                } else {
                    console.warn("Invalid date in useEffect. Resetting.", date);
                    setDate(new Date()); // auto-repair
                    return; // exit so no bad rows are pushed
                }

                const existing = await getAttendanceByDate(iso);

                const map: Record<string, "present" | "absent" | "leave"> = {};
                emps.forEach((e) => (map[e.id] = "present")); // default

                (existing || []).forEach((r) => {
                    if (r.person_id) {
                        map[r.person_id] =
                            (r.status as "present" | "absent" | "leave") ?? "absent";
                    }
                });

                setAttendanceMap(map);
            } catch (err) {
                console.error(err);
                toast({
                    title: "Failed to load",
                    description: "Could not load attendance data",
                    variant: "destructive",
                });
            } finally {
                setLoading(false);
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, date]);

    // Change attendance status
    const handleStatusChange = (employeeId: string, status: "present" | "absent" | "leave") => {
        setAttendanceMap((prev) => ({ ...prev, [employeeId]: status }));
    };


    // Save attendance
    const handleSave = async () => {

        if (!(date instanceof Date) || isNaN(date.getTime())) {

            toast({
                title: "Invalid Date",
                description: "Please select a valid date.",
                variant: "destructive",
            });
            return;
        }

        // Fix: Use local date to avoid timezone issues
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, "0");
        const d = String(date.getDate()).padStart(2, "0");
        const iso = `${y}-${m}-${d}`;

        const rows = employees.map((emp) => ({
            person_type: "employee" as const,
            person_id: emp.id,
            date: iso,
            status: attendanceMap[emp.id] || "absent",
            marked_by_employee_id: markedByEmployeeId ?? null,
        }));

        setLoading(true);
        try {
            const { error } = await upsertAttendanceBulk(rows);

            if (error) {
                console.error("attendance upsert error", error);
                toast({
                    title: "Save failed",
                    description: "Failed to save attendance",
                    variant: "destructive",
                });
                return;
            }

            toast({
                title: "Saved",
                description: "Attendance saved successfully",
            });

            onOpenChange(false);
        } catch (err) {
            console.error(err);
            toast({
                title: "Error",
                description: "Failed to save attendance",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Mark Attendance</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <div className="text-sm text-muted-foreground">Date</div>

                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="flex items-center">
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {format(date, "dd MMM yyyy")}
                                    </Button>
                                </PopoverTrigger>

                                <PopoverContent className="w-auto p-0">
                                    <Calendar
                                        mode="single"
                                        selected={date}
                                        onSelect={(d) => {
                                            if (d instanceof Date && !isNaN(d.getTime())) {
                                                setDate(d);
                                            }
                                        }}
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>

                        <div className="text-sm text-muted-foreground">
                            Default status: Present
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                        {employees.length === 0 && (
                            <div className="text-center py-8 text-muted-foreground">
                                No active employees found
                            </div>
                        )}

                        {employees.map((emp) => (
                            <div
                                key={emp.id}
                                className="flex items-center justify-between p-2 border rounded"
                            >
                                <div>{emp.name}</div>

                                <div className="flex items-center gap-2">
                                    <Select
                                        value={attendanceMap[emp.id] ?? "present"}
                                        onValueChange={(v) =>
                                            handleStatusChange(emp.id, v as any)
                                        }
                                    >
                                        <SelectTrigger className="w-36">
                                            <SelectValue />
                                        </SelectTrigger>

                                        <SelectContent>
                                            <SelectItem value="present">Present</SelectItem>
                                            <SelectItem value="absent">Absent</SelectItem>
                                            <SelectItem value="leave">Leave</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-end pt-4">
                        <Button
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={loading}
                        >
                            Cancel
                        </Button>

                        <Button onClick={handleSave} className="ml-2" disabled={loading}>
                            {loading ? "Saving..." : "Save Attendance"}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default AttendanceDialog;
