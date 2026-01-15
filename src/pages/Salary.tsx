
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmployeeSalaryTable } from '@/components/salary/EmployeeSalaryTable';
import { WorkerSalaryTable } from '@/components/salary/WorkerSalaryTable';
import { AddEmployeeSalaryDialog } from '@/components/salary/AddEmployeeSalaryDialog';
import { AddWorkerSalaryDialog } from '@/components/salary/AddWorkerSalaryDialog';
import { Button } from '@/components/ui/button';
import { PlusCircle, Calculator, Menu } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { WorkerSalary } from '@/types/salary';
import { getWorkerSalaries } from '@/Services/salaryService';
import { getProductions } from '@/Services/productionService';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Production } from '@/types/production';
import { autoGenerateEmployeeSalary } from '@/Services/salaryService';

// start with empty salaries; actual rows will be loaded from DB
const initialWorkerSalaries: WorkerSalary[] = [];

const Salary: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const isAdmin = user?.role === 'admin';
  const [activeTab, setActiveTab] = useState<string>("workers");
  const [isAddEmployeeSalaryOpen, setIsAddEmployeeSalaryOpen] = useState(false);
  const [isAddWorkerSalaryOpen, setIsAddWorkerSalaryOpen] = useState(false);
  const [workerSalaries, setWorkerSalaries] = useState<WorkerSalary[]>(initialWorkerSalaries);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // Date state for Employees Salary (Lifted from Table)
  const [employeeMonth, setEmployeeMonth] = useState<string>(new Date().getMonth().toString());
  const [employeeYear, setEmployeeYear] = useState<string>(new Date().getFullYear().toString());
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // No mock productions — rely on real production data when available
  const [productions, setProductions] = useState<Production[]>([]);

  // Function to add a new worker salary record
  const addWorkerSalary = (newSalary: WorkerSalary) => {
    setWorkerSalaries(prev => [...prev, newSalary]);
    toast({
      title: "Success",
      description: "Worker salary record has been added successfully.",
    });
  };

  // Function to calculate all worker salaries based on their monthly operations
  const calculateAllWorkerSalaries = () => {
    // Disabled: calculation that used to insert mock worker salary rows has been removed
    // to avoid adding dummy data. You can implement a proper calculation using
    // stored worker assignments or call a backend RPC to compute salaries.
    toast({
      title: 'Calculation Disabled',
      description: 'Calculate All is disabled to prevent inserting dummy salary records.',
    });
  };

  // Ensure only admin and supervisor can access this page
  if (user?.role !== 'admin' && user?.role !== 'supervisor') {
    return <Navigate to="/dashboard" />;
  }

  // fetch worker_salaries from DB on mount
  useEffect(() => {
    (async () => {
      try {
        const [salaryRows, productionRows] = await Promise.all([
          getWorkerSalaries(),
          getProductions()
        ]);

        if (salaryRows && salaryRows.length > 0) setWorkerSalaries(salaryRows as WorkerSalary[]);
        if (productionRows) setProductions(productionRows);

      } catch (err) {
        console.error('Failed to fetch initial data', err);
        // Fail silently or toast
      }
    })();
  }, []);

  const handleAutoGenerate = async () => {
    // Use selected month/year (1-indexed for service)
    const m = parseInt(employeeMonth) + 1;
    const y = parseInt(employeeYear);

    const res = await autoGenerateEmployeeSalary(m, y);

    if (res.error) {
      toast({
        title: "Error",
        description: res.error.message || "Something went wrong",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: `Salaries generated for ${m}/${y}. Table will update momentarily.`,
    });

    // Setup trigger to reload table without page reload
    setRefreshTrigger(prev => prev + 1);
  };

  const months = [
    { value: '0', label: 'January' },
    { value: '1', label: 'February' },
    { value: '2', label: 'March' },
    { value: '3', label: 'April' },
    { value: '4', label: 'May' },
    { value: '5', label: 'June' },
    { value: '6', label: 'July' },
    { value: '7', label: 'August' },
    { value: '8', label: 'September' },
    { value: '9', label: 'October' },
    { value: '10', label: 'November' },
    { value: '11', label: 'December' },
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => (currentYear - 2 + i).toString());


  // Render buttons based on device type and active tab
  const renderActionButtons = () => {
    if (activeTab === "workers") {
      return (
        <div className="flex items-center space-x-2">
          {/* ... existing worker buttons ... */}
          <Button
            variant="outline"
            onClick={calculateAllWorkerSalaries}
            className={isMobile ? "px-2 py-1 h-8" : ""}
            size={isMobile ? "sm" : "default"}
          >
            <Calculator className={`${isMobile ? "h-4 w-4" : "mr-2 h-4 w-4"}`} />
            {!isMobile && "Calculate All"}
          </Button>

          <Button
            onClick={() => setIsAddWorkerSalaryOpen(true)}
            className={isMobile ? "px-2 py-1 h-8" : ""}
            size={isMobile ? "sm" : "default"}
          >
            <PlusCircle className={`${isMobile ? "h-4 w-4" : "mr-2 h-4 w-4"}`} />
            {!isMobile && "Add Worker Salary"}
          </Button>
        </div>
      );
    } else if (activeTab === "employees" && isAdmin) {
      return (
        <div className="flex items-center space-x-2">
          {/* MONTH / YEAR SELECTORS IN HEADER */}
          <div className="flex items-center gap-2 mr-2">
            <select
              className="h-9 w-[120px] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={employeeMonth}
              onChange={(e) => setEmployeeMonth(e.target.value)}
            >
              {months.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
            <select
              className="h-9 w-[100px] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={employeeYear}
              onChange={(e) => setEmployeeYear(e.target.value)}
            >
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <Button
            variant="outline"
            onClick={handleAutoGenerate}
            className={isMobile ? "px-2 py-1 h-8" : ""}
            size={isMobile ? "sm" : "default"}
          >
            <Calculator className={`${isMobile ? "h-4 w-4" : "mr-2 h-4 w-4"}`} />
            {!isMobile && "Auto Generate"}
          </Button>

          <Button
            onClick={() => setIsAddEmployeeSalaryOpen(true)}
            className={isMobile ? "px-2 py-1 h-8" : ""}
            size={isMobile ? "sm" : "default"}
          >
            <PlusCircle className={`${isMobile ? "h-4 w-4" : "mr-2 h-4 w-4"}`} />
            {!isMobile && "Add Salary"}
          </Button>
        </div>
      );
    }

    return null;
  };



  // Desktop view logic continues...
  // ...

  // To fix the mobile/desktop split correctly I should replace the Desktop return:
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Salary Management</h1>
      </div>

      <Tabs defaultValue="workers" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="workers">Workers Salary</TabsTrigger>
            {isAdmin && <TabsTrigger value="employees">Employees Salary</TabsTrigger>}
          </TabsList>

          {renderActionButtons()}
        </div>

        <TabsContent value="workers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Workers Salary Records</CardTitle>
              <CardDescription>
                Monthly salary payments to production workers based on operations and piece rates.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WorkerSalaryTable
                salaries={workerSalaries}
                setSalaries={setWorkerSalaries}
                productions={productions}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="employees" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Employees Salary Records</CardTitle>
                <CardDescription>
                  Manage monthly salary payments to permanent employees.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <EmployeeSalaryTable month={employeeMonth} year={employeeYear} refreshTrigger={refreshTrigger} />
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Dialogs ... */}
      <AddWorkerSalaryDialog
        open={isAddWorkerSalaryOpen}
        onOpenChange={setIsAddWorkerSalaryOpen}
        onAddSalary={addWorkerSalary}
        productions={productions}
      />

      {isAdmin && (
        <AddEmployeeSalaryDialog
          open={isAddEmployeeSalaryOpen}
          onOpenChange={setIsAddEmployeeSalaryOpen}
        />
      )}
    </div>
  );
};

export default Salary;
