import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Search, Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProductionTable } from "@/components/production/ProductionTable";
import { AddProductionDialog } from "@/components/production/AddProductionDialog";
import { EditProductionDialog } from "@/components/production/EditProductionDialog";
import ProductionOperationsDialog from "@/components/production/ProductionOperationsDialog";
import { Production, WorkerAssignment } from '@/types/production';
import { useToast } from '@/hooks/use-toast';
import { WorkerSalary } from '@/types/salary';
import { v4 as uuidv4 } from 'uuid';

// Mock data for initial development
const mockProductions: Production[] = [
  {
    id: '1',
    name: 'Summer T-Shirt Collection',
    productionId: 'PRD-2023-001',
    poNumber: 'PO-12345',
    color: 'Blue',
    totalFabric: 500,
    average: 0.5,
    totalQuantity: 1000,
    operations: [
      {
        id: '1-1',
        name: 'Cutting',
        ratePerPiece: 5,
        isCompleted: false,
        productionId: '1'
      },
      {
        id: '1-2',
        name: 'Stitching',
        ratePerPiece: 15,
        isCompleted: false,
        productionId: '1'
      }
    ],
    createdBy: 'admin',
    createdAt: new Date('2023-01-20')
  },
  {
    id: '2',
    name: 'Winter Jacket Production',
    productionId: 'PRD-2023-002',
    poNumber: 'PO-67890',
    color: 'Black',
    totalFabric: 1200,
    average: 2.4,
    totalQuantity: 500,
    operations: [
      {
        id: '2-1',
        name: 'Cutting',
        ratePerPiece: 8,
        isCompleted: false,
        productionId: '2'
      },
      {
        id: '2-2',
        name: 'Stitching',
        ratePerPiece: 25,
        isCompleted: false,
        productionId: '2'
      },
      {
        id: '2-3',
        name: 'Washing',
        ratePerPiece: 12,
        isCompleted: false,
        productionId: '2'
      }
    ],
    createdBy: 'admin',
    createdAt: new Date('2023-02-15')
  }
];

// Mock data for workers - This would ideally come from a database
const mockWorkers = [
  { id: 'WOR001', name: 'Ramesh Kumar' },
  { id: 'WOR002', name: 'Suresh Singh' },
  { id: 'WOR003', name: 'Manoj Verma' },
  { id: 'WOR004', name: 'Ravi Patel' },
  { id: 'WOR005', name: 'Amit Sharma' },
];

const ProductionPage: React.FC = () => {
  const [productions, setProductions] = useState<Production[]>(mockProductions);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isOperationsDialogOpen, setIsOperationsDialogOpen] = useState(false);
  const [selectedProduction, setSelectedProduction] = useState<Production | null>(null);
  const [workerAssignments, setWorkerAssignments] = useState<WorkerAssignment[]>([]);
  const [workerSalaries, setWorkerSalaries] = useState<WorkerSalary[]>([]);
  
  const { toast } = useToast();

  const handleAddProduction = (newProduction: Production) => {
    setProductions([...productions, newProduction]);
    toast({
      title: "Production added",
      description: `${newProduction.name} has been added successfully.`,
    });
  };

  const handleUpdateProduction = (updatedProduction: Production) => {
    // Check if operations have assigned workers
    const hasAssignedWorkers = updatedProduction.operations.some(op => op.assignedWorkerId);
    
    setProductions(productions.map(production => 
      production.id === updatedProduction.id ? updatedProduction : production
    ));
    
    toast({
      title: "Production updated",
      description: `${updatedProduction.name} has been updated successfully.`,
    });
    
    // If operations have assigned workers, update worker assignments
    if (hasAssignedWorkers) {
      const newAssignments = updatedProduction.operations
        .filter(op => op.assignedWorkerId)
        .map(op => {
          const worker = mockWorkers.find(w => w.id === op.assignedWorkerId);
          return {
            workerId: op.assignedWorkerId!,
            workerName: worker?.name || 'Unknown Worker',
            operationId: op.id,
            operationName: op.name,
            productionId: updatedProduction.id,
            productionName: updatedProduction.name,
            piecesDone: 0, // Default value, will be updated when work is recorded
            date: new Date()
          };
        });
      
      setWorkerAssignments(prev => [
        ...prev.filter(wa => wa.productionId !== updatedProduction.id), // Remove old assignments for this production
        ...newAssignments
      ]);
      
      // Create salary records for newly assigned workers
      const newSalaryRecords = updatedProduction.operations
        .filter(op => op.assignedWorkerId)
        .map(op => {
          const worker = mockWorkers.find(w => w.id === op.assignedWorkerId);
          return {
            id: uuidv4(),
            workerId: op.assignedWorkerId!,
            workerName: worker?.name || 'Unknown Worker',
            productId: updatedProduction.id,
            productName: updatedProduction.name,
            date: new Date(),
            operationId: op.id,
            operationName: op.name,
            piecesDone: 0, // Default value, will be updated when work is completed
            amountPerPiece: op.ratePerPiece,
            totalAmount: 0, // Will be calculated when pieces are done
            paid: false
          };
        });
      
      // Only add new salary records if they don't already exist
      const existingSalaryIds = workerSalaries.map(ws => 
        `${ws.workerId}-${ws.productId}-${ws.operationId}`
      );
      
      const filteredNewSalaries = newSalaryRecords.filter(nsr => 
        !existingSalaryIds.includes(`${nsr.workerId}-${nsr.productId}-${nsr.operationId}`)
      );
      
      if (filteredNewSalaries.length > 0) {
        setWorkerSalaries(prev => [...prev, ...filteredNewSalaries]);
        toast({
          title: "Salary records created",
          description: `${filteredNewSalaries.length} new worker salary records have been created.`,
        });
      }
    }
  };

  const handleEditProduction = (id: string) => {
    const production = productions.find(p => p.id === id);
    if (production) {
      setSelectedProduction(production);
      setIsEditDialogOpen(true);
    }
  };
  
  const handleViewOperations = (production: Production) => {
    setSelectedProduction(production);
    setIsOperationsDialogOpen(true);
  };

  const filteredProductions = productions.filter(production => 
    production.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    production.productionId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    production.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    production.color.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Production Management</h1>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Production
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Production Records</CardTitle>
          <CardDescription>
            View, add, and manage all your production records here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search productions by name, ID, P.O number, or color..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <ProductionTable 
            productions={filteredProductions} 
            onEditProduction={handleEditProduction}
            onViewOperations={handleViewOperations}
          />
        </CardContent>
      </Card>

      <AddProductionDialog 
        open={isAddDialogOpen} 
        onOpenChange={setIsAddDialogOpen}
        onAddProduction={handleAddProduction}
        availableWorkers={mockWorkers}
      />

      <EditProductionDialog 
        open={isEditDialogOpen} 
        onOpenChange={setIsEditDialogOpen}
        onUpdateProduction={handleUpdateProduction}
        production={selectedProduction}
        availableWorkers={mockWorkers}
      />
      
      <ProductionOperationsDialog
        open={isOperationsDialogOpen}
        onOpenChange={setIsOperationsDialogOpen}
        production={selectedProduction} availableWorkers={[]} onAssignWorker={function (productionId: string, operationId: string, workerId: string): void {
          throw new Error('Function not implemented.');
        } }      />
    </div>
  );
};

export default ProductionPage;
