
export interface Employee {
  id: string;
  name: string;
  employeeId: string;
  email: string;
  permanentAddress?: string;
  currentAddress?: string;
  mobileNumber: string;
  emergencyNumber: string;
  idProof: string;
  idProofImageUrl?: string;
  bankAccountDetail: string;
  bankname: string;
  account_number: string;
  ifsc_code: string;
  account_holder_name: string;
  bankImageUrl: string;
  salary: number;
  isActive: boolean;
  createdBy: string;
  enteredBy?: string;
  created_at: Date;
}

export interface EmployeeFormData {
  name: string;
  employeeId: string;
  email: string;
  permanentAddress?: string;
  currentAddress?: string;
  mobileNumber: string;
  emergencyNumber: string;
  idProof: string;
  idProofImage?: File | null;
  bankAccountDetail: string;
  bankname: string;
  account_number: string;
  ifsc_code: string;
  account_holder_name: string;
  bankImage: File | null;
  salary: number;
  isActive: boolean;
}
