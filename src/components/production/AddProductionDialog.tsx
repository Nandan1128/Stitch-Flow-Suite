// src/components/production/AddProductionDialog.tsx
import React from "react";
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
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Product } from "@/types/product";
import { useForm } from "react-hook-form";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useIsMobile } from "@/hooks/use-mobile";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Product[];
  onAddProduction: (row: any) => void;
}

interface FormValues {
  productId: string;
  productionId: string;
  poNumber: string;
  color: string;
  totalFabric: number;
  average: number;
  totalQuantity: number;
}

export const AddProductionDialog: React.FC<Props> = ({ open, onOpenChange, products, onAddProduction }) => {
  const { toast } = useToast();
  const form = useForm<FormValues>({
    defaultValues: {
      productId: "",
      productionId: "",
      poNumber: "",
      color: "",
      totalFabric: 0,
      average: 0,
      totalQuantity: 0,
    },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      const row = {
        product_id: values.productId,
        production_code: values.productionId,
        po_number: values.poNumber,
        color: values.color,
        total_fabric: values.totalFabric,
        average: values.average,
        total_quantity: values.totalQuantity,
        created_by: "admin",
        created_at: new Date().toISOString(),
      };
      onAddProduction(row);
      form.reset();
    } catch (err: any) {
      console.error("prepare production error", err);
      toast({ title: "Error", description: err?.message || String(err), variant: "destructive" });
    }
  };

  const isMobile = useIsMobile();

  const renderForm = () => (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="productId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Product</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} ({p.product_code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="productionId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Production Code</FormLabel>
                <FormControl>
                  <Input placeholder="PRD-001" {...field} className="h-9" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="poNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>P.O Number</FormLabel>
                <FormControl>
                  <Input placeholder="PO-123" {...field} className="h-9" />
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
                  <Input placeholder="Blue" {...field} className="h-9" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="totalQuantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Total Quantity</FormLabel>
                <FormControl>
                  <Input type="number" {...field} className="h-9" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="totalFabric"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Total Fabric (mtr.)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" {...field} className="h-9" />
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
                <FormLabel>Average (P.O)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" {...field} className="h-9" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t sticky bottom-0 bg-background">
          <Button type="submit" className="flex-1">Save Production</Button>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[96vh]">
          <DrawerHeader className="text-left border-b pb-4">
            <DrawerTitle>Add Production</DrawerTitle>
            <DrawerDescription>Choose product and fill production details.</DrawerDescription>
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
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader className="border-b pb-4">
          <DialogTitle>Add Production</DialogTitle>
          <DialogDescription>Choose product and fill production details.</DialogDescription>
        </DialogHeader>
        <div className="py-2">
          {renderForm()}
        </div>
      </DialogContent>
    </Dialog>
  );
};
