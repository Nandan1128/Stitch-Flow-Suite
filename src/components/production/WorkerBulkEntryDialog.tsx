
import React, { useEffect, useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, X, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { getWorkers } from "@/Services/workerService";
import { getProductions, insertProductionOperation, checkAndUpdateProductionStatus, getOperationsByProductionId } from "@/Services/productionService";
import { getOperationsByProduct } from "@/Services/operationService";
import { formatCurrency } from "@/lib/formatCurrency";

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const WorkerBulkEntryDialog: React.FC<Props> = ({ open, onOpenChange }) => {
    const { toast } = useToast();
    const { user } = useAuth();

    const [workers, setWorkers] = useState<any[]>([]);
    const [productions, setProductions] = useState<any[]>([]);
    // Cache of master operations by productId
    const [opsCache, setOpsCache] = useState<Record<string, any[]>>({});
    // Cache of already-recorded operation totals by productionId
    // Map: productionId -> { operationId -> pieces_done total }
    const [recordedTotals, setRecordedTotals] = useState<Record<string, Record<string, number>>>({});

    const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);

    const [rows, setRows] = useState<{ id: string; productionId: string | null; masterOpId: string | null; pieces: number }[]>([
        { id: "init-1", productionId: null, masterOpId: null, pieces: 0 }
    ]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // ── Load workers & active productions on open ──────────────────────────
    useEffect(() => {
        if (open) {
            setRows([{ id: "init-1", productionId: null, masterOpId: null, pieces: 0 }]);
            setSelectedWorkerId(null);
            setOpsCache({});
            setRecordedTotals({});

            Promise.all([getWorkers(), getProductions()])
                .then(([wData, pData]) => {
                    setWorkers(wData || []);
                    const activeProds = (pData || []).filter((p: any) => (p.status || 'active') === 'active');
                    setProductions(activeProds);
                })
                .catch(err => {
                    console.error(err);
                    toast({ title: "Error", description: "Failed to load initial data", variant: "destructive" });
                });
        }
    }, [open]);

    // ── Fetch master ops & existing recorded totals for a production ───────
    const fetchOpsForProduction = async (productionId: string) => {
        const prod = productions.find(p => p.id === productionId);
        if (!prod || !prod.product_id) return;

        // Fetch master operations if not cached
        if (!opsCache[prod.product_id]) {
            try {
                const ops = await getOperationsByProduct(prod.product_id);
                setOpsCache(prev => ({ ...prev, [prod.product_id]: ops || [] }));
            } catch (err) {
                console.error(err);
            }
        }

        // Fetch existing production_operation rows to get already-recorded totals
        if (!recordedTotals[productionId]) {
            try {
                const existingOps = await getOperationsByProductionId(productionId);
                const totals: Record<string, number> = {};
                (existingOps || []).forEach((op: any) => {
                    const opId = op.operation_id;
                    if (opId) {
                        totals[opId] = (totals[opId] || 0) + (Number(op.pieces_done) || 0);
                    }
                });
                setRecordedTotals(prev => ({ ...prev, [productionId]: totals }));
            } catch (err) {
                console.error("Failed to fetch recorded totals:", err);
            }
        }
    };

    // ── Helper: get the production limit (total_quantity) ─────────────────
    const getProductionLimit = (productionId: string): number => {
        const prod = productions.find(p => p.id === productionId);
        return Number(prod?.total_quantity || 0);
    };

    // ── Helper: already recorded pieces for a production+operation (DB) ───
    const getDbRecorded = (productionId: string, masterOpId: string): number => {
        return recordedTotals[productionId]?.[masterOpId] || 0;
    };

    // ── Helper: pieces in OTHER rows for the same production+operation ─────
    const getSiblingTotal = (excludeRowId: string, productionId: string, masterOpId: string): number => {
        return rows
            .filter(r => r.id !== excludeRowId && r.productionId === productionId && r.masterOpId === masterOpId)
            .reduce((s, r) => s + (Number(r.pieces) || 0), 0);
    };

    // ── Helper: remaining pieces available for a row ───────────────────────
    const getRemainingForRow = (rowId: string, productionId: string | null, masterOpId: string | null): number => {
        if (!productionId || !masterOpId) return Infinity;
        const limit = getProductionLimit(productionId);
        const dbDone = getDbRecorded(productionId, masterOpId);
        const siblings = getSiblingTotal(rowId, productionId, masterOpId);
        return Math.max(0, limit - dbDone - siblings);
    };

    // ── Helper: is an operation fully complete for a production? ──────────
    const isOpComplete = (productionId: string, masterOpId: string): boolean => {
        const limit = getProductionLimit(productionId);
        if (limit <= 0) return false;
        const dbDone = getDbRecorded(productionId, masterOpId);
        return dbDone >= limit;
    };

    // ── Row change handlers ────────────────────────────────────────────────
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
            // If production changed → reset op & pieces, fetch data
            if (field === 'productionId') {
                updated.masterOpId = null;
                updated.pieces = 0;
                if (value) fetchOpsForProduction(value);
            }
            // If operation changed → reset pieces
            if (field === 'masterOpId') {
                updated.pieces = 0;
            }
            return updated;
        }));
    };

    // ── Global validation: any row over limit? ────────────────────────────
    const hasLimitErrors = useMemo(() => {
        return rows.some(row => {
            if (!row.productionId || !row.masterOpId || row.pieces <= 0) return false;
            const rem = getRemainingForRow(row.id, row.productionId, row.masterOpId);
            return row.pieces > rem;
        });
    }, [rows, recordedTotals, productions]);

    // ── Total earnings preview ────────────────────────────────────────────
    const totalEarnings = useMemo(() => {
        return rows.reduce((sum, row) => {
            if (!row.productionId || !row.masterOpId || row.pieces <= 0) return sum;
            const prod = productions.find(p => p.id === row.productionId);
            const ops = (prod && prod.product_id) ? (opsCache[prod.product_id] || []) : [];
            const master = ops.find((m: any) => m.id === row.masterOpId);
            return sum + (master?.amount_per_piece || 0) * row.pieces;
        }, 0);
    }, [rows, opsCache, productions]);

    // ── Submit ────────────────────────────────────────────────────────────
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

        // Limit validation before submit
        const limitErrors: string[] = [];
        validRows.forEach(row => {
            const rem = getRemainingForRow(row.id, row.productionId, row.masterOpId);
            if (row.pieces > rem) {
                const prod = productions.find(p => p.id === row.productionId);
                const ops = (prod && prod.product_id) ? (opsCache[prod.product_id] || []) : [];
                const master = ops.find((m: any) => m.id === row.masterOpId);
                limitErrors.push(`"${master?.name || 'Operation'}": entered ${row.pieces}, only ${rem} remaining.`);
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

                const prod = productions.find(p => p.id === row.productionId);
                const ops = prod ? opsCache[prod.product_id] : [];
                const master = ops?.find((m: any) => m.id === row.masterOpId);

                if (!master) continue;

                const amountPerPiece = master.amount_per_piece || 0;
                const totalAmount = row.pieces * amountPerPiece;

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

                count++;
            }

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

                        <div className="space-y-3">
                            {/* Column headers (desktop only) */}
                            <div className="hidden sm:grid grid-cols-[1.5fr_1.5fr_130px_40px] gap-2 text-xs font-medium text-muted-foreground px-1">
                                <div>Production</div>
                                <div>Operation</div>
                                <div>Qty / Remaining</div>
                                <div></div>
                            </div>

                            {rows.map((row) => {
                                const prod = productions.find(p => p.id === row.productionId);
                                const ops = (prod && prod.product_id) ? (opsCache[prod.product_id] || []) : [];
                                const prodLimit = row.productionId ? getProductionLimit(row.productionId) : 0;

                                const rem = getRemainingForRow(row.id, row.productionId, row.masterOpId);
                                const isOver = row.masterOpId && row.pieces > 0 && row.pieces > rem;
                                const opFull = row.productionId && row.masterOpId ? isOpComplete(row.productionId, row.masterOpId) : false;

                                // Current master op
                                const currentMaster = ops.find((m: any) => m.id === row.masterOpId);
                                const rowEarnings = (currentMaster?.amount_per_piece || 0) * row.pieces;

                                return (
                                    <div key={row.id} className="space-y-1">
                                        <div className="grid grid-cols-1 sm:grid-cols-[1.5fr_1.5fr_130px_40px] gap-2 items-start border p-2 sm:border-0 sm:p-0 rounded-md bg-muted/20 sm:bg-transparent">
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
                                                    {ops.map((op: any) => {
                                                        const complete = row.productionId ? isOpComplete(row.productionId, op.id) : false;
                                                        const opRem = row.productionId
                                                            ? Math.max(0, getProductionLimit(row.productionId) - getDbRecorded(row.productionId, op.id))
                                                            : prodLimit;
                                                        return (
                                                            <SelectItem key={op.id} value={op.id} disabled={complete}>
                                                                {complete && "✓ "}
                                                                {op.name} (₹{formatCurrency(op.amount_per_piece)})
                                                                {complete
                                                                    ? " — Complete"
                                                                    : ` · ${opRem} left`}
                                                            </SelectItem>
                                                        );
                                                    })}
                                                </SelectContent>
                                            </Select>

                                            {/* Mobile Label */}
                                            <label className="sm:hidden text-xs font-semibold mt-2">Quantity</label>
                                            <div className="space-y-0.5">
                                                <Input
                                                    type="number"
                                                    className={`h-9 ${isOver ? "border-destructive focus-visible:ring-destructive" : ""}`}
                                                    placeholder={row.masterOpId && rem < Infinity ? `Max ${rem}` : "Qty"}
                                                    value={row.pieces || ''}
                                                    min={1}
                                                    max={rem < Infinity ? rem : undefined}
                                                    disabled={!!opFull}
                                                    onChange={(e) => handleUpdateRow(row.id, 'pieces', Number(e.target.value))}
                                                />
                                                {/* Remaining hint below input */}
                                                {row.masterOpId && !opFull && rem < Infinity && (
                                                    <p className="text-[10px] text-muted-foreground text-right pr-1">
                                                        {rem} remaining
                                                    </p>
                                                )}
                                                {opFull && (
                                                    <p className="text-[10px] text-green-600 flex items-center gap-1">
                                                        <CheckCircle2 className="h-3 w-3" /> Complete
                                                    </p>
                                                )}
                                            </div>

                                            <div className="flex justify-end mt-2 sm:mt-0">
                                                <Button size="icon" variant="ghost" className="h-9 w-9 text-muted-foreground hover:text-destructive" onClick={() => handleRemoveRow(row.id)}>
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Per-row feedback line */}
                                        {row.masterOpId && row.pieces > 0 && (
                                            <div className={`text-xs flex items-center justify-between px-1 ${isOver ? "text-destructive" : "text-muted-foreground"}`}>
                                                <span className="flex items-center gap-1">
                                                    {isOver
                                                        ? <><AlertTriangle className="h-3 w-3" /> Exceeds limit by {row.pieces - rem} pieces</>
                                                        : <>After entry: {getDbRecorded(row.productionId!, row.masterOpId) + row.pieces} / {prodLimit} pcs</>
                                                    }
                                                </span>
                                                {row.pieces > 0 && currentMaster && (
                                                    <span className="font-medium">₹{formatCurrency(rowEarnings)}</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <Button variant="outline" onClick={handleAddRow} className="w-full border-dashed">
                            <Plus className="mr-2 h-4 w-4" /> Add Another Line
                        </Button>
                    </div>

                    {/* ── Total earnings summary ── */}
                    {rows.some(r => r.masterOpId && r.pieces > 0) && (
                        <div className="rounded-lg border bg-muted/30 p-3 space-y-1.5 text-xs">
                            <p className="font-semibold text-muted-foreground uppercase tracking-wide">Entry Summary</p>
                            {rows.filter(r => r.productionId && r.masterOpId && r.pieces > 0).map(row => {
                                const prod = productions.find(p => p.id === row.productionId);
                                const ops = (prod && prod.product_id) ? (opsCache[prod.product_id] || []) : [];
                                const master = ops.find((m: any) => m.id === row.masterOpId);
                                const earnings = (master?.amount_per_piece || 0) * row.pieces;
                                const rem = getRemainingForRow(row.id, row.productionId, row.masterOpId);
                                const isOver = row.pieces > rem;
                                return (
                                    <div key={row.id} className={`flex justify-between items-center ${isOver ? "text-destructive" : ""}`}>
                                        <span>
                                            {prod?.production_code} · {master?.name}: {row.pieces} pcs
                                            {isOver && ` ⚠ (max ${rem})`}
                                        </span>
                                        <span className="font-medium">₹{formatCurrency(earnings)}</span>
                                    </div>
                                );
                            })}
                            <div className="flex justify-between items-center font-bold pt-2 mt-1 border-t">
                                <span>Total Earnings</span>
                                <span>₹{formatCurrency(totalEarnings)}</span>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="mt-4 pt-2 border-t">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={isSubmitting || hasLimitErrors}
                        title={hasLimitErrors ? "Fix quantity limit errors before saving" : ""}
                    >
                        {isSubmitting ? "Saving..." : "Save All Operations"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default WorkerBulkEntryDialog;
