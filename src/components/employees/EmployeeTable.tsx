
import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Edit, UserCheck, UserX } from "lucide-react";
import { Employee } from '@/types/employee';
import { Switch } from "@/components/ui/switch";
import { formatDistanceToNow } from 'date-fns';
import { useToast } from "@/hooks/use-toast";
import { EmployeeDetailsSheet } from './EmployeeDetailsSheet';

interface EmployeeTableProps {
  employees: Employee[];
  onToggleStatus: (id: string) => void;
  onUpdateEmployee: (id: string, updatedEmployee: Partial<Employee>) => void;
}

export const EmployeeTable: React.FC<EmployeeTableProps> = ({ 
  employees, 
  onToggleStatus,
  onUpdateEmployee
}) => {
  const { toast } = useToast();
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isDetailsSheetOpen, setIsDetailsSheetOpen] = useState(false);
  
  const handleToggle = (employee: Employee) => {
    onToggleStatus(employee.id);
    
    toast({
      title: `Employee status updated`,
      description: `${employee.name} is now ${!employee.isActive ? 'active' : 'inactive'}`,
      variant: !employee.isActive ? "default" : "destructive",
    });
  };

  const handleEditClick = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsDetailsSheetOpen(true);
  };

  const handleViewClick = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsDetailsSheetOpen(true);
  };

  if (employees.length === 0) {
    return (
      <div className="text-center p-6 bg-gray-50 rounded-lg">
        <h3 className="font-medium text-lg">No employees found</h3>
        <p className="text-muted-foreground">Try changing your search term or add new employees.</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Mobile</TableHead>
              <TableHead>Salary</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Added</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.map((employee) => (
              <TableRow key={employee.id}>
                <TableCell className="font-medium">{employee.employeeId}</TableCell>
                <TableCell>{employee.name}</TableCell>
                <TableCell>{employee.mobileNumber}</TableCell>
                <TableCell>₹{employee.salary.toLocaleString()}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Switch 
                      checked={employee.isActive}
                      onCheckedChange={() => handleToggle(employee)}
                    />
                    <Badge variant={employee.isActive ? "default" : "outline"}>
                      {employee.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell>{formatDistanceToNow(new Date(employee.createdAt), { addSuffix: true })}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="icon" title="View Details" onClick={() => handleViewClick(employee)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      title="Edit Employee"
                      onClick={() => handleEditClick(employee)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant={employee.isActive ? "outline" : "default"} 
                      size="icon"
                      onClick={() => handleToggle(employee)}
                      title={employee.isActive ? "Deactivate Employee" : "Activate Employee"}
                    >
                      {employee.isActive ? 
                        <UserX className="h-4 w-4" /> : 
                        <UserCheck className="h-4 w-4" />
                      }
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <EmployeeDetailsSheet 
        open={isDetailsSheetOpen}
        onOpenChange={setIsDetailsSheetOpen}
        employee={selectedEmployee}
        onUpdateEmployee={onUpdateEmployee}
      />
    </>
  );
};
