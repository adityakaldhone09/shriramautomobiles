import { apiClient } from './client';

export const authApi = {
  login: (data: any) => apiClient('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  register: (data: any) => apiClient('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  logout: () => apiClient('/auth/logout', { method: 'POST' }),
  me: () => apiClient('/auth/me'),
};

export const vehiclesApi = {
  getBrands: () => apiClient('/vehicles/brands'),
  getModels: (brandId?: number) => apiClient(`/vehicles/models${brandId ? `?brandId=${brandId}` : ''}`),
  getMyVehicles: () => apiClient('/vehicles/my'),
  addVehicle: (data: any) => apiClient('/vehicles/my', { method: 'POST', body: JSON.stringify(data) }),
};

export const partsApi = {
  getParts: (params?: { brand?: string; category?: string; search?: string }) => {
    const q = new URLSearchParams(params as any).toString();
    return apiClient(`/parts${q ? `?${q}` : ''}`);
  },
  getCategories: () => apiClient('/parts/categories'),
  getCompatible: (vehicleId: number) => apiClient(`/parts/compatible/${vehicleId}`),
};

export const servicesApi = {
  getServices: () => apiClient('/services'),
  getSymptoms: () => apiClient('/services/symptoms'),
  getRecommendations: (params: any) => {
    const q = new URLSearchParams(params).toString();
    return apiClient(`/intelligence/recommendations?${q}`);
  },
};

export const bookingsApi = {
  create: (data: any) => apiClient('/bookings', { method: 'POST', body: JSON.stringify(data) }),
  getAll: () => apiClient('/bookings'),
  getById: (id: number) => apiClient(`/bookings/${id}`),
};

export const helmetsApi = {
  getBrands: () => apiClient('/helmets/brands'),
  getTypes: () => apiClient('/helmets/types'),
  getProducts: () => apiClient('/helmets'),
  getById: (id: number) => apiClient(`/helmets/${id}`),
};

export const ordersApi = {
  create: (data: any) => apiClient('/orders', { method: 'POST', body: JSON.stringify(data) }),
  getMyOrders: () => apiClient('/orders'),
};

export const adminApi = {
  getOverview: () => apiClient<any>('/admin/overview'),
  getCustomers: (q?: string) => apiClient<any[]>(`/admin/customers${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  getCustomerById: (id: number) => apiClient<any>(`/admin/customers/${id}`),
  createCustomer: (data: any) => apiClient<any>('/admin/customers', { method: 'POST', body: JSON.stringify(data) }),
  updateCustomer: (id: number, data: any) => apiClient<any>(`/admin/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  getVehicles: (q?: string) => apiClient<any[]>(`/admin/vehicles${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  createVehicle: (data: any) => apiClient<any>('/admin/vehicles', { method: 'POST', body: JSON.stringify(data) }),
  getInventory: () => apiClient<any[]>('/admin/inventory'),
  getLowStock: () => apiClient<any[]>('/admin/inventory/low-stock'),
  getMechanics: () => apiClient<any[]>('/admin/mechanics'),
  assignMechanic: (bookingId: number, mechanicId: number) =>
    apiClient<any>(`/admin/bookings/${bookingId}/assign-mechanic`, {
      method: 'POST',
      body: JSON.stringify({ mechanicId }),
    }),
  updateOrderStatus: (orderId: number, status: string) =>
    apiClient<any>(`/admin/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  updateBookingStatus: (bookingId: number, status: string, notes?: string) =>
    apiClient<any>(`/bookings/${bookingId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, notes }),
    }),
};

export const mechanicApi = {
  getMyJobs: () => apiClient<any[]>('/mechanics/my-jobs'),
  getJobCard: (bookingId: number) => apiClient<any>(`/bookings/${bookingId}/job-card`),
  createJobCard: (bookingId: number, data: any) =>
    apiClient<any>(`/bookings/${bookingId}/job-card`, { method: 'POST', body: JSON.stringify(data) }),
  recordInspection: (bookingId: number, data: { item: string; condition: string; notes?: string }) =>
    apiClient<any>(`/bookings/${bookingId}/job-card/inspections`, { method: 'POST', body: JSON.stringify(data) }),
  addJobCardPart: (bookingId: number, data: { partName: string; quantity: number; unitPrice: number; partId?: number }) =>
    apiClient<any>(`/bookings/${bookingId}/job-card/parts`, { method: 'POST', body: JSON.stringify(data) }),
  updateJobCard: (bookingId: number, data: any) =>
    apiClient<any>(`/bookings/${bookingId}/job-card`, { method: 'PATCH', body: JSON.stringify(data) }),
  updateStatus: (bookingId: number, status: string, notes?: string) =>
    apiClient<any>(`/bookings/${bookingId}/status`, { method: 'PATCH', body: JSON.stringify({ status, notes }) }),
  getTimeline: (bookingId: number) => apiClient<any[]>(`/bookings/${bookingId}/timeline`),
};


