import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
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
import { Loader2, X, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useIsMobile } from '@/hooks/use-mobile';
import { Card, CardContent } from '@/components/ui/card';

interface WorkerOperation {
  id: string;
  productName: string;
  operationName: string;
  date: Date;
  piecesDone: number;
  ratePerPiece: number;
  totalEarning: number;
  poNumber: string;
  enteredBy?: string;
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
  const isMobile = useIsMobile();
  const [operations, setOperations] = useState<WorkerOperation[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [poNumberFilter, setPoNumberFilter] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);

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
      setShowFilters(false);
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

  const renderContent = () => (
    <div className="py-2">
      {/* Filters Toggle for Mobile */}
      {isMobile && (
        <Button
          variant="outline"
          size="sm"
          className="w-full mb-4 flex items-center justify-center gap-2"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter size={16} />
          {showFilters ? "Hide Filters" : "Show Filters"}
        </Button>
      )}

      {/* Filters */}
      <div className={`flex gap-4 mb-4 flex-wrap ${(isMobile && !showFilters) ? 'hidden' : 'flex'}`}>
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs font-medium mb-1 block text-muted-foreground uppercase tracking-wider">Month</label>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="h-9">
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
          <label className="text-xs font-medium mb-1 block text-muted-foreground uppercase tracking-wider">PO Number</label>
          <div className="relative">
            <Input
              placeholder="Search PO..."
              value={poNumberFilter}
              onChange={(e) => setPoNumberFilter(e.target.value)}
              className="h-9 pr-8"
            />
            {poNumberFilter && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-9 w-8 p-0"
                onClick={() => setPoNumberFilter("")}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center mb-4 p-3 bg-primary/5 rounded-lg border border-primary/10">
        <div>
          <p className="text-[10px] uppercase text-muted-foreground font-semibold">Operations</p>
          <p className="text-sm font-bold">{filteredOperations.length}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase text-muted-foreground font-semibold">Total Earnings</p>
          <p className="text-sm font-bold text-primary">₹{totalEarnings}</p>
        </div>
      </div>

      {isMobile ? (
        <div className="space-y-3 pb-8">
          {filteredOperations.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl">
              {operations.length === 0 ? "No history found" : "No results for filters"}
            </div>
          ) : (
            filteredOperations.map((op) => (
              <Card key={op.id} className="shadow-sm border-gray-100 overflow-hidden">
                <CardContent className="p-3">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-bold text-sm text-foreground">{op.productName}</h4>
                      <p className="text-[10px] text-muted-foreground font-medium">PO: {op.poNumber}</p>
                    </div>
                    <Badge variant="secondary" className="text-[10px] px-2 py-0 h-5 font-normal">
                      {format(new Date(op.date), 'dd/MM/yy')}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-end">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/20 leading-none py-0.5">
                          {op.operationName}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">• {op.piecesDone} pcs</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">Admin: {op.enteredBy || "—"}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-muted-foreground">₹{op.ratePerPiece} / pc</p>
                      <p className="text-sm font-bold text-primary">₹{op.totalEarning}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      ) : (
        <div className="rounded-md border max-h-[60vh] overflow-y-auto shadow-inner bg-gray-50/30">
          <Table>
            <TableHeader className="bg-white sticky top-0 z-20">
              <TableRow>
                <TableHead className="w-[150px]">Product</TableHead>
                <TableHead>Operation</TableHead>
                <TableHead>PO Number</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Pieces</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead className="text-right">Earning</TableHead>
                <TableHead>Entered By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOperations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    {operations.length === 0 ? "No operations found for this worker" : "No operations match the selected filters"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredOperations.map((op) => (
                  <TableRow key={op.id} className="bg-white hover:bg-gray-50/80 transition-colors">
                    <TableCell className="font-medium">{op.productName}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize text-[10px] font-normal">
                        {op.operationName}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-mono">{op.poNumber}</TableCell>
                    <TableCell className="text-xs">{format(new Date(op.date), 'dd/MM/yyyy')}</TableCell>
                    <TableCell className="text-right text-xs">{op.piecesDone}</TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">₹{op.ratePerPiece}</TableCell>
                    <TableCell className="text-right font-bold text-primary">₹{op.totalEarning}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{op.enteredBy || "—"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="text-left border-b pb-4">
            <DrawerTitle>Worker History</DrawerTitle>
            <DrawerDescription>
              Operations performed by {workerName}
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center items-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : renderContent()}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[850px] max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b bg-gray-50/50">
          <DialogTitle>Worker Operations History</DialogTitle>
          <DialogDescription>
            Viewing operations performed by {workerName}
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-2 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : renderContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
};
