import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AddEmployeeDialog } from "@/components/employees/AddEmployeeDialog";
import { EmployeeTable } from "@/components/employees/EmployeeTable";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getEmployees, toggleEmployeeStatus, updateEmployee } from "@/Services/employeeService";
import { AttendanceDialog } from '@/components/attendance/AttendanceDialog';
const Employees: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isAttendanceOpen, setOpenAttendance] = useState(false);
  const queryClient = useQueryClient();



  // Fetch REAL employees from Supabase
  const { data: employees = [], isLoading, error } = useQuery({
    queryKey: ["employees"],
    queryFn: getEmployees,
  });

  // Convert DB → frontend format
  const mappedEmployees = employees.map((e: any) => ({
    id: e.id,
    employeeId: e.employee_code,
    name: e.name,
    email: e.email,
    address: e.address,
    permanentAddress: e.permanent_address,
    currentAddress: e.current_address,
    mobileNumber: e.mobile_number,
    emergencyNumber: e.emergency_number,
    idProof: e.id_proof,
    idProofImageUrl: e.id_proof_image_url,
    bankAccountDetail: e.bank_account_detail,
    bankImageUrl: e.bank_image_url,
    salary: e.salary_amount,
    isActive: e.is_active,
    createdBy: e.created_by,
    created_at: e.created_at,
  }));

  // Add employee → refresh list
  const handleAddEmployee = async () => {
    await queryClient.invalidateQueries({ queryKey: ["employees"] });
  };



  // Toggle active/inactive
  const handleToggleStatus = async (id: string) => {
    await toggleEmployeeStatus(id);
    queryClient.invalidateQueries({ queryKey: ["employees"] });
  };

  // Edit employee
  const handleUpdateEmployee = async (id: string, updatedEmployee: any) => {
    // Convert camelCase → snake_case
    const payload = {
      name: updatedEmployee.name,
      employee_code: updatedEmployee.employeeId,
      address: updatedEmployee.address,
      permanent_address: updatedEmployee.permanentAddress,
      current_address: updatedEmployee.currentAddress,
      mobile_number: updatedEmployee.mobileNumber,
      emergency_number: updatedEmployee.emergencyNumber,
      id_proof: updatedEmployee.idProof,
      id_proof_image_url: updatedEmployee.idProofImageUrl,
      bank_account_detail: updatedEmployee.bankAccountDetail,
      bank_image_url: updatedEmployee.bankImageUrl,
      salary_amount: updatedEmployee.salary,
      is_active: updatedEmployee.isActive,
    };

    await updateEmployee(id, payload);
    queryClient.invalidateQueries({ queryKey: ["employees"] });
  };


  // Search
  const filteredEmployees = mappedEmployees.filter((employee: any) =>
    employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.employeeId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Employees</h1>
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 w-full md:w-auto">
          <Button onClick={() => setOpenAttendance(true)} className="w-full md:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Mark Attendance
          </Button>

          <Button onClick={() => setIsAddDialogOpen(true)} className="w-full md:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Add Employee
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Employee Management</CardTitle>
          <CardDescription>
            View, add, and manage all employees in the company.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search employees by name or ID..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {isLoading && <p>Loading employees...</p>}
          {error && <p>Error loading employees.</p>}

          {!isLoading && !error && (
            <EmployeeTable
              employees={filteredEmployees}
              onToggleStatus={handleToggleStatus}
              onUpdateEmployee={handleUpdateEmployee}
            />
          )}
        </CardContent>
      </Card>

      <AddEmployeeDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onAddEmployee={handleAddEmployee}
      />
      <AttendanceDialog
        open={isAttendanceOpen}
        onOpenChange={setOpenAttendance}
        markedByEmployeeId={null}
      />

    </div>
  );

};

export default Employees;
