import { z } from 'zod';

export const bookingInputSchema = z.object({
  fullName: z.string().min(2, 'Name is required'),
  phone: z.string().min(10, 'Valid 10-digit phone required'),
  email: z.string().email().optional().or(z.literal('')),
  vehicleBrand: z.string().min(1, 'Vehicle brand required'),
  vehicleModel: z.string().min(1, 'Vehicle model required'),
  registrationNumber: z.string().min(3, 'Registration number required'),
  appointmentDate: z.string().min(1, 'Appointment date required'),
  timeSlot: z.string().min(1, 'Time slot required'),
  vehicleType: z.string().default('Motorcycle'),
  selectedServices: z.array(z.string()).optional(),
  problemDescription: z.string().optional(),
});
