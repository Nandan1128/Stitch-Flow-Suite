// src/types/product.ts
export interface Operation {
  id: string;
  name: string;
  operation_code: string;
  amount_per_piece: number;
  product_id: string;
  created_at?: string | Date;
  entered_by?: string;
}

export interface Product {
  id: string;
  name: string;
  product_code: string;
  design_no: string;
  color: string;
  pattern_image_url: string | null;
  material_cost: number;
  thread_cost: number;
  other_costs: number;
  unit?: string;
  operations: Operation[];
  created_by?: string | null;
  created_at?: string | Date;
  is_active?: boolean;
}

export interface ProductFormData {
  name: string;
  product_code: string;
  design_no: string;
  color: string;
  patternImage: File | null;
  material_cost: number;
  thread_cost: number;
  other_costs: number;
  operations: {
    name: string;
    operation_code: string;
    amount_per_piece: number;
  }[];
}

export interface OperationFormData {
  name: string;
  operation_code: string;
  amount_per_piece: number;
}
