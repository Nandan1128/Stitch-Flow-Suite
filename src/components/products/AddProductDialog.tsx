// src/components/products/AddProductDialog.tsx
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Product } from '@/types/product';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Package, Plus, X } from 'lucide-react';
import { uploadPatternImage, createProduct } from "@/Services/productService";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png"];

const operationSchema = z.object({
  name: z.string().min(1),
  operation_code: z.string().min(1),
  amount_per_piece: z.coerce.number().min(0),
});

const formSchema = z.object({
  name: z.string().min(1),
  product_code: z.string().min(1),
  design_no: z.string().min(1),
  color: z.string().min(1),
  patternImage: z.instanceof(File).optional().nullable(),
  material_cost: z.coerce.number().min(0),
  thread_cost: z.coerce.number().min(0),
  other_costs: z.coerce.number().min(0),
  operations: z.array(operationSchema).min(1),
});

type FormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddProduct: (product: Product) => void;
}

export const AddProductDialog: React.FC<Props> = ({ open, onOpenChange, onAddProduct }) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [patternImagePreview, setPatternImagePreview] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      product_code: "",
      design_no: "",
      color: "",
      patternImage: null,
      material_cost: 0,
      thread_cost: 0,
      other_costs: 0,
      operations: [{ name: "", operation_code: "", amount_per_piece: 0 }],
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "operations",
  });

  const onSubmit = async (values: FormValues) => {
    try {
      const imageUrl = await uploadPatternImage(values.patternImage || null);

      const productRow = {
        name: values.name,
        product_code: values.product_code,
        design_no: values.design_no,
        color: values.color,
        pattern_image_url: imageUrl,
        material_cost: values.material_cost,
        thread_cost: values.thread_cost,
        other_costs: values.other_costs,
        created_by: user?.id ?? "admin",
        is_active: true,
      };

      const operations = values.operations.map(op => ({
        name: op.name,
        operation_code: op.operation_code,
        amount_per_piece: op.amount_per_piece,
        entered_by: user?.name ?? user?.email ?? user?.id ?? "system",
      }));

      const product = await createProduct(productRow, operations);

      toast({
        title: "Product Added",
        description: `${values.name} has been added.`,
      });

      onAddProduct(product);
      form.reset();
      setPatternImagePreview(null);
      onOpenChange(false);
    } catch (err: any) {
      console.error("Add product error:", err);
      toast({
        title: "Error",
        description: err?.message || "Failed to add product",
        variant: "destructive",
      });
    }
  };

  const handlePatternImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      toast({ title: "Error", description: "Image must be < 10MB", variant: "destructive" });
      return;
    }
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      toast({ title: "Error", description: "Only JPG/JPEG/PNG supported", variant: "destructive" });
      return;
    }

    form.setValue("patternImage", file);
    setPatternImagePreview(URL.createObjectURL(file));
  };

  const isMobile = useIsMobile();

  const renderForm = () => (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField control={form.control} name="name" render={({ field }) => (
            <FormItem>
              <FormLabel>Product Name</FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="product_code" render={({ field }) => (
            <FormItem>
              <FormLabel>Product ID (code)</FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField control={form.control} name="design_no" render={({ field }) => (
            <FormItem>
              <FormLabel>Design Number</FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="color" render={({ field }) => (
            <FormItem>
              <FormLabel>Color</FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <div>
          <Label>Pattern Image</Label>
          <div className="mt-2">
            <label htmlFor="pattern-image-upload" className="cursor-pointer flex flex-col items-center justify-center border border-dashed rounded-md p-6 hover:bg-gray-50">
              {patternImagePreview ? (
                <div className="text-center">
                  <img src={patternImagePreview} alt="Pattern" className="h-32 mx-auto object-contain" />
                  <p className="text-xs text-center mt-2">Click to change</p>
                </div>
              ) : (
                <div className="text-center">
                  <Package className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="text-sm mt-2">Upload pattern image</p>
                </div>
              )}
            </label>
            <Input id="pattern-image-upload" type="file" className="sr-only" accept=".jpg,.jpeg,.png" onChange={handlePatternImageChange} />
          </div>
        </div>

        <div className="border rounded-md p-4">
          <h3 className="text-sm font-medium mb-3">Cost Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormField control={form.control} name="material_cost" render={({ field }) => (
              <FormItem>
                <FormLabel>Material Cost (₹)</FormLabel>
                <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="thread_cost" render={({ field }) => (
              <FormItem>
                <FormLabel>Thread Cost (₹)</FormLabel>
                <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="other_costs" render={({ field }) => (
              <FormItem>
                <FormLabel>Other Costs (₹)</FormLabel>
                <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>
        </div>

        <div className="border rounded-md p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-medium">Operations</h3>
            <Button type="button" variant="outline" size="sm" onClick={() => append({ name: "", operation_code: "", amount_per_piece: 0 })}>
              <Plus className="h-4 w-4 mr-1" /> Add Operation
            </Button>
          </div>

          <div className="space-y-4">
            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 mb-3 pb-3 border-b last:border-b-0 items-end">
                <FormField control={form.control} name={`operations.${index}.name`} render={({ field }) => (
                  <FormItem>
                    <FormLabel className={index && !isMobile ? "sr-only" : ""}>Operation Name</FormLabel>
                    <FormControl><Input placeholder="Operation name" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name={`operations.${index}.operation_code`} render={({ field }) => (
                  <FormItem>
                    <FormLabel className={index && !isMobile ? "sr-only" : ""}>Operation Code</FormLabel>
                    <FormControl><Input placeholder="Code" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="flex items-end gap-2">
                  <FormField control={form.control} name={`operations.${index}.amount_per_piece`} render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel className={index && !isMobile ? "sr-only" : ""}>Amount/Piece (₹)</FormLabel>
                      <FormControl><Input type="number" step="0.01" {...field} onChange={e => field.onChange(Number(e.target.value))} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  {fields.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="mb-[2px] shrink-0">
                      <X className="h-4 w-4" />
                      <span className="sr-only">Remove</span>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" className="flex-1 sm:flex-initial">Save Product</Button>
        </div>
      </form>
    </Form>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="px-4 max-h-[90vh]">
          <DrawerHeader className="text-left px-0">
            <DrawerTitle>Add New Product</DrawerTitle>
            <DrawerDescription>Fill in the details to add a new product.</DrawerDescription>
          </DrawerHeader>
          <div className="overflow-y-auto pb-6">
            {renderForm()}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Product</DialogTitle>
          <DialogDescription>Fill in the details to add a new product to the system.</DialogDescription>
        </DialogHeader>
        {renderForm()}
      </DialogContent>
    </Dialog>
  );
};
