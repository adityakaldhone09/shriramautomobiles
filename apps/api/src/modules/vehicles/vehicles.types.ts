export interface CreateVehicleDTO {
  userId?: number;
  customerId?: number | null;
  brand: string;
  model: string;
  vehicleType?: string;
  registrationNumber: string;
  vehicleModelId?: number | null;
  nickname?: string | null;
  manufactureYear?: number | null;
  variant?: string | null;
  color?: string | null;
  notes?: string | null;
  vehicleAge?: number | null;
}
