import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().min(10, 'Valid 10-digit phone required'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['customer', 'mechanic', 'admin']).default('customer'),
});

export const loginSchema = z.object({
  identifier: z.string().min(3, 'Phone or email required'),
  password: z.string().min(6, 'Password required'),
});

export const vehicleSchema = z.object({
  brandId: z.number().optional(),
  modelId: z.number().optional(),
  vehicleBrand: z.string().min(1, 'Brand required'),
  vehicleModel: z.string().min(1, 'Model required'),
  registrationNumber: z.string().min(3, 'Registration number required'),
  manufactureYear: z.number().optional(),
  currentOdometer: z.number().optional(),
});

export const bookingSchema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  phone: z.string().min(10, 'Valid phone number is required'),
  email: z.string().email().optional().or(z.literal('')),
  vehicleBrand: z.string().min(1, 'Vehicle brand is required'),
  vehicleModel: z.string().min(1, 'Vehicle model is required'),
  vehicleType: z.string().default('Motorcycle'),
  registrationNumber: z.string().min(3, 'Registration number is required'),
  vehicleAge: z.string().optional().or(z.literal('')),
  selectedServices: z.array(z.string()).min(1, 'Select at least one service'),
  appointmentDate: z.string().min(1, 'Appointment date is required'),
  timeSlot: z.string().min(1, 'Time slot is required'),
  problemDescription: z.string().optional().or(z.literal('')),
});

export const cartItemSchema = z.object({
  partId: z.number().optional(),
  helmetVariantId: z.number().optional(),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
});

export const orderSchema = z.object({
  deliveryMethod: z.enum(['pickup', 'delivery']),
  deliveryAddress: z.string().optional(),
  paymentMethod: z.enum(['cash', 'online', 'cod']),
  customerNotes: z.string().optional(),
});

export const wholesaleQuoteSchema = z.object({
  businessName: z.string().min(2, 'Business name required'),
  contactPerson: z.string().min(2, 'Contact person required'),
  phone: z.string().min(10, 'Valid phone number required'),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  requiredProducts: z.array(
    z.object({
      partId: z.number().optional(),
      partNumber: z.string().optional(),
      description: z.string(),
      quantity: z.number().min(1),
    })
  ).min(1, 'Add at least one product to the quote'),
  notes: z.string().optional(),
});
