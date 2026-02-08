import React from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '@/components/ui/use-toast';
import { updateSupervisor } from '@/Services/supervisorService';

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
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useIsMobile } from '@/hooks/use-mobile';

const supervisorEditSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email address"),
});

type SupervisorEditFormValues = z.infer<typeof supervisorEditSchema>;

interface Supervisor {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  createdAt: Date;
}

interface SupervisorEditDialogProps {
  supervisor: Supervisor;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: (supervisor: Supervisor) => void;
}

export const SupervisorEditDialog: React.FC<SupervisorEditDialogProps> = ({
  supervisor,
  open,
  onOpenChange,
  onUpdated,
}) => {
  const isMobile = useIsMobile();
  const { toast } = useToast();

  const form = useForm<SupervisorEditFormValues>({
    resolver: zodResolver(supervisorEditSchema),
    defaultValues: {
      name: supervisor.name,
      email: supervisor.email,
    },
  });

  const onSubmit = async (values: SupervisorEditFormValues) => {
    const res = await updateSupervisor(supervisor.id, {
      name: values.name,
      email: values.email,
    });

    if (res.error) {
      toast({
        title: "Failed to update supervisor",
        description: res.error?.message ?? "An error occurred",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Supervisor updated",
      description: `${values.name}'s information has been updated.`,
    });

    onUpdated?.(res.data!);
    onOpenChange(false);
  };

  const renderForm = () => (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
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
              <FormLabel>Email Address</FormLabel>
              <FormControl>
                <Input type="email" placeholder="supervisor@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t sticky bottom-0 bg-background">
          <Button type="submit" className="flex-1">
            Save Changes
          </Button>
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
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
            <DrawerTitle>Edit Supervisor</DrawerTitle>
            <DrawerDescription>
              Update supervisor information.
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
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader className="border-b pb-4">
          <DialogTitle>Edit Supervisor</DialogTitle>
          <DialogDescription>
            Update supervisor information. Click save when done.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          {renderForm()}
        </div>
      </DialogContent>
    </Dialog>
  );
};
