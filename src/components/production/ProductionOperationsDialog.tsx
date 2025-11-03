import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Worker } from '@/types/worker';
import { Production } from '@/types/production';

interface ProductionOperationsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  production: Production | null;
  availableWorkers: Worker[];
  onAssignWorker: (productionId: string, operationId: string, workerId: string) => void;
}

const ProductionOperationsDialog: React.FC<ProductionOperationsDialogProps> = ({ open, onOpenChange, production, availableWorkers, onAssignWorker }) => {
  if (!production) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>Assign Workers to Operations</DialogTitle>
      </DialogHeader>
      <DialogContent>
        <div>
          {production.operations.map((operation) => (
            <div key={operation.id} className="mb-4">
              <h3 className="text-lg">{operation.name}</h3>
              <Select
                onValueChange={(workerId) => onAssignWorker(production.id, operation.id, workerId)}
                value={operation.assignedWorkerId || ''}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a worker" />
                </SelectTrigger>
                <SelectItem value="">None</SelectItem>
                {availableWorkers.map((worker) => (
                  <SelectItem key={worker.id} value={worker.id}>
                    {worker.name}
                  </SelectItem>
                ))}
              </Select>
            </div>
          ))}
        </div>
      </DialogContent>
      <DialogFooter>
        <Button onClick={() => onOpenChange(false)}>Close</Button>
      </DialogFooter>
    </Dialog>
  );
};

export default ProductionOperationsDialog;
