/** Membership plan shape used across the app */
export interface ICreateMembershipPlanData {
  name: string;
  price: number;
  duration: string;
  features?: string | null;
  status?: "active" | "inactive";
  gymId?: number | null;
}

export interface IUpdateMembershipPlanData {
  name?: string;
  price?: number;
  duration?: string;
  features?: string | null;
  status?: "active" | "inactive";
  gymId?: number | null;
}

export interface IMembershipPlanRow {
  id: number;
  name: string;
  price: string;
  duration_days: string;
  features: string | null;
  status: string;
  gym_id: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface IMembershipPlanData {
  id: number;
  name: string;
  price: number;
  duration: string;
  features: string | null;
  status: string;
  gymId: number | null;
  createdAt?: string;
  updatedAt?: string;
}