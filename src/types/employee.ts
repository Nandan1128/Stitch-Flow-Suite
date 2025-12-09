
export interface Employee {
  id: string;
  name: string;
  employeeId: string;
  email: string;
  address: string;
  permanentAddress?: string;
  currentAddress?: string;
  mobileNumber: string;
  emergencyNumber: string;
  idProof: string;
  idProofImageUrl?: string;
  bankAccountDetail: string;
  bankImageUrl: string;
  salary: number;
  isActive: boolean;
  createdBy: string;
  created_at: Date;
}

export interface EmployeeFormData {
  name: string;
  employeeId: string;
  email: string;
  address: string;
  permanentAddress?: string;
  currentAddress?: string;
  mobileNumber: string;
  emergencyNumber: string;
  idProof: string;
  idProofImage?: File | null;
  bankAccountDetail: string;
  bankImage: File | null;
  salary: number;
  isActive: boolean;
}
