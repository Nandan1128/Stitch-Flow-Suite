
import React, { useEffect } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { v4 as uuidv4 } from 'uuid';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Production, ProductionFormData } from '@/types/production';
import { CirclePlus, CircleMinus } from "lucide-react";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Form validation schema
const operationSchema = z.object({
  name: z.string().min(1, "Operation name is required"),
  ratePerPiece: z.coerce.number().min(0, "Rate must be a positive number"),
  assignedWorkerId: z.string().optional(),
});

const formSchema = z.object({
  name: z.string().min(1, "Production name is required"),
  productionId: z.string().min(1, "Production ID is required"),
  poNumber: z.string().min(1, "P.O Number is required"),
  color: z.string().min(1, "Color is required"),
  totalFabric: z.coerce.number().min(0, "Total fabric must be a positive number"),
  average: z.coerce.number().min(0, "Average must be a positive number"),
  totalQuantity: z.coerce.number().min(1, "Total quantity must be at least 1"),
  operations: z.array(operationSchema).min(1, "At least one operation is required"),
});

interface EditProductionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateProduction: (production: Production) => void;
  production: Production | null;
  availableWorkers?: { id: string; name: string }[];
}

interface ExtendedProductionFormData extends ProductionFormData {
  operations: Array<{
    name: string;
    ratePerPiece: number;
    assignedWorkerId?: string;
  }>;
}

export const EditProductionDialog: React.FC<EditProductionDialogProps> = ({
  open,
  onOpenChange,
  onUpdateProduction,
  production,
  availableWorkers = []
}) => {
  const form = useForm<ExtendedProductionFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      productionId: "",
      poNumber: "",
      color: "",
      totalFabric: 0,
      average: 0,
      totalQuantity: 0,
      operations: [{ name: "Cutting", ratePerPiece: 0 }],
    },
  });

  // Update form when production data changes
  useEffect(() => {
    if (production) {
      form.reset({
        name: production.name,
        productionId: production.productionId,
        poNumber: production.poNumber,
        color: production.color,
        totalFabric: production.totalFabric,
        average: production.average,
        totalQuantity: production.totalQuantity,
        operations: production.operations.map(op => ({
          name: op.name,
          ratePerPiece: op.ratePerPiece,
          assignedWorkerId: op.assignedWorkerId || '',
        })),
      });
    }
  }, [form, production]);

  const onSubmit = (values: ExtendedProductionFormData) => {
    if (!production) return;

    // Keep existing IDs for operations that already exist
    const updatedOperations = values.operations.map((op, index) => {
      const existingOp = production.operations[index];
      const selectedWorker = op.assignedWorkerId 
        ? availableWorkers.find(w => w.id === op.assignedWorkerId) 
        : null;
        
      return {
        id: existingOp?.id || uuidv4(),
        name: op.name,
        ratePerPiece: op.ratePerPiece,
        isCompleted: existingOp?.isCompleted || false,
        productionId: production.id,
        assignedWorkerId: op.assignedWorkerId,
        assignedWorkerName: selectedWorker?.name,
      };
    });

    // Create an updated production object
    const updatedProduction: Production = {
      ...production,
      name: values.name,
      productionId: values.productionId,
      poNumber: values.poNumber,
      color: values.color,
      totalFabric: values.totalFabric,
      average: values.average,
      totalQuantity: values.totalQuantity,
      operations: updatedOperations,
    };

    onUpdateProduction(updatedProduction);
    onOpenChange(false);
  };

  const addOperation = () => {
    const currentOperations = form.getValues().operations || [];
    form.setValue("operations", [
      ...currentOperations,
      { name: "", ratePerPiece: 0 }
    ]);
  };

  const removeOperation = (index: number) => {
    const currentOperations = form.getValues().operations;
    if (currentOperations.length > 1) {
      form.setValue(
        "operations",
        currentOperations.filter((_, i) => i !== index)
      );
    }
  };

  if (!production) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Production</DialogTitle>
          <DialogDescription>
            Update the details for this production.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Production Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter production name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="productionId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Production ID</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter production ID" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="poNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>P.O Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter P.O number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Color</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter color" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="totalFabric"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Fabric (mtr.)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="average"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Average (as per P.O)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="totalQuantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Quantity (pieces)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator className="my-4" />
            
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Operations</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addOperation}
                >
                  <CirclePlus className="mr-2 h-4 w-4" />
                  Add Operation
                </Button>
              </div>

              {form.getValues().operations?.map((_, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto_auto] gap-4 mb-4 items-start">
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name={`operations.${index}.name`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Operation Name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Cutting, Stitching" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name={`operations.${index}.ratePerPiece`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Rate (per piece)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01" 
                              placeholder="0.00"
                              className="w-28" 
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name={`operations.${index}.assignedWorkerId`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Assigned Worker</FormLabel>
                          <Select
                            value={field.value || "none"}
                            onValueChange={(value) => field.onChange(value === "none" ? undefined : value)}
                          >
                            <FormControl>
                              <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Select worker" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              {availableWorkers.map(worker => (
                                <SelectItem key={worker.id} value={worker.id}>
                                  {worker.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="pt-8">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeOperation(index)}
                      disabled={form.getValues().operations.length <= 1}
                    >
                      <CircleMinus className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">Update Production</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
