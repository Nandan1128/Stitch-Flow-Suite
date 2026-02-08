import React, { useState, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { User, Calendar } from "lucide-react";

export const AttendanceTable = ({
  month,
  year,
  employees,
  attendance,
  onSave,
  loading,
  paidEmployeeIds = [],
}) => {
  const isMobile = useIsMobile();
  const daysInMonth = useMemo(() => new Date(year, month, 0).getDate(), [month, year]);

  // Transform array -> Map: "employeeId-day" => { status }
  const transformToMap = (data) => {
    const map = {};
    if (Array.isArray(data)) {
      data.forEach((row) => {
        if (row.date) {
          try {
            const d = new Date(row.date);
            const day = d.getDate();
            const key = `${row.person_id}-${day}`;
            map[key] = { status: row.status };
          } catch (e) {
            console.error("Error parsing date", row.date);
          }
        }
      });
    }
    return map;
  };

  const [local, setLocal] = useState({});

  // Sync state when attendance prop or month/year changes
  React.useEffect(() => {
    setLocal(transformToMap(attendance));
  }, [attendance, month, year]);

  const handleChange = (empId, day, value) => {
    const key = `${empId}-${day}`;
    setLocal((prev) => ({
      ...prev,
      [key]: { ...prev[key], status: value },
    }));
  };

  const buildSavePayload = () => {
    const rows = [];

    Object.keys(local).forEach((key) => {
      const lastDashIndex = key.lastIndexOf("-");
      const empId = key.substring(0, lastDashIndex);
      const day = parseInt(key.substring(lastDashIndex + 1));

      const row = local[key];
      // Re-construct date safely
      const date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

      // Skip if employee is paid (double safety)
      if (paidEmployeeIds.includes(empId)) return;

      rows.push({
        person_type: "employee",
        person_id: empId,
        date,
        status: row.status,
        shift: "morning",
        marked_by_employee_id: null,
      });
    });

    return rows;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "present":
        return "bg-green-400 text-white hover:bg-green-600 focus:ring-green-500";
      case "absent":
        return "bg-red-400 text-white hover:bg-red-600 focus:ring-red-500";
      case "leave":
        return "bg-yellow-400 text-white hover:bg-yellow-600 focus:ring-yellow-500";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getStatusAbbreviation = (status) => {
    switch (status) {
      case "present": return "P";
      case "absent": return "A";
      case "leave": return "L";
      default: return "-";
    }
  };

  if (isMobile) {
    return (
      <div className="space-y-6">
        <Accordion type="multiple" className="w-full space-y-2">
          {employees.map((emp) => {
            const isPaid = paidEmployeeIds.includes(emp.id);
            const presentCount = [...Array(daysInMonth).keys()].filter(d => (local[`${emp.id}-${d + 1}`]?.status || "present") === "present").length;

            return (
              <AccordionItem key={emp.id} value={emp.id} className="border rounded-lg px-2 bg-card">
                <AccordionTrigger className="hover:no-underline py-4">
                  <div className="flex items-center gap-3 text-left">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      <User size={20} />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-base leading-none">{emp.name}</span>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Badge variant="secondary" className="text-[10px] h-4 px-1.5 font-normal">
                          {presentCount}/{daysInMonth} Present
                        </Badge>
                        {isPaid && <Badge variant="destructive" className="text-[10px] h-4 px-1.5 font-normal">Paid</Badge>}
                      </div>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4">
                  <div className="grid grid-cols-7 gap-1.5 mt-2">
                    {[...Array(daysInMonth).keys()].map((d) => {
                      const key = `${emp.id}-${d + 1}`;
                      const row = local[key] || { status: "present" };

                      return (
                        <div key={key} className="flex flex-col items-center">
                          <span className="text-[10px] text-muted-foreground mb-1">{d + 1}</span>
                          <Select
                            value={row.status}
                            onValueChange={(value) => handleChange(emp.id, d + 1, value)}
                            disabled={isPaid}
                          >
                            <SelectTrigger className={`w-full h-8 px-0 flex justify-center border-0 text-[10px] font-bold ${getStatusColor(row.status)}`}>
                              {getStatusAbbreviation(row.status)}
                            </SelectTrigger>
                            <SelectContent className="min-w-[80px]">
                              <SelectItem value="present">Present (P)</SelectItem>
                              <SelectItem value="absent">Absent (A)</SelectItem>
                              <SelectItem value="leave">Leave (L)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      );
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>

        <Button onClick={() => onSave(buildSavePayload())} disabled={loading} className="w-full h-12 text-base font-semibold">
          Submit Attendance Report
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[150px] sticky left-0 bg-background z-10 border-r">Employee</TableHead>
              {[...Array(daysInMonth).keys()].map((d) => (
                <TableHead key={d} className="text-center min-w-[70px]">{d + 1}</TableHead>
              ))}
            </TableRow>
          </TableHeader>

          <TableBody>
            {employees.map((emp) => {
              const isPaid = paidEmployeeIds.includes(emp.id);
              return (
                <TableRow key={emp.id} className={isPaid ? "opacity-50 bg-muted/20" : ""}>
                  <TableCell className="font-medium sticky left-0 bg-background z-10 border-r">
                    {emp.name}
                    {isPaid && <div className="text-xs text-red-500">(Paid)</div>}
                  </TableCell>

                  {[...Array(daysInMonth).keys()].map((d) => {
                    const key = `${emp.id}-${d + 1}`;
                    const row = local[key] || { status: "present" };

                    return (
                      <TableCell key={key} className="text-center">
                        <Select
                          value={row.status}
                          onValueChange={(value) => handleChange(emp.id, d + 1, value)}
                          disabled={isPaid}
                        >
                          <SelectTrigger className={`w-full h-8 border-0 ${getStatusColor(row.status)}`}>
                            <SelectValue />
                          </SelectTrigger>

                          <SelectContent>
                            <SelectItem value="present" className="text-green-600">P</SelectItem>
                            <SelectItem value="absent" className="text-red-600">A</SelectItem>
                            <SelectItem value="leave" className="text-yellow-600">L</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Button onClick={() => onSave(buildSavePayload())} disabled={loading}>
        Save Attendance
      </Button>
    </div>
  );
};
