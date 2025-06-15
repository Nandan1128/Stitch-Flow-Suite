import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Employee, EmployeeFormData } from '@/types/employee';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { FileImage, Upload } from 'lucide-react';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png"];

const formSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  employeeId: z.string().min(3, "Employee ID must be at least 3 characters"),
  address: z.string().min(5, "Address must be at least 5 characters"),
  permanentAddress: z.string().optional().nullable(),
  currentAddress: z.string().optional().nullable(),
  mobileNumber: z.string().min(10, "Mobile number must be at least 10 digits"),
  emergencyNumber: z.string().min(10, "Emergency number must be at least 10 digits"),
  idProof: z.string().min(5, "ID proof must be at least 5 characters"),
  idProofImage: z.instanceof(File).optional().refine(
    (file) => !file || file.size <= MAX_FILE_SIZE,
    'Max file size is 10MB'
  ).refine(
    (file) => !file || ACCEPTED_IMAGE_TYPES.includes(file.type),
    'Only .jpg, .jpeg, and .png formats are supported'
  ).nullable().optional(),
  bankAccountDetail: z.string().min(5, "Bank account details must be at least 5 characters"),
  bankImage: z.instanceof(File).optional().refine(
    (file) => !file || file.size <= MAX_FILE_SIZE,
    'Max file size is 10MB'
  ).refine(
    (file) => !file || ACCEPTED_IMAGE_TYPES.includes(file.type),
    'Only .jpg, .jpeg, and .png formats are supported'
  ).nullable().optional(),
  salary: z.coerce.number().min(1, "Salary must be at least 1"),
  isActive: z.boolean().default(true),
});

interface AddEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddEmployee: (employee: Employee) => void;
}

export const AddEmployeeDialog: React.FC<AddEmployeeDialogProps> = ({ 
  open, 
  onOpenChange,
  onAddEmployee 
}) => {
  const { toast } = useToast();
  const [idProofPreview, setIdProofPreview] = useState<string | null>(null);
  const [bankImagePreview, setBankImagePreview] = useState<string | null>(null);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      employeeId: "",
      address: "",
      permanentAddress: "",
      currentAddress: "",
      mobileNumber: "",
      emergencyNumber: "",
      idProof: "",
      idProofImage: null,
      bankAccountDetail: "",
      bankImage: null,
      salary: 0,
      isActive: true,
    }
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    const newEmployee: Employee = {
      id: Math.random().toString(36).substring(2, 11),
      name: values.name,
      employeeId: values.employeeId,
      address: values.address,
      mobileNumber: values.mobileNumber,
      emergencyNumber: values.emergencyNumber,
      idProof: values.idProof,
      idProofImageUrl: idProofPreview || '/placeholder.svg',
      bankAccountDetail: values.bankAccountDetail,
      bankImageUrl: bankImagePreview || '/placeholder.svg',
      salary: values.salary,
      isActive: values.isActive,
      createdBy: 'admin',
      createdAt: new Date(),
      permanentAddress: values.permanentAddress || "",
      currentAddress: values.currentAddress || ""
    };

    onAddEmployee(newEmployee);
    toast({
      title: "Employee added",
      description: `${values.name} has been successfully added`,
    });
    onOpenChange(false);
    form.reset();
    setIdProofPreview(null);
    setBankImagePreview(null);
  };

  const handleIdProofImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: "Error",
          description: "ID Proof image must be less than 10MB",
          variant: "destructive",
        });
        return;
      }
      
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        toast({
          title: "Error",
          description: "Only .jpg, .jpeg, and .png formats are supported",
          variant: "destructive",
        });
        return;
      }
      
      form.setValue("idProofImage", file);
      setIdProofPreview(URL.createObjectURL(file));
    }
  };

  const handleBankImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: "Error",
          description: "Bank document must be less than 10MB",
          variant: "destructive",
        });
        return;
      }
      
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        toast({
          title: "Error",
          description: "Only .jpg, .jpeg, and .png formats are supported",
          variant: "destructive",
        });
        return;
      }
      
      form.setValue("bankImage", file);
      setBankImagePreview(URL.createObjectURL(file));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Employee</DialogTitle>
          <DialogDescription>
            Fill in the details to add a new employee to the system.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="employeeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employee ID</FormLabel>
                    <FormControl>
                      <Input placeholder="EMP123" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Textarea placeholder="123 Main St, City, State" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="mobileNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mobile Number</FormLabel>
                    <FormControl>
                      <Input placeholder="9876543210" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="emergencyNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Emergency Contact</FormLabel>
                    <FormControl>
                      <Input placeholder="9876543210" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="idProof"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ID Proof</FormLabel>
                    <FormControl>
                      <Input placeholder="Aadhar/PAN/Voter ID" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div>
                <Label>ID Proof Image</Label>
                <div className="mt-2">
                  <Label 
                    htmlFor="id-proof-upload" 
                    className="cursor-pointer flex flex-col items-center justify-center border border-dashed border-gray-300 rounded-md p-4 hover:bg-gray-50"
                  >
                    {idProofPreview ? (
                      <div className="text-center">
                        <img 
                          src={idProofPreview} 
                          alt="ID Proof" 
                          className="h-20 mx-auto object-contain" 
                        />
                        <p className="text-xs text-center mt-2">Click to change</p>
                      </div>
                    ) : (
                      <div className="text-center">
                        <FileImage className="mx-auto h-8 w-8 text-gray-400" />
                        <p className="text-xs mt-1">Upload ID proof image</p>
                        <p className="text-xs text-gray-500">JPG, JPEG, PNG (max 10MB)</p>
                      </div>
                    )}
                  </Label>
                  <Input
                    id="id-proof-upload"
                    type="file"
                    className="sr-only"
                    accept=".jpg,.jpeg,.png"
                    onChange={handleIdProofImageChange}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="bankAccountDetail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bank Account Details</FormLabel>
                    <FormControl>
                      <Input placeholder="Account number/IFSC" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div>
                <Label>Bank Proof Image</Label>
                <div className="mt-2">
                  <Label 
                    htmlFor="bank-proof-upload" 
                    className="cursor-pointer flex flex-col items-center justify-center border border-dashed border-gray-300 rounded-md p-4 hover:bg-gray-50"
                  >
                    {bankImagePreview ? (
                      <div className="text-center">
                        <img 
                          src={bankImagePreview} 
                          alt="Bank Document" 
                          className="h-20 mx-auto object-contain" 
                        />
                        <p className="text-xs text-center mt-2">Click to change</p>
                      </div>
                    ) : (
                      <div className="text-center">
                        <Upload className="mx-auto h-8 w-8 text-gray-400" />
                        <p className="text-xs mt-1">Upload bank document</p>
                        <p className="text-xs text-gray-500">JPG, JPEG, PNG (max 10MB)</p>
                      </div>
                    )}
                  </Label>
                  <Input
                    id="bank-proof-upload"
                    type="file"
                    className="sr-only"
                    accept=".jpg,.jpeg,.png"
                    onChange={handleBankImageChange}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="salary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Salary</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="25000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Active Status</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        Employee will be immediately active in the system
                      </div>
                    </div>
                    <FormControl>
                      <Switch 
                        checked={field.value} 
                        onCheckedChange={field.onChange} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">Save Employee</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
