
import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { User, Mail, Shield, Hash } from "lucide-react";

const SupervisorProfile: React.FC = () => {
  const { user } = useAuth();

  if (!user || user.role !== "supervisor") {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              You must be logged in as a supervisor to view this page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Supervisor Profile</h1>
        <p className="text-muted-foreground">View your account details</p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User size={20} />
            Profile Information
          </CardTitle>
          <CardDescription>
            Your account details. Contact an admin to make changes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <User size={16} />
                Full Name
              </Label>
              <p className="text-sm bg-muted px-3 py-2 rounded-md font-medium">{user.name}</p>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Mail size={16} />
                Email Address
              </Label>
              <p className="text-sm bg-muted px-3 py-2 rounded-md">{user.email}</p>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Shield size={16} />
                Role
              </Label>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="capitalize">
                  {user.role}
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Hash size={16} />
                User ID
              </Label>
              <p className="text-sm bg-muted px-3 py-2 rounded-md font-mono">{user.id}</p>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Only administrators can edit profile information. 
              If you need to update your details, please contact your system administrator.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SupervisorProfile;
