
import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Edit2, Save, X } from "lucide-react";

const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const AdminProfile: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || "",
      email: user?.email || "",
    },
  });

  if (!user || user.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              You must be logged in as an admin to view this page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const onSubmit = async (values: ProfileFormValues) => {
    try {
      // In a real app, this would call an API to update the profile
      console.log('Updating profile:', values);
      
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
      
      setIsEditing(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    reset();
    setIsEditing(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Profile</h1>
        <p className="text-muted-foreground">Manage your admin account details</p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>Your account details and settings</CardDescription>
          </div>
          {!isEditing && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2"
            >
              <Edit2 size={16} />
              Edit Profile
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                {isEditing ? (
                  <div>
                    <Input
                      id="name"
                      {...register("name")}
                      placeholder="Enter your full name"
                    />
                    {errors.name && (
                      <p className="text-sm text-destructive mt-1">{errors.name.message}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm bg-muted px-3 py-2 rounded-md">{user.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                {isEditing ? (
                  <div>
                    <Input
                      id="email"
                      type="email"
                      {...register("email")}
                      placeholder="Enter your email"
                    />
                    {errors.email && (
                      <p className="text-sm text-destructive mt-1">{errors.email.message}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm bg-muted px-3 py-2 rounded-md">{user.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Role</Label>
                <p className="text-sm bg-muted px-3 py-2 rounded-md capitalize">{user.role}</p>
              </div>

              <div className="space-y-2">
                <Label>User ID</Label>
                <p className="text-sm bg-muted px-3 py-2 rounded-md font-mono">{user.id}</p>
              </div>
            </div>

            {isEditing && (
              <>
                <Separator />
                <div className="flex items-center gap-3">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center gap-2"
                  >
                    <Save size={16} />
                    {isSubmitting ? "Saving..." : "Save Changes"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                    className="flex items-center gap-2"
                  >
                    <X size={16} />
                    Cancel
                  </Button>
                </div>
              </>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminProfile;
