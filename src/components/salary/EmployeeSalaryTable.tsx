import React, { useState, useMemo, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Calendar, Calendar as CalendarIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { EmployeeSalary } from "@/types/salary";
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { getEmployeeSalaries, markEmployeeSalariesPaid } from '@/Services/salaryService';
import { getEmployees } from "@/Services/salaryService";
import EditEmployeeSalaryDialog from "./EditEmployeeSalaryDialog";

export const EmployeeSalaryTable: React.FC = () => {
  const [year, setYear] = useState<string>(new Date().getFullYear().toString());
  const [month, setMonth] = useState<string>(new Date().getMonth().toString());
  const { toast } = useToast();
  const [salaries, setSalaries] = useState<EmployeeSalary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [employeesMap, setEmployeesMap] = useState<Record<string, any>>({});
  const [editOpen, setEditOpen] = useState(false);
  const [editingSalary, setEditingSalary] = useState<EmployeeSalary | null>(null);

  // show toast when load fails so user notices error
  useEffect(() => {
    if (error) {
      toast({ title: "Failed to load employee salaries", description: error, variant: "destructive" });
    }
  }, [error, toast]);

  const loadSalaries = async () => {
    setLoading(true);
    setError(null);
    try {
      // fetch salaries and employee base salary data concurrently
      const [rows, emps] = await Promise.all([getEmployeeSalaries(), getEmployees()]);
      setSalaries(rows);
      const map: Record<string, any> = {};
      (emps || []).forEach((e: any) => { if (e?.id) map[e.id] = e; });
      setEmployeesMap(map);
    } catch (err: any) {
      console.error(err);
      setError(err?.message ?? 'Failed to load employee salaries');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSalaries();
  }, []);

  const markAsPaid = async (id: string) => {
    try {
      const res = await markEmployeeSalariesPaid([id]);
      if (res?.error) {
        toast({ title: 'Update failed', description: res.error.message, variant: 'destructive' });
        return;
      }
      setSalaries(prev => prev.map(s => s.id === id ? { ...s, paid: true, paidDate: new Date() } : s));
      toast({ title: 'Success', description: 'Salary marked as paid.' });
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Error', description: err?.message ?? 'Failed to mark paid', variant: 'destructive' });
    }
  };

  const handleDeleteSalary = (id: string) => {
    // local remove; server delete can be added if needed
    setSalaries(prevSalaries => prevSalaries.filter(salary => salary.id !== id));
  };

  const applyUpdated = (updated: EmployeeSalary) => {
    setSalaries(prev => prev.map(s => s.id === updated.id ? { ...s, ...updated } : s));
    setEditOpen(false);
    setEditingSalary(null);
  };

  // show only salaries matching selected month/year (robust date handling)
  const filteredSalaries = useMemo(() => {
    const selectedMonth = Number(month);
    const selectedYear = Number(year);
    return (salaries || []).filter(s => {
      const raw = s.month;
      const d = raw instanceof Date ? raw : new Date(raw);
      if (isNaN(d.getTime())) return false; // ignore invalid dates
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
    });
  }, [salaries, month, year]);

  const months = [
    { value: '0', label: 'January' },
    { value: '1', label: 'February' },
    { value: '2', label: 'March' },
    { value: '3', label: 'April' },
    { value: '4', label: 'May' },
    { value: '5', label: 'June' },
    { value: '6', label: 'July' },
    { value: '7', label: 'August' },
    { value: '8', label: 'September' },
    { value: '9', label: 'October' },
    { value: '10', label: 'November' },
    { value: '11', label: 'December' },
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => (currentYear - 2 + i).toString());

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center justify-between rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          <div>Failed to load employee salaries — {error}</div>
          <div>
            <button onClick={loadSalaries} className="rounded bg-red-600 px-3 py-1 text-white text-xs hover:bg-red-700">
              Retry
            </button>
          </div>
        </div>
      )}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-4 w-4 opacity-50" />
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select month" />
            </SelectTrigger>
            <SelectContent>
              {months.map(m => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Select value={year} onValueChange={setYear}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Select year" />
          </SelectTrigger>
          <SelectContent>
            {years.map(y => (
              <SelectItem key={y} value={y}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Month</TableHead>
              <TableHead className="text-right">Base Salary (₹)</TableHead>
              <TableHead className="text-right">Advance (₹)</TableHead>
              <TableHead className="text-right">Net Salary (₹)</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Payment Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  Loading employee salaries...
                </TableCell>
              </TableRow>
            ) : filteredSalaries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  No salary records found
                </TableCell>
              </TableRow>
            ) : (
              filteredSalaries.map((salary) => (
                <TableRow key={salary.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{salary.employeeName }</span>
                      {salary.employeeName ? <span className="text-xs text-muted-foreground"></span> : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {format(salary.month, 'MMM yyyy')}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {/* Prefer base salary from employees table when present, fallback to row salary */}
                    ₹{(employeesMap[salary.employeeId]?.base_salary ?? salary.salary).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">₹{salary.advance.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-medium">₹{salary.netSalary.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant={salary.paid ? "success" : "outline"} className={salary.paid ? "bg-green-100 text-green-800" : ""}>
                      {salary.paid ? 'Paid' : 'Pending'}
                    </Badge>
                  </TableCell>
                  <TableCell>{salary.paidDate ? format(salary.paidDate, 'dd/MM/yyyy') : '-'}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {/* <DropdownMenuItem
                           onClick={() => openDetails(salary.employeeId)}
                           className="cursor-pointer"
                         >
                           View Details
                         </DropdownMenuItem> */}
                        {!salary.paid && (
                          <DropdownMenuItem
                            onClick={() => markAsPaid(salary.id)}
                            className="cursor-pointer"
                          >
                            Mark as Paid
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => {
                            setEditingSalary(salary);
                            setEditOpen(true);
                          }}
                          className="cursor-pointer"
                        >
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteSalary(salary.id)}
                          className="cursor-pointer text-destructive"
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <EditEmployeeSalaryDialog
        open={editOpen}
        onOpenChange={(v) => { setEditOpen(v); if (!v) setEditingSalary(null); }}
        salary={editingSalary}
        onUpdated={applyUpdated}
      />
    </div>
  );
}
