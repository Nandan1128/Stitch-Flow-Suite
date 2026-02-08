import React, { useEffect, useState } from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@/components/ui/drawer";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { Employee, EmployeeFormData } from "@/types/employee";
import { useToast } from "@/hooks/use-toast";
import { Check, X, FileImage, FileText } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface EmployeeDetailsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee | null;
  onUpdateEmployee: (id: string, updatedEmployee: Partial<Employee>) => void;
  readOnly?: boolean; // <-- new optional prop
}

export const EmployeeDetailsSheet: React.FC<EmployeeDetailsSheetProps> = ({
  open,
  onOpenChange,
  employee,
  onUpdateEmployee,
  readOnly = false,
}) => {
  const { toast } = useToast();
  const [idProofPreview, setIdProofPreview] = useState<string | null>(null);
  const [bankImagePreview, setBankImagePreview] = useState<string | null>(null);

  const form = useForm<EmployeeFormData>({
    defaultValues: {
      name: '',
      employeeId: '',
      permanentAddress: '',
      currentAddress: '',
      mobileNumber: '',
      emergencyNumber: '',
      idProof: '',
      idProofImage: null,
      bankAccountDetail: '',
      bankImage: null,
      salary: 0,
      isActive: true,
    },
  });

  // Reset form whenever employee changes
  useEffect(() => {
    if (!employee) return;

    form.reset({
      name: employee.name || '',
      employeeId: (employee.employeeId as string) || '',
      permanentAddress: (employee.permanentAddress as string) || '',
      currentAddress: (employee.currentAddress as string) || '',
      mobileNumber: (employee.mobileNumber as string) || '',
      emergencyNumber: (employee.emergencyNumber as string) || '',
      idProof: (employee.idProof as string) || '',
      idProofImage: null,
      bankAccountDetail: (employee.bankAccountDetail as string) || '',
      bankImage: null,
      salary: (employee.salary as any) || 0,
      isActive: (employee as any).isActive ?? true,
    });

    // populate previews from DB URLs when available
    // Accept both old camelCase and new snake_case keys just in case
    const idProofUrl = (employee as any).idProofImageUrl || (employee as any).id_proof_image_url || (employee as any).id_proof_image_url;
    const bankUrl = (employee as any).bankImageUrl || (employee as any).bank_image_url || (employee as any).bank_image_url;
    const profileUrl = (employee as any).profileImageUrl || (employee as any).profile_image_url || (employee as any).profile_image_url;

    if (idProofUrl) setIdProofPreview(idProofUrl);
    else setIdProofPreview(null);

    if (bankUrl) setBankImagePreview(bankUrl);
    else setBankImagePreview(null);

    // no need to use profile preview here (UI shows profile image elsewhere)
  }, [employee, form]);

  const onSubmit = async (data: EmployeeFormData) => {
    if (!employee) return;
    if (readOnly) return; // guard: do nothing in read-only mode

    try {
      const updatedEmployee: Partial<Employee> = {
        name: data.name,
        employeeId: data.employeeId,
        permanentAddress: data.permanentAddress,
        currentAddress: data.currentAddress,
        mobileNumber: data.mobileNumber,
        emergencyNumber: data.emergencyNumber,
        idProof: data.idProof,
        bankAccountDetail: data.bankAccountDetail,
        // salary/isActive handled below
      };

      // update salary/isActive if present in form
      (updatedEmployee as any).salary = data.salary;
      (updatedEmployee as any).isActive = data.isActive;

      // If user selected new images in the form, normally you'd upload them
      // to storage and set the returned URLs here. For now we simulate with
      // object URLs so the UI updates immediately (matches your existing logic).
      if (data.idProofImage) {
        (updatedEmployee as any).idProofImageUrl = URL.createObjectURL(data.idProofImage);
      }
      if (data.bankImage) {
        (updatedEmployee as any).bankImageUrl = URL.createObjectURL(data.bankImage);
      }

      onUpdateEmployee(employee.id, updatedEmployee);

      toast({
        title: "Employee updated",
        description: `${data.name}'s information has been updated.`,
      });

      onOpenChange(false);
    } catch (err: any) {
      console.error("Error updating employee:", err);
      toast({
        title: "Error",
        description: err?.message || "Failed to update employee",
        variant: "destructive",
      });
    }
  };

  // file change handlers — they set value in react-hook-form and update preview.
  const handleIdProofImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (readOnly) return;
    const file = e.target.files?.[0];
    if (!file) return;
    form.setValue("idProofImage", file);
    setIdProofPreview(URL.createObjectURL(file));
  };

  const handleBankImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (readOnly) return;
    const file = e.target.files?.[0];
    if (!file) return;
    form.setValue("bankImage", file);
    setBankImagePreview(URL.createObjectURL(file));
  };

  // If no employee selected, render nothing (same as before)
  if (!employee) return null;

  const isMobile = useIsMobile();
  const disabled = Boolean(readOnly);

  // Render form function to be used in both Drawer (mobile) and Sheet (desktop)
  const renderForm = () => (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
        <div className="space-y-4">
          {/* Basic Information */}
          <div className="border rounded-md p-4">
            <h3 className="text-sm font-medium mb-3">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={disabled} />
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
                      <Input {...field} disabled={disabled} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Contact Information */}
          <div className="border rounded-md p-4">
            <h3 className="text-sm font-medium mb-3">Contact Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="mobileNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mobile Number</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={disabled} />
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
                      <Input {...field} disabled={disabled} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Address Information */}
          <div className="border rounded-md p-4">
            <h3 className="text-sm font-medium mb-3">Address Information</h3>
            <div className="grid gap-4">
              <FormField
                control={form.control}
                name="currentAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Address</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={disabled} />
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
                    <FormLabel>Permanent Address</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={disabled} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* ID Proof */}
          <div className="border rounded-md p-4">
            <h3 className="text-sm font-medium mb-3">ID Proof</h3>
            <FormField
              control={form.control}
              name="idProof"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ID Number</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={disabled} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="mt-4">
              <Label htmlFor="id-proof-image">ID Proof Image</Label>
              <div className="mt-1 flex items-center">
                <Label
                  htmlFor="id-proof-image"
                  className={`cursor-pointer flex items-center justify-center border border-dashed rounded-md p-4 w-full ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  {idProofPreview ? (
                    <div className="w-full">
                      <img
                        src={idProofPreview}
                        alt="ID Proof"
                        className="h-32 object-contain mx-auto"
                      />
                    </div>
                  ) : (
                    <div className="text-center">
                      <FileImage className="mx-auto h-12 w-12 text-gray-400" />
                      <p className="mt-1 text-sm text-gray-500">Upload ID proof</p>
                    </div>
                  )}
                </Label>
                <Input
                  id="id-proof-image"
                  type="file"
                  className="hidden"
                  onChange={handleIdProofImageChange}
                  disabled={disabled}
                />
              </div>
            </div>
          </div>

          {/* Bank Details */}
          <div className="border rounded-md p-4">
            <h3 className="text-sm font-medium mb-3">Bank Details</h3>
            <FormField
              control={form.control}
              name="bankAccountDetail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bank Account Details</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={disabled} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="mt-4">
              <Label htmlFor="bank-image">Bank Passbook/Cheque</Label>
              <div className="mt-1 flex items-center">
                <Label
                  htmlFor="bank-image"
                  className={`cursor-pointer flex items-center justify-center border border-dashed rounded-md p-4 w-full ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  {bankImagePreview ? (
                    <div className="w-full">
                      <img
                        src={bankImagePreview}
                        alt="Bank Document"
                        className="h-32 object-contain mx-auto"
                      />
                    </div>
                  ) : (
                    <div className="text-center">
                      <FileText className="mx-auto h-12 w-12 text-gray-400" />
                      <p className="mt-1 text-sm text-gray-500">Upload bank document</p>
                    </div>
                  )}
                </Label>
                <Input
                  id="bank-image"
                  type="file"
                  className="hidden"
                  onChange={handleBankImageChange}
                  disabled={disabled}
                />
              </div>
            </div>
          </div>

          {/* Salary & Status */}
          <div className="border rounded-md p-4">
            <h3 className="text-sm font-medium mb-3">Salary & Status</h3>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="salary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Salary (₹)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={e => field.onChange(Number(e.target.value))}
                        disabled={disabled}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-2 pt-6">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="h-4 w-4"
                        disabled={disabled}
                      />
                    </FormControl>
                    <FormLabel className="!mt-0 cursor-pointer">Active Status</FormLabel>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </div>

        <div className={`flex justify-end gap-3 ${isMobile ? 'pb-6' : 'mt-6'}`}>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            <X className="mr-1 h-4 w-4" />
            {readOnly ? "Close" : "Cancel"}
          </Button>

          {!readOnly && (
            <Button type="submit">
              <Check className="mr-1 h-4 w-4" />
              Save Changes
            </Button>
          )}
        </div>
      </form>
    </Form>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="px-4 max-h-[90vh]">
          <DrawerHeader className="text-left px-0">
            <DrawerTitle>{readOnly ? `View Employee` : `Edit Employee`}</DrawerTitle>
            <DrawerDescription>{employee.name}</DrawerDescription>
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
          <SheetTitle>{readOnly ? `View Employee: ${employee.name}` : `Edit Employee: ${employee.name}`}</SheetTitle>
          <SheetDescription>
            {readOnly ? "Viewing employee details." : "View and update employee information. Click save when you're done."}
          </SheetDescription>
        </SheetHeader>
        {renderForm()}
      </SheetContent>
    </Sheet>
  );
};
