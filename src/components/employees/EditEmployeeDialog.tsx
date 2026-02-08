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
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { Employee, EmployeeFormData } from "@/types/employee";
import { useToast } from "@/hooks/use-toast";
import { FileImage, FileText } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/use-mobile";

interface EditEmployeeDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    employee: Employee | null;
    onUpdateEmployee: (id: string, updatedEmployee: Partial<Employee>) => void;
}

export const EditEmployeeDialog: React.FC<EditEmployeeDialogProps> = ({
    open,
    onOpenChange,
    employee,
    onUpdateEmployee,
}) => {
    const { toast } = useToast();
    const [idProofPreview, setIdProofPreview] = useState<string | null>(null);
    const [bankImagePreview, setBankImagePreview] = useState<string | null>(null);

    const form = useForm<EmployeeFormData>({
        defaultValues: {
            name: '',
            employeeId: '',
            email: '',
            currentAddress: '',
            permanentAddress: '',
            mobileNumber: '',
            emergencyNumber: '',
            idProof: '',
            idProofImage: null,
            bankAccountDetail: '',
            bankname: '',
            account_number: '',
            ifsc_code: '',
            account_holder_name: '',
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
            email: employee.email || '',
            permanentAddress: (employee.permanentAddress as string) || '',
            currentAddress: (employee.currentAddress as string) || '',
            mobileNumber: (employee.mobileNumber as string) || '',
            emergencyNumber: (employee.emergencyNumber as string) || '',
            idProof: (employee.idProof as string) || '',
            idProofImage: null,
            bankAccountDetail: (employee.bankAccountDetail as string) || '',
            bankname: employee.bankname || '',
            account_number: employee.account_number || '',
            ifsc_code: employee.ifsc_code || '',
            account_holder_name: employee.account_holder_name || '',
            bankImage: null,
            salary: (employee.salary as any) || 0,
            isActive: (employee as any).isActive ?? true,
        });

        // populate previews from DB URLs when available
        const idProofUrl = (employee as any).idProofImageUrl || (employee as any).id_proof_image_url;
        const bankUrl = (employee as any).bankImageUrl || (employee as any).bank_image_url;

        if (idProofUrl) setIdProofPreview(idProofUrl);
        else setIdProofPreview(null);

        if (bankUrl) setBankImagePreview(bankUrl);
        else setBankImagePreview(null);

    }, [employee, form]);

    const onSubmit = async (data: EmployeeFormData) => {
        if (!employee) return;

        try {
            const updatedEmployee: Partial<Employee> = {
                name: data.name,
                employeeId: data.employeeId,
                email: data.email,
                permanentAddress: data.permanentAddress,
                currentAddress: data.currentAddress,
                mobileNumber: data.mobileNumber,
                emergencyNumber: data.emergencyNumber,
                idProof: data.idProof,
                bankAccountDetail: data.bankAccountDetail,
                bankname: data.bankname,
                account_number: data.account_number,
                ifsc_code: data.ifsc_code,
                account_holder_name: data.account_holder_name,
            };

            (updatedEmployee as any).salary = data.salary;
            (updatedEmployee as any).isActive = data.isActive;

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

    const handleIdProofImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        form.setValue("idProofImage", file);
        setIdProofPreview(URL.createObjectURL(file));
    };

    const handleBankImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        form.setValue("bankImage", file);
        setBankImagePreview(URL.createObjectURL(file));
    };

    if (!employee) return null;

    const isMobile = useIsMobile();

    const renderForm = () => (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">

                <Tabs defaultValue="basic" className="w-full">
                    <TabsList className={`grid ${isMobile ? 'grid-cols-2 gap-2 h-auto' : 'grid-cols-4'} mb-4`}>
                        <TabsTrigger value="basic" className="flex-1">Basic Info</TabsTrigger>
                        <TabsTrigger value="address" className="flex-1">Address</TabsTrigger>
                        <TabsTrigger value="documents" className="flex-1">Docs</TabsTrigger>
                        <TabsTrigger value="bank" className="flex-1">Bank</TabsTrigger>
                    </TabsList>

                    {/* BASIC INFO */}
                    <TabsContent value="basic" className="space-y-4">
                        <div className="border rounded-md p-4">
                            <h3 className="text-sm font-medium mb-3">Basic Information</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Name</FormLabel>
                                            <FormControl>
                                                <Input {...field} />
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
                                                <Input {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem className="col-span-1 sm:col-span-2">
                                            <FormLabel>Email</FormLabel>
                                            <FormControl>
                                                <Input type="email" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

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
                                                <Input {...field} />
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
                                                <Input {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>
                    </TabsContent>

                    {/* ADDRESS TAB */}
                    <TabsContent value="address" className="space-y-4">
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
                                                <Input {...field} />
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
                                                <Input {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>
                    </TabsContent>

                    {/* DOCUMENTS TAB */}
                    <TabsContent value="documents" className="space-y-4">
                        <div className="border rounded-md p-4">
                            <h3 className="text-sm font-medium mb-3">ID Proof</h3>
                            <FormField
                                control={form.control}
                                name="idProof"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>ID Number</FormLabel>
                                        <FormControl>
                                            <Input {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="mt-4">
                                <Label htmlFor="id-proof-image-edit">ID Proof Image</Label>
                                <div className="mt-1 flex items-center">
                                    <Label
                                        htmlFor="id-proof-image-edit"
                                        className="cursor-pointer flex items-center justify-center border border-dashed rounded-md p-4 w-full"
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
                                        id="id-proof-image-edit"
                                        type="file"
                                        className="hidden"
                                        onChange={handleIdProofImageChange}
                                    />
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                            {/* BANK TAB */}
                            <TabsContent value="bank" className="space-y-4">
                                <div className="border rounded-md p-4">
                                    <h3 className="text-sm font-medium mb-3">Bank Details</h3>
                                    <FormField
                                        control={form.control}
                                        name="bankAccountDetail"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Bank Account Details</FormLabel>
                                                <FormControl>
                                                    <Input {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                            <div className="mt-4">
                                <Label htmlFor="bank-image-edit">Bank Passbook/Cheque</Label>
                                <div className="mt-1 flex items-center">
                                    <Label
                                        htmlFor="bank-image-edit"
                                        className="cursor-pointer flex items-center justify-center border border-dashed rounded-md p-4 w-full"
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
                                        id="bank-image-edit"
                                        type="file"
                                        className="hidden"
                                        onChange={handleBankImageChange}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="border rounded-md p-4">
                            <h3 className="text-sm font-medium mb-3">Salary & Status</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                                                />
                                            </FormControl>
                                            <FormLabel className="!mt-0 cursor-pointer">Active Status</FormLabel>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>
                    </TabsContent>

                </Tabs>

                <div className={`flex justify-end gap-3 ${isMobile ? 'pb-6' : ''}`}>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button type="submit">
                        Save Changes
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
                        <DrawerTitle>Edit Employee</DrawerTitle>
                        <DrawerDescription>
                            Update information for {employee.name}
                        </DrawerDescription>
                    </DrawerHeader>
                    <div className="overflow-y-auto">
                        {renderForm()}
                    </div>
                </DrawerContent>
            </Drawer>
        );
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Edit Employee: {employee.name}</DialogTitle>
                </DialogHeader>
                {renderForm()}
            </DialogContent>
        </Dialog>
    );
};
