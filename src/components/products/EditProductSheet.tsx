import React, { useEffect, useState } from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { useForm, useFieldArray } from "react-hook-form";
import { Product, Operation } from "@/types/product";
import { useToast } from "@/hooks/use-toast";
import { Check, X, Plus, Package } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { uploadPatternImage } from "@/Services/productService";
import { useIsMobile } from "@/hooks/use-mobile";

interface EditProductSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  onUpdateProduct: (id: string, updatedProduct: Partial<Product>, operations: any[]) => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png"];

const operationSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  operation_code: z.string(),
  amount_per_piece: z.coerce.number(),
  product_id: z.string().optional(),
});

const formSchema = z.object({
  name: z.string(),
  product_code: z.string(),
  design_no: z.string(),
  color: z.string(),
  patternImage: z.instanceof(File).optional().nullable(),
  material_cost: z.coerce.number(),
  thread_cost: z.coerce.number(),
  other_costs: z.coerce.number(),
  operations: z.array(operationSchema),
});

type FormValues = z.infer<typeof formSchema>;

export const EditProductSheet: React.FC<EditProductSheetProps> = ({ open, onOpenChange, product, onUpdateProduct }) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [patternImagePreview, setPatternImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      product_code: '',
      design_no: '',
      color: '',
      patternImage: null,
      material_cost: 0,
      thread_cost: 0,
      other_costs: 0,
      operations: []
    }
  });

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "operations"
  });

  useEffect(() => {
    if (!product) return;
    // Populate form with DB fields (snake_case)
    const ops = (product.operations || []).map(op => ({
      id: op.id,
      name: op.name,
      operation_code: (op as any).operation_code || (op as any).operationId,
      amount_per_piece: op.amount_per_piece,
      product_id: op.product_id || product.id
    }));

    form.reset({
      name: product.name,
      product_code: product.product_code,
      design_no: product.design_no,
      color: product.color,
      patternImage: null,
      material_cost: Number(product.material_cost || 0),
      thread_cost: Number(product.thread_cost || 0),
      other_costs: Number(product.other_costs || 0),
      operations: ops
    });

    replace(ops);
    if (product.pattern_image_url) setPatternImagePreview(product.pattern_image_url as string);
    else setPatternImagePreview(null);
  }, [product, form, replace]);

  const onSubmit = async (data: FormValues) => {
    if (!product) return;

    try {
      const updatedProduct: Partial<Product> = {
        name: data.name,
        product_code: data.product_code,
        design_no: data.design_no,
        color: data.color,
        material_cost: data.material_cost,
        thread_cost: data.thread_cost,
        other_costs: data.other_costs,
      };

      if (data.patternImage) {
        toast({ title: "Uploading...", description: "Uploading pattern image" });
        const imageUrl = await uploadPatternImage(data.patternImage);
        if (imageUrl) updatedProduct.pattern_image_url = imageUrl;
      }

      // operations array (map to DB shape)
      const operations = data.operations.map(op => ({
        id: op.id,
        name: op.name,
        operation_code: op.operation_code,
        amount_per_piece: op.amount_per_piece,
        product_id: product.id,
        entered_by: user?.name ?? user?.email ?? user?.id ?? "system",
      }));

      setIsSubmitting(true);
      await onUpdateProduct(product.id, updatedProduct, operations);

      toast({
        title: "Product updated",
        description: `${data.name} updated.`,
      });

      onOpenChange(false);
    } catch (err: any) {
      console.error("Update product error:", err);
      toast({
        title: "Error",
        description: err?.message || "Failed to update product",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
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

  if (!product) return null;

  // const isMobile = useIsMobile(); // Moved to top

  const renderForm = () => (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
        <div className="space-y-4">
          <div className="border rounded-md p-4">
            <h3 className="text-sm font-medium mb-3">Basic Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Product Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="product_code" render={({ field }) => (
                <FormItem><FormLabel>Product Code</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
          </div>

          <div className="border rounded-md p-4">
            <h3 className="text-sm font-medium mb-3">Design Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <FormField control={form.control} name="design_no" render={({ field }) => (
                <FormItem><FormLabel>Design Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="color" render={({ field }) => (
                <FormItem><FormLabel>Color</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>

            <div>
              <Label>Pattern Image</Label>
              <div className="mt-1 flex items-center">
                <label htmlFor="pattern-image" className="cursor-pointer flex items-center justify-center border border-dashed rounded-md p-4 w-full">
                  {patternImagePreview ? (
                    <div className="w-full"><img src={patternImagePreview} alt="Pattern" className="h-32 object-contain mx-auto" /><p className="text-xs text-center mt-2">Click to change</p></div>
                  ) : (
                    <div className="text-center"><Package className="mx-auto h-12 w-12 text-gray-400" /><p className="mt-1 text-sm text-gray-500">Upload pattern image</p></div>
                  )}
                </label>
                <Input id="pattern-image" type="file" className="hidden" accept=".jpg,.jpeg,.png" onChange={handlePatternImageChange} />
              </div>
            </div>
          </div>

          <div className="border rounded-md p-4">
            <h3 className="text-sm font-medium mb-3">Cost Information</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <FormField control={form.control} name="material_cost" render={({ field }) => (
                <FormItem><FormLabel>Material Cost (₹)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="thread_cost" render={({ field }) => (
                <FormItem><FormLabel>Thread Cost (₹)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="other_costs" render={({ field }) => (
                <FormItem><FormLabel>Other Costs (₹)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
          </div>

          <div className="border rounded-md p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-medium">Operations</h3>
              <Button type="button" variant="outline" size="sm" onClick={() => append({ id: `new-${Date.now()}`, name: "", operation_code: "", amount_per_piece: 0, product_id: product.id })}>
                <Plus className="mr-1 h-4 w-4" /> Add Operation
              </Button>
            </div>

            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-[1fr_1fr_auto] gap-3 mb-3 pb-3 border-b last:border-b-0">
                <FormField control={form.control} name={`operations.${index}.name`} render={({ field }) => (
                  <FormItem><FormLabel className={index ? "sr-only" : ""}>Operation Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name={`operations.${index}.operation_code`} render={({ field }) => (
                  <FormItem><FormLabel className={index ? "sr-only" : ""}>Operation Code</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="flex items-end gap-2">
                  <FormField control={form.control} name={`operations.${index}.amount_per_piece`} render={({ field }) => (
                    <FormItem><FormLabel className={index ? "sr-only" : ""}>Amt/Pc</FormLabel><FormControl><Input type="number" className="w-16 sm:w-20" {...field} onChange={e => field.onChange(Number(e.target.value))} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="mb-[2px]"><X className="h-4 w-4" /></Button>
                </div>
                <input type="hidden" {...form.register(`operations.${index}.id`)} />
                <input type="hidden" {...form.register(`operations.${index}.product_id`)} value={product.id} />
              </div>
            ))}
          </div>
        </div>

        <div className={`flex justify-end gap-3 ${isMobile ? 'pb-6' : 'mt-6'}`}>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}><X className="mr-1 h-4 w-4" /> Cancel</Button>
          <Button type="submit" disabled={isSubmitting}>
            <Check className="mr-1 h-4 w-4" />
            {isSubmitting ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </Form>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="px-4 max-h-[90vh]">
          <DrawerHeader className="text-left px-0">
            <DrawerTitle>Edit Product</DrawerTitle>
            <DrawerDescription>Update information for {product.name}</DrawerDescription>
          </DrawerHeader>
          <div className="overflow-y-auto">
            {renderForm()}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md md:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Edit Product: {product.name}</SheetTitle>
          <SheetDescription>View and update product information. Click save when you're done.</SheetDescription>
        </SheetHeader>
        {renderForm()}
      </SheetContent>
    </Sheet>
  );
};
