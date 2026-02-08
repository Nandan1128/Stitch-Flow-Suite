import React, { useState, useEffect } from 'react';
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
import { MoreHorizontal, Calendar, CalendarDays, Eye, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Card, CardContent } from "@/components/ui/card";
import { WorkerSalary, ProductionOperation } from "@/types/salary";
import { format } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { markWorkerSalariesPaid } from '@/Services/salaryService';
import { Production } from '@/types/production';

import WorkerOperationDetailDialog, { OperationDetail } from "@/components/salary/WorkerOperationDetailDialog";
import { getWorkerOperations } from "@/Services/salaryService";
import { AddWorkerAdvanceDialog } from "./AddWorkerAdvanceDialog";
// Rely on DB-backed `salaries` and optional `workerName` provided on each salary row

interface WorkerSalaryTableProps {
  salaries: WorkerSalary[];
  setSalaries: React.Dispatch<React.SetStateAction<WorkerSalary[]>>;
  productions?: Production[];
}


export const WorkerSalaryTable: React.FC<WorkerSalaryTableProps> = ({
  salaries,
  setSalaries,
  productions = []
}) => {
  const [month, setMonth] = useState<string>(new Date().getMonth().toString());
  const [year, setYear] = useState<string>(new Date().getFullYear().toString());
  const [aggregatedSalaries, setAggregatedSalaries] = useState<any[]>([]);
  const isMobile = useIsMobile();
  const [advanceOpen, setAdvanceOpen] = useState(false);
  const [advanceWorkerId, setAdvanceWorkerId] = useState<string>("");

  useEffect(() => {
    console.log("Debug salaries:", salaries);
  }, [salaries]);

  // No automatic/mock salary generation here — rely on DB-backed `salaries` prop

  // Calculate aggregated salaries by worker when month, year, or salaries change
  useEffect(() => {
    const selectedMonth = parseInt(month);
    const selectedYear = parseInt(year);

    // Filter salaries for selected month and year
    const filteredSalaries = salaries.filter(salary => {
      const salaryDate = new Date(salary.date);
      return (
        salaryDate.getMonth() === selectedMonth &&
        salaryDate.getFullYear() === selectedYear
      );
    });

    // Aggregate by worker
    const workerSalaryMap = new Map();

    filteredSalaries.forEach(salary => {
      if (!workerSalaryMap.has(salary.workerId)) {
        workerSalaryMap.set(salary.workerId, {
          workerId: salary.workerId,
          workerName: salary.workerName || 'Unknown Worker',
          totalPieces: 0,
          totalAmount: 0, // This will be Net Amount (Earnings - Advance)
          totalAdvance: 0,
          operations: [],
          paid: true
        });
      }

      const workerData = workerSalaryMap.get(salary.workerId);
      workerData.totalPieces += salary.piecesDone;
      // If amount is negative, it's an advance
      if (salary.totalAmount < 0) {
        workerData.totalAdvance += Math.abs(salary.totalAmount);
        workerData.totalAmount += salary.totalAmount; // Net decreases
      } else {
        workerData.totalAmount += salary.totalAmount; // Earnings add to net
      }
      workerData.paid = workerData.paid && salary.paid;

      const prodName = productions.find(p => p.id === salary.productId)?.productName || 'Unknown Product';
      const opName = salary.operationName || 'Unknown Operation';

      workerData.operations.push({
        productId: salary.productId,
        productName: prodName,
        operationId: salary.operationId,
        operationName: opName,
        piecesDone: salary.piecesDone,
        amount: salary.totalAmount
      });
    });

    setAggregatedSalaries(Array.from(workerSalaryMap.values()));
  }, [month, year, salaries, productions]);

  const { toast } = useToast();
  const { user } = useAuth();

  const markAsPaid = async (workerId: string) => {
    try {
      const selectedMonth = parseInt(month);
      const selectedYear = parseInt(year);

      // UUID checker
      const isUuid = (v: string) =>
        /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(v);

      // FIRST define idsToMark (your error was using it BEFORE this line)
      const idsToMark = salaries
        .filter((s) => s.workerId === workerId)
        .filter((s) => {
          const d = new Date(s.date);
          return (
            d.getMonth() === selectedMonth &&
            d.getFullYear() === selectedYear &&
            !s.paid
          );
        })
        .map((s) => s.id);

      console.log("DEBUG → idsToMark:", idsToMark);

      if (idsToMark.length === 0) {
        toast({
          title: "Nothing to mark",
          description: "No unpaid salaries found for this worker.",
        });
        return;
      }

      const validIds = idsToMark.filter((id) => isUuid(id));

      console.log("DEBUG → validIds:", validIds);

      if (validIds.length === 0) {
        toast({
          title: "UUID Error",
          description: "No valid salary UUIDs found.",
          variant: "destructive",
        });
        return;
      }

      const result = await markWorkerSalariesPaid(validIds);

      if (result.error) {
        toast({
          title: "Update Failed",
          description: result.error.message,
          variant: "destructive",
        });
        return;
      }

      // Update UI
      setSalaries((prev) =>
        prev.map((s) =>
          validIds.includes(s.id)
            ? { ...s, paid: true, paidDate: new Date() }
            : s
        )
      );

      toast({
        title: "Success",
        description: `${validIds.length} salary records marked as paid.`,
      });
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Error",
        description: err.message || "Something went wrong",
        variant: "destructive",
      });
    }
  };


  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailOperations, setDetailOperations] = useState<OperationDetail[]>([]);
  const [detailWorkerName, setDetailWorkerName] = useState<string | undefined>();

  const openDetails = async (employeeId: string) => {
    setDetailError(null);
    setDetailOperations([]);
    setDetailLoading(true);

    try {
      // pass currently selected month/year to fetch scoped operations
      const monthNum = Number(month);
      const yearNum = Number(year);
      const ops = await getWorkerOperations(employeeId, monthNum, yearNum);
      setDetailOperations(ops);
      setDetailWorkerName(employeeId);
      setDetailOpen(true);
    } catch (err: any) {
      console.error("Failed to load operations:", err);
      setDetailError(err?.message ?? "Failed to load operations");
      // show dialog even on error so user sees message (optional)
      setDetailWorkerName(employeeId);
      setDetailOpen(true);
    } finally {
      setDetailLoading(false);
    }
  };
  const handleDeleteSalary = (workerId: string) => {
    setSalaries(prevSalaries => prevSalaries.filter(salary => salary.workerId !== workerId));
  };

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
      <div className={`flex ${isMobile ? "flex-col" : "items-center"} gap-2`}>
        <div className={`flex items-center gap-2 ${isMobile ? "w-full" : ""}`}>
          <CalendarDays className="h-4 w-4 opacity-50 flex-shrink-0" />
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className={`${isMobile ? "w-full" : "w-[150px]"}`}>
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
          <SelectTrigger className={`${isMobile ? "w-full" : "w-[100px]"}`}>
            <SelectValue placeholder="Select year" />
          </SelectTrigger>
          <SelectContent>
            {years.map(y => (
              <SelectItem key={y} value={y}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isMobile ? (
        <div className="space-y-4">
          {aggregatedSalaries.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground border rounded-lg bg-muted/20">
              No salary records found for the selected period
            </div>
          ) : (
            aggregatedSalaries.map((workerSalary) => (
              <Card key={workerSalary.workerId} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <User size={20} />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg leading-none">{workerSalary.workerName}</h3>
                        <div className="flex items-center mt-1">
                          <Badge variant={workerSalary.paid ? "success" : "outline"} className={workerSalary.paid ? "bg-green-100 text-green-800 h-5" : "h-5"}>
                            {workerSalary.paid ? 'Paid' : 'Pending'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="-mr-2 -mt-2">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => openDetails(workerSalary.workerId)}>
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          setAdvanceWorkerId(workerSalary.workerId);
                          setAdvanceOpen(true);
                        }}>
                          Add Advance
                        </DropdownMenuItem>
                        {(!workerSalary.paid && user?.role === 'admin') && (
                          <DropdownMenuItem onClick={() => markAsPaid(workerSalary.workerId)}>
                            Mark as Paid
                          </DropdownMenuItem>
                        )}
                        {user?.role === 'admin' && (
                          <DropdownMenuItem onClick={() => handleDeleteSalary(workerSalary.workerId)} className="text-destructive">
                            Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="grid grid-cols-2 gap-y-3 text-sm">
                    <div className="flex flex-col">
                      <span className="text-muted-foreground text-xs uppercase font-semibold">Pieces</span>
                      <span className="font-medium">{workerSalary.totalPieces}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-muted-foreground text-xs uppercase font-semibold">Advance</span>
                      <span className="font-medium text-red-600">
                        {workerSalary.totalAdvance > 0 ? `₹${workerSalary.totalAdvance}` : '-'}
                      </span>
                    </div>
                    <div className="flex flex-col col-span-2 border-t pt-2 mt-1">
                      <span className="text-muted-foreground text-xs uppercase font-semibold">Net Amount</span>
                      <span className="text-lg font-bold text-primary">₹{workerSalary.totalAmount}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4">
                    <Button
                      variant="outline"
                      className="flex-1 text-xs h-8"
                      onClick={() => openDetails(workerSalary.workerId)}
                    >
                      <Eye className="h-3 w-3 mr-1.5" />
                      View Details
                    </Button>
                    {(!workerSalary.paid && user?.role === 'admin') && (
                      <Button
                        variant="default"
                        className="flex-1 text-xs h-8 bg-green-600 hover:bg-green-700"
                        onClick={() => markAsPaid(workerSalary.workerId)}
                      >
                        Mark Paid
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Worker</TableHead>
                <TableHead className={`${isMobile ? "" : "text-right"}`}>Pieces</TableHead>
                <TableHead className="text-right">Advance (₹)</TableHead>
                <TableHead className="text-right">Net Amount (₹)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {aggregatedSalaries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No salary records found for the selected period
                  </TableCell>
                </TableRow>
              ) : (
                aggregatedSalaries.map((workerSalary) => (
                  <TableRow key={workerSalary.workerId}>
                    <TableCell className="font-medium">{workerSalary.workerName}</TableCell>
                    <TableCell className={`${isMobile ? "" : "text-right"}`}>{workerSalary.totalPieces}</TableCell>
                    <TableCell className="text-right text-red-600">
                      {workerSalary.totalAdvance > 0 ? `₹${workerSalary.totalAdvance}` : '-'}
                    </TableCell>
                    <TableCell className="text-right font-medium">₹{workerSalary.totalAmount}</TableCell>
                    <TableCell>
                      <Badge variant={workerSalary.paid ? "success" : "outline"} className={workerSalary.paid ? "bg-green-100 text-green-800" : ""}>
                        {workerSalary.paid ? 'Paid' : 'Pending'}
                      </Badge>
                    </TableCell>
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
                          <DropdownMenuItem
                            onClick={() => openDetails(workerSalary.workerId)}
                            className="cursor-pointer"
                          >
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setAdvanceWorkerId(workerSalary.workerId);
                              setAdvanceOpen(true);
                            }}
                            className="cursor-pointer"
                          >
                            Add Advance
                          </DropdownMenuItem>
                          {(!workerSalary.paid && user?.role === 'admin') && (
                            <DropdownMenuItem
                              onClick={() => markAsPaid(workerSalary.workerId)}
                              className="cursor-pointer"
                            >
                              Mark as Paid
                            </DropdownMenuItem>
                          )}
                          {user?.role === 'admin' && (
                            <DropdownMenuItem
                              onClick={() => handleDeleteSalary(workerSalary.workerId)}
                              className="cursor-pointer text-destructive"
                            >
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
      <WorkerOperationDetailDialog
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        operations={detailOperations}
        workerName={detailWorkerName}
        onUpdate={() => detailWorkerName && openDetails(detailWorkerName)}
      />

      <AddWorkerAdvanceDialog
        open={advanceOpen}
        onOpenChange={setAdvanceOpen}
        workerId={advanceWorkerId}
        onSaved={(newRecord) => {
          if (newRecord) {
            const mapped: WorkerSalary = {
              id: newRecord.id,
              workerId: newRecord.worker_id,
              workerName: aggregatedSalaries.find(s => s.workerId === newRecord.worker_id)?.workerName,
              productId: "",
              date: newRecord.date,
              operationId: "",
              piecesDone: newRecord.pieces_done || 0,
              amountPerPiece: 0,
              totalAmount: newRecord.total_amount,
              paid: false
            };
            setSalaries(prev => [...prev, mapped]);
          }
        }}
      />
    </div>
  );
};
