import React, { useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '@/components/ui/use-toast';
import { FileImage, Upload, Banknote, User, Shield } from "lucide-react";
import { supabase } from "@/Config/supabaseClient";

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
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/use-mobile";

// keep original UI fields but map to DB columns below
const supervisorSchema = z.object({
  name: z.string().min(2, "Name is required"),
  employeeCode: z.string().optional(), // EMP ID
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  mobileNumber: z.string().min(1, "Mobile number is required"),
  emergencyNumber: z.string().optional(),
  currentAddress: z.string().min(1, "Current address is required"),
  permanentAddress: z.string().min(1, "Permanent address is required"),
  idProofNumber: z.string().min(1, "ID proof is required"),
  bankName: z.string().min(1, "Bank name is required"),
  accountNumber: z.string().min(1, "Account number is required"),
  confirmAccountNumber: z.string().min(1, "Please confirm account number"),
  ifscCode: z.string().min(1, "IFSC code is required"),
  accountHolderName: z.string().min(1, "Account holder name is required"),
  salary: z.coerce.number().min(0, "Salary must be a valid number"),
  profileImage: z.any().optional(),
  idProofImage: z.any().optional(),
  addressProofImage: z.any().optional(),
  bankImage: z.any().optional(),
}).refine((data) => data.accountNumber === data.confirmAccountNumber, {
  message: "Account numbers do not match",
  path: ["confirmAccountNumber"],
});

type SupervisorFormValues = z.infer<typeof supervisorSchema>;

export type AddSupervisorPayload = {
  name: string;
  email?: string | null;
  employee_code?: string | null;
  mobile_number?: string | null;
  emergency_number?: string | null;
  current_address?: string | null;
  permanent_address?: string | null;
  id_proof?: string | null;
  id_proof_image_url?: string | null;
  bank_account_detail?: string | null;
  bank_image_url?: string | null;
  salary_amount?: number | null;
  salary_id?: string | null;
  role?: string | null;
  is_supervisor?: boolean;
  profile_image_url?: string | null;
  is_active?: boolean;
  password?: string | null;
};

interface AddSupervisorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddSupervisor: (payload: AddSupervisorPayload) => Promise<{ data: any; error: any }>;
}

