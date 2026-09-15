import { z } from 'zod';

export const sparePartInputSchema = z.object({
  sku: z.string().min(1, 'SKU required'),
  name: z.string().min(1, 'Part name required'),
  category: z.string().min(1, 'Category required'),
  brand: z.string().default('Genuine / OEM'),
  price: z.string().or(z.number()),
  stockQuantity: z.number().default(10),
  description: z.string().optional(),
  subCategory: z.string().optional(),
  partType: z.string().optional(),
  vehicleTypes: z.string().optional(),
  availability: z.string().optional(),
});
