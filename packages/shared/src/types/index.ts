export type UserRole = 'customer' | 'mechanic' | 'admin';

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'in_progress'
  | 'inspection_completed'
  | 'estimate_approved'
  | 'ready_for_delivery'
  | 'completed'
  | 'cancelled';

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'ready_for_pickup'
  | 'dispatched'
  | 'delivered'
  | 'cancelled';

export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';

export type VehicleType = 'Motorcycle' | 'Scooter' | 'ElectricScooter' | 'Moped';

export interface User {
  id: number;
  email?: string | null;
  phone: string;
  name: string;
  role: UserRole;
  isActive?: boolean | null;
  createdAt?: string | Date | null;
}

export interface Customer {
  id: number;
  name: string;
  phone: string;
  email?: string | null;
  createdAt?: string | Date | null;
}

export interface VehicleBrand {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  logoUrl?: string | null;
  isActive?: boolean | null;
}

export interface VehicleModel {
  id: number;
  brandId: number;
  name: string;
  slug: string;
  vehicleType: string;
  engineClass?: string | null;
  isActive?: boolean | null;
}

export interface CustomerVehicle {
  id: number;
  customerId: number;
  modelId?: number | null;
  registrationNumber: string;
  vehicleBrand: string;
  vehicleModel: string;
  manufactureYear?: number | null;
  currentOdometer?: number | null;
}

export interface Part {
  id: number;
  partNumber: string;
  name: string;
  category: string;
  brand: string;
  price: string | number;
  description?: string | null;
  stockQuantity: number;
  availability?: string;
  imageUrl?: string | null;
}

export interface Service {
  id: number;
  name: string;
  slug: string;
  category: string;
  description?: string | null;
  estimatedDuration: string;
  startingPrice: string | number;
  icon?: string | null;
  isActive?: boolean | null;
}

export interface Booking {
  id: number;
  bookingCode: string;
  customerId?: number | null;
  vehicleId?: number | null;
  fullName: string;
  phone: string;
  email?: string | null;
  vehicleBrand: string;
  vehicleModel: string;
  vehicleType: string;
  registrationNumber: string;
  vehicleAge?: string | null;
  selectedServices: string[];
  appointmentDate: string;
  timeSlot: string;
  problemDescription?: string | null;
  status: BookingStatus;
  estimatedCost?: string | number | null;
  finalCost?: string | number | null;
  allocatedMechanicId?: number | null;
  createdAt?: string | Date | null;
}

export interface Helmet {
  id: number;
  brandId?: number | null;
  typeId?: number | null;
  name: string;
  slug: string;
  basePrice: string | number;
  description?: string | null;
  brandName?: string;
  typeName?: string;
  variants?: HelmetVariant[];
}

export interface HelmetVariant {
  id: number;
  productId: number;
  color: string;
  finish: string;
  visorType: string;
  mrp: string | number;
  sku?: string;
  inventoryCount?: number;
}

export interface Notification {
  id: number;
  userId: number;
  title: string;
  message: string;
  isRead: boolean;
  type: 'booking' | 'order' | 'estimate' | 'system';
  createdAt?: string | Date | null;
}

export interface CartItem {
  id: number;
  userId?: number | null;
  sessionId?: string | null;
  partId?: number | null;
  helmetVariantId?: number | null;
  quantity: number;
  unitPrice: string | number;
  productTitle?: string;
  productBrand?: string;
}

export interface Order {
  id: number;
  orderNumber: string;
  userId?: number | null;
  totalAmount: string | number;
  status: OrderStatus;
  deliveryMethod: 'pickup' | 'delivery';
  deliveryAddress?: string | null;
  paymentMethod: 'cash' | 'online' | 'cod';
  paymentStatus: PaymentStatus;
  createdAt?: string | Date | null;
}
