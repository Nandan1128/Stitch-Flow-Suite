import React, { useState, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export const AttendanceTable = ({
  month,
  year,
  employees,
  attendance,
  onSave,
  loading,
  paidEmployeeIds = [],
}) => {
  const daysInMonth = useMemo(() => new Date(year, month, 0).getDate(), [month, year]);

  // Transform array -> Map: "employeeId-day" => { status }
  const transformToMap = (data) => {
    const map = {};
    if (Array.isArray(data)) {
      data.forEach((row) => {
        if (row.date) {
          const d = new Date(row.date);
          const day = d.getDate();
          const key = `${row.person_id}-${day}`;
          map[key] = { status: row.status };
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

    // Combine local changes with existing map structure logic
    // We iterate over known employees & days or just the local map keys?
    // Better: Iterate local map keys to find what changed, OR 
    // simply iterate over ALL cells if we want to be safe, but local map has the edits.

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

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Employee</TableHead>
            {[...Array(daysInMonth).keys()].map((d) => (
              <TableHead key={d} className="text-center min-w-[100px]">{d + 1}</TableHead>
            ))}
          </TableRow>
        </TableHeader>

        <TableBody>
          {employees.map((emp) => {
            const isPaid = paidEmployeeIds.includes(emp.id);
            return (
              <TableRow key={emp.id} className={isPaid ? "opacity-50 bg-muted/20" : ""}>
                <TableCell className="font-medium">
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
                        <SelectTrigger className="w-[100px]">
                          <SelectValue />
                        </SelectTrigger>

                        <SelectContent>
                          <SelectItem value="present">P</SelectItem>
                          <SelectItem value="absent">A</SelectItem>
                          <SelectItem value="leave">L</SelectItem>
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

      <Button onClick={() => onSave(buildSavePayload())} disabled={loading}>
        Save Attendance
      </Button>
    </div>
  );
};
