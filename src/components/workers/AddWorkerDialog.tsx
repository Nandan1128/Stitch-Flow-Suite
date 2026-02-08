// src/components/workers/AddWorkerDialog.tsx

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { FileImage, Upload, Banknote, User } from "lucide-react";

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
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/use-mobile";

import { WorkerFormData } from "@/types/worker";
import { uploadWorkerImage, insertWorker } from "@/Services/workerService";

interface AddWorkerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddWorker: () => Promise<void>;
}

export const AddWorkerDialog: React.FC<AddWorkerDialogProps> = ({
  open,
  onOpenChange,
  onAddWorker,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState<string>("basic");

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
    trigger,
  } = useForm<WorkerFormData>({
    mode: "onChange",
    defaultValues: {
      name: "",
      workerId: "",
      address: "",
      permanentAddress: "",
      currentAddress: "",
      mobileNumber: "",
      emergencyNumber: "",
      idProof: "",
      profile_image_url: null,
      id_proof_image_url: null,
      bank_image_url: null,
      bankAccountDetail: "",
      bankName: "",
      accountNumber: "",
      confirmAccountNumber: "",
      ifscCode: "",
      accountHolderName: "",
    },
  });

  // Reset form and step when dialog closes
  React.useEffect(() => {
    if (open) {
      setCurrentStep("basic");
    } else {
      reset();
      setCurrentStep("basic");
    }
  }, [open, reset]);

  // Validate current step before proceeding
  const validateCurrentStep = async () => {
    let fieldsToValidate: (keyof WorkerFormData)[] = [];

    switch (currentStep) {
      case "basic":
        fieldsToValidate = ["name", "mobileNumber", "currentAddress", "permanentAddress"];
        break;
      case "documents":
        fieldsToValidate = ["idProof"];
        break;
      case "bank":
        fieldsToValidate = ["bankName", "accountNumber", "confirmAccountNumber", "ifscCode", "accountHolderName"];
        break;
    }

    const isValid = await trigger(fieldsToValidate);
    return isValid;
  };

  const onSubmit = async (data: WorkerFormData) => {
    if (data.accountNumber !== data.confirmAccountNumber) {
      toast({
        title: "Error",
        description: "Account numbers do not match",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const profileFile = data.profile_image_url?.[0] ?? null;
      const idProofFile = data.id_proof_image_url?.[0] ?? null;
      const bankFile = data.bank_image_url?.[0] ?? null;

      const profileUrl = await uploadWorkerImage("workers/profile", profileFile);
      const idProofUrl = await uploadWorkerImage("workers/id-proof", idProofFile);
      const bankUrl = await uploadWorkerImage("workers/bank", bankFile);

      const workerCode = `WOR-${Date.now()}`;

      const row = {
        name: data.name,
        worker_code: workerCode,
        mobile_number: data.mobileNumber,
        emergency_number: data.emergencyNumber,
        address: data.address,
        permanent_address: data.permanentAddress,
        current_address: data.currentAddress,
        id_proof: data.idProof,
        id_proof_image_url: idProofUrl,
        bank_account_detail: data.bankAccountDetail,
        bank_name: data.bankName,
        account_number: data.accountNumber,
        ifsc_code: data.ifscCode,
        account_holder_name: data.accountHolderName,
        bank_image_url: bankUrl,
        profile_image_url: profileUrl,
        created_at: new Date().toISOString(),
        entered_by: user?.name ?? user?.email ?? user?.id ?? "system",
      };

      await insertWorker(row);

      toast({
        title: "Worker added",
        description: `${data.name} added successfully.`,
      });

      reset();
      onOpenChange(false);
      await onAddWorker();
    } catch (err: any) {
      console.error("Error adding worker:", err);
      toast({
        title: "Error",
        description: err?.message ?? "Failed to add worker",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderForm = () => (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Tabs value={currentStep} onValueChange={setCurrentStep}>
        <TabsList className="grid grid-cols-3 mb-6 pointer-events-none sticky top-0 z-10 bg-background py-1">
          <TabsTrigger value="basic" className="pointer-events-none text-[10px] sm:text-sm px-1">
            <User className="mr-1 h-3 w-3 sm:h-4 sm:w-4" />
            Basic
          </TabsTrigger>

          <TabsTrigger value="documents" className="pointer-events-none text-[10px] sm:text-sm px-1">
            <FileImage className="mr-1 h-3 w-3 sm:h-4 sm:w-4" />
            Docs
          </TabsTrigger>

          <TabsTrigger value="bank" className="pointer-events-none text-[10px] sm:text-sm px-1">
            <Banknote className="mr-1 h-3 w-3 sm:h-4 sm:w-4" />
            Bank
          </TabsTrigger>
        </TabsList>

        {/* BASIC INFO */}
        <TabsContent value="basic" className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>Profile Photo</Label>
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => setValue("profile_image_url", e.target.files)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Full Name *</Label>
              <Input placeholder="Ex: Ramesh Patel"{...register("name", { required: "Name is required" })} />
              {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Mobile Number *</Label>
              <Input placeholder="9876543210" {...register("mobileNumber", { required: "Mobile number is required" })} />
              {errors.mobileNumber && <p className="text-xs text-destructive mt-1">{errors.mobileNumber.message}</p>}
            </div>

            <div className="md:col-span-2 space-y-2">
              <Label>Current Address *</Label>
              <Input placeholder="Full current living address"{...register("currentAddress", { required: "Current address is required" })} />
              {errors.currentAddress && <p className="text-xs text-destructive mt-1">{errors.currentAddress.message}</p>}
            </div>

            <div className="md:col-span-2 space-y-2">
              <Label>Permanent Address *</Label>
              <Input placeholder="Permanent home address"{...register("permanentAddress", { required: "Permanent address is required" })} />
              {errors.permanentAddress && <p className="text-xs text-destructive mt-1">{errors.permanentAddress.message}</p>}
            </div>

            <div className="md:col-span-2 space-y-2">
              <Label>Alternate Address</Label>
              <Input placeholder="Optional"{...register("address")} />
            </div>
          </div>
        </TabsContent>

        {/* DOCUMENTS */}
        <TabsContent value="documents" className="space-y-6 pt-2">
          <div className="space-y-2">
            <Label>ID Proof Number *</Label>
            <Input placeholder="Aadhar / PAN / Voter ID Number"{...register("idProof", { required: "ID proof number is required" })} />
            {errors.idProof && <p className="text-xs text-destructive mt-1">{errors.idProof.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>ID Proof Document</Label>
            <Input
              type="file"
              accept="image/*"
              onChange={(e) =>
                setValue("id_proof_image_url", e.target.files)
              }
            />
          </div>
        </TabsContent>

        {/* BANK DETAILS */}
        <TabsContent value="bank" className="space-y-4 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Bank Name *</Label>
              <Input placeholder="Ex: SBI, HDFC"{...register("bankName", { required: "Bank name is required" })} />
              {errors.bankName && <p className="text-xs text-destructive mt-1">{errors.bankName.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Account Number *</Label>
              <Input placeholder="Bank account number"{...register("accountNumber", { required: "Account number is required" })} />
              {errors.accountNumber && <p className="text-xs text-destructive mt-1">{errors.accountNumber.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Confirm Account Number *</Label>
              <Input placeholder="Re-enter account number"
                {...register("confirmAccountNumber", { required: "Please confirm account number" })}
              />
              {errors.confirmAccountNumber && <p className="text-xs text-destructive mt-1">{errors.confirmAccountNumber.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>IFSC Code *</Label>
              <Input placeholder="Ex: SBIN0001234"{...register("ifscCode", { required: "IFSC code is required" })} />
              {errors.ifscCode && <p className="text-xs text-destructive mt-1">{errors.ifscCode.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Account Holder Name *</Label>
              <Input placeholder="Name as per bank account"
                {...register("accountHolderName", { required: "Account holder name is required" })}
              />
              {errors.accountHolderName && <p className="text-xs text-destructive mt-1">{errors.accountHolderName.message}</p>}
            </div>

            <div className="md:col-span-2 space-y-2">
              <Label>Other Bank Details</Label>
              <Input placeholder="(Optional) Branch, notes, etc" {...register("bankAccountDetail")} />
            </div>

            <div className="md:col-span-2 space-y-2">
              <Label>Bank Document</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) =>
                  setValue("bank_image_url", e.target.files)
                }
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex flex-col sm:flex-row justify-between gap-3 pt-4 border-t sticky bottom-0 bg-background">
        <div className="flex gap-2">
          {currentStep !== "basic" && (
            <Button
              type="button"
              variant="outline"
              className="flex-1 sm:flex-none"
              onClick={() => {
                const steps = ["basic", "documents", "bank"];
                const currentIndex = steps.indexOf(currentStep);
                if (currentIndex > 0) {
                  setCurrentStep(steps[currentIndex - 1]);
                }
              }}
            >
              Previous
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            className="flex-1 sm:flex-none"
            onClick={() => {
              reset();
              onOpenChange(false);
            }}
          >
            Cancel
          </Button>
        </div>

        <div className="flex gap-2">
          {currentStep !== "bank" ? (
            <Button
              type="button"
              className="flex-1 sm:flex-none"
              onClick={async () => {
                const isValid = await validateCurrentStep();
                if (!isValid) {
                  toast({
                    title: "Validation Error",
                    description: "Please fill all required fields correctly before proceeding.",
                    variant: "destructive",
                  });
                  return;
                }

                const steps = ["basic", "documents", "bank"];
                const currentIndex = steps.indexOf(currentStep);
                if (currentIndex < steps.length - 1) {
                  setCurrentStep(steps[currentIndex + 1]);
                }
              }}
            >
              Next Step
            </Button>
          ) : (
            <Button type="submit" disabled={isSubmitting} className="flex-1 sm:flex-none">
              {isSubmitting ? "Saving..." : "Save Worker"}
            </Button>
          )}
        </div>
      </div>
    </form>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[96vh]">
          <DrawerHeader className="text-left border-b pb-4">
            <DrawerTitle>Add New Worker</DrawerTitle>
            <DrawerDescription>
              Provide worker information across the steps below.
            </DrawerDescription>
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
          <DialogTitle>Add New Worker</DialogTitle>
          <DialogDescription>
            Enter worker details below. Click save when you're done.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {renderForm()}
        </div>
      </DialogContent>
    </Dialog>
  );
};

