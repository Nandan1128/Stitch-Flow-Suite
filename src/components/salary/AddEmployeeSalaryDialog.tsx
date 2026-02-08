import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { getEmployees, autoGenerateEmployeeSalary } from "@/Services/salaryService";
import { useAuth } from "@/contexts/AuthContext";
import { EmployeeSalary } from "@/types/salary";
import { v4 as uuidv4 } from "uuid";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface AddEmployeeSalaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AddEmployeeSalaryDialog: React.FC<
  AddEmployeeSalaryDialogProps
> = ({ open, onOpenChange }) => {
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const { user } = useAuth();

  const [employees, setEmployees] = useState<any[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);

  const [formData, setFormData] = useState({
    employeeId: "",
    month: new Date(),
    salary: 0,
    advance: 0,
    netSalary: 0,
  });

  useEffect(() => {
    const loadEmployees = async () => {
      setLoadingEmployees(true);
      try {
        const rows = await getEmployees();
        setEmployees(rows || []);
      } catch (err: any) {
        toast({
          title: "Error",
          description: "Failed to load employees.",
          variant: "destructive",
        });
      } finally {
        setLoadingEmployees(false);
      }
    };
    if (open) loadEmployees();
  }, [open, toast]);

  const handleEmployeeChange = (value: string) => {
    const employee = employees.find((emp) => emp.id === value);
    if (employee) {
      const base = typeof employee.base_salary === "number" ? employee.base_salary : Number(formData.salary || 0);
      setFormData((prev) => ({
        ...prev,
        employeeId: value,
        salary: base,
        netSalary: base - prev.advance,
      }));
    }
  };

  const handleMonthChange = (date: Date | undefined) => {
    if (date) {
      setFormData((prev) => ({
        ...prev,
        month: date,
      }));
    }
  };

  const handleAdvanceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const advance = parseFloat(e.target.value) || 0;
    setFormData((prev) => ({
      ...prev,
      advance,
      netSalary: prev.salary - advance,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.employeeId || Number(formData.salary) <= 0) {
      toast({
        title: "Validation Error",
        description: "Please fill all required fields with valid values.",
        variant: "destructive",
      });
      return;
    }

    const res = await autoGenerateEmployeeSalary();
    if (res?.error) {
      toast({
        title: "Error",
        description: res.error.message ?? "Failed to add salary",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Employee salary record added successfully.",
    });

    setFormData({
      employeeId: "",
      month: new Date(),
      salary: 0,
      advance: 0,
      netSalary: 0,
    });
    onOpenChange(false);
  };

  const renderForm = () => (
    <form onSubmit={handleSubmit} className="space-y-4 py-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Employee</Label>
          <Select
            value={formData.employeeId}
            onValueChange={handleEmployeeChange}
          >
            <SelectTrigger className="h-9">
              <SelectValue
                placeholder={loadingEmployees ? "Loading..." : "Select employee"}
              />
            </SelectTrigger>
            <SelectContent>
              {employees.map((emp) => (
                <SelectItem key={emp.id} value={emp.id}>
                  {emp.name} ({emp.id})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Month</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal h-9",
                  !formData.month && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(formData.month, "MMMM yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={formData.month}
                onSelect={handleMonthChange}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Base Salary (₹)</Label>
          <Input
            type="number"
            value={formData.salary || ''}
            onChange={(e) => {
              const s = parseFloat(e.target.value) || 0;
              setFormData(prev => ({ ...prev, salary: s, netSalary: s - prev.advance }));
            }}
            min="0"
            step="0.01"
            className="h-9"
          />
        </div>

        <div className="space-y-2">
          <Label>Advance (₹)</Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={formData.advance || ''}
            onChange={handleAdvanceChange}
            className="h-9"
          />
        </div>

        <div className="space-y-2">
          <Label>Net Salary (₹)</Label>
          <Input
            readOnly
            value={formData.netSalary}
            className="h-9 bg-muted font-medium"
          />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t sticky bottom-0 bg-background text-black">
        <Button type="submit" className="flex-1">Add Salary Record</Button>
        <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">Cancel</Button>
      </div>
    </form>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[96vh]">
          <DrawerHeader className="text-left border-b pb-4">
            <DrawerTitle>Add Employee Salary</DrawerTitle>
            <DrawerDescription>Create a monthly salary record.</DrawerDescription>
          </DrawerHeader>
          <div className="px-4 overflow-y-auto pb-6">
            {renderForm()}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader className="border-b pb-4">
          <DialogTitle>Add Employee Salary</DialogTitle>
          <DialogDescription>
            Create a monthly salary record for an employee.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          {renderForm()}
        </div>
      </DialogContent>
    </Dialog>
  );
};
