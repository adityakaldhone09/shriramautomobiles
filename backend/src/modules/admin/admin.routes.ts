import { Router } from 'express';
import { adminController } from './admin.controller';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/roles';

export const adminRouter = Router();

// Protect all admin routes with authentication and role check (ADMIN or STAFF, with automatic SUPER_ADMIN inheritance)
adminRouter.use(requireAuth, requireRole('ADMIN', 'STAFF'));

// 1. Overview & Analytics
adminRouter.get('/overview', (req, res) => adminController.getOverview(req, res));

// 2. Customer Management
adminRouter.get('/customers', (req, res) => adminController.listCustomers(req, res));
adminRouter.get('/customers/:id', (req, res) => adminController.getCustomerById(req, res));
adminRouter.post('/customers', (req, res) => adminController.createCustomer(req, res));
adminRouter.put('/customers/:id', (req, res) => adminController.updateCustomer(req, res));

// 3. Vehicle Management
adminRouter.get('/vehicles', (req, res) => adminController.listVehicles(req, res));
adminRouter.post('/vehicles', (req, res) => adminController.createVehicleForCustomer(req, res));

// 4. Inventory & Stock
adminRouter.get('/inventory', (req, res) => adminController.listInventory(req, res));
adminRouter.get('/inventory/low-stock', (req, res) => adminController.listLowStock(req, res));

// 5. Mechanics & Operations
adminRouter.get('/mechanics', (req, res) => adminController.listMechanics(req, res));
adminRouter.post('/bookings/:id/assign-mechanic', (req, res) => adminController.assignMechanic(req, res));

// 6. Orders
adminRouter.patch('/orders/:id/status', (req, res) => adminController.updateOrderStatus(req, res));
