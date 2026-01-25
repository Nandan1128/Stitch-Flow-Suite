// src/components/production/ProductionOperationsDialog.tsx
import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Worker } from "@/types/worker";
import { Production } from "@/types/production";
import { getOperationsByProductionId, assignWorkerToOperation, insertProductionOperation } from "@/Services/productionService";
import { getOperationsByProduct } from "@/Services/operationService";
import { getWorkers } from "@/Services/workerService";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { addWorkerSalary, updateWorkerSalaryByOps, deleteWorkerSalary } from "@/Services/salaryService";
import { deleteProductionOperation, checkAndUpdateProductionStatus } from "@/Services/productionService";
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
import { MoreVertical, Pencil, Trash2 } from "lucide-react";


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
  const [ops, setOps] = useState<any[]>([]);
  const [opMasters, setOpMasters] = useState<any[]>([]);
  const [fetchedWorkers, setFetchedWorkers] = useState<any[]>([]);
  const [selectedOpId, setSelectedOpId] = useState<string | null>(null); // id of production_operation row OR `master:<id>` when choosing from master
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
  const [pieces, setPieces] = useState<number>(0);
  const [editingOperation, setEditingOperation] = useState<any | null>(null);
  const [deletingOperationId, setDeletingOperationId] = useState<string | null>(null);

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
        // fetch operation masters for this product
        const prodId = (production as any).productId ?? (production as any).product_id;
        if (prodId) {
          const masters = await getOperationsByProduct(prodId);
          setOpMasters(masters || []);
        } else {
          setOpMasters([]);
        }
        // fetch workers
        const workers = await getWorkers();
        setFetchedWorkers(workers || []);
      } catch (err) {
        console.error(err);
        toast({ title: "Error", description: "Failed to load operations", variant: "destructive" });
      }
    })();
  }, [production]);

  // Get production quantity limit
  const productionLimit = React.useMemo(() => {
    return (production as any)?.total_quantity || 0;
  }, [production]);

  // Calculate total for the currently selected/editing operation
  const currentOperationTotal = React.useMemo(() => {
    let operationId: string | null = null;
    if (selectedOpId && selectedOpId.startsWith("master:")) {
      operationId = selectedOpId.split(":")[1];
    } else if (editingOperation) {
      operationId = editingOperation.operation_id;
    }

    if (!operationId) return 0;

    return ops
      .filter(op => op.operation_id === operationId && op.id !== editingOperation?.id)
      .reduce((sum, op) => sum + (Number(op.pieces_done) || 0), 0);
  }, [ops, selectedOpId, editingOperation]);

  const handleAdd = async () => {
    if (!production) {
      toast({ title: "Production missing", variant: "destructive" });
      return;
    }

    try {
      // Validate quantity limit - each operation is limited to production total_quantity
      const requestedPieces = Number(pieces) || 0;
      const productionLimit = (production as any)?.total_quantity || 0;

      // Determine which operation we're working with
      let operationId: string | null = null;
      if (selectedOpId && selectedOpId.startsWith("master:")) {
        operationId = selectedOpId.split(":")[1];
      } else if (editingOperation) {
        operationId = editingOperation.operation_id;
      }

      // Calculate total already done for THIS specific operation
      let totalForThisOperation = 0;
      if (operationId) {
        totalForThisOperation = ops
          .filter(op => op.operation_id === operationId && op.id !== editingOperation?.id)
          .reduce((sum, op) => sum + (Number(op.pieces_done) || 0), 0);
      }

      const newTotal = totalForThisOperation + requestedPieces;

      if (newTotal > productionLimit) {
        toast({
          title: "Quantity Limit Exceeded",
          description: `Cannot add ${requestedPieces} pieces. This operation already has ${totalForThisOperation} pieces. Total would be ${newTotal}, but limit is ${productionLimit} pieces.`,
          variant: "destructive"
        });
        return;
      }
      // If a master operation was selected (value starts with `master:`), insert a new production_operation
      if (selectedOpId && selectedOpId.startsWith("master:")) {
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
        };

        const createdOp = await insertProductionOperation(payload);
        toast({ title: "Added", description: "Operation record created" });

        // create worker salary record when worker assigned and pieces > 0
        try {
          if (selectedWorkerId && Number(pieces) > 0) {
            const amountPerPiece = master?.amount_per_piece ?? master?.rate ?? 0;
            const total = (Number(pieces) || 0) * Number(amountPerPiece || 0);
            await addWorkerSalary({
              worker_id: selectedWorkerId,
              product_id: (production as any).product_id ?? null,
              operation_id: masterId,
              pieces_done: Number(pieces || 0),
              amount_per_piece: Number(amountPerPiece || 0),
              total_amount: total,
              date: payload.date,
              created_by: user?.id ?? null,
            });
          }
        } catch (err) {
          console.warn("addWorkerSalary failed for new operation", err);
          // do not block main flow
        }

        const refreshed = await getOperationsByProductionId(production.id);
        setOps(refreshed || []);

        // Check completion status
        const statusChanged = await checkAndUpdateProductionStatus(production.id);
        if (statusChanged) {
          toast({
            title: "Production Completed!",
            description: "All operations have been finished for this production.",
            className: "bg-green-100 border-green-200 text-green-800"
          });
        }

        // clear form
        setSelectedOpId(null);
        setSelectedWorkerId(null);
        setPieces(0);
        setEditingOperation(null);
        return;
      }

      // OTHERWISE: It's an update to an existing record OR an assignment
      // If we are in "edit mode" (editingOperation is set), use that ID.
      // If not, use selectedOpId (which would be the ID from dropdown if we allowed selecting existing ops there).
      // Note: The original code allowed selecting existing op from dropdown.
      // We will prefer `editingOperation.id` if set.

      const targetOpId = editingOperation ? editingOperation.id : selectedOpId;

      if (!targetOpId) {
        toast({ title: "Select operation", variant: "destructive" });
        return;
      }

      const workerList = (availableWorkers && availableWorkers.length > 0) ? availableWorkers : fetchedWorkers;
      const worker = workerList.find((w: any) => w.id === selectedWorkerId);
      const workerName = worker ? worker.name : null;

      const res = await assignWorkerToOperation(production.id, targetOpId, selectedWorkerId || null, pieces || 0, workerName || null);
      toast({ title: "Saved", description: "Operation updated" });

      // add worker salary record for this updated assignment (if worker selected + pieces > 0)
      try {
        const opBefore = ops.find(o => o.id === targetOpId);
        // opBefore contains linked master info if available
        const amountPerPiece = opBefore?.operations?.amount_per_piece ?? opBefore?.rate_per_piece ?? opBefore?.rate ?? 0;
        const total = (Number(pieces) || 0) * Number(amountPerPiece || 0);

        // SYNC SALARY LOGIC
        // We need to identify if we should DELETE old salary (if worker changed) and ADD new, or UPDATE existing.
        // `opBefore` has the *previous* state.
        const oldWorkerId = opBefore?.worker_id;
        const oldDate = opBefore?.date;
        const masterOpId = opBefore?.operation_id; // This is the master ID stored in production_operation

        if (masterOpId && oldDate && selectedWorkerId) {
          if (oldWorkerId && oldWorkerId !== selectedWorkerId) {
            // Worker CHANGED: Delete old salary record for old worker
            await deleteWorkerSalary(oldWorkerId, masterOpId, oldDate);

            // Add new salary record for new worker
            if (Number(pieces) > 0) {
              await addWorkerSalary({
                worker_id: selectedWorkerId,
                product_id: (production as any).product_id ?? null,
                operation_id: masterOpId,
                pieces_done: Number(pieces || 0),
                amount_per_piece: Number(amountPerPiece || 0),
                total_amount: total,
                date: new Date().toISOString(), // Use current date for new entry? Or keep old date? Original code used new Date() on update.
                created_by: user?.id ?? null,
              });
            }
          } else {
            // Worker SAME (or was null): Update existing salary match
            // If previously null, it wouldn't have a salary record, so we might need to ADD if it didn't exist.
            // Ideally `updateWorkerSalaryByOps` handles "update if exists".
            // But wait, if we are editing, we assume a record might exist.

            // If oldWorkerId was present, try to update.
            if (oldWorkerId) {
              await updateWorkerSalaryByOps(oldWorkerId, masterOpId, oldDate, {
                pieces_done: Number(pieces),
                total_amount: total
              });
            } else {
              // Was null, now assigning -> Create new
              if (Number(pieces) > 0) {
                await addWorkerSalary({
                  worker_id: selectedWorkerId,
                  product_id: (production as any).product_id ?? null,
                  operation_id: masterOpId,
                  pieces_done: Number(pieces || 0),
                  amount_per_piece: Number(amountPerPiece || 0),
                  total_amount: total,
                  date: new Date().toISOString(),
                  created_by: user?.id ?? null,
                });
              }
            }
          }
        }
      } catch (err) {
        console.warn("Salary sync failed for assignment", err);
      }

      const refreshed = await getOperationsByProductionId(production.id);
      setOps(refreshed || []);

      onAssignWorker && onAssignWorker(production.id, targetOpId, selectedWorkerId || "", pieces || 0);

      // Check if production should be marked as completed
      const statusChanged = await checkAndUpdateProductionStatus(production.id);
      if (statusChanged) {
        toast({
          title: "Production Completed!",
          description: "All operations have been finished for this production.",
          className: "bg-green-100 border-green-200 text-green-800"
        });
      }

      // Cleanup
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
    // Set form values
    // For dropdown: we ideally want to show the operation name.
    // usage: `selectedOpId` triggers the "master:..." selection.
    // But here we are editing an EXISTING production_operation.
    // We'll leave `selectedOpId` null or handle "edit mode" in UI.
    // Let's set the other fields so user can change worker/pieces.

    // Attempt to set worker
    setSelectedWorkerId(op.worker_id || null);
    setPieces(op.pieces_done || 0);
  };

  const confirmDelete = async () => {
    if (!deletingOperationId) return;
    try {
      // 1. Delete from production_operation
      await deleteProductionOperation(deletingOperationId);

      // 2. Delete from worker_salaries (sync)
      // Find the operation object to get details
      const opToDelete = ops.find(o => o.id === deletingOperationId);
      if (opToDelete && opToDelete.worker_id && opToDelete.operation_id && opToDelete.date) {
        // Attempt to delete associated salary
        try {
          await deleteWorkerSalary(opToDelete.worker_id, opToDelete.operation_id, opToDelete.date);
        } catch (salErr) {
          console.warn("Failed to delete associated salary record", salErr);
        }
      }

      toast({ title: "Deleted", description: "Operation and salary record removed" });
      const refreshed = await getOperationsByProductionId(production.id);
      setOps(refreshed || []);
    } catch (err: any) {
      toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
    } finally {
      setDeletingOperationId(null);
    }
  };

  if (!production) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle></DialogTitle>
      </DialogHeader>
      <DialogContent>
        <div className="space-y-4">


          <div>
            <label className="block text-sm font-medium mb-1">
              {editingOperation ? "Updating Operation" : "Select Operation"}
            </label>
            {editingOperation ? (
              <div className="w-full border rounded px-3 py-2 bg-muted text-sm font-medium">
                {editingOperation.operations?.name ?? "Unknown Operation"}
              </div>
            ) : (
              <Select value={selectedOpId ?? ""} onValueChange={(v) => setSelectedOpId(v || null)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose operation (production operation record)" />
                </SelectTrigger>
                <SelectContent>
                  {/* Show only operation masters so user can create a new production_operation */}
                  {opMasters.map(m => (
                    <SelectItem key={`master-${m.id}`} value={`master:${m.id}`}>{m.name} — ₹{m.amount_per_piece}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Select Worker</label>
            <Select value={selectedWorkerId ?? ""} onValueChange={(v) => setSelectedWorkerId(v === "__none" ? null : (v || null))}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select worker" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">none</SelectItem>
                {(availableWorkers && availableWorkers.length > 0 ? availableWorkers : fetchedWorkers).map((w: any) => (
                  <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Quantity (pieces)</label>
            <input
              type="number"
              value={pieces}
              onChange={(e) => setPieces(Number(e.target.value))}
              className="w-full border rounded px-2 py-2"
            />
          </div>

          {/* Production Quantity Info */}
          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex-1">
                  <div className="text-sm text-blue-900 dark:text-blue-100 font-medium">Per-Operation Limit</div>
                  <div className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                    Production total quantity
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-blue-900 dark:text-blue-100">{productionLimit}</div>
                  <div className="text-xs text-blue-700 dark:text-blue-300">pcs max</div>
                </div>
              </div>
              {(selectedOpId || editingOperation) && (
                <div className="pt-2 border-t border-blue-200 dark:border-blue-800">
                  <div className="flex justify-between items-center">
                    <div className="text-xs text-blue-700 dark:text-blue-300">Already recorded for this operation:</div>
                    <div className="text-sm font-semibold text-blue-900 dark:text-blue-100">{currentOperationTotal} pcs</div>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <div className="text-xs text-blue-700 dark:text-blue-300">Remaining for this operation:</div>
                    <div className="text-sm font-semibold text-green-700 dark:text-green-400">{Math.max(0, productionLimit - currentOperationTotal)} pcs</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            {editingOperation && (
              <Button variant="ghost" onClick={() => { setEditingOperation(null); setPieces(0); setSelectedWorkerId(null); }}>
                Cancel Edit
              </Button>
            )}
            <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
            <Button onClick={handleAdd}>{editingOperation ? "Update" : "Add / Save"}</Button>
          </div>

          <div className="mt-4">
            <h4 className="font-medium">Existing Operation Records</h4>
            <div className="mt-2 space-y-2 max-h-[300px] overflow-y-auto pr-2">
              {ops.filter(o => Number(o.pieces_done ?? 0) > 0).map(o => (
                <div key={o.id} className="border rounded p-2 flex justify-between items-start group">
                  <div>
                    <div className="text-sm font-medium">{o.operations?.name ?? o.operation_id}</div>
                    <div className="text-xs text-muted-foreground">
                      Worker: {o.worker_name ?? "none"} · Pieces: {o.pieces_done} · Date: {o.date}
                    </div>
                  </div>
                  <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => startEdit(o)}>
                        <Pencil className="mr-2 h-4 w-4" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeletingOperationId(o.id)}>
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>

      <AlertDialog open={!!deletingOperationId} onOpenChange={(o) => !o && setDeletingOperationId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this operation record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </Dialog >
  );
};

export default ProductionOperationsDialog;
