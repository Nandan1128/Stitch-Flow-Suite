import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { WorkerSalary, WorkerSalaryFormData } from '@/types/salary';
import { getWorkers } from '@/Services/workerService';
import { getOperationsByProductionId } from '@/Services/productionService';
import { useAuth } from '@/contexts/AuthContext';
import { v4 as uuidv4 } from 'uuid';
import { Production } from '@/types/production';
import { useIsMobile } from "@/hooks/use-mobile";

interface AddWorkerSalaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddSalary: (salary: WorkerSalary) => void;
  productions?: Production[];
}

export const AddWorkerSalaryDialog: React.FC<AddWorkerSalaryDialogProps> = ({
  open,
  onOpenChange,
  onAddSalary,
  productions = []
}) => {
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const { user } = useAuth();

  const [formData, setFormData] = useState<WorkerSalaryFormData>({
    workerId: '',
    productId: '',
    operationId: '',
    piecesDone: 0,
    amountPerPiece: 0,
    totalAmount: 0,
  });

  const [workers, setWorkers] = useState<any[]>([]);
  const [selectedWorker, setSelectedWorker] = useState<any | null>(null);
  const [selectedOperation, setSelectedOperation] = useState<any | null>(null);
  const [selectedProduction, setSelectedProduction] = useState<Production | null>(null);
  const [availableOperations, setAvailableOperations] = useState<any[]>([]);

  useEffect(() => {
    if (open) {
      setFormData({
        workerId: '',
        productId: '',
        operationId: '',
        piecesDone: 0,
        amountPerPiece: 0,
        totalAmount: 0,
      });
      setSelectedWorker(null);
      setSelectedOperation(null);
      setSelectedProduction(null);
    }
  }, [open]);

  useEffect(() => {
    (async () => {
      try {
        const w = await getWorkers();
        setWorkers(w || []);
      } catch (err) {
        console.error('Failed to load workers', err);
      }
    })();
  }, []);

  const handleWorkerChange = (value: string) => {
    const worker = workers.find(w => w.id === value);
    if (worker) {
      setSelectedWorker(worker);
      setFormData(prev => ({
        ...prev,
        workerId: value,
      }));
    }
  };

  const handleProductionChange = async (value: string) => {
    const production = productions.find(p => p.id === value);
    if (production) {
      setSelectedProduction(production);
      try {
        const ops = await getOperationsByProductionId(value);
        const uniqueOpsMap = new Map();
        ops.forEach((o: any) => {
          if (!o.operation_id) return;
          if (!uniqueOpsMap.has(o.operation_id)) {
            uniqueOpsMap.set(o.operation_id, {
              id: o.operation_id,
              name: o.operations?.name || "Unknown Operation",
              ratePerPiece: o.operations?.amount_per_piece || 0,
            });
          }
        });
        const mappedOps = Array.from(uniqueOpsMap.values());
        setAvailableOperations(mappedOps);
      } catch (e) {
        console.error("Failed to load operations", e);
        setAvailableOperations([]);
      }
      setFormData(prev => ({
        ...prev,
        productId: value,
        operationId: '',
        amountPerPiece: 0,
        piecesDone: 0,
        totalAmount: 0,
      }));
    }
  };

  const handleOperationChange = (value: string) => {
    const operation = availableOperations.find(op => op.id === value);
    if (operation) {
      setSelectedOperation(operation);
      setFormData(prev => ({
        ...prev,
        operationId: value,
        amountPerPiece: operation.ratePerPiece,
        totalAmount: prev.piecesDone * operation.ratePerPiece
      }));
    }
  };

  const handlePiecesDoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const pieces = parseInt(e.target.value) || 0;
    setFormData(prev => ({
      ...prev,
      piecesDone: pieces,
      totalAmount: pieces * prev.amountPerPiece,
    }));
  };

  const handleAmountPerPieceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const amount = parseFloat(e.target.value) || 0;
    setFormData(prev => ({
      ...prev,
      amountPerPiece: amount,
      totalAmount: prev.piecesDone * amount,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.workerId || !formData.productId || !formData.operationId || formData.piecesDone <= 0) {
      toast({
        title: "Validation Error",
        description: "Please fill all required fields with valid values.",
        variant: "destructive",
      });
      return;
    }
    const newSalary: WorkerSalary = {
      id: uuidv4(),
      workerId: formData.workerId,
      workerName: selectedWorker?.name,
      productId: formData.productId,
      productName: selectedProduction?.name,
      date: new Date(),
      operationId: formData.operationId,
      operationName: selectedOperation?.name,
      piecesDone: formData.piecesDone,
      amountPerPiece: formData.amountPerPiece,
      totalAmount: formData.totalAmount,
      paid: false,
    };
    onAddSalary(newSalary);
    onOpenChange(false);
  };

  const renderForm = () => (
    <form onSubmit={handleSubmit} className="space-y-4 py-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="worker">Worker</Label>
          <Select value={formData.workerId} onValueChange={handleWorkerChange}>
            <SelectTrigger id="worker" className="h-9">
              <SelectValue placeholder="Select worker" />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {workers.map((worker) => (
                <SelectItem key={worker.id} value={worker.id}>
                  {worker.name} ({worker.id})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="production">Production</Label>
          <Select value={formData.productId} onValueChange={handleProductionChange}>
            <SelectTrigger id="production" className="h-9">
              <SelectValue placeholder="Select production" />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {productions.map((production) => (
                <SelectItem key={production.id} value={production.id}>
                  {production.productName || production.name || "Unnamed Production"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="operation">Operation</Label>
          <Select
            value={formData.operationId}
            onValueChange={handleOperationChange}
            disabled={!selectedProduction}
          >
            <SelectTrigger id="operation" className="h-9">
              <SelectValue placeholder="Select operation" />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {availableOperations.map((operation) => (
                <SelectItem key={operation.id} value={operation.id}>
                  {operation.name} (₹{operation.ratePerPiece}/piece)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="piecesDone">Pieces Completed</Label>
          <Input
            id="piecesDone"
            type="number"
            min="1"
            placeholder="Enter pieces"
            value={formData.piecesDone || ''}
            onChange={handlePiecesDoneChange}
            className="h-9"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="amountPerPiece">Rate per Piece (₹)</Label>
          <Input
            id="amountPerPiece"
            type="number"
            step="0.01"
            min="0"
            placeholder="Enter rate"
            value={formData.amountPerPiece || ''}
            onChange={handleAmountPerPieceChange}
            readOnly={!!selectedOperation}
            className={`h-9 ${selectedOperation ? "bg-muted" : ""}`}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="totalAmount">Total Amount (₹)</Label>
          <Input
            id="totalAmount"
            type="number"
            readOnly
            value={formData.totalAmount || 0}
            className="h-9 bg-muted"
          />
        </div>
      </div>

      {selectedProduction && (
        <div className="p-3 bg-primary/5 rounded-lg border border-primary/10 text-xs text-muted-foreground space-y-1">
          <p className="font-medium text-primary">Selected Production:</p>
          <p>{selectedProduction.productName || selectedProduction.name} ({selectedProduction.productId})</p>
          {selectedOperation && (
            <p className="font-medium">Operation Rate: ₹{selectedOperation.ratePerPiece} per piece</p>
          )}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t sticky bottom-0 bg-background text-black">
        <Button type="submit" className="flex-1">Add Salary Record</Button>
        <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">Cancel</Button>
      </div>
    </form>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[96vh]">
          <DrawerHeader className="text-left border-b pb-4">
            <DrawerTitle>Add Worker Salary</DrawerTitle>
            <DrawerDescription>Create a new salary record.</DrawerDescription>
          </DrawerHeader>
          <div className="px-4 overflow-y-auto pb-6">
            {renderForm()}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b pb-4">
          <DialogTitle>Add Worker Salary</DialogTitle>
          <DialogDescription>
            Create a new salary record for work completed by a worker.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          {renderForm()}
        </div>
      </DialogContent>
    </Dialog>
  );
};
