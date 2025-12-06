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

// Export payload shape that maps to your employees table columns
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
  onAddSupervisor: (payload: AddSupervisorPayload) => void;
}

export const AddSupervisorDialog: React.FC<AddSupervisorDialogProps> = ({
  open,
  onOpenChange,
  onAddSupervisor,
}) => {
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

  // upload helper (same storage bucket used by employees)
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

  // optional small preview handlers for file inputs
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
    setIsSubmitting(true);

    try {
      // upload files (if present) and build payload
      const bankDetail = JSON.stringify({
        bankName: values.bankName,
        accountHolderName: values.accountHolderName,
        accountNumber: values.accountNumber,
        ifscCode: values.ifscCode,
      });

      // upload images in parallel
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

      // Call the callback with full payload
      await onAddSupervisor(payload);

      // Show success message
      toast({
        title: "Supervisor added",
        description: `${values.name} has been added as a supervisor.`,
      });

      // Reset form and close dialog
      form.reset();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add supervisor. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Supervisor</DialogTitle>
          <DialogDescription>
            Create a new supervisor account. They will be able to manage workers and operations.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid grid-cols-4 mb-6">
                <TabsTrigger value="basic">
                  <User className="mr-2 h-4 w-4" />
                  Basic Info
                </TabsTrigger>
                <TabsTrigger value="address">
                  <Shield className="mr-2 h-4 w-4" />
                  Address
                </TabsTrigger>
                <TabsTrigger value="documents">
                  <FileImage className="mr-2 h-4 w-4" />
                  Documents
                </TabsTrigger>
                <TabsTrigger value="bank">
                  <Banknote className="mr-2 h-4 w-4" />
                  Bank Details
                </TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="profileImage"
                    render={({ field: { onChange, value, ...field } }) => (
                      <FormItem>
                        <FormLabel>Profile Photo</FormLabel>
                        <FormControl>
                          <div className="flex items-center space-x-4">
                            <div className="w-24 h-24 border rounded-full flex items-center justify-center bg-muted">
                              <Upload className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <Input
                              type="file"
                              accept="image/*"
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
                  {profilePreview && <img src={profilePreview} alt="profile" className="h-16 w-16 rounded-full" />}

                  <FormField
                    control={form.control}
                    name="employeeCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>EMP ID</FormLabel>
                        <FormControl>
                          <Input placeholder="EMP123" {...field} />
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
                          <Input placeholder="Enter supervisor's name" {...field} />
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
                        <FormLabel>Email Address *</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="supervisor@example.com" {...field} />
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
                        <FormLabel>Mobile Number *</FormLabel>
                        <FormControl>
                          <Input placeholder="10-digit mobile number" {...field} />
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
                        <FormLabel>Emergency Number</FormLabel>
                        <FormControl>
                          <Input placeholder="Emergency contact number" {...field} />
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
                          <Input type="password" placeholder="Create a strong password" {...field} />
                        </FormControl>
                        <FormDescription>
                          Password must be at least 8 characters long.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              <TabsContent value="address" className="space-y-4">
                <FormField
                  control={form.control}
                  name="currentAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Address *</FormLabel>
                      <FormControl>
                        <Input placeholder="Current residential address" {...field} />
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
                        <Input placeholder="Permanent home address" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="addressProofImage"
                  render={({ field: { onChange, value, ...field } }) => (
                    <FormItem>
                      <FormLabel>Address Proof Document</FormLabel>
                      <FormControl>
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            onChange(e.target.files?.[0] || null);
                          }}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Upload a document as address proof (utility bill, rental agreement, etc.)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="documents" className="space-y-4">
                <FormField
                  control={form.control}
                  name="idProofNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ID Proof Number *</FormLabel>
                      <FormControl>
                        <Input placeholder="Aadhar/PAN/Voter ID" {...field} />
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
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            onChange(e.target.files?.[0] || null);
                            handleIdProofChange(e);
                          }}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {idProofPreview && <img src={idProofPreview} alt="id" className="h-16 mt-2" />}
              </TabsContent>

              <TabsContent value="bank" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="bankName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bank Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Bank name" {...field} />
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
                        <FormLabel>Account Holder Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Account holder name" {...field} />
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
                        <FormLabel>Account Number *</FormLabel>
                        <FormControl>
                          <Input placeholder="Account number" {...field} />
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
                        <FormLabel>Confirm Account Number *</FormLabel>
                        <FormControl>
                          <Input placeholder="Confirm account number" {...field} />
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
                          <Input placeholder="IFSC code" {...field} />
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
                        <FormLabel>Salary (₹)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="Enter base salary" {...field} />
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
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            onChange(e.target.files?.[0] || null);
                            handleBankChange(e);
                          }}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Upload a passbook image or cancelled cheque
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {bankPreview && <img src={bankPreview} alt="bank" className="h-16 mt-2" />}
              </TabsContent>
            </Tabs>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  form.reset();
                  onOpenChange(false);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Adding..." : "Add Supervisor"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddSupervisorDialog;
