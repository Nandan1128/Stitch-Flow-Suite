// src/components/production/ProductionOperationsDialog.tsx
import React, { useEffect, useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useIsMobile } from "@/hooks/use-mobile";
import { Worker } from "@/types/worker";
import { Production } from "@/types/production";
import { getOperationsByProductionId, assignWorkerToOperation, insertProductionOperation } from "@/Services/productionService";
import { getOperationsByProduct } from "@/Services/operationService";
import { getWorkers } from "@/Services/workerService";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { addWorkerSalary, updateWorkerSalaryByOps, deleteWorkerSalary } from "@/Services/salaryService";
import { deleteProductionOperation, checkAndUpdateProductionStatus } from "@/Services/productionService";
import { useQueryClient } from "@tanstack/react-query";
import { formatCurrency } from "@/lib/formatCurrency";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MoreVertical, Pencil, Trash2, Plus, X, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";


interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  production: Production | null;
  availableWorkers: Worker[];
  onAssignWorker?: (productionId: string, operationRecordId: string, workerId: string, pieces: number) => void;
}

const ProductionOperationsDialog: React.FC<Props> = ({ open, onOpenChange, production, availableWorkers, onAssignWorker }) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [ops, setOps] = useState<any[]>([]);
  const [opMasters, setOpMasters] = useState<any[]>([]);
  const [fetchedWorkers, setFetchedWorkers] = useState<any[]>([]);
  const [selectedOpId, setSelectedOpId] = useState<string | null>(null);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
  const [pieces, setPieces] = useState<number>(0);
  const [editingOperation, setEditingOperation] = useState<any | null>(null);
  const [deletingOperationId, setDeletingOperationId] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState("single");
  const [bulkWorkerId, setBulkWorkerId] = useState<string | null>(null);
  const [bulkOps, setBulkOps] = useState<{ id: string; masterOpId: string | null; pieces: number }[]>([
    { id: "init-1", masterOpId: null, pieces: 0 }
  ]);

  // ── Computed: total_quantity for this production ──────────────────────────
  const productionLimit = useMemo(() => {
    return (production as any)?.total_quantity || 0;
  }, [production]);

  // ── Computed: per-operation already-recorded totals (excl. editing row) ──
  const operationTotalsMap = useMemo(() => {
    const map: Record<string, number> = {};
    ops.forEach(op => {
      const opId = op.operation_id;
      if (!opId) return;
      // When editing, exclude the row being edited from the total so we don't double-count
      if (editingOperation && op.id === editingOperation.id) return;
      map[opId] = (map[opId] || 0) + (Number(op.pieces_done) || 0);
    });
    return map;
  }, [ops, editingOperation]);

  // ── Computed: remaining pieces per operation master ───────────────────────
  const remainingForOperation = (masterOpId: string, excludeRowId?: string): number => {
    let already = 0;
    ops.forEach(op => {
      if (op.operation_id !== masterOpId) return;
      if (excludeRowId && op.id === excludeRowId) return;
      already += Number(op.pieces_done) || 0;
    });
    return Math.max(0, productionLimit - already);
  };

  // ── Computed: is a master operation fully done? ───────────────────────────
  const isOperationComplete = (masterOpId: string) => {
    return remainingForOperation(masterOpId) <= 0;
  };

  // ── Current operation remaining (Single Entry) ────────────────────────────
  const currentOperationTotal = useMemo(() => {
    let operationId: string | null = null;
    if (selectedOpId && selectedOpId.startsWith("master:")) {
      operationId = selectedOpId.split(":")[1];
    } else if (editingOperation) {
      operationId = editingOperation.operation_id;
    }
    if (!operationId) return 0;
    return operationTotalsMap[operationId] || 0;
  }, [operationTotalsMap, selectedOpId, editingOperation]);

  const currentRemaining = Math.max(0, productionLimit - currentOperationTotal);

  // ── Single Entry: live piece-count validity ───────────────────────────────
  const piecesOverLimit = pieces > 0 && pieces > currentRemaining;
  const piecesValid = pieces > 0 && !piecesOverLimit;

  // ── Bulk Entry helpers ────────────────────────────────────────────────────
  const handleBulkAddRow = () => {
    setBulkOps([...bulkOps, { id: crypto.randomUUID(), masterOpId: null, pieces: 0 }]);
  };

  const handleBulkRemoveRow = (id: string) => {
    if (bulkOps.length > 1) {
      setBulkOps(bulkOps.filter(r => r.id !== id));
    }
  };

  const handleBulkUpdateRow = (id: string, field: 'masterOpId' | 'pieces', value: any) => {
    setBulkOps(bulkOps.map(r => {
      if (r.id !== id) return r;
      const updated = { ...r, [field]: value };
      // When operation changes, auto-reset pieces to 0
      if (field === 'masterOpId') updated.pieces = 0;
      return updated;
    }));
  };

  // Per bulk-row remaining (accounts for sibling rows selecting the same op)
  const bulkRowRemaining = (rowId: string, masterOpId: string | null): number => {
    if (!masterOpId) return productionLimit;
    // Pieces already in DB for this op
    const dbTotal = (operationTotalsMap[masterOpId] || 0);
    // Pieces in OTHER bulk rows for the same operation
    const siblingTotal = bulkOps
      .filter(r => r.id !== rowId && r.masterOpId === masterOpId)
      .reduce((s, r) => s + (Number(r.pieces) || 0), 0);
    return Math.max(0, productionLimit - dbTotal - siblingTotal);
  };

  // Bulk validation summary
  const bulkValidationErrors = useMemo(() => {
    const errors: string[] = [];
    bulkOps.forEach((row, i) => {
      if (!row.masterOpId || row.pieces <= 0) return;
      const rem = bulkRowRemaining(row.id, row.masterOpId);
      if (row.pieces > rem + row.pieces) { // rem already subtracts siblings
        const master = opMasters.find(m => m.id === row.masterOpId);
        errors.push(`Row ${i + 1} (${master?.name || 'op'}): ${row.pieces} exceeds remaining ${rem}`);
      }
    });
    return errors;
  }, [bulkOps, opMasters, operationTotalsMap]);

  const handleBulkSubmit = async () => {
    if (!production || !bulkWorkerId) {
      toast({ title: "Validation Error", description: "Please select a worker.", variant: "destructive" });
      return;
    }

    const validRows = bulkOps.filter(r => r.masterOpId && r.pieces > 0);
    if (validRows.length === 0) {
      toast({ title: "Validation Error", description: "Please add at least one valid operation with quantity.", variant: "destructive" });
      return;
    }

    // Per-row limit validation
    const limitErrors: string[] = [];
    validRows.forEach((row, i) => {
      const rem = bulkRowRemaining(row.id, row.masterOpId!);
      if (row.pieces > rem) {
        const master = opMasters.find(m => m.id === row.masterOpId);
        limitErrors.push(`"${master?.name || `Row ${i + 1}`}": you entered ${row.pieces} but only ${rem} remaining.`);
      }
    });

    if (limitErrors.length > 0) {
      toast({
        title: "Quantity Limit Exceeded",
        description: limitErrors.join(" | "),
        variant: "destructive"
      });
      return;
    }

    try {
      const workerList = (availableWorkers && availableWorkers.length > 0) ? availableWorkers : fetchedWorkers;
      const worker = workerList.find((w: any) => w.id === bulkWorkerId);
      const workerName = worker ? worker.name : null;
      const enteredBy = user?.name ?? user?.email ?? user?.id ?? "system";
      const dateStr = new Date().toISOString().split("T")[0];
      const dateTimeStr = new Date().toISOString();

      let successCount = 0;

      for (const row of validRows) {
        const master = opMasters.find(m => m.id === row.masterOpId);
        if (!master) continue;

        const amountPerPiece = master.amount_per_piece || 0;
        const totalAmount = row.pieces * amountPerPiece;

        const payload = {
          operation_id: row.masterOpId,
          worker_id: bulkWorkerId,
          worker_name: workerName || null,
          pieces_done: row.pieces,
          earnings: totalAmount,
          date: dateStr,
          supervisor_employee_id: null,
          production_id: production.id,
          created_at: dateTimeStr,
          entered_by: enteredBy,
        };

        await insertProductionOperation(payload);

        try {
          const salaryResult = await addWorkerSalary({
            worker_id: bulkWorkerId,
            product_id: (production as any).product_id ?? null,
            operation_id: row.masterOpId,
            pieces_done: row.pieces,
            amount_per_piece: amountPerPiece,
            total_amount: totalAmount,
            date: dateStr,
            created_by: enteredBy,
          });
          if (salaryResult?.error) {
            console.error("Salary creation failed:", salaryResult.error);
            toast({
              title: "Warning",
              description: `Salary record creation failed for ${workerName || 'worker'}: ${salaryResult.error.message}`,
              variant: "destructive"
            });
          }
        } catch (salErr: any) {
          console.error("Salary sync exception for bulk row:", salErr);
          toast({
            title: "Warning",
            description: `Salary record creation failed: ${salErr.message || 'Unknown error'}`,
            variant: "destructive"
          });
        }

        successCount++;
      }

      toast({ title: "Success", description: `Added ${successCount} operations successfully.` });

      const refreshed = await getOperationsByProductionId(production.id);
      setOps(refreshed || []);
      await checkAndUpdateProductionStatus(production.id);

      setBulkOps([{ id: crypto.randomUUID(), masterOpId: null, pieces: 0 }]);
      setBulkWorkerId(null);

    } catch (err: any) {
      console.error(err);
      toast({ title: "Error", description: "Failed to save bulk operations.", variant: "destructive" });
    }
  };

  useEffect(() => {
    if (!production) {
      setOps([]);
      setOpMasters([]);
      return;
    }
    (async () => {
      try {
        const data = await getOperationsByProductionId(production.id);
        setOps(data || []);
        const prodId = (production as any).productId ?? (production as any).product_id;
        if (prodId) {
          const masters = await getOperationsByProduct(prodId);
          setOpMasters(masters || []);
        } else {
          setOpMasters([]);
        }
        const workers = await getWorkers();
        setFetchedWorkers(workers || []);
      } catch (err) {
        console.error(err);
        toast({ title: "Error", description: "Failed to load operations", variant: "destructive" });
      }
    })();
  }, [production]);

  const handleAdd = async () => {
    if (!production) {
      toast({ title: "Production missing", variant: "destructive" });
      return;
    }

    try {
      const requestedPieces = Number(pieces) || 0;

      let operationId: string | null = null;
      if (selectedOpId && selectedOpId.startsWith("master:")) {
        operationId = selectedOpId.split(":")[1];
      } else if (editingOperation) {
        operationId = editingOperation.operation_id;
      }

      // ── Limit guard ───────────────────────────────────────────────────────
      if (requestedPieces <= 0) {
        toast({ title: "Invalid Quantity", description: "Please enter at least 1 piece.", variant: "destructive" });
        return;
      }

      const alreadyForOp = operationId ? (operationTotalsMap[operationId] || 0) : 0;
      const newTotal = alreadyForOp + requestedPieces;

      if (newTotal > productionLimit) {
        const remaining = Math.max(0, productionLimit - alreadyForOp);
        toast({
          title: "Quantity Limit Exceeded",
          description: `Only ${remaining} piece${remaining !== 1 ? 's' : ''} remaining for this operation (limit: ${productionLimit}).`,
          variant: "destructive"
        });
        return;
      }
      // ─────────────────────────────────────────────────────────────────────

      if (!editingOperation && selectedOpId && selectedOpId.startsWith("master:")) {
        const masterId = selectedOpId.split(":")[1];
        const master = opMasters.find(m => m.id === masterId);
        const workerList = (availableWorkers && availableWorkers.length > 0) ? availableWorkers : fetchedWorkers;
        const worker = workerList.find((w: any) => w.id === selectedWorkerId);
        const workerName = worker ? worker.name : null;

        const payload = {
          operation_id: masterId,
          worker_id: selectedWorkerId || null,
          worker_name: workerName || null,
          pieces_done: pieces || 0,
          earnings: master?.amount_per_piece ? (pieces || 0) * (master.amount_per_piece || 0) : 0,
          date: new Date().toISOString().split("T")[0],
          supervisor_employee_id: null,
          production_id: production.id,
          created_at: new Date().toISOString(),
          entered_by: user?.name ?? user?.email ?? user?.id ?? "system",
        };

        await insertProductionOperation(payload);
        toast({ title: "Added", description: "Operation record created" });

        try {
          if (selectedWorkerId && Number(pieces) > 0) {
            const amountPerPiece = master?.amount_per_piece ?? master?.rate ?? 0;
            const total = (Number(pieces) || 0) * Number(amountPerPiece || 0);
            const salaryResult = await addWorkerSalary({
              worker_id: selectedWorkerId,
              product_id: (production as any).product_id ?? null,
              operation_id: masterId,
              pieces_done: Number(pieces || 0),
              amount_per_piece: Number(amountPerPiece || 0),
              total_amount: total,
              date: payload.date,
              created_by: payload.entered_by,
            });
            if (salaryResult?.error) {
              console.error("Salary creation failed:", salaryResult.error);
              toast({
                title: "Warning",
                description: `Production record created but salary record failed: ${salaryResult.error.message}`,
                variant: "destructive"
              });
            }
          }
        } catch (err: any) {
          console.error("Salary sync failed:", err);
          toast({
            title: "Warning",
            description: `Production record created but salary record failed: ${err.message || 'Unknown error'}`,
            variant: "destructive"
          });
        }

        const refreshed = await getOperationsByProductionId(production.id);
        setOps(refreshed || []);

        const statusChanged = await checkAndUpdateProductionStatus(production.id);
        if (statusChanged) {
          toast({
            title: "Production Completed!",
            description: "All operations have been finished for this production.",
            className: "bg-green-100 border-green-200 text-green-800"
          });
        }

        setSelectedOpId(null);
        setSelectedWorkerId(null);
        setPieces(0);
        setEditingOperation(null);
        return;
      }

      const targetOpId = editingOperation ? editingOperation.id : selectedOpId;

      if (!targetOpId) {
        toast({ title: "Select operation", variant: "destructive" });
        return;
      }

      const workerList = (availableWorkers && availableWorkers.length > 0) ? availableWorkers : fetchedWorkers;
      const worker = workerList.find((w: any) => w.id === selectedWorkerId);
      const workerName = worker ? worker.name : null;
      const enteredBy = user?.name ?? user?.email ?? user?.id ?? "system";

      const opBefore = ops.find(o => o.id === targetOpId);
      const amountPerPiece = opBefore?.operations?.amount_per_piece ?? opBefore?.rate_per_piece ?? opBefore?.rate ?? 0;
      const earningsValue = (Number(pieces) || 0) * Number(amountPerPiece || 0);

      await assignWorkerToOperation(production.id, targetOpId, selectedWorkerId || null, pieces || 0, workerName || null, enteredBy, earningsValue);
      toast({ title: "Saved", description: "Operation updated" });

      try {
        const opBefore2 = ops.find(o => o.id === targetOpId);
        const amountPerPiece2 = opBefore2?.operations?.amount_per_piece ?? opBefore2?.rate_per_piece ?? opBefore2?.rate ?? 0;
        const total = (Number(pieces) || 0) * Number(amountPerPiece2 || 0);

        const oldWorkerId = opBefore?.worker_id;
        const oldDate = opBefore?.date;
        const masterOpId = opBefore?.operation_id;

        if (masterOpId && oldDate && selectedWorkerId) {
          if (oldWorkerId && oldWorkerId !== selectedWorkerId) {
            await deleteWorkerSalary(oldWorkerId, masterOpId, oldDate);
            if (Number(pieces) > 0) {
              const salaryResult = await addWorkerSalary({
                worker_id: selectedWorkerId,
                product_id: (production as any).product_id ?? null,
                operation_id: masterOpId,
                pieces_done: Number(pieces || 0),
                amount_per_piece: Number(amountPerPiece || 0),
                total_amount: total,
                date: new Date().toISOString(),
                created_by: enteredBy,
              });
              if (salaryResult?.error) {
                console.error("Salary creation failed:", salaryResult.error);
                toast({
                  title: "Warning",
                  description: `Production updated but salary record creation failed: ${salaryResult.error.message}`,
                  variant: "destructive"
                });
              }
            }
          } else if (oldWorkerId) {
            await updateWorkerSalaryByOps(oldWorkerId, masterOpId, oldDate, {
              pieces_done: Number(pieces),
              total_amount: total
            });
          } else if (Number(pieces) > 0) {
            const salaryResult = await addWorkerSalary({
              worker_id: selectedWorkerId,
              product_id: (production as any).product_id ?? null,
              operation_id: masterOpId,
              pieces_done: Number(pieces || 0),
              amount_per_piece: Number(amountPerPiece || 0),
              total_amount: total,
              date: new Date().toISOString(),
              created_by: enteredBy,
            });
            if (salaryResult?.error) {
              console.error("Salary creation failed:", salaryResult.error);
              toast({
                title: "Warning",
                description: `Production updated but salary record creation failed: ${salaryResult.error.message}`,
                variant: "destructive"
              });
            }
          }
        }
      } catch (err: any) {
        console.error("Salary sync failed:", err);
        toast({
          title: "Warning",
          description: `Production updated but salary sync failed: ${err.message || 'Unknown error'}`,
          variant: "destructive"
        });
      }

      const refreshed = await getOperationsByProductionId(production.id);
      setOps(refreshed || []);
      queryClient.invalidateQueries({ queryKey: ["operation-report"] });

      onAssignWorker && onAssignWorker(production.id, targetOpId, selectedWorkerId || "", pieces || 0);
      await checkAndUpdateProductionStatus(production.id);

      setSelectedOpId(null);
      setSelectedWorkerId(null);
      setPieces(0);
      setEditingOperation(null);

    } catch (err: any) {
      console.error(err);
      toast({ title: "Error", description: err?.message || "Failed to assign", variant: "destructive" });
    }
  };

  const startEdit = (op: any) => {
    setEditingOperation(op);
    setSelectedWorkerId(op.worker_id || null);
    setPieces(op.pieces_done || 0);
    setSelectedOpId(null);
  };

  const confirmDelete = async () => {
    if (!deletingOperationId) return;
    try {
      await deleteProductionOperation(deletingOperationId);
      const opToDelete = ops.find(o => o.id === deletingOperationId);
      if (opToDelete && opToDelete.worker_id && opToDelete.operation_id && opToDelete.date) {
        try {
          await deleteWorkerSalary(opToDelete.worker_id, opToDelete.operation_id, opToDelete.date);
        } catch (salErr) {
          console.warn("Salary deletion failed", salErr);
        }
      }
      toast({ title: "Deleted", description: "Record removed" });
      const refreshed = await getOperationsByProductionId(production!.id);
      setOps(refreshed || []);
      queryClient.invalidateQueries({ queryKey: ["productions"] });
      queryClient.invalidateQueries({ queryKey: ["operation-report"] });
    } catch (err: any) {
      toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
    } finally {
      setDeletingOperationId(null);
    }
  };

  if (!production) return null;

  // ── Operation Progress Summary (per master operation) ─────────────────────
  const renderOperationProgressSummary = () => {
    if (opMasters.length === 0) return null;
    return (
      <div className="mt-4 rounded-lg border bg-muted/30 p-3 space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Operation Progress</p>
        <div className="space-y-1.5">
          {opMasters.map(m => {
            const done = operationTotalsMap[m.id] || 0;
            const pct = productionLimit > 0 ? Math.min(100, Math.round((done / productionLimit) * 100)) : 0;
            const complete = done >= productionLimit;
            return (
              <div key={m.id} className="space-y-0.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-medium flex items-center gap-1">
                    {complete && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                    {m.name}
                  </span>
                  <span className={complete ? "text-green-600 font-semibold" : "text-muted-foreground"}>
                    {done} / {productionLimit} pcs {complete && "✓"}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${complete ? "bg-green-500" : "bg-primary"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderContent = () => (
    <div className="space-y-4 py-2">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="single">Single Entry</TabsTrigger>
          <TabsTrigger value="bulk">Bulk Entry</TabsTrigger>
        </TabsList>

        {/* ── SINGLE ENTRY TAB ── */}
        <TabsContent value="single" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{editingOperation ? "Updating Operation" : "Select Operation"}</Label>
              {editingOperation ? (
                <div className="h-9 flex items-center px-3 border rounded-md bg-muted text-sm font-medium">
                  {editingOperation.operations?.name ?? "Unknown Operation"}
                </div>
              ) : (
                <Select value={selectedOpId ?? ""} onValueChange={(v) => { setSelectedOpId(v || null); setPieces(0); }}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Choose operation" />
                  </SelectTrigger>
                  <SelectContent>
                    {opMasters.map(m => {
                      const complete = isOperationComplete(m.id);
                      return (
                        <SelectItem
                          key={`master-${m.id}`}
                          value={`master:${m.id}`}
                          disabled={complete}
                        >
                          <span className="flex items-center gap-2">
                            {complete && <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />}
                            {m.name} — ₹{formatCurrency(m.amount_per_piece)}
                            {complete && <span className="text-green-600 text-xs">(Complete)</span>}
                            {!complete && (
                              <span className="text-muted-foreground text-xs ml-1">
                                ({remainingForOperation(m.id)} left)
                              </span>
                            )}
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label>Worker</Label>
              <Select value={selectedWorkerId ?? ""} onValueChange={(v) => setSelectedWorkerId(v === "__none" ? null : (v || null))}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select worker" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">None</SelectItem>
                  {[...(availableWorkers && availableWorkers.length > 0 ? availableWorkers : fetchedWorkers)]
                    .sort((a: any, b: any) => (a.name || "").localeCompare(b.name || ""))
                    .map((w: any) => (
                      <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Pieces input with limit info */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Quantity (pieces)</Label>
              {(selectedOpId || editingOperation) && (
                <span className={`text-xs font-medium ${currentRemaining === 0 ? "text-destructive" : "text-muted-foreground"}`}>
                  Max: {currentRemaining} pcs remaining
                </span>
              )}
            </div>
            <Input
              type="number"
              value={pieces || ''}
              min={1}
              max={currentRemaining > 0 ? currentRemaining : undefined}
              onChange={(e) => {
                const val = Number(e.target.value);
                setPieces(val);
              }}
              placeholder={currentRemaining > 0 ? `Max ${currentRemaining}` : "Select operation first"}
              className={`h-9 ${piecesOverLimit ? "border-destructive focus-visible:ring-destructive" : ""}`}
              disabled={currentRemaining === 0 && !editingOperation && !!(selectedOpId)}
            />
            {piecesOverLimit && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Exceeds limit by {pieces - currentRemaining} piece{pieces - currentRemaining !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          {/* Info panel */}
          <div className="bg-primary/5 border border-primary/10 rounded-lg p-3 text-xs space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Production Limit:</span>
              <span className="font-bold">{productionLimit} pcs</span>
            </div>
            {(selectedOpId || editingOperation) && (
              <>
                <div className="flex justify-between items-center pt-1 mt-1 border-t border-primary/10">
                  <span className="text-muted-foreground">Already recorded:</span>
                  <span className="font-medium">{currentOperationTotal} pcs</span>
                </div>
                <div className={`flex justify-between items-center font-medium ${currentRemaining === 0 ? "text-green-600" : "text-primary"}`}>
                  <span>Remaining:</span>
                  <span>{currentRemaining === 0 ? "✓ Complete" : `${currentRemaining} pcs`}</span>
                </div>
                {pieces > 0 && !piecesOverLimit && (
                  <div className="flex justify-between items-center text-muted-foreground pt-1 mt-1 border-t border-primary/10">
                    <span>After this entry:</span>
                    <span>{currentOperationTotal + pieces} / {productionLimit} pcs</span>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t sticky bottom-0 bg-background pt-4">
            <Button
              onClick={handleAdd}
              className="flex-1"
              disabled={piecesOverLimit || (pieces <= 0 && !editingOperation)}
            >
              {editingOperation ? "Update Record" : "Add Record"}
            </Button>
            {editingOperation && (
              <Button variant="outline" onClick={() => { setEditingOperation(null); setPieces(0); setSelectedWorkerId(null); }} className="flex-1">
                Cancel
              </Button>
            )}
          </div>
        </TabsContent>

        {/* ── BULK ENTRY TAB ── */}
        <TabsContent value="bulk" className="space-y-4">
          <div className="space-y-2">
            <Label>Select Worker</Label>
            <Select value={bulkWorkerId ?? ""} onValueChange={(v) => setBulkWorkerId(v || null)}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select worker for all operations" />
              </SelectTrigger>
              <SelectContent>
                {[...(availableWorkers && availableWorkers.length > 0 ? availableWorkers : fetchedWorkers)]
                  .sort((a: any, b: any) => (a.name || "").localeCompare(b.name || ""))
                  .map((w: any) => (
                    <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label>Operations</Label>
            <div className="space-y-2">
              {bulkOps.map((row, index) => {
                const rem = bulkRowRemaining(row.id, row.masterOpId);
                const isOver = row.pieces > 0 && row.pieces > rem;
                const opComplete = row.masterOpId ? isOperationComplete(row.masterOpId) : false;
                return (
                  <div key={row.id} className="space-y-1">
                    <div className="flex gap-2 items-start">
                      <div className="flex-1 min-w-[140px]">
                        <Select value={row.masterOpId ?? ""} onValueChange={(v) => handleBulkUpdateRow(row.id, 'masterOpId', v)}>
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Operation" />
                          </SelectTrigger>
                          <SelectContent>
                            {opMasters.map(m => {
                              const complete = isOperationComplete(m.id);
                              return (
                                <SelectItem
                                  key={`bulk-${row.id}-${m.id}`}
                                  value={m.id}
                                  disabled={complete}
                                >
                                  {m.name} (₹{formatCurrency(m.amount_per_piece)})
                                  {complete
                                    ? " ✓ Complete"
                                    : ` · ${remainingForOperation(m.id)} left`}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="w-[80px] sm:w-[100px]">
                        <Input
                          type="number"
                          placeholder={row.masterOpId ? `Max ${rem}` : "Qty"}
                          className={`h-9 ${isOver ? "border-destructive" : ""}`}
                          value={row.pieces || ''}
                          min={1}
                          max={rem}
                          disabled={opComplete}
                          onChange={(e) => handleBulkUpdateRow(row.id, 'pieces', Number(e.target.value))}
                        />
                      </div>
                      <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-destructive" onClick={() => handleBulkRemoveRow(row.id)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    {/* Per-row feedback */}
                    {row.masterOpId && row.pieces > 0 && (
                      <div className={`text-xs flex items-center gap-1 pl-1 ${isOver ? "text-destructive" : "text-muted-foreground"}`}>
                        {isOver
                          ? <><AlertTriangle className="h-3 w-3" /> Exceeds limit by {row.pieces - rem}</>
                          : <>After entry: {(operationTotalsMap[row.masterOpId] || 0) + row.pieces} / {productionLimit} pcs</>
                        }
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <Button variant="outline" size="sm" onClick={handleBulkAddRow} className="w-full border-dashed">
              <Plus className="h-4 w-4 mr-2" /> Add Operation
            </Button>
          </div>

          {/* Bulk total earnings preview */}
          {bulkOps.some(r => r.masterOpId && r.pieces > 0) && (
            <div className="bg-primary/5 border border-primary/10 rounded-lg p-3 text-xs space-y-1">
              <p className="font-semibold text-muted-foreground">Entry Summary</p>
              {bulkOps.filter(r => r.masterOpId && r.pieces > 0).map(row => {
                const master = opMasters.find(m => m.id === row.masterOpId);
                const earnings = (master?.amount_per_piece || 0) * row.pieces;
                const rem = bulkRowRemaining(row.id, row.masterOpId);
                const isOver = row.pieces > rem;
                return (
                  <div key={row.id} className={`flex justify-between ${isOver ? "text-destructive" : ""}`}>
                    <span>{master?.name}: {row.pieces} pcs{isOver ? ` ⚠ (max ${rem})` : ""}</span>
                    <span>₹{formatCurrency(earnings)}</span>
                  </div>
                );
              })}
              <div className="flex justify-between font-bold pt-1 mt-1 border-t border-primary/10">
                <span>Total Earnings</span>
                <span>
                  ₹{formatCurrency(
                    bulkOps
                      .filter(r => r.masterOpId && r.pieces > 0)
                      .reduce((s, row) => {
                        const master = opMasters.find(m => m.id === row.masterOpId);
                        return s + (master?.amount_per_piece || 0) * row.pieces;
                      }, 0)
                  )}
                </span>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t sticky bottom-0 bg-background pt-4">
            <Button
              onClick={handleBulkSubmit}
              className="flex-1"
              disabled={
                !bulkWorkerId ||
                bulkOps.every(r => !r.masterOpId || r.pieces <= 0) ||
                bulkOps.some(r => r.masterOpId && r.pieces > 0 && r.pieces > bulkRowRemaining(r.id, r.masterOpId))
              }
            >
              Save All Operations
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Per-operation progress summary ── */}
      {renderOperationProgressSummary()}

      {/* ── Existing records list ── */}
      <div className="mt-4">
        <h4 className="font-medium">Existing Operation Records</h4>
        <div className="mt-2 space-y-2 max-h-[300px] overflow-y-auto pr-2">
          {ops.filter(o => Number(o.pieces_done ?? 0) > 0).map(o => (
            <div key={o.id} className="border rounded p-2 flex justify-between items-start group">
              <div>
                <div className="text-sm font-medium">{o.operations?.name ?? o.operation_id}</div>
                <div className="text-xs text-muted-foreground">
                  Worker: {o.worker_name ?? "none"} · Pieces: {o.pieces_done} · Date: {o.date} · Entered by: {o.enteredBy ?? o.entered_by ?? "-"}
                </div>
              </div>
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => { setActiveTab("single"); startEdit(o); }}>
                    <Pencil className="mr-2 h-4 w-4" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeletingOperationId(o.id)}>
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
          {ops.filter(o => Number(o.pieces_done ?? 0) > 0).length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-4">No operations recorded yet.</div>
          )}
        </div>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <>
        <Drawer open={open} onOpenChange={onOpenChange}>
          <DrawerContent className="max-h-[85vh]">
            <DrawerHeader className="text-left border-b pb-4">
              <DrawerTitle>Production Operations</DrawerTitle>
              <DrawerDescription>{production.production_code}</DrawerDescription>
            </DrawerHeader>
            <div className="px-4 overflow-y-auto">
              {renderContent()}
            </div>
            <DrawerFooter className="pt-4 border-t px-4">
              <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">Close</Button>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>

        <AlertDialog open={!!deletingOperationId} onOpenChange={(o) => !o && setDeletingOperationId(null)}>
          <AlertDialogContent className="w-[90vw] rounded-xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Record?</AlertDialogTitle>
              <AlertDialogDescription>This will permanently remove this operation record.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col sm:flex-row gap-2">
              <AlertDialogCancel className="mt-0">Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader className="border-b pb-4">
            <DialogTitle>Production Operations</DialogTitle>
            <DialogDescription>Manage operations for {production.production_code}</DialogDescription>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto pr-2">
            {renderContent()}
          </div>
          <div className="flex justify-end pt-4 mt-2 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingOperationId} onOpenChange={(o) => !o && setDeletingOperationId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this operation record.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ProductionOperationsDialog;
