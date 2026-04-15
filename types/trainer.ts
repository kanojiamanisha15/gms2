export interface ICreateTrainerData {
  name: string;
  email?: string | null;
  phone: string;
  role: "Trainer" | "Staff";
  hireDate: string;
  status?: "active" | "inactive";
  gymId?: number | null;
}

export interface IUpdateTrainerData {
  name?: string;
  email?: string | null;
  phone?: string;
  role?: "Trainer" | "Staff";
  hireDate?: string;
  status?: "active" | "inactive";
  gymId?: number | null;
}

/** Raw trainer row from database (snake_case) */
export interface ITrainerRow {
  id: number;
  name: string;
  email?: string | null;
  phone: string;
  role: string;
  hire_date: string;
  status: string;
  gym_id: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface ITrainerData {
  id: number;
  name: string;
  email?: string | null;
  phone: string;
  role: string;
  hireDate: string;
  status: string;
  gymId: number | null;
  createdAt?: string;
  updatedAt?: string;
}
