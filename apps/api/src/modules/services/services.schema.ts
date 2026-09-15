import { z } from 'zod';

export const serviceInputSchema = z.object({
  name: z.any(),
  slug: z.string().min(1),
  description: z.any().optional(),
  vehicleType: z.string().default('All'),
  startingPrice: z.string().or(z.number()),
  estimatedDuration: z.string().default('60 mins'),
  icon: z.string().optional(),
});
