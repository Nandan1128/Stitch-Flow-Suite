
import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const SupervisorProfile: React.FC = () => {
  const { user } = useAuth();

  if (!user || user.role !== "supervisor") {
    return <div className="p-6">You must be logged in as a supervisor to view this page.</div>;
  }

  return (
    <div className="flex flex-col items-center px-4 py-12">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle>Supervisor Profile</CardTitle>
          <CardDescription>Your account details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="font-medium text-muted-foreground">Name</div>
            <div>{user.name}</div>
            <div className="font-medium text-muted-foreground">Email</div>
            <div>{user.email}</div>
            <div className="font-medium text-muted-foreground">Role</div>
            <div className="capitalize">{user.role}</div>
            <div className="font-medium text-muted-foreground">User ID</div>
            <div>{user.id}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SupervisorProfile;
