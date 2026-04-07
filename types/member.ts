/** Member shape used across the app (table, forms, etc.) */
export interface ICreateMemberData {
  name: string;
  email?: string | null;
  phone?: string | null;
  membershipType: string;
  joinDate: string;
  expiryDate: string | null;
  status: "active" | "inactive" | "expired";
  paymentStatus: "paid" | "unpaid";
  paymentAmount: number;
  gymId?: number | null;
}

export interface IUpdateMemberData {
  name?: string;
  email?: string | null;
  phone?: string | null;
  membershipType?: string;
  joinDate?: string;
  expiryDate?: string | null;
  status?: "active" | "inactive" | "expired";
  paymentStatus?: "paid" | "unpaid";
  paymentAmount?: number;
  gymId?: number | null;
}

/** Raw member row from database (snake_case) */
export interface IMemberRow {
  id: number;
  member_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  membership_type: string;
  join_date: string;
  expiry_date: string | null;
  status: string;
  payment_status: string;
  payment_amount: string;
  gym_id: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface IMemberData {
  id: number;
  memberId: string;
  name: string;
  email: string | null;
  phone: string | null;
  membershipType: string;
  joinDate: string;
  expiryDate: string | null;
  status: string;
  paymentStatus: string;
  paymentAmount: number;
  gymId: number | null;
  createdAt?: string;
  updatedAt?: string;
}
