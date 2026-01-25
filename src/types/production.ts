// ----------------------
// Production Cutting (Optional Stage)
// ----------------------
export interface ProductionCutting {
  id: string;
  productId: string;          // maps to production.product_id
  totalPieces: number;
  cutDate: Date;
  createdBy: string;
}

// ----------------------
// Production Operation (Stored in DB)
// ----------------------
export interface ProductionOperation {
  id: string;
  productionId: string;       // production.id
  operationId: string;        // operation master id
  workerId: string | null;    // worker assigned
  workerName?: string;
  piecesDone: number;
  earnings: number;
  date: Date;
  createdAt: Date;
}

// ----------------------
// Main Production Record (Matches DB)
// ----------------------
export interface Production {
  name: string;
  id: string;
  productId: string;
  production_code: string;        // production_code
  po_number: string;
  color: string;
  total_fabric: number;
  average: number;
  total_quantity: number;
  createdBy: string;
  createdAt: Date;
  status?: 'active' | 'completed'; // Added status field
  // UI only (NOT stored in DB)
  productName: string;
  operations: ProductionOperation[];   // fetched separately
  operationsCount?: number;           // count of operations
}

// ----------------------
// Operation Master Table (already exists)
// ----------------------
export interface OperationMaster {
  id: string;
  name: string;
  operationCode: string;
  amountPerPiece: number;
  productId: string;       // allows product-specific operations
  createdAt: Date;
}

// ----------------------
// Production Form (Add Production Dialog)
// ----------------------
export interface ProductionFormData {
  prodcutName: string;
  productId: string;
  productionId: string;
  po_number: string;
  color: string;
  total_fabric: number;
  average: number;
  total_quantity: number;
}

// ----------------------
// Worker Assignment (When selecting worker in dialog)
// ----------------------
export interface WorkerAssignment {
  workerId: string;
  workerName: string;
  operationId: string;
  operationName: string;
  productionId: string;
  piecesDone: number;
  date: Date;
}
