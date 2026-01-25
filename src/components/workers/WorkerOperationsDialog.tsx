import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';
import { getOperationsByWorkerId } from "@/Services/productionService";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

interface WorkerOperation {
  id: string;
  productName: string;
  operationName: string;
  date: Date;
  piecesDone: number;
  ratePerPiece: number;
  totalEarning: number;
  poNumber: string;
}

interface WorkerOperationsDialogProps {
  workerId: string;
  workerName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const WorkerOperationsDialog: React.FC<WorkerOperationsDialogProps> = ({
  workerId,
  workerName,
  open,
  onOpenChange,
}) => {
  const [operations, setOperations] = useState<WorkerOperation[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [poNumberFilter, setPoNumberFilter] = useState<string>("");

  useEffect(() => {
    const fetchOperations = async () => {
      if (!open || !workerId) return;

      try {
        setLoading(true);
        const data = await getOperationsByWorkerId(workerId);
        setOperations(data);
      } catch (error) {
        console.error("Failed to fetch worker operations", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOperations();
  }, [workerId, open]);

  // Reset filters when dialog closes
  useEffect(() => {
    if (!open) {
      setSelectedMonth("all");
      setPoNumberFilter("");
    }
  }, [open]);

  // Filter operations based on selected month and PO number
  const filteredOperations = useMemo(() => {
    return operations.filter((op) => {
      // Month filter
      if (selectedMonth !== "all") {
        const opDate = new Date(op.date);
        const opMonth = `${opDate.getFullYear()}-${String(opDate.getMonth() + 1).padStart(2, '0')}`;
        if (opMonth !== selectedMonth) return false;
      }

      // PO Number filter
      if (poNumberFilter.trim() !== "") {
        const filterLower = poNumberFilter.toLowerCase();
        if (!op.poNumber.toLowerCase().includes(filterLower)) return false;
      }

      return true;
    });
  }, [operations, selectedMonth, poNumberFilter]);

  // Get unique months from operations for the dropdown
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    operations.forEach((op) => {
      const opDate = new Date(op.date);
      const monthKey = `${opDate.getFullYear()}-${String(opDate.getMonth() + 1).padStart(2, '0')}`;
      months.add(monthKey);
    });
    return Array.from(months).sort().reverse();
  }, [operations]);

  // Calculate total earnings (based on filtered operations)
  const totalEarnings = filteredOperations.reduce((sum, op) => sum + op.totalEarning, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>Worker Operations History</DialogTitle>
          <DialogDescription>
            Viewing operations performed by {workerName}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <div className="py-4">
            {/* Filters */}
            <div className="flex gap-4 mb-4 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <label className="text-sm font-medium mb-1 block">Filter by Month</label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Months" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Months</SelectItem>
                    {availableMonths.map((month) => {
                      const [year, monthNum] = month.split('-');
                      const date = new Date(parseInt(year), parseInt(monthNum) - 1);
                      const monthName = date.toLocaleString('default', { month: 'long', year: 'numeric' });
                      return (
                        <SelectItem key={month} value={month}>
                          {monthName}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="text-sm font-medium mb-1 block">Filter by PO Number</label>
                <div className="relative">
                  <Input
                    placeholder="Search PO Number..."
                    value={poNumberFilter}
                    onChange={(e) => setPoNumberFilter(e.target.value)}
                  />
                  {poNumberFilter && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                      onClick={() => setPoNumberFilter("")}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center mb-4">
              <div>
                <p className="text-sm text-muted-foreground">
                  Showing: <span className="font-semibold">{filteredOperations.length}</span> of <span className="font-semibold">{operations.length}</span> operations
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm">
                  Total earnings: <span className="font-bold text-primary">₹{totalEarnings}</span>
                </p>
              </div>
            </div>

            <div className="rounded-md border max-h-[60vh] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Operation</TableHead>
                    <TableHead>PO Number</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Pieces</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">Earning</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOperations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                        {operations.length === 0 ? "No operations found for this worker" : "No operations match the selected filters"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOperations.map((op) => (
                      <TableRow key={op.id}>
                        <TableCell>{op.productName}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {op.operationName}
                          </Badge>
                        </TableCell>
                        <TableCell>{op.poNumber}</TableCell>
                        <TableCell>{format(new Date(op.date), 'dd/MM/yyyy')}</TableCell>
                        <TableCell className="text-right">{op.piecesDone}</TableCell>
                        <TableCell className="text-right">₹{op.ratePerPiece}</TableCell>
                        <TableCell className="text-right font-semibold">₹{op.totalEarning}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