export const AddSupervisorDialog: React.FC<AddSupervisorDialogProps> = ({
  open,
  onOpenChange,
  onAddSupervisor,
}) => {
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profilePreview, setProfilePreview] = useState<string | null>(null);
  const [idProofPreview, setIdProofPreview] = useState<string | null>(null);
  const [bankPreview, setBankPreview] = useState<string | null>(null);

  const form = useForm<SupervisorFormValues>({
    resolver: zodResolver(supervisorSchema),
    defaultValues: {
      employeeCode: "",
      name: "",
      email: "",
      password: "",
      mobileNumber: "",
      emergencyNumber: "",
      currentAddress: "",
      permanentAddress: "",
      idProofNumber: "",
      bankName: "",
      accountNumber: "",
      confirmAccountNumber: "",
      ifscCode: "",
      accountHolderName: "",
      salary: 0,
    },
  });

  const uploadToStorage = async (file: File | null | undefined, folder: string) => {
    if (!file) return null;
    const ext = file.name.split('.').pop();
    const fileName = `${folder}/${crypto.randomUUID()}.${ext}`;
    const { data, error } = await supabase.storage
      .from("factory-images")
      .upload(fileName, file, { cacheControl: "3600", upsert: false });
    if (error) {
      console.warn("uploadToStorage error", error);
      throw error;
    }
    const { data: urlData } = supabase.storage.from("factory-images").getPublicUrl(fileName);
    return urlData.publicUrl;
  };

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    form.setValue("profileImage", f);
    setProfilePreview(f ? URL.createObjectURL(f) : null);
  };
  const handleIdProofChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    form.setValue("idProofImage", f);
    setIdProofPreview(f ? URL.createObjectURL(f) : null);
  };
  const handleBankChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    form.setValue("bankImage", f);
    setBankPreview(f ? URL.createObjectURL(f) : null);
  };

  const onSubmit = async (values: SupervisorFormValues) => {
    console.log("AddSupervisorDialog onSubmit START", values);
    setIsSubmitting(true);
    try {
      const bankDetail = JSON.stringify({
        bankName: values.bankName,
        accountHolderName: values.accountHolderName,
        accountNumber: values.accountNumber,
        ifscCode: values.ifscCode,
      });

      const profileFile = values.profileImage instanceof File ? values.profileImage : null;
      const idProofFile = values.idProofImage instanceof File ? values.idProofImage : null;
      const bankFile = values.bankImage instanceof File ? values.bankImage : null;
      const [profileUrl, idProofUrl, bankUrl] = await Promise.allSettled([
        uploadToStorage(profileFile, "profile-images"),
        uploadToStorage(idProofFile, "id-proof"),
        uploadToStorage(bankFile, "bank-proof"),
      ]);

      const payload: AddSupervisorPayload = {
        name: values.name,
        email: values.email ?? null,
        employee_code: values.employeeCode ?? null,
        mobile_number: values.mobileNumber ?? null,
        emergency_number: values.emergencyNumber ?? null,
        current_address: values.currentAddress ?? null,
        permanent_address: values.permanentAddress ?? null,
        id_proof: values.idProofNumber ?? null,
        id_proof_image_url: idProofUrl.status === "fulfilled" ? idProofUrl.value : null,
        bank_account_detail: bankDetail,
        bank_image_url: bankUrl.status === "fulfilled" ? bankUrl.value : null,
        salary_amount: Number(values.salary) || null,
        salary_id: null,
        role: "supervisor",
        is_supervisor: true,
        profile_image_url: profileUrl.status === "fulfilled" ? profileUrl.value : null,
        is_active: true,
        password: values.password,
      };

      const res = await onAddSupervisor(payload);
      if (!res.error) {
        form.reset();
        onOpenChange(false);
      }
    } catch (error) {
      console.error("AddSupervisorDialog onSubmit error:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderForm = () => (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid grid-cols-4 mb-6 sticky top-0 z-10 bg-background py-1">
            <TabsTrigger value="basic" className="text-[10px] sm:text-xs px-1">
              <User className="mr-1 h-3 w-3 sm:h-4 sm:w-4" />
              Basic
            </TabsTrigger>
            <TabsTrigger value="address" className="text-[10px] sm:text-xs px-1">
              <Shield className="mr-1 h-3 w-3 sm:h-4 sm:w-4" />
              Addr
            </TabsTrigger>
            <TabsTrigger value="documents" className="text-[10px] sm:text-xs px-1">
              <FileImage className="mr-1 h-3 w-3 sm:h-4 sm:w-4" />
              Docs
            </TabsTrigger>
            <TabsTrigger value="bank" className="text-[10px] sm:text-xs px-1">
              <Banknote className="mr-1 h-3 w-3 sm:h-4 sm:w-4" />
              Bank
            </TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4 pt-2">
            <FormField
              control={form.control}
              name="profileImage"
              render={({ field: { onChange, value, ...field } }) => (
                <FormItem>
                  <FormLabel>Profile Photo</FormLabel>
                  <FormControl>
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 border rounded-full flex items-center justify-center bg-muted overflow-hidden">
                        {profilePreview ? (
                          <img src={profilePreview} alt="preview" className="w-full h-full object-cover" />
                        ) : (
                          <Upload className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <Input
                        type="file"
                        accept="image/*"
                        className="text-xs h-9"
                        onChange={(e) => {
                          onChange(e.target.files?.[0] || null);
                          handleProfileChange(e);
                        }}
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="employeeCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>EMP ID</FormLabel>
                    <FormControl>
                      <Input placeholder="EMP123" {...field} className="h-9" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Name" {...field} className="h-9" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email *</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="email@example.com" {...field} className="h-9" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="mobileNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mobile *</FormLabel>
                    <FormControl>
                      <Input placeholder="Mobile number" {...field} className="h-9" />
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
                    <FormLabel>Emergency No</FormLabel>
                    <FormControl>
                      <Input placeholder="Emergency number" {...field} className="h-9" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password *</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Password" {...field} className="h-9" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </TabsContent>

          <TabsContent value="address" className="space-y-4 pt-2">
            <FormField
              control={form.control}
              name="currentAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current Address *</FormLabel>
                  <FormControl>
                    <Input placeholder="Current address" {...field} className="h-9" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="permanentAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Permanent Address *</FormLabel>
                  <FormControl>
                    <Input placeholder="Permanent address" {...field} className="h-9" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </TabsContent>

          <TabsContent value="documents" className="space-y-4 pt-2">
            <FormField
              control={form.control}
              name="idProofNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ID Proof Number *</FormLabel>
                  <FormControl>
                    <Input placeholder="Aadhar/PAN/Voter ID" {...field} className="h-9" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="idProofImage"
              render={({ field: { onChange, value, ...field } }) => (
                <FormItem>
                  <FormLabel>ID Proof Document</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      <Input
                        type="file"
                        accept="image/*"
                        className="text-xs h-9"
                        onChange={(e) => {
                          onChange(e.target.files?.[0] || null);
                          handleIdProofChange(e);
                        }}
                        {...field}
                      />
                      {idProofPreview && (
                        <div className="mt-2 border rounded-lg p-1 max-w-[200px] overflow-hidden">
                          <img src={idProofPreview} alt="id" className="w-full h-auto object-contain" />
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </TabsContent>

          <TabsContent value="bank" className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="bankName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bank Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Bank name" {...field} className="h-9" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="accountHolderName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Holder Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Account holder name" {...field} className="h-9" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="accountNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account No *</FormLabel>
                    <FormControl>
                      <Input placeholder="Account number" {...field} className="h-9" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmAccountNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm No *</FormLabel>
                    <FormControl>
                      <Input placeholder="Confirm number" {...field} className="h-9" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="ifscCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>IFSC Code *</FormLabel>
                    <FormControl>
                      <Input placeholder="IFSC code" {...field} className="h-9" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="salary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Salary (₹) *</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="Salary" {...field} className="h-9" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="bankImage"
              render={({ field: { onChange, value, ...field } }) => (
                <FormItem>
                  <FormLabel>Bank Document</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      <Input
                        type="file"
                        accept="image/*"
                        className="text-xs h-9"
                        onChange={(e) => {
                          onChange(e.target.files?.[0] || null);
                          handleBankChange(e);
                        }}
                        {...field}
                      />
                      {bankPreview && (
                        <div className="mt-2 border rounded-lg p-1 max-w-[200px] overflow-hidden">
                          <img src={bankPreview} alt="bank" className="w-full h-auto object-contain" />
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </TabsContent>
        </Tabs>

        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t sticky bottom-0 bg-background text-black">
          <Button type="submit" disabled={isSubmitting} className="flex-1">
            {isSubmitting ? "Adding..." : "Add Supervisor"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => {
              form.reset();
              onOpenChange(false);
            }}
          >
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
            <DrawerTitle>Add New Supervisor</DrawerTitle>
            <DrawerDescription>Create a new supervisor account.</DrawerDescription>
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
          <DialogTitle>Add New Supervisor</DialogTitle>
          <DialogDescription>
            Create a new supervisor account. They will be able to manage workers and operations.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {renderForm()}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddSupervisorDialog;
