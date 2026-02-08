// EmployeeTable.tsx
import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Edit, UserCheck, UserX, User, Phone, DollarSign, Calendar, MoreVertical } from "lucide-react";
import { Employee } from '@/types/employee';
import { Switch } from "@/components/ui/switch";
import { formatDistanceToNow } from 'date-fns';
import { useToast } from "@/hooks/use-toast";
import { EmployeeDetailsSheet } from './EmployeeDetailsSheet';
import { EditEmployeeDialog } from './EditEmployeeDialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
  const isMobile = useIsMobile();

  // ⭐ NEW: readOnly flag
  const [readOnly, setReadOnly] = useState(false);

  // ⭐ NEW: Edit Dialog state
  const [isEditOpen, setIsEditOpen] = useState(false);

  const handleToggle = (employee: Employee) => {
    onToggleStatus(employee.id);

    toast({
      title: `Employee status updated`,
      description: `${employee.name} is now ${!employee.isActive ? 'active' : 'inactive'}`,
      variant: !employee.isActive ? "default" : "destructive",
    });
  };

  // ⭐ View (READ ONLY)
  const handleViewClick = (employee: Employee) => {
    setSelectedEmployee(employee);
    setReadOnly(true);      // VIEW = READ ONLY
    setIsDetailsSheetOpen(true);
  };

  // ⭐ Edit (EDITABLE)
  const handleEditClick = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsEditOpen(true); // Open DIALOG, not Sheet
  };

  if (employees.length === 0) {
    return (
      <div className="text-center p-6 bg-gray-50 rounded-lg">
        <h3 className="font-medium text-lg">No employees found</h3>
        <p className="text-muted-foreground">Try changing your search term or add new employees.</p>
      </div>
    );
  }

  if (isMobile) {
    return (
      <div className="space-y-4">
        {employees.map((employee) => {
          const createdAt = employee.created_at ? new Date(employee.created_at) : null;
          const createdAtLabel = createdAt && !isNaN(createdAt as any)
            ? formatDistanceToNow(createdAt, { addSuffix: true })
            : "—";

          return (
            <Card key={employee.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <User size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg leading-none">{employee.name}</h3>
                      <div className="flex items-center text-xs text-muted-foreground mt-1">
                        <span className="bg-muted px-1.5 py-0.5 rounded font-mono">{employee.employeeId}</span>
                        <span className="mx-1">•</span>
                        <Badge variant={employee.isActive ? "default" : "outline"} className="h-5 text-[10px] px-1.5">
                          {employee.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="-mr-2 -mt-2">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleViewClick(employee)}>
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEditClick(employee)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Employee
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleToggle(employee)}>
                        {employee.isActive ? <UserX className="mr-2 h-4 w-4" /> : <UserCheck className="mr-2 h-4 w-4" />}
                        {employee.isActive ? 'Deactivate' : 'Activate'}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="grid grid-cols-2 gap-y-3 text-sm">
                  <div className="flex items-center text-muted-foreground">
                    <Phone className="w-4 h-4 mr-2" />
                    {employee.mobileNumber || "N/A"}
                  </div>
                  <div className="flex items-center text-muted-foreground">
                    <DollarSign className="w-4 h-4 mr-2 text-green-600" />
                    ₹{Number(employee.salary || 0).toLocaleString()}
                  </div>
                  <div className="flex items-center text-muted-foreground col-span-2 border-t pt-2 mt-1">
                    <Calendar className="w-4 h-4 mr-2" />
                    <span className="text-xs">Added {createdAtLabel}</span>
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outline"
                    className="flex-1 text-xs h-8"
                    onClick={() => handleViewClick(employee)}
                  >
                    <Eye className="h-3 w-3 mr-1.5" />
                    View
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 text-xs h-8"
                    onClick={() => handleEditClick(employee)}
                  >
                    <Edit className="h-3 w-3 mr-1.5" />
                    Edit
                  </Button>
                  <div className="flex items-center justify-center bg-muted/30 rounded-md px-2 h-8">
                    <Switch
                      checked={employee.isActive}
                      onCheckedChange={() => handleToggle(employee)}
                      className="scale-75"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        <EmployeeDetailsSheet
          open={isDetailsSheetOpen}
          onOpenChange={setIsDetailsSheetOpen}
          employee={selectedEmployee}
          onUpdateEmployee={onUpdateEmployee}
          readOnly={readOnly}
        />

        <EditEmployeeDialog
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
          employee={selectedEmployee}
          onUpdateEmployee={onUpdateEmployee}
        />
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
            {employees.map((employee) => {
              const createdAt = employee.created_at
                ? new Date(employee.created_at)
                : null;

              const createdAtLabel =
                createdAt && !isNaN(createdAt as any)
                  ? formatDistanceToNow(createdAt, { addSuffix: true })
                  : "—";

              return (
                <TableRow key={employee.id}>
                  <TableCell className="font-medium">{employee.employeeId}</TableCell>
                  <TableCell>{employee.name}</TableCell>
                  <TableCell>{employee.mobileNumber}</TableCell>
                  <TableCell>₹{Number(employee.salary || 0).toLocaleString()}</TableCell>

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

                  <TableCell>{createdAtLabel}</TableCell>

                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {/* ⭐ VIEW BUTTON (READ ONLY) */}
                      <Button variant="outline" size="icon" title="View"
                        onClick={() => handleViewClick(employee)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>

                      {/* ⭐ EDIT BUTTON */}
                      <Button variant="outline" size="icon" title="Edit"
                        onClick={() => handleEditClick(employee)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>

                      {/* ACTIVE / INACTIVE */}
                      <Button
                        variant={employee.isActive ? "outline" : "default"}
                        size="icon"
                        onClick={() => handleToggle(employee)}
                      >
                        {employee.isActive ?
                          <UserX className="h-4 w-4" /> :
                          <UserCheck className="h-4 w-4" />
                        }
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <EmployeeDetailsSheet
        open={isDetailsSheetOpen}
        onOpenChange={setIsDetailsSheetOpen}
        employee={selectedEmployee}
        onUpdateEmployee={onUpdateEmployee}
        readOnly={readOnly}
      />

      <EditEmployeeDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        employee={selectedEmployee}
        onUpdateEmployee={onUpdateEmployee}
      />
    </>
  );
};
