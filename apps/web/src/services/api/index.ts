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
