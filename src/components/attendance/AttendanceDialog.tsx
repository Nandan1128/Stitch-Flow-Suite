import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { getActiveEmployees, getAttendanceByDate, upsertAttendanceBulk } from "@/Services/attendanceService";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

type Props = {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    markedByEmployeeId?: string | null;
};

export const AttendanceDialog: React.FC<Props> = ({ open, onOpenChange, markedByEmployeeId = null }) => {
    const isMobile = useIsMobile();
    const { toast } = useToast();

    const [date, setDate] = useState<Date>(new Date());
    const [employees, setEmployees] = useState<{ id: string; name: string }[]>([]);
    const [loading, setLoading] = useState(false);
    const [attendanceMap, setAttendanceMap] =
        useState<Record<string, "present" | "absent" | "leave">>({});

    useEffect(() => {
        if (open) {
            setDate(new Date());
        }
    }, [open]);

    useEffect(() => {
        if (!open) return;

        (async () => {
            setLoading(true);
            try {
                const emps = await getActiveEmployees();
                setEmployees(emps.map((e) => ({ id: e.id, name: e.name })));

                if (!(date instanceof Date) || isNaN(date.getTime())) return;

                let iso = "1970-01-01";
                if (date instanceof Date && !isNaN(date.getTime())) {
                    const y = date.getFullYear();
                    const m = String(date.getMonth() + 1).padStart(2, "0");
                    const d = String(date.getDate()).padStart(2, "0");
                    iso = `${y}-${m}-${d}`;
                } else {
                    setDate(new Date());
                    return;
                }

                const existing = await getAttendanceByDate(iso);
                const map: Record<string, "present" | "absent" | "leave"> = {};
                emps.forEach((e) => (map[e.id] = "present"));

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
    }, [open, date]);

    const handleStatusChange = (employeeId: string, status: "present" | "absent" | "leave") => {
        setAttendanceMap((prev) => ({ ...prev, [employeeId]: status }));
    };

    const handleSave = async () => {
        if (!(date instanceof Date) || isNaN(date.getTime())) {
            toast({
                title: "Invalid Date",
                description: "Please select a valid date.",
                variant: "destructive",
            });
            return;
        }

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
            toast({
                title: "Error",
                description: "Failed to save attendance",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const renderContent = () => (
        <div className="space-y-4 py-2">
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground whitespace-nowrap">Date:</span>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="flex items-center h-9">
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {format(date, "dd MMM yyyy")}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={date}
                                onSelect={(d) => d && setDate(d)}
                            />
                        </PopoverContent>
                    </Popover>
                </div>
                <div className="text-xs text-muted-foreground hidden sm:block">
                    Default status: Present
                </div>
            </div>

            <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-2">
                {employees.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                        No active employees found
                    </div>
                )}

                {employees.map((emp) => (
                    <div
                        key={emp.id}
                        className="flex items-center justify-between p-3 border rounded-lg bg-card"
                    >
                        <div className="font-medium text-sm">{emp.name}</div>
                        <Select
                            value={attendanceMap[emp.id] ?? "present"}
                            onValueChange={(v) => handleStatusChange(emp.id, v as any)}
                        >
                            <SelectTrigger className="w-32 h-8 text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="present">Present</SelectItem>
                                <SelectItem value="absent">Absent</SelectItem>
                                <SelectItem value="leave">Leave</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t sticky bottom-0 bg-background text-black">
                <Button onClick={handleSave} className="flex-1" disabled={loading}>
                    {loading ? "Saving..." : "Save Attendance"}
                </Button>
                <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1" disabled={loading}>
                    Cancel
                </Button>
            </div>
        </div>
    );

    if (isMobile) {
        return (
            <Drawer open={open} onOpenChange={onOpenChange}>
                <DrawerContent className="max-h-[96vh]">
                    <DrawerHeader className="text-left border-b pb-4">
                        <DrawerTitle>Mark Attendance</DrawerTitle>
                    </DrawerHeader>
                    <div className="px-4 pb-6 overflow-y-auto">
                        {renderContent()}
                    </div>
                </DrawerContent>
            </Drawer>
        );
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader className="border-b pb-4">
                    <DialogTitle>Mark Attendance</DialogTitle>
                </DialogHeader>
                {renderContent()}
            </DialogContent>
        </Dialog>
    );
};

export default AttendanceDialog;
