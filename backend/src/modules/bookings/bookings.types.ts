export interface CreateBookingDTO {
  fullName: string;
  phone: string;
  email?: string;
  customerVehicleId?: number;
  vehicleBrand: string;
  vehicleModel: string;
  vehicleType?: string;
  registrationNumber: string;
  vehicleAge?: string;
  selectedServices?: string[];
  serviceId?: number;
  symptomId?: number;
  appointmentDate: string | Date;
  timeSlot: string;
  problemDescription?: string;
  imageUrl?: string;
  preferredMechanicId?: number;
  customerNotes?: string;
  userId?: number;
}
