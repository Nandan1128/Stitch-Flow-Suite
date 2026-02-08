// src/pages/Workers.tsx
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AddWorkerDialog } from "@/components/workers/AddWorkerDialog";
import { WorkerTable } from "@/components/workers/WorkerTable";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getWorkers, updateWorker as svcUpdateWorker, insertWorker } from "@/Services/workerService";
import { Worker } from "@/types/worker";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";

const Workers: React.FC = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const queryClient = useQueryClient();

  // Redirect if not admin/supervisor
  if (user?.role !== "admin" && user?.role !== "supervisor") {
    return <Navigate to="/dashboard" />;
  }

  const { data: workersRaw = [], isLoading, error } = useQuery({
    queryKey: ["workers"],
    queryFn: getWorkers,
  });

  // Map DB -> UI-friendly Worker interface (camelCase)
  const mappedWorkers: Worker[] = (workersRaw as any[]).map((w) => ({
    id: w.id,
    name: w.name,
    worker_code: w.worker_code,
    workerId: w.worker_code,
    address: w.address,
    permanentAddress: w.permanent_address,
    currentAddress: w.current_address,
    mobileNumber: w.mobile_number,
    emergencyNumber: w.emergency_number,
    idProof: w.id_proof,
    idProofImageUrl: w.id_proof_image_url ?? "",
    bankAccountDetail: w.bank_account_detail ?? "",
    bankName: w.bank_name ?? "",
    accountNumber: w.account_number ?? "",
    ifscCode: w.ifsc_code ?? "",
    accountHolderName: w.account_holder_name ?? "",
    bankImageUrl: w.bank_image_url ?? "",
    profileImageUrl: w.profile_image_url ?? "",
    // removed addressProofImageUrl (not in DB)

    createdBy: (w.created_by as string) || undefined,
    enteredBy: (w.entered_by as string) || undefined,
    createdAt: w.created_at ? new Date(w.created_at) : new Date(), // fallback to now
  }));

  // Add worker: called after AddWorkerDialog completes insert
  const handleAfterAdd = async () => {
    await queryClient.invalidateQueries({ queryKey: ["workers"] });
  };

  const handleUpdateWorker = async (id: string, updates: Partial<Worker>) => {
    // Map updates back to DB column names
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.address !== undefined) dbUpdates.address = updates.address;
    if (updates.permanentAddress !== undefined) dbUpdates.permanent_address = updates.permanentAddress;
    if (updates.currentAddress !== undefined) dbUpdates.current_address = updates.currentAddress;
    if (updates.mobileNumber !== undefined) dbUpdates.mobile_number = updates.mobileNumber;
    if (updates.emergencyNumber !== undefined) dbUpdates.emergency_number = updates.emergencyNumber;
    if (updates.bankAccountDetail !== undefined) dbUpdates.bank_account_detail = updates.bankAccountDetail;
    if (updates.bankName !== undefined) dbUpdates.bank_name = updates.bankName;
    if (updates.accountNumber !== undefined) dbUpdates.account_number = updates.accountNumber;
    if (updates.ifscCode !== undefined) dbUpdates.ifsc_code = updates.ifscCode;
    if (updates.accountHolderName !== undefined) dbUpdates.account_holder_name = updates.accountHolderName;
    if (updates.profileImageUrl !== undefined) dbUpdates.profile_image_url = updates.profileImageUrl;
    if (updates.idProofImageUrl !== undefined) dbUpdates.id_proof_image_url = updates.idProofImageUrl;
    if (updates.bankImageUrl !== undefined) dbUpdates.bank_image_url = updates.bankImageUrl;
    // any other mapping as needed

    await svcUpdateWorker(id, dbUpdates);
    await queryClient.invalidateQueries({ queryKey: ["workers"] });
  };

  const filtered = mappedWorkers.filter((w) =>
    w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (w.workerId ?? "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Workers</h1>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Worker
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Worker Management</CardTitle>
          <CardDescription>View, add and manage all workers.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search workers by name or ID..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {isLoading && <p>Loading workers...</p>}
          {error && <p>Error loading workers.</p>}

          {!isLoading && !error && (
            <WorkerTable workers={filtered} onUpdateWorker={handleUpdateWorker} />
          )}
        </CardContent>
      </Card>

      <AddWorkerDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onAddWorker={async () => {
          setIsAddDialogOpen(false);
          await handleAfterAdd();
        }}
      />
    </div>
  );
};

export default Workers;
