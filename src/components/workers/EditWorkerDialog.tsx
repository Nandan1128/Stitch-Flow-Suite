
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Worker } from "@/types/worker";

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Worker</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div>
            <label htmlFor="worker-name" className="block text-sm font-medium text-muted-foreground mb-1">
              Worker Name
            </label>
            <Input
              id="worker-name"
              name="name"
              placeholder="Enter name"
              value={form.name || ""}
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <label htmlFor="worker-mobile" className="block text-sm font-medium text-muted-foreground mb-1">
              Mobile Number
            </label>
            <Input
              id="worker-mobile"
              name="mobileNumber"
              placeholder="Mobile Number"
              value={form.mobileNumber || ""}
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <label htmlFor="worker-address" className="block text-sm font-medium text-muted-foreground mb-1">
              Address
            </label>
            <Input
              id="worker-address"
              name="address"
              placeholder="Address"
              value={form.address || ""}
              onChange={handleChange}
            />
          </div>
          {/* Add more fields as needed */}
          <DialogFooter>
            <Button type="submit">Save</Button>
            <DialogClose asChild>
              <Button variant="ghost" type="button">
                Cancel
              </Button>
            </DialogClose>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
