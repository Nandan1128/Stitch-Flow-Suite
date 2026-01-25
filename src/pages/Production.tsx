// src/pages/Production.tsx
import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProductionTable } from "@/components/production/ProductionTable";
import { AddProductionDialog } from "@/components/production/AddProductionDialog";
import { EditProductionDialog } from "@/components/production/EditProductionDialog";
import ProductionOperationsDialog from "@/components/production/ProductionOperationsDialog";

import {
  getProductions,
  getProducts,
  createProduction,
  getProductionById,
  updateProduction
} from "@/Services/productionService";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Production } from "@/types/production";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ProductionPage: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isOperationsDialogOpen, setIsOperationsDialogOpen] = useState(false);
  const [selectedProduction, setSelectedProduction] = useState<Production | null>(null);

  const { data: products = [] } = useQuery({
    queryKey: ["products_for_production"],
    queryFn: getProducts,
  });

  const { data: productions = [], isLoading } = useQuery({
    queryKey: ["productions"],
    queryFn: getProductions,
  });

  const handleAddProduction = async (row: any) => {
    await createProduction(row);
    toast({ title: "Production added" });
    setIsAddDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: ["productions"] });
  };

  const handleEditProduction = async (productionId: string) => {
    const data = await getProductionById(productionId);
    if (!data) {
      toast({ title: "Error", description: "Production not found", variant: "destructive" });
      return;
    }
    setSelectedProduction(data);
    setIsEditDialogOpen(true);
  };

  const handleViewOperations = async (production: Production) => {
    const data = await getProductionById(production.id);
    setSelectedProduction(data);
    setIsOperationsDialogOpen(true);
  };

  // new: update production handler
  const handleUpdateProduction = async (id: string, updates: any) => {
    await updateProduction(id, updates);
    toast({ title: "Production updated" });
    queryClient.invalidateQueries({ queryKey: ["productions"] });
    setIsEditDialogOpen(false);
  };

  const filtered = (productions || []).filter((p: any) => {
    // Status filter
    const status = p.status || 'active'; // Default to active if undefined
    if (status !== activeTab) return false;

    // Search filter
    const term = (searchTerm || "").toLowerCase();
    return (
      (p.productName || p.name || "").toString().toLowerCase().includes(term) ||
      (p.productionId || p.production_id || "").toString().toLowerCase().includes(term) ||
      (p.poNumber || p.po_number || "").toString().toLowerCase().includes(term) ||
      (p.color || "").toString().toLowerCase().includes(term)
    );
  });

  const activeCount = (productions || []).filter((p: any) => (p.status || 'active') === 'active').length;
  const completedCount = (productions || []).filter((p: any) => p.status === 'completed').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Production</h1>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Production
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>Production Records</CardTitle>
              <CardDescription>View & manage all production entries.</CardDescription>
            </div>

            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'active' | 'completed')} className="w-full md:w-auto">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="active">Active ({activeCount})</TabsTrigger>
                <TabsTrigger value="completed">Completed ({completedCount})</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>

        <CardContent>
          <div className="relative mb-6">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <ProductionTable
            productions={filtered}
            onEditProduction={handleEditProduction}
            onViewOperations={handleViewOperations}
            activeTab={activeTab}
          />
        </CardContent>
      </Card>

      <AddProductionDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        products={products}
        onAddProduction={handleAddProduction}
      />

      <EditProductionDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        production={selectedProduction}
        onUpdateProduction={(updatedProduction: any) => {
          // we expect the dialog to call with full updated production object
          handleUpdateProduction(updatedProduction.id, updatedProduction);
        }}
      />

      <ProductionOperationsDialog
        open={isOperationsDialogOpen}
        onOpenChange={setIsOperationsDialogOpen}
        production={selectedProduction}
        availableWorkers={[]} // wire to real workers where available
        onAssignWorker={async (productionId, operationRecordId, workerId, pieces) => {
          // note: operationRecordId is id of production_operation row
          await assignWorkerAndRefresh(productionId, operationRecordId, workerId, pieces);
        }}
      />
    </div>
  );
};

export default ProductionPage;

// small helper used by ProductionPage (assign + refresh)
import { assignWorkerToOperation } from "@/Services/productionService";
async function assignWorkerAndRefresh(productionId: string, operationRecordId: string, workerId: string, pieces: number) {
  await assignWorkerToOperation(productionId, operationRecordId, workerId || null, pieces || 0);
  // invalidate production operations and productions if using react-query
  // caller (ProductionPage) does not have react-query instance here but the component above does.
}
