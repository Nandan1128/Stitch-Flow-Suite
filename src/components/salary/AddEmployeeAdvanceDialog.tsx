import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { addEmployeeAdvance } from "@/Services/salaryService";
import { useIsMobile } from "@/hooks/use-mobile";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
  onSaved?: () => void;
}

export const AddEmployeeAdvanceDialog: React.FC<Props> = ({ open, onOpenChange, employeeId, onSaved }) => {
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  const save = async () => {
    if (!employeeId || !amount || !date) {
      toast({ title: "Incomplete", description: "Please enter amount and date", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const res = await addEmployeeAdvance({
        employeeId,
        amount: Number(amount),
        date: new Date(date),
        note
      });

      if (res.error) throw res.error;

      toast({ title: "Advance Added", description: "Advance recorded and salary updated." });
      setAmount("");
      setNote("");
      setDate(new Date().toISOString().split("T")[0]);
      onOpenChange(false);
      onSaved?.();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to save", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => (
    <div className="space-y-4 py-2">
      <div>
        <Label>Date</Label>
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9" />
      </div>
      <div>
        <Label>Amount (₹)</Label>
        <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-9" placeholder="Enter amount" />
      </div>
      <div>
        <Label>Note</Label>
        <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason (optional)" className="h-9" />
      </div>
    </div>
  );

  const renderFooter = () => (
    <div className="flex flex-col sm:flex-row gap-3 pt-4 sm:pt-0">
      <Button onClick={save} disabled={loading} className="flex-1">
        {loading ? "Saving..." : "Save Advance"}
      </Button>
      <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
        Cancel
      </Button>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader className="text-left border-b pb-4">
            <DrawerTitle>Add Employee Advance</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 py-4">
            {renderContent()}
            <div className="mt-6">
              {renderFooter()}
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader className="border-b pb-4">
          <DialogTitle>Add Employee Advance</DialogTitle>
        </DialogHeader>

        {renderContent()}

        <DialogFooter className="pt-4 border-t">
          {renderFooter()}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
