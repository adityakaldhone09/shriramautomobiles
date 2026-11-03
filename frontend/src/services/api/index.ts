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
  getAnalyticsSummary: () => apiClient<any>('/admin/analytics/summary'),
  getAnalyticsTrends: (months = 6) => apiClient<any[]>(`/admin/analytics/trends?months=${months}`),
  getExportCsvUrl: () => `${apiClient.getBaseUrl ? apiClient.getBaseUrl() : '/api'}/admin/analytics/export`,
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

export const inventoryApi = {
  getInventory: (params?: { search?: string; category?: string; lowStock?: boolean }) => {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.category) q.set('category', params.category);
    if (params?.lowStock) q.set('lowStock', 'true');
    const qs = q.toString() ? `?${q.toString()}` : '';
    return apiClient<any[]>(`/inventory${qs}`);
  },
  adjustStock: (data: { partId: number; quantityChange: number; movementType?: string; notes?: string; location?: string }) =>
    apiClient<any>('/inventory/adjust', { method: 'POST', body: JSON.stringify(data) }),
  getMovements: (params?: { partId?: number; movementType?: string; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.partId) q.set('partId', String(params.partId));
    if (params?.movementType) q.set('movementType', params.movementType);
    if (params?.limit) q.set('limit', String(params.limit));
    const qs = q.toString() ? `?${q.toString()}` : '';
    return apiClient<any[]>(`/inventory/movements${qs}`);
  },
};

export const suppliersApi = {
  getSuppliers: (search?: string) => apiClient<any[]>(`/suppliers${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  getSupplier: (id: number) => apiClient<any>(`/suppliers/${id}`),
  createSupplier: (data: any) => apiClient<any>('/suppliers', { method: 'POST', body: JSON.stringify(data) }),
  updateSupplier: (id: number, data: any) => apiClient<any>(`/suppliers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
};

export const purchaseOrdersApi = {
  getPurchaseOrders: (params?: { status?: string; supplierId?: number }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.supplierId) q.set('supplierId', String(params.supplierId));
    const qs = q.toString() ? `?${q.toString()}` : '';
    return apiClient<any[]>(`/purchase-orders${qs}`);
  },
  getPurchaseOrder: (id: number) => apiClient<any>(`/purchase-orders/${id}`),
  createPurchaseOrder: (data: any) => apiClient<any>('/purchase-orders', { method: 'POST', body: JSON.stringify(data) }),
  receivePurchaseOrder: (id: number) => apiClient<any>(`/purchase-orders/${id}/receive`, { method: 'POST' }),
  updateStatus: (id: number, status: string) => apiClient<any>(`/purchase-orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
};

export const invoicesApi = {
  getInvoices: (params?: { paymentStatus?: string; invoiceType?: string; search?: string }) => {
    const q = new URLSearchParams();
    if (params?.paymentStatus) q.set('paymentStatus', params.paymentStatus);
    if (params?.invoiceType) q.set('invoiceType', params.invoiceType);
    if (params?.search) q.set('search', params.search);
    const qs = q.toString() ? `?${q.toString()}` : '';
    return apiClient<any[]>(`/invoices${qs}`);
  },
  getInvoice: (id: number) => apiClient<any>(`/invoices/${id}`),
  generateFromBooking: (data: { bookingId: number; discountAmount?: number; paymentMethod?: string; paymentReference?: string; paidAmount?: number; notes?: string }) =>
    apiClient<any>('/invoices/generate-from-booking', { method: 'POST', body: JSON.stringify(data) }),
  createDirectSale: (data: any) => apiClient<any>('/invoices/direct-sale', { method: 'POST', body: JSON.stringify(data) }),
  recordPayment: (id: number, data: { paidAmount: number; paymentMethod: string; paymentReference?: string }) =>
    apiClient<any>(`/invoices/${id}/payment`, { method: 'POST', body: JSON.stringify(data) }),
};

export const aiApi = {
  getHealth: () => apiClient<any>('/ai/health'),
  recommendMaintenance: (data: {
    brand: string;
    model: string;
    mileage: number;
    year?: number;
    customerReportedProblem?: string;
  }) => apiClient<any>('/ai/recommend/maintenance', { method: 'POST', body: JSON.stringify(data) }),
  recommendParts: (data: {
    modelSlug: string;
    serviceCategory?: string;
    symptomKeywords?: string[];
  }) => apiClient<any>('/ai/recommend/parts', { method: 'POST', body: JSON.stringify(data) }),
  predictMaintenance: (data: {
    model: string;
    currentMileage: number;
    lastServiceMileage?: number;
    lastServiceDate?: string;
    avgMonthlyKm?: number;
  }) => apiClient<any>('/ai/predict/maintenance', { method: 'POST', body: JSON.stringify(data) }),
  forecastInventory: () => apiClient<any>('/ai/forecast/inventory', { method: 'POST' }),
  analyzeCustomerIntelligence: () => apiClient<any>('/ai/intelligence/customers', { method: 'POST' }),
  classifyHelmet: (data: {
    imageBase64?: string;
    imageUrl?: string;
    vehicleType?: string;
    lightingCondition?: string;
  }) => apiClient<any>('/ai/vision/classify-helmet', { method: 'POST', body: JSON.stringify(data) }),
  askAssistant: (question: string) => apiClient<any>('/ai/assistant/chat', { method: 'POST', body: JSON.stringify({ question }) }),
};



