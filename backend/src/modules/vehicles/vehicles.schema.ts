import { z } from 'zod';

export const vehicleInputSchema = z.object({
  brand: z.string().min(1, 'Brand is required'),
  model: z.string().min(1, 'Model is required'),
  registrationNumber: z.string().min(3, 'Registration number is required'),
  vehicleType: z.string().default('Motorcycle'),
  vehicleModelId: z.number().optional(),
  nickname: z.string().optional(),
  manufactureYear: z.number().optional(),
  variant: z.string().optional(),
  color: z.string().optional(),
  notes: z.string().optional(),
  vehicleAge: z.number().optional(),
});
