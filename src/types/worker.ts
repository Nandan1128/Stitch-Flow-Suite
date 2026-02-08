
export interface Worker {
  worker_code: string;
  id: string;
  name: string;
  workerId: string;
  address: string;
  permanentAddress: string;
  currentAddress: string;
  mobileNumber: string;
  emergencyNumber: string;
  idProof: string;
  idProofImageUrl?: string;
  bankAccountDetail: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  accountHolderName?: string;
  bankImageUrl: string;
  profileImageUrl?: string;
  createdBy?: string;
  enteredBy?: string;
  createdAt: Date;
}

export interface WorkerFormData {
  name: string;
  workerId: string;
  address: string;
  permanentAddress: string;
  currentAddress: string;
  mobileNumber: string;
  emergencyNumber: string;
  idProof: string;

  // MUST BE FileList, not File
  id_proof_image_url: FileList | null;
  bank_image_url: FileList | null;
  profile_image_url: FileList | null;

  bankAccountDetail: string;
  bankName: string;
  accountNumber: string;
  confirmAccountNumber: string;
  ifscCode: string;
  accountHolderName: string;
}

