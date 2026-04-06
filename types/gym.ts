export interface ICreateGymData {
  gymName: string;
  address: string;
}

export interface IUpdateGymData {
  gymName?: string;
  address?: string;
}

export interface IGymRow {
  gym_id: number;
  gym_name: string;
  address: string;
  created_at: Date;
  updated_at: Date;
}

export interface IGymData {
  gymId: number;
  gymName: string;
  address: string;
  createdAt?: string;
  updatedAt?: string;
}
