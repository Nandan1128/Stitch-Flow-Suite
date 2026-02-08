import React from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Worker } from "@/types/worker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { useIsMobile } from "@/hooks/use-mobile";

interface WorkerDetailsSheetProps {
  worker: Worker | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const WorkerDetailsSheet: React.FC<WorkerDetailsSheetProps> = ({
  worker,
  open,
  onOpenChange,
}) => {
  const isMobile = useIsMobile();

  if (!worker) return null;

  // Map backend field names to the ones used in the UI if necessary
  const normalizedWorker = {
    ...worker,
    mobileNumber: (worker as any).mobile_number || worker.mobileNumber,
    emergencyNumber: (worker as any).emergency_number || worker.emergencyNumber,
    currentAddress: (worker as any).current_address || worker.currentAddress,
    permanentAddress: (worker as any).permanent_address || worker.permanentAddress,
    idProof: (worker as any).id_proof || worker.idProof,
    idProofImageUrl: (worker as any).id_proof_image_url || worker.idProofImageUrl,
    bankName: (worker as any).bank_name || worker.bankName,
    accountNumber: (worker as any).account_number || worker.accountNumber,
    ifscCode: (worker as any).ifsc_code || worker.ifscCode,
    accountHolderName: (worker as any).account_holder_name || worker.accountHolderName,
    bankAccountDetail: (worker as any).bank_account_detail || worker.bankAccountDetail,
    bankImageUrl: (worker as any).bank_image_url || worker.bankImageUrl,
    profileImageUrl: (worker as any).profile_image_url || worker.profileImageUrl,
    createdAt: (worker as any).created_at || worker.createdAt,
    workerId: (worker as any).worker_code || worker.workerId,
    createdBy: (worker as any).entered_by || worker.enteredBy || worker.createdBy,
  };

  const renderContent = () => (
    <Tabs defaultValue="basic" className="py-2">
      <TabsList className="w-full mb-4 sticky top-0 z-10 bg-background py-1">
        <TabsTrigger value="basic" className="flex-1 text-[10px] sm:text-xs">Basic</TabsTrigger>
        <TabsTrigger value="address" className="flex-1 text-[10px] sm:text-xs">Address</TabsTrigger>
        <TabsTrigger value="documents" className="flex-1 text-[10px] sm:text-xs">Docs</TabsTrigger>
        <TabsTrigger value="bank" className="flex-1 text-[10px] sm:text-xs">Bank</TabsTrigger>
      </TabsList>

      <TabsContent value="basic" className="space-y-6">
        <div className="space-y-1">
          {normalizedWorker.profileImageUrl && (
            <div className="flex justify-center mb-4">
              <img
                src={normalizedWorker.profileImageUrl}
                alt={`${normalizedWorker.name}'s profile`}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-2 border-primary"
              />
            </div>
          )}

          <h4 className="text-sm font-medium text-muted-foreground">Basic Information</h4>
          <Separator className="my-2" />
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="font-medium">Name</div>
            <div>{normalizedWorker.name}</div>

            <div className="font-medium">Worker ID</div>
            <div className="font-mono">{normalizedWorker.workerId}</div>

            <div className="font-medium">Mobile</div>
            <div>{normalizedWorker.mobileNumber}</div>

            <div className="font-medium">Emergency</div>
            <div>{normalizedWorker.emergencyNumber || '—'}</div>

            <div className="font-medium">Created By</div>
            <div className="capitalize truncate">{normalizedWorker.createdBy || '—'}</div>

            <div className="font-medium">Created On</div>
            <div>{format(new Date(normalizedWorker.createdAt), 'dd MMM yyyy')}</div>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="address" className="space-y-6">
        <div className="space-y-1">
          <h4 className="text-sm font-medium text-muted-foreground">Addresses</h4>
          <Separator className="my-2" />
          <div className="space-y-3">
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase">Current Address</p>
              <p className="text-sm">{normalizedWorker.currentAddress || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase">Permanent Address</p>
              <p className="text-sm">{normalizedWorker.permanentAddress || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase">Alternate Address</p>
              <p className="text-sm">{normalizedWorker.address || '—'}</p>
            </div>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="documents" className="space-y-6">
        <div className="space-y-1">
          <h4 className="text-sm font-medium text-muted-foreground">ID Information</h4>
          <Separator className="my-2" />
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="font-medium">ID Proof</div>
            <div>{normalizedWorker.idProof || '—'}</div>
          </div>
        </div>

        {normalizedWorker.idProofImageUrl && (
          <div className="space-y-1">
            <h4 className="text-sm font-medium text-muted-foreground">ID Document</h4>
            <Separator className="my-2" />
            <div className="flex justify-center bg-muted/30 p-2 rounded-lg">
              <img
                src={normalizedWorker.idProofImageUrl}
                alt="ID document"
                className="w-full h-auto object-contain border rounded-md shadow-sm"
              />
            </div>
          </div>
        )}
      </TabsContent>

      <TabsContent value="bank" className="space-y-6">
        <div className="space-y-1">
          <h4 className="text-sm font-medium text-muted-foreground">Bank Information</h4>
          <Separator className="my-2" />
          <div className="grid grid-cols-2 gap-3 sm:gap-4 text-sm">
            <div className="font-medium">Bank Name</div>
            <div>{normalizedWorker.bankName || '—'}</div>

            <div className="font-medium">Account No</div>
            <div className="font-mono">{normalizedWorker.accountNumber || '—'}</div>

            <div className="font-medium">IFSC Code</div>
            <div className="font-mono">{normalizedWorker.ifscCode || '—'}</div>

            <div className="font-medium">Holder Name</div>
            <div>{normalizedWorker.accountHolderName || '—'}</div>

            <div className="font-medium">Other Details</div>
            <div>{normalizedWorker.bankAccountDetail || '—'}</div>
          </div>
        </div>

        {normalizedWorker.bankImageUrl && (
          <div className="space-y-1">
            <h4 className="text-sm font-medium text-muted-foreground">Bank Document</h4>
            <Separator className="my-2" />
            <div className="flex justify-center bg-muted/30 p-2 rounded-lg">
              <img
                src={normalizedWorker.bankImageUrl}
                alt="Bank document"
                className="w-full h-auto object-contain border rounded-md shadow-sm"
              />
            </div>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[96vh]">
          <DrawerHeader className="text-left border-b pb-4">
            <DrawerTitle>Worker Details</DrawerTitle>
            <DrawerDescription>Detailed information about {worker.name}</DrawerDescription>
          </DrawerHeader>
          <div className="px-4 overflow-y-auto pb-8">
            {renderContent()}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader className="border-b pb-4">
          <SheetTitle>Worker Details</SheetTitle>
          <SheetDescription>
            Detailed information about {worker.name}
          </SheetDescription>
        </SheetHeader>
        <div className="pt-2">
          {renderContent()}
        </div>
      </SheetContent>
    </Sheet>
  );
};
