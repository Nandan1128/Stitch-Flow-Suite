import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { AttendanceTable } from "@/components/attendance/AttendanceTable";
import { getActiveEmployees, getAttendanceForMonth, bulkUpdateAttendance } from "@/Services/attendanceService";
import { getPaidEmployeeIdsForMonth } from "@/Services/salaryService";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";

const AttendancePage: React.FC = () => {
    const { toast } = useToast();
    const { user } = useAuth();

    if (user?.role !== 'admin') {
        return <Navigate to="/dashboard" replace />;
    }

    const today = new Date();
    const [month, setMonth] = useState(today.getMonth() + 1);
    const [year, setYear] = useState(today.getFullYear());

    const [employees, setEmployees] = useState([]);
    const [attendance, setAttendance] = useState({});
    const [paidEmployeeIds, setPaidEmployeeIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    // Load employees + attendance
    const loadData = async () => {
        setLoading(true);
        try {
            const emps = await getActiveEmployees();
            setEmployees(emps);

            const att = await getAttendanceForMonth(month, year);
            setAttendance(att);

            const paidIds = await getPaidEmployeeIdsForMonth(month, year);
            setPaidEmployeeIds(paidIds);
        } catch (err) {
            toast({
                title: "Error loading attendance",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [month, year]);

    const handlePrevMonth = () => {
        if (month === 1) {
            setMonth(12);
            setYear(year - 1);
        } else {
            setMonth(month - 1);
        }
    };

    const handleNextMonth = () => {
        if (month === 12) {
            setMonth(1);
            setYear(year + 1);
        } else {
            setMonth(month + 1);
        }
    };

    const handleSave = async (updatedAttendance) => {
        const res = await bulkUpdateAttendance(updatedAttendance);

        if (res.error) {
            toast({
                title: "Failed to update attendance",
                description: res.error.message,
                variant: "destructive",
            });
            return;
        }

        toast({ title: "Attendance updated successfully" });
        loadData();
    };

    const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' });
    const isNextDisabled = year > today.getFullYear() || (year === today.getFullYear() && month >= today.getMonth() + 1);

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle>Employee Attendance</CardTitle>
                    <div className="flex items-center space-x-2">
                        <Button variant="outline" size="icon" onClick={handlePrevMonth}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <div className="font-semibold min-w-[140px] text-center">
                            {monthName} {year}
                        </div>
                        <Button variant="outline" size="icon" onClick={handleNextMonth} disabled={isNextDisabled}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </CardHeader>

                <CardContent>
                    <AttendanceTable
                        month={month}
                        year={year}
                        employees={employees}
                        attendance={attendance}
                        paidEmployeeIds={paidEmployeeIds}
                        onSave={handleSave}
                        loading={loading}
                    />
                </CardContent>
            </Card>
        </div>
    );
};

export default AttendancePage;
