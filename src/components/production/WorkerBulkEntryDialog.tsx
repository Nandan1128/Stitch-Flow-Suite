
import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, X, Trash2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { getWorkers } from "@/Services/workerService";
import { getProductions, insertProductionOperation, checkAndUpdateProductionStatus } from "@/Services/productionService";
import { getOperationsByProduct } from "@/Services/operationService";
import { addWorkerSalary } from "@/Services/salaryService";

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const WorkerBulkEntryDialog: React.FC<Props> = ({ open, onOpenChange }) => {
    const { toast } = useToast();
    const { user } = useAuth();

    const [workers, setWorkers] = useState<any[]>([]);
    const [productions, setProductions] = useState<any[]>([]);
    // We'll cache operations (masters) by productId to avoid refetching
    const [opsCache, setOpsCache] = useState<Record<string, any[]>>({});

    const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);

    // Rows: id, productionId, masterOpId,  pieces
    const [rows, setRows] = useState<{ id: string; productionId: string | null; masterOpId: string | null; pieces: number }[]>([
        { id: "init-1", productionId: null, masterOpId: null, pieces: 0 }
    ]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // 1. Fetch Workers & Active Productions on Mount
    useEffect(() => {
        if (open) {
            // Reset form
            setRows([{ id: "init-1", productionId: null, masterOpId: null, pieces: 0 }]);
            setSelectedWorkerId(null);

            // Load data
            Promise.all([getWorkers(), getProductions()])
                .then(([wData, pData]) => {
                    setWorkers(wData || []);
                    // Filter only active productions
                    const activeProds = (pData || []).filter((p: any) => (p.status || 'active') === 'active');
                    setProductions(activeProds);
                })
                .catch(err => {
                    console.error(err);
                    toast({ title: "Error", description: "Failed to load initial data", variant: "destructive" });
                });
        }
    }, [open]);

    // 2. Fetch Helper
    const fetchOpsForProduction = async (productionId: string) => {
        const prod = productions.find(p => p.id === productionId);
        if (!prod || !prod.product_id) return;

        // Check cache
        if (opsCache[prod.product_id]) return;

        try {
            const ops = await getOperationsByProduct(prod.product_id);
            setOpsCache(prev => ({ ...prev, [prod.product_id]: ops || [] }));
        } catch (err) {
            console.error(err);
        }
    };

    const handleAddRow = () => {
        setRows([...rows, { id: crypto.randomUUID(), productionId: null, masterOpId: null, pieces: 0 }]);
    };

    const handleRemoveRow = (id: string) => {
        if (rows.length > 1) {
            setRows(rows.filter(r => r.id !== id));
        }
    };

    const handleUpdateRow = (id: string, field: 'productionId' | 'masterOpId' | 'pieces', value: any) => {
        setRows(prev => prev.map(r => {
            if (r.id !== id) return r;
            const updated = { ...r, [field]: value };

            // If production changed, reset op and fetch new ops
            if (field === 'productionId') {
                updated.masterOpId = null;
                if (value) {
                    fetchOpsForProduction(value);
                }
            }
            return updated;
        }));
    };

    const handleSubmit = async () => {
        if (!selectedWorkerId) {
            toast({ title: "Error", description: "Please select a worker", variant: "destructive" });
            return;
        }

        const validRows = rows.filter(r => r.productionId && r.masterOpId && r.pieces > 0);
        if (validRows.length === 0) {
            toast({ title: "Error", description: "Add at least one valid row (Production + Operation + Quantity)", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);
        try {
            const worker = workers.find(w => w.id === selectedWorkerId);
            const workerName = worker ? worker.name : null;
            const enteredBy = user?.name ?? user?.email ?? user?.id ?? "system";
            const dateStr = new Date().toISOString().split("T")[0];
            const dateTimeStr = new Date().toISOString();
            const uniqueProdIds = new Set<string>();

            let count = 0;
            for (const row of validRows) {
                uniqueProdIds.add(row.productionId!);

                // Find master op from cache
                const prod = productions.find(p => p.id === row.productionId);
                const ops = prod ? opsCache[prod.product_id] : [];
                const master = ops?.find((m: any) => m.id === row.masterOpId);

                if (!master) continue;

                const amountPerPiece = master.amount_per_piece || 0;
                const totalAmount = row.pieces * amountPerPiece;

                // Insert Op
                await insertProductionOperation({
                    operation_id: row.masterOpId,
                    worker_id: selectedWorkerId,
                    worker_name: workerName || null,
                    pieces_done: row.pieces,
                    earnings: totalAmount,
                    date: dateStr,
                    supervisor_employee_id: null,
                    production_id: row.productionId,
                    created_at: dateTimeStr,
                    entered_by: enteredBy,
                });

                // Insert Salary
                try {
                    const salaryResult = await addWorkerSalary({
                        worker_id: selectedWorkerId,
                        product_id: prod?.product_id ?? null,
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
                            description: `Salary record failed for one operation: ${salaryResult.error.message}`,
                            variant: "destructive"
                        });
                    }
                } catch (salErr: any) {
                    console.error("Salary error:", salErr);
                    toast({
                        title: "Warning",
                        description: `Salary record failed: ${salErr.message || 'Unknown error'}`,
                        variant: "destructive"
                    });
                }
                count++;
            }

            // Check status for all affected productions
            for (const pid of Array.from(uniqueProdIds)) {
                await checkAndUpdateProductionStatus(pid);
            }

            toast({ title: "Success", description: `Saved ${count} operations.` });
            onOpenChange(false);

        } catch (err: any) {
            console.error(err);
            toast({ title: "Error", description: "Failed to save operations", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Worker Bulk Entry</DialogTitle>
                    <DialogDescription>Assign operations to a worker across multiple productions.</DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto py-4 pr-1 space-y-6">
                    {/* Worker Select */}
                    <div className="space-y-2">
                        <Label>Worker</Label>
                        <Select value={selectedWorkerId ?? ""} onValueChange={(v) => setSelectedWorkerId(v || null)}>
                            <SelectTrigger className="w-full sm:w-1/2">
                                <SelectValue placeholder="Select Worker" />
                            </SelectTrigger>
                            <SelectContent>
                                {workers
                                    .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
                                    .map(w => (
                                        <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                                    ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Rows */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <Label>Operations</Label>
                        </div>

                        <div className="space-y-2">
                            <div className="hidden sm:grid grid-cols-[1.5fr_1.5fr_100px_40px] gap-2 text-xs font-medium text-muted-foreground px-1">
                                <div>Production</div>
                                <div>Operation</div>
                                <div>Qty</div>
                                <div></div>
                            </div>
                            {rows.map((row) => {
                                const prod = productions.find(p => p.id === row.productionId);
                                const ops = (prod && prod.product_id) ? (opsCache[prod.product_id] || []) : [];

                                return (
                                    <div key={row.id} className="grid grid-cols-1 sm:grid-cols-[1.5fr_1.5fr_100px_40px] gap-2 items-start border p-2 sm:border-0 sm:p-0 rounded-md bg-muted/20 sm:bg-transparent">
                                        {/* Mobile Label */}
                                        <label className="sm:hidden text-xs font-semibold">Production</label>
                                        <Select value={row.productionId ?? ""} onValueChange={(v) => handleUpdateRow(row.id, 'productionId', v)}>
                                            <SelectTrigger className="h-9">
                                                <SelectValue placeholder="Select Production" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {productions.map(p => (
                                                    <SelectItem key={p.id} value={p.id}>
                                                        {p.production_code} {p.productName ? `(${p.productName})` : ''} - {p.po_number}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>

                                        {/* Mobile Label */}
                                        <label className="sm:hidden text-xs font-semibold mt-2">Operation</label>
                                        <Select
                                            value={row.masterOpId ?? ""}
                                            onValueChange={(v) => handleUpdateRow(row.id, 'masterOpId', v)}
                                            disabled={!row.productionId}
                                        >
                                            <SelectTrigger className="h-9">
                                                <SelectValue placeholder="Select Operation" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {ops.map((op: any) => (
                                                    <SelectItem key={op.id} value={op.id}>
                                                        {op.name} (₹{op.amount_per_piece})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>

                                        {/* Mobile Label */}
                                        <label className="sm:hidden text-xs font-semibold mt-2">Quantity</label>
                                        <Input
                                            type="number"
                                            className="h-9"
                                            placeholder="Qty"
                                            value={row.pieces || ''}
                                            onChange={(e) => handleUpdateRow(row.id, 'pieces', Number(e.target.value))}
                                        />

                                        <div className="flex justify-end mt-2 sm:mt-0">
                                            <Button size="icon" variant="ghost" className="h-9 w-9 text-muted-foreground hover:text-destructive" onClick={() => handleRemoveRow(row.id)}>
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <Button variant="outline" onClick={handleAddRow} className="w-full border-dashed">
                            <Plus className="mr-2 h-4 w-4" /> Add Another Line
                        </Button>
                    </div>
                </div>

                <DialogFooter className="mt-4 pt-2 border-t">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting ? "Saving..." : "Save All Operations"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default WorkerBulkEntryDialog;
