import { Router } from 'express';
import { accountController } from './account.controller';
import { requireAuth } from '../../middleware/auth';

export const accountRouter = Router();

// All /api/account routes require authentication
accountRouter.use(requireAuth);

// Profile
accountRouter.get('/profile', (req, res) => accountController.getProfile(req, res));

// Addresses
accountRouter.get('/addresses', (req, res) => accountController.listAddresses(req, res));
accountRouter.post('/addresses', (req, res) => accountController.createAddress(req, res));
accountRouter.delete('/addresses/:id', (req, res) => accountController.deleteAddress(req, res));

// Vehicles
accountRouter.get('/vehicles', (req, res) => accountController.listVehicles(req, res));
accountRouter.post('/vehicles', (req, res) => accountController.createVehicle(req, res));
accountRouter.get('/vehicles/:id', (req, res) => accountController.getVehicleById(req, res));
accountRouter.put('/vehicles/:id', (req, res) => accountController.updateVehicle(req, res));
accountRouter.delete('/vehicles/:id', (req, res) => accountController.deleteVehicle(req, res));

// Orders
accountRouter.get('/orders', (req, res) => accountController.listOrders(req, res));
accountRouter.get('/orders/:orderNumber', (req, res) => accountController.getOrderByNumber(req, res));

// Bookings
accountRouter.get('/bookings', (req, res) => accountController.listBookings(req, res));
accountRouter.get('/bookings/:bookingNumber', (req, res) => accountController.getBookingByNumber(req, res));
accountRouter.get('/bookings/:id/estimate', (req, res) => accountController.getBookingEstimate(req, res));

// Estimates
accountRouter.get('/estimates', (req, res) => accountController.listEstimates(req, res));
accountRouter.put('/estimates/:id/approve', (req, res) => accountController.approveEstimate(req, res));
accountRouter.post('/estimates/:id/approve', (req, res) => accountController.approveEstimate(req, res));
accountRouter.put('/estimates/:id/reject', (req, res) => accountController.rejectEstimate(req, res));
accountRouter.post('/estimates/:id/reject', (req, res) => accountController.rejectEstimate(req, res));

// Notifications
accountRouter.get('/notifications', (req, res) => accountController.listNotifications(req, res));
accountRouter.patch('/notifications/:id/read', (req, res) => accountController.markNotificationRead(req, res));
