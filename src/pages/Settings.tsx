import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/Config/supabaseClient';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { User, Shield, Lock } from 'lucide-react';
import { AddSupervisorDialog } from '@/components/settings/AddSupervisorDialog';
import { SupervisorTable } from '@/components/settings/SupervisorTable';
import { getSupervisors, addSupervisor, toggleSupervisorStatus } from '@/Services/supervisorService';
import { AddSupervisorPayload } from '@/components/settings/AddSupervisorDialog'; // type from dialog

// Schema for password change form
const passwordSchema = z.object({
  currentPassword: z.string().min(6, "Current password is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(8, "Please confirm your password"),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type PasswordFormValues = z.infer<typeof passwordSchema>;

const Settings: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [supervisors, setSupervisors] = useState<any[]>([]);
  const [loadingSupervisors, setLoadingSupervisors] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  // Form for changing password
  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Check if the user is an admin, if not redirect
  if (!isAuthenticated || user?.role !== 'admin') {
    return <Navigate to="/dashboard" />;
  }

  // Load supervisors from DB on mount
  useEffect(() => {
    const load = async () => {
      setLoadingSupervisors(true);
      try {
        const rows = await getSupervisors();
        setSupervisors(rows);
      } catch (err) {
        console.error("Failed to load supervisors:", err);
      } finally {
        setLoadingSupervisors(false);
      }
    };
    load();
  }, []);

  // Handle password change submission
  const onPasswordSubmit = async (values: PasswordFormValues) => {
    try {
      const { data, error } = await supabase.rpc("change_user_password", {
        p_user_id: user?.id,
        p_current_password: values.currentPassword,
        p_new_password: values.newPassword,
      });

      if (error) {
        toast({
          title: "Error",
          description: "Something went wrong while updating the password.",
          variant: "destructive",
        });
        return;
      }

      if (data === "INVALID_PASSWORD") {
        toast({
          title: "Incorrect Password",
          description: "Your current password is incorrect.",
          variant: "destructive",
        });
        return;
      }

      if (data === "SUCCESS") {
        toast({
          title: "Password Updated",
          description: "Your password has been changed successfully.",
        });
        passwordForm.reset();
        return;
      }

      toast({
        title: "Error",
        description: "Unknown error occurred.",
        variant: "destructive",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Unexpected error occurred.",
        variant: "destructive",
      });
    }
  };


  const handleAddSupervisor = async (payload: AddSupervisorPayload) => {
    console.log("Settings handleAddSupervisor bridge triggered with:", { ...payload, password: "REDACTED" });
    const res = await addSupervisor(payload);
    if (res.error) {
      toast({
        title: "Failed to add supervisor",
        description: res.error?.message ?? "An error occurred",
        variant: "destructive",
      });
      return res; // Return the full response
    }

    if (res.data) {
      setSupervisors([res.data.supervisor, ...supervisors]);
      toast({
        title: "Supervisor added",
        description: `${res.data.supervisor.name} has been added as a supervisor.`,
      });
    }
    return res;
  };

  const handleToggleSupervisorStatus = async (id: string) => {
    const supervisor = supervisors.find(s => s.id === id);
    if (!supervisor) return;

    const res = await toggleSupervisorStatus(id, supervisor.isActive);
    if (res.error) {
      toast({
        title: "Failed to toggle status",
        description: res.error?.message ?? "An error occurred",
        variant: "destructive",
      });
      return;
    }

    if (res.data) {
      setSupervisors(supervisors.map(s =>
        s.id === id ? { ...s, isActive: res.data.isActive } : s
      ));
      toast({
        title: "Status updated",
        description: `${supervisor.name} is now ${res.data.isActive ? "active" : "inactive"}.`,
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your system settings and supervisors</p>
      </div>

      <Tabs defaultValue="supervisors" className="space-y-4">
        <TabsList>
          <TabsTrigger value="supervisors" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Supervisors
          </TabsTrigger>
          <TabsTrigger value="password" className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Change Password
          </TabsTrigger>
          <TabsTrigger value="account" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Account
          </TabsTrigger>
        </TabsList>

        <TabsContent value="supervisors" className="space-y-4">
          <div className="flex justify-between">
            <h2 className="text-lg font-semibold">Supervisor Management</h2>
            <Button onClick={() => setIsAddDialogOpen(true)}>Add Supervisor</Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Supervisors</CardTitle>
              <CardDescription>
                Manage your production supervisors and their permissions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SupervisorTable
                supervisors={supervisors}
                onToggleStatus={handleToggleSupervisorStatus}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="password">
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>
                Update your admin password. Choose a strong password you don't use elsewhere.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Form {...passwordForm}>
                <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                  <FormField
                    control={passwordForm.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Enter your current password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={passwordForm.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Enter your new password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={passwordForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Confirm your new password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit">Update Password</Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="account">
          <Card>
            <CardHeader>
              <CardTitle>Account Settings</CardTitle>
              <CardDescription>
                Manage your account preferences and information.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Account Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Name</p>
                      <p>{user?.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p>{user?.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Role</p>
                      <p className="capitalize">{user?.role}</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AddSupervisorDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onAddSupervisor={handleAddSupervisor}
      />
    </div>
  );
};

export default Settings;
