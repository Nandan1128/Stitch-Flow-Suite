export interface WorkerSalary {
  id: string;
  workerId: string;
  workerName?: string; // Added worker name for display
  productId: string;
  productName?: string; // Added product name for display
  date: Date;
  operationId: string;
  operationName?: string; // Added operation name for display
  piecesDone: number;
  amountPerPiece: number;
  totalAmount: number;
  paid: boolean;
  paidDate?: Date;
}

export interface EmployeeSalary {
	id: string;
	employeeId: string;
	employeeName?: string | null; // added — service returns employee_name when present
	month: Date; // parsed Date from salary_month
	salary: number; // gross_salary mapped to salary
	advance: number;
	netSalary: number;
	paid: boolean;
	paidDate?: Date;
	paidBy?: string;
}

export interface EmployeeAdvance {
  id: string;
  employeeId: string;
  date: Date;
  amount: number;
  createdBy: string;
}

export interface WorkerSalaryFormData {
  workerId: string;
  productId: string;
  operationId: string;
  piecesDone: number;
  amountPerPiece: number;
  totalAmount: number;
}

export interface EmployeeSalaryFormData {
  employeeId: string;
  month: Date;
  salary: number;
  advance: number;
  netSalary: number;
}

export interface ProductionOperation {
  id: string;
  productionId: string;
  operationId: string; 
  workerId: string;
  piecesDone: number;
  date: Date;
  createdBy: string;
}

// Helper functions for ID generation
export const generateWorkerId = (currentIds: string[] = []): string => {
  const prefix = "WOR";
  let lastNumber = 0;
  
  if (currentIds.length > 0) {
    // Extract numbers from existing IDs and find the highest
    const numbers = currentIds
      .filter(id => id.startsWith(prefix))
      .map(id => parseInt(id.replace(prefix, ''), 10))
      .filter(num => !isNaN(num));
    
    if (numbers.length > 0) {
      lastNumber = Math.max(...numbers);
    }
  }
  
  return `${prefix}${String(lastNumber + 1).padStart(3, '0')}`;
};

export const generateEmployeeId = (currentIds: string[] = []): string => {
  const prefix = "EMP";
  let lastNumber = 0;
  
  if (currentIds.length > 0) {
    // Extract numbers from existing IDs and find the highest
    const numbers = currentIds
      .filter(id => id.startsWith(prefix))
      .map(id => parseInt(id.replace(prefix, ''), 10))
      .filter(num => !isNaN(num));
    
    if (numbers.length > 0) {
      lastNumber = Math.max(...numbers);
    }
  }
  
  return `${prefix}${String(lastNumber + 1).padStart(3, '0')}`;
};

export const generateProductionId = (currentIds: string[] = []): string => {
  const prefix = "PRD";
  const year = new Date().getFullYear();
  let lastNumber = 0;
  
  if (currentIds.length > 0) {
    // Extract numbers from existing IDs with this year
    const yearPrefix = `${prefix}-${year}-`;
    const numbers = currentIds
      .filter(id => id.startsWith(yearPrefix))
      .map(id => parseInt(id.replace(yearPrefix, ''), 10))
      .filter(num => !isNaN(num));
    
    if (numbers.length > 0) {
      lastNumber = Math.max(...numbers);
    }
  }
  
  return `${prefix}-${year}-${String(lastNumber + 1).padStart(3, '0')}`;
};
