// src/components/production/ProductionOperationsDialog.tsx
import React, { useEffect, useState } from "react";
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
import { MoreVertical, Pencil, Trash2, Plus, X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


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
  const isMobile = useIsMobile(); // Moved to top-level to fix hook rules
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

  const handleBulkAddRow = () => {
    setBulkOps([...bulkOps, { id: crypto.randomUUID(), masterOpId: null, pieces: 0 }]);
  };

  const handleBulkRemoveRow = (id: string) => {
    if (bulkOps.length > 1) {
      setBulkOps(bulkOps.filter(r => r.id !== id));
    }
  };

  const handleBulkUpdateRow = (id: string, field: 'masterOpId' | 'pieces', value: any) => {
    setBulkOps(bulkOps.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

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

    try {
      const workerList = (availableWorkers && availableWorkers.length > 0) ? availableWorkers : fetchedWorkers;
      const worker = workerList.find((w: any) => w.id === bulkWorkerId);
      const workerName = worker ? worker.name : null;
      const enteredBy = user?.name ?? user?.email ?? user?.id ?? "system";
      const dateStr = new Date().toISOString().split("T")[0];
      const dateTimeStr = new Date().toISOString();

      let successCount = 0;

      for (const row of validRows) {
        // 1. Get Master Op
        const master = opMasters.find(m => m.id === row.masterOpId);
        if (!master) continue;

        const amountPerPiece = master.amount_per_piece || 0;
        const totalAmount = row.pieces * amountPerPiece;

        // 2. Insert Production Operation
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

        // 3. Add Salary
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

      // Refresh
      const refreshed = await getOperationsByProductionId(production.id);
      setOps(refreshed || []);
      await checkAndUpdateProductionStatus(production.id);

      // Reset Bulk Form
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

  const productionLimit = React.useMemo(() => {
    return (production as any)?.total_quantity || 0;
  }, [production]);

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
      const requestedPieces = Number(pieces) || 0;
      const productionLimit = (production as any)?.total_quantity || 0;

      let operationId: string | null = null;
      if (selectedOpId && selectedOpId.startsWith("master:")) {
        operationId = selectedOpId.split(":")[1];
      } else if (editingOperation) {
        operationId = editingOperation.operation_id;
      }

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
          description: `Cannot add ${requestedPieces} pieces. Limit is ${productionLimit} pieces.`,
          variant: "destructive"
        });
        return;
      }

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
              created_by: payload.entered_by, // Pass name, not UUID
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

      const res = await assignWorkerToOperation(production.id, targetOpId, selectedWorkerId || null, pieces || 0, workerName || null, enteredBy, earningsValue);
      toast({ title: "Saved", description: "Operation updated" });

      try {
        const opBefore = ops.find(o => o.id === targetOpId);
        const amountPerPiece = opBefore?.operations?.amount_per_piece ?? opBefore?.rate_per_piece ?? opBefore?.rate ?? 0;
        const total = (Number(pieces) || 0) * Number(amountPerPiece || 0);

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
            const updateResult = await updateWorkerSalaryByOps(oldWorkerId, masterOpId, oldDate, {
              pieces_done: Number(pieces),
              total_amount: total
            });
            if (updateResult?.error) {
              console.error("Salary update failed:", updateResult.error);
              toast({
                title: "Warning",
                description: `Production updated but salary record update failed: ${updateResult.error.message}`,
                variant: "destructive"
              });
            }
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
      const refreshed = await getOperationsByProductionId(production.id);
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



  const renderContent = () => (
    <div className="space-y-4 py-2">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="single">Single Entry</TabsTrigger>
          <TabsTrigger value="bulk">Bulk Entry</TabsTrigger>
        </TabsList>

        <TabsContent value="single" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{editingOperation ? "Updating Operation" : "Select Operation"}</Label>
              {editingOperation ? (
                <div className="h-9 flex items-center px-3 border rounded-md bg-muted text-sm font-medium">
                  {editingOperation.operations?.name ?? "Unknown Operation"}
                </div>
              ) : (
                <Select value={selectedOpId ?? ""} onValueChange={(v) => setSelectedOpId(v || null)}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Choose operation" />
                  </SelectTrigger>
                  <SelectContent>
                    {opMasters.map(m => (
                      <SelectItem key={`master-${m.id}`} value={`master:${m.id}`}>{m.name} — ₹{m.amount_per_piece}</SelectItem>
                    ))}
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

          <div className="space-y-2">
            <Label>Quantity (pieces)</Label>
            <Input
              type="number"
              value={pieces || ''}
              onChange={(e) => setPieces(Number(e.target.value))}
              placeholder="Enter pieces"
              className="h-9"
            />
          </div>

          <div className="bg-primary/5 border border-primary/10 rounded-lg p-3 text-xs">
            <div className="flex justify-between items-center mb-1">
              <span className="text-muted-foreground">Production Limit:</span>
              <span className="font-bold">{productionLimit} pcs</span>
            </div>
            {(selectedOpId || editingOperation) && (
              <div className="space-y-1 pt-2 mt-2 border-t border-primary/10">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Already recorded:</span>
                  <span className="font-medium">{currentOperationTotal} pcs</span>
                </div>
                <div className="flex justify-between items-center text-primary font-medium">
                  <span>Remaining:</span>
                  <span>{Math.max(0, productionLimit - currentOperationTotal)} pcs</span>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t sticky bottom-0 bg-background pt-4">
            <Button onClick={handleAdd} className="flex-1">{editingOperation ? "Update Record" : "Add Record"}</Button>
            {editingOperation && (
              <Button variant="outline" onClick={() => { setEditingOperation(null); setPieces(0); setSelectedWorkerId(null); }} className="flex-1">
                Cancel
              </Button>
            )}
          </div>
        </TabsContent>

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
              {bulkOps.map((row, index) => (
                <div key={row.id} className="flex gap-2 items-start">
                  <div className="flex-1 min-w-[140px]">
                    <Select value={row.masterOpId ?? ""} onValueChange={(v) => handleBulkUpdateRow(row.id, 'masterOpId', v)}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Operation" />
                      </SelectTrigger>
                      <SelectContent>
                        {opMasters.map(m => (
                          <SelectItem key={`bulk-${row.id}-${m.id}`} value={m.id}>{m.name} (₹{m.amount_per_piece})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-[80px] sm:w-[100px]">
                    <Input
                      type="number"
                      placeholder="Qty"
                      className="h-9"
                      value={row.pieces || ''}
                      onChange={(e) => handleBulkUpdateRow(row.id, 'pieces', Number(e.target.value))}
                    />
                  </div>
                  <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-destructive" onClick={() => handleBulkRemoveRow(row.id)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={handleBulkAddRow} className="w-full border-dashed">
              <Plus className="h-4 w-4 mr-2" /> Add Operation
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t sticky bottom-0 bg-background pt-4">
            <Button onClick={handleBulkSubmit} className="flex-1" disabled={!bulkWorkerId}>
              Save All Operations
            </Button>
          </div>
        </TabsContent>
      </Tabs>

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

  // const isMobile = useIsMobile(); // Moved to top

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
