
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Worker } from "@/types/worker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { format } from 'date-fns';
import { useIsMobile } from "@/hooks/use-mobile";

interface EditWorkerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  worker: Worker | null;
  onUpdate: (id: string, updated: Partial<Worker>) => void;
}

export const EditWorkerDialog: React.FC<EditWorkerDialogProps> = ({
  open,
  onOpenChange,
  worker,
  onUpdate,
}) => {
  const isMobile = useIsMobile();
  const [form, setForm] = useState<Partial<Worker>>({});

  useEffect(() => {
    if (worker) setForm(worker);
  }, [worker]);

  if (!worker) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({
      ...f,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(worker.id, form);
    onOpenChange(false);
  };

  const renderForm = () => (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Tabs defaultValue="basic" className="py-2">
        <TabsList className="w-full mb-4 sticky top-0 z-10 bg-background py-1">
          <TabsTrigger value="basic" className="flex-1 text-[10px] sm:text-xs">Basic</TabsTrigger>
          <TabsTrigger value="address" className="flex-1 text-[10px] sm:text-xs">Address</TabsTrigger>
          <TabsTrigger value="documents" className="flex-1 text-[10px] sm:text-xs">Docs</TabsTrigger>
          <TabsTrigger value="bank" className="flex-1 text-[10px] sm:text-xs">Bank</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-6">
          <div className="space-y-1">
            {worker.profileImageUrl && (
              <div className="flex justify-center mb-4">
                <img
                  src={worker.profileImageUrl}
                  alt={`${worker.name}'s profile`}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-2 border-primary"
                />
              </div>
            )}

            <h4 className="text-sm font-medium text-muted-foreground">Basic Information</h4>
            <Separator className="my-2" />
            <div className="grid grid-cols-2 gap-4 text-sm items-center">
              <div className="font-medium">Name</div>
              <Input
                name="name"
                value={form.name || ""}
                onChange={handleChange}
                className="h-8"
                required
              />

              <div className="font-medium">Worker ID</div>
              <Input
                value={worker.workerId || worker.worker_code || ""}
                disabled
                className="h-8 bg-muted"
              />

              <div className="font-medium">Created By</div>
              <div className="capitalize truncate">{worker.createdBy || '—'}</div>

              <div className="font-medium">Created On</div>
              <div>{format(new Date(worker.createdAt), 'dd MMM yyyy')}</div>
            </div>
          </div>

          <div className="space-y-1">
            <h4 className="text-sm font-medium text-muted-foreground">Contact Information</h4>
            <Separator className="my-2" />
            <div className="grid grid-cols-2 gap-4 text-sm items-center">
              <div className="font-medium">Mobile Number</div>
              <Input
                name="mobileNumber"
                value={form.mobileNumber || ""}
                onChange={handleChange}
                className="h-8"
                required
              />

              <div className="font-medium">Emergency Number</div>
              <Input
                name="emergencyNumber"
                value={form.emergencyNumber || ""}
                onChange={handleChange}
                className="h-8"
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="address" className="space-y-6">
          <div className="space-y-1">
            <h4 className="text-sm font-medium text-muted-foreground">Current Address</h4>
            <Separator className="my-2" />
            <Input
              name="currentAddress"
              value={form.currentAddress || ""}
              onChange={handleChange}
              className="h-8 text-sm"
              placeholder="Current address"
            />
          </div>

          <div className="space-y-1">
            <h4 className="text-sm font-medium text-muted-foreground">Permanent Address</h4>
            <Separator className="my-2" />
            <Input
              name="permanentAddress"
              value={form.permanentAddress || ""}
              onChange={handleChange}
              className="h-8 text-sm"
              placeholder="Permanent address"
            />
          </div>

          <div className="space-y-1">
            <h4 className="text-sm font-medium text-muted-foreground">Alternate Address</h4>
            <Separator className="my-2" />
            <Input
              name="address"
              value={form.address || ""}
              onChange={handleChange}
              className="h-8 text-sm"
              placeholder="Alternate address"
            />
          </div>
        </TabsContent>

        <TabsContent value="documents" className="space-y-6">
          <div className="space-y-1">
            <h4 className="text-sm font-medium text-muted-foreground">ID Information</h4>
            <Separator className="my-2" />
            <div className="grid grid-cols-2 gap-4 text-sm items-center">
              <div className="font-medium">ID Proof</div>
              <Input
                name="idProof"
                value={form.idProof || ""}
                onChange={handleChange}
                className="h-8"
              />
            </div>
          </div>

          {worker.idProofImageUrl && (
            <div className="space-y-1">
              <h4 className="text-sm font-medium text-muted-foreground">ID Document</h4>
              <Separator className="my-2" />
              <div className="flex justify-center bg-muted/30 p-2 rounded-lg">
                <img
                  src={worker.idProofImageUrl}
                  alt="ID document"
                  className="w-full max-w-[280px] h-auto object-contain border rounded-md shadow-sm"
                />
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="bank" className="space-y-6">
          <div className="space-y-1">
            <h4 className="text-sm font-medium text-muted-foreground">Bank Information</h4>
            <Separator className="my-2" />
            <div className="grid grid-cols-2 gap-3 sm:gap-4 text-sm items-center">
              <div className="font-medium">Bank Name</div>
              <Input
                name="bankName"
                value={form.bankName || ""}
                onChange={handleChange}
                className="h-8"
              />

              <div className="font-medium">Account No</div>
              <Input
                name="accountNumber"
                value={form.accountNumber || ""}
                onChange={handleChange}
                className="h-8"
              />

              <div className="font-medium">IFSC Code</div>
              <Input
                name="ifscCode"
                value={form.ifscCode || ""}
                onChange={handleChange}
                className="h-8"
              />

              <div className="font-medium">Holder Name</div>
              <Input
                name="accountHolderName"
                value={form.accountHolderName || ""}
                onChange={handleChange}
                className="h-8"
              />

              <div className="font-medium">Other Details</div>
              <Input
                name="bankAccountDetail"
                value={form.bankAccountDetail || ""}
                onChange={handleChange}
                className="h-8"
              />
            </div>
          </div>

          {worker.bankImageUrl && (
            <div className="space-y-1">
              <h4 className="text-sm font-medium text-muted-foreground">Bank Document</h4>
              <Separator className="my-2" />
              <div className="flex justify-center bg-muted/30 p-2 rounded-lg">
                <img
                  src={worker.bankImageUrl}
                  alt="Bank document"
                  className="w-full max-w-[280px] h-auto object-contain border rounded-md shadow-sm"
                />
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t sticky bottom-0 bg-background">
        <Button type="submit" className="flex-1">Save Changes</Button>
        <Button variant="outline" type="button" onClick={() => onOpenChange(false)} className="flex-1">
          Cancel
        </Button>
      </div>
    </form>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[96vh]">
          <DrawerHeader className="text-left border-b pb-4">
            <DrawerTitle>Edit Worker</DrawerTitle>
            <DrawerDescription>Update details for {worker.name}</DrawerDescription>
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
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader className="border-b pb-4">
          <DialogTitle>Edit Worker</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          {renderForm()}
        </div>
      </DialogContent>
    </Dialog>
  );
};
