import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Trash2, Save, X } from "lucide-react";
import { updateWorkerSalaryByOps, deleteWorkerSalary } from "@/Services/salaryService";
import { useToast } from "@/hooks/use-toast";

export type OperationDetail = {
    id?: string;
    productName: string;
    date: string | Date;
    pieces: number;
    ratePerPiece: number;
    total?: number;
    workerId?: string;     // Added
    operationId?: string;  // Added (master ID)
    enteredBy?: string;    // Added
};

type Props = {
    open: boolean;
    onClose: () => void;
    workerName?: string;
    operations?: OperationDetail[];
    onUpdate?: () => void; // Callback to refresh parent list
};

const fmtCurrency = (n: number) =>
    n.toLocaleString(undefined, { style: "currency", currency: "INR", maximumFractionDigits: 2 });

const fmtDate = (d?: string | Date) => {
    if (!d) return "-";
    const dt = typeof d === "string" ? new Date(d) : d;
    return dt.toLocaleDateString();
};

export const WorkerOperationDetailDialog: React.FC<Props> = ({ open, onClose, workerName, operations = [], onUpdate }) => {
    const { toast } = useToast();

    // Edit state
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editPieces, setEditPieces] = useState<number>(0);

    // Show ALL operations, not just top 2
    const opsToShow = operations;

    const grandTotal = useMemo(() => {
        return opsToShow.reduce((sum, op) => {
            const tot = typeof op.total === "number" ? op.total : op.pieces * op.ratePerPiece;
            return sum + tot;
        }, 0);
    }, [opsToShow]);

    const startEdit = (op: OperationDetail, idx: number) => {
        // Prefer op.id, fallback to index if missing (though update requires ID)
        setEditingId(op.id || String(idx));
        setEditPieces(op.pieces);
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditPieces(0);
    };

    const handleSave = async (op: OperationDetail) => {
        if (!op.workerId || !op.operationId || !op.date) {
            toast({ title: "Error", description: "Missing record details for update", variant: "destructive" });
            return;
        }

        try {
            const newTotal = editPieces * op.ratePerPiece;
            const dateStr = op.date instanceof Date ? op.date.toISOString() : String(op.date);

            await updateWorkerSalaryByOps(op.workerId, op.operationId, dateStr, {
                pieces_done: editPieces,
                total_amount: newTotal
            });

            toast({ title: "Updated", description: "Operation updated successfully" });
            setEditingId(null);
            if (onUpdate) onUpdate(); // Refresh parent
        } catch (err: any) {
            console.error("Update failed", err);
            toast({ title: "Update Failed", description: err.message, variant: "destructive" });
        }
    };

    const handleDelete = async (op: OperationDetail) => {
        if (!confirm("Are you sure you want to delete this record?")) return;

        if (!op.workerId || !op.operationId || !op.date) {
            toast({ title: "Error", description: "Missing record details for delete", variant: "destructive" });
            return;
        }

        try {
            const dateStr = op.date instanceof Date ? op.date.toISOString() : String(op.date);
            await deleteWorkerSalary(op.workerId, op.operationId, dateStr);

            toast({ title: "Deleted", description: "Operation record deleted" });
            if (onUpdate) onUpdate(); // Refresh parent
        } catch (err: any) {
            console.error("Delete failed", err);
            toast({ title: "Delete Failed", description: err.message, variant: "destructive" });
        }
    };

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Worker operation details"
        >
            <div
                className="fixed inset-0 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
                aria-hidden="true"
            />
            <div className="relative z-10 w-full max-w-4xl rounded-md bg-white p-6 shadow-lg dark:bg-slate-800 max-h-[90vh] flex flex-col">
                <header className="mb-4 flex items-start justify-between flex-shrink-0">
                    <div>
                        <h3 className="text-lg font-semibold">
                            Operation details {workerName ? `– ${workerName}` : ""}
                        </h3>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            Manage operation entries for the selected worker
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        aria-label="Close"
                        className="ml-4 rounded p-1.5 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
                    >
                        ✕
                    </button>
                </header>

                <div className="overflow-y-auto flex-1">
                    <table className="w-full min-w-[560px] table-auto">
                        <thead className="sticky top-0 bg-white dark:bg-slate-800 z-10 shadow-sm">
                            <tr className="text-left text-sm text-slate-600 dark:text-slate-300">
                                <th className="px-3 py-2">Product</th>
                                <th className="px-3 py-2">Date</th>

                                <th className="px-3 py-2 text-right">Pieces</th>
                                <th className="px-3 py-2 text-right">Rate / piece</th>
                                <th className="px-3 py-2 text-right">Total</th>
                                <th className="px-3 py-2">Entered By</th>
                                <th className="px-3 py-2 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {opsToShow.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-3 py-6 text-center text-sm text-slate-500">
                                        No operations to display
                                    </td>
                                </tr>
                            ) : (
                                opsToShow.map((op, i) => {
                                    const isEditing = editingId === (op.id || String(i));
                                    const total = typeof op.total === "number" ? op.total : op.pieces * op.ratePerPiece;

                                    return (
                                        <tr key={op.id ?? i} className="border-t">
                                            <td className="px-3 py-3 align-middle">{op.productName}</td>
                                            <td className="px-3 py-3 align-middle">{fmtDate(op.date)}</td>


                                            <td className="px-3 py-3 align-middle text-right">
                                                {isEditing ? (
                                                    <Input
                                                        type="number"
                                                        className="w-20 text-right h-8 ml-auto"
                                                        value={editPieces}
                                                        onChange={(e) => setEditPieces(Number(e.target.value))}
                                                    />
                                                ) : (
                                                    op.pieces
                                                )}
                                            </td>

                                            <td className="px-3 py-3 align-middle text-right">{fmtCurrency(op.ratePerPiece)}</td>

                                            <td className="px-3 py-3 align-middle text-right">
                                                {isEditing
                                                    ? fmtCurrency(editPieces * op.ratePerPiece)
                                                    : fmtCurrency(total)
                                                }
                                            </td>
                                            <td className="px-3 py-3 align-middle text-sm text-muted-foreground capitalize">
                                                {op.enteredBy || "-"}
                                            </td>

                                            <td className="px-3 py-3 align-middle text-right">
                                                <div className="flex justify-end gap-2">
                                                    {isEditing ? (
                                                        <>
                                                            <Button size="sm" variant="ghost" onClick={() => handleSave(op)} className="h-8 w-8 p-0 text-green-600">
                                                                <Save className="h-4 w-4" />
                                                            </Button>
                                                            <Button size="sm" variant="ghost" onClick={cancelEdit} className="h-8 w-8 p-0 text-slate-500">
                                                                <X className="h-4 w-4" />
                                                            </Button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Button size="sm" variant="ghost" onClick={() => startEdit(op, i)} className="h-8 w-8 p-0">
                                                                <Pencil className="h-4 w-4 text-slate-500 hover:text-blue-600" />
                                                            </Button>
                                                            <Button size="sm" variant="ghost" onClick={() => handleDelete(op)} className="h-8 w-8 p-0">
                                                                <Trash2 className="h-4 w-4 text-slate-500 hover:text-red-600" />
                                                            </Button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                        {opsToShow.length > 0 && (
                            <tfoot className="sticky bottom-0 bg-slate-50 dark:bg-slate-900 border-t font-semibold">
                                <tr>
                                    <td colSpan={4} className="px-3 py-3 text-right">
                                        Grand total
                                    </td>
                                    <td className="px-3 py-3 text-right">{fmtCurrency(grandTotal)}</td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>

                <div className="mt-4 flex justify-end flex-shrink-0">
                    <button
                        onClick={onClose}
                        className="rounded-md bg-slate-100 px-4 py-2 text-sm text-slate-800 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default WorkerOperationDetailDialog;