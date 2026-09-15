export interface AuthUser {
  id: number;
  customerId?: number | null;
  role: string;
  phone: string;
  name?: string;
  email?: string;
}

export interface RegisterDTO {
  name: string;
  phone: string;
  email: string;
  password: string;
  role?: string;
}

export interface LoginDTO {
  identifier: string;
  password: string;
}
