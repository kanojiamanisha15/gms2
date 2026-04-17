export type BankAccountType = "savings" | "current" | "salary" | "other";

export interface ICreateBankData {
  bankName: string;
  accountNumber?: string | null;
  ifscCode?: string | null;
  accountHolderName: string;
  branchName: string;
  accountType: BankAccountType;
  upiId?: string | null;
  gymId?: number | null;
}

export interface IUpdateBankData {
  bankName?: string;
  accountNumber?: string | null;
  ifscCode?: string | null;
  accountHolderName?: string;
  branchName?: string;
  accountType?: BankAccountType;
  upiId?: string | null;
  gymId?: number | null;
}

export interface IBankRow {
  id: number;
  bank_name: string;
  account_number: string | null;
  ifsc_code: string | null;
  account_holder_name: string;
  branch_name: string;
  account_type: string;
  upi_id: string | null;
  gym_id: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface IBankData {
  id: number;
  bankName: string;
  accountNumber: string | null;
  ifscCode: string | null;
  accountHolderName: string;
  branchName: string;
  accountType: string;
  upiId: string | null;
  gymId: number | null;
  createdAt?: string;
  updatedAt?: string;
}
