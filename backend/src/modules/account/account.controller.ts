import type { Request, Response } from 'express';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '../../db/client';
import {
  addressesTable,
  bookingsTable,
  customerVehiclesTable,
  customersTable,
  notificationsTable,
  orderItemsTable,
  ordersTable,
  serviceEstimateItemsTable,
  serviceEstimatesTable,
  sparePartsTable,
  usersTable,
} from '../../db/schema';
import { getAuthUser } from '../../middleware/auth';
import { createResponse, isValidRegistrationNumber } from '../../utils/helpers';

export class AccountController {
  // ================= PROFILE =================
  async getProfile(req: Request, res: Response) {
    const auth = getAuthUser(req);
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, auth.id));
    if (!user) {
      return res.status(404).json(createResponse(false, 'User not found', undefined, 'NOT_FOUND'));
    }

    let customer = null;
    if (user.customerId) {
      const [c] = await db.select().from(customersTable).where(eq(customersTable.id, user.customerId));
      customer = c || null;
    }

    return res.json(
      createResponse(true, 'Profile fetched', {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        customer,
        createdAt: user.createdAt,
      })
    );
  }

  // ================= ADDRESSES =================
  async listAddresses(req: Request, res: Response) {
    const auth = getAuthUser(req);
    const addresses = await db
      .select()
      .from(addressesTable)
      .where(eq(addressesTable.userId, auth.id));
    return res.json(createResponse(true, 'Addresses fetched', addresses));
  }

  async createAddress(req: Request, res: Response) {
    const auth = getAuthUser(req);
    const { addressLine, city, state = 'Maharashtra', pinCode, isDefault = false } = req.body;

    if (!addressLine?.trim() || !city?.trim() || !pinCode?.trim()) {
      return res.status(400).json(
        createResponse(false, 'Address line, city, and PIN code are required', undefined, 'VALIDATION_ERROR')
      );
    }

    if (!/^\d{6}$/.test(pinCode.trim())) {
      return res.status(400).json(
        createResponse(false, 'A valid 6-digit Indian PIN code is required', undefined, 'VALIDATION_ERROR')
      );
    }

    const [address] = await db
      .insert(addressesTable)
      .values({
        userId: auth.id,
        addressLine: addressLine.trim(),
        city: city.trim(),
        state: state.trim(),
        pinCode: pinCode.trim(),
        isDefault: Boolean(isDefault),
      })
      .returning();

    return res.status(201).json(createResponse(true, 'Address created', address));
  }

  async deleteAddress(req: Request, res: Response) {
    const auth = getAuthUser(req);
    const addressId = parseInt(req.params.id, 10);
    if (!Number.isInteger(addressId)) {
      return res.status(400).json(createResponse(false, 'Invalid address ID', undefined, 'VALIDATION_ERROR'));
    }

    const [deleted] = await db
      .delete(addressesTable)
      .where(and(eq(addressesTable.id, addressId), eq(addressesTable.userId, auth.id)))
      .returning();

    if (!deleted) {
      return res.status(404).json(createResponse(false, 'Address not found or unauthorized', undefined, 'NOT_FOUND'));
    }

    return res.json(createResponse(true, 'Address deleted', deleted));
  }

  // ================= VEHICLES =================
  async listVehicles(req: Request, res: Response) {
    const auth = getAuthUser(req);
    const vehicles = await db
      .select()
      .from(customerVehiclesTable)
      .where(eq(customerVehiclesTable.userId, auth.id));
    return res.json(createResponse(true, 'Vehicles fetched', vehicles));
  }

  async getVehicleById(req: Request, res: Response) {
    const auth = getAuthUser(req);
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) {
      return res.status(400).json(createResponse(false, 'Invalid vehicle ID', undefined, 'VALIDATION_ERROR'));
    }

    const [vehicle] = await db
      .select()
      .from(customerVehiclesTable)
      .where(and(eq(customerVehiclesTable.id, id), eq(customerVehiclesTable.userId, auth.id)));

    if (!vehicle) {
      return res.status(404).json(createResponse(false, 'Vehicle not found or unauthorized', undefined, 'NOT_FOUND'));
    }

    return res.json(createResponse(true, 'Vehicle fetched', vehicle));
  }

  async createVehicle(req: Request, res: Response) {
    const auth = getAuthUser(req);
    const { brand, model, vehicleType = 'Motorcycle', registrationNumber, manufactureYear, year, color, nickname, notes } = req.body;

    if (!brand?.trim() || !model?.trim() || !registrationNumber?.trim()) {
      return res.status(400).json(
        createResponse(false, 'Brand, model, and registration number are required', undefined, 'VALIDATION_ERROR')
      );
    }

    const cleanReg = registrationNumber.replace(/\s+/g, '').toUpperCase();
    if (!isValidRegistrationNumber(cleanReg)) {
      return res.status(400).json(
        createResponse(false, 'Invalid registration number format', undefined, 'VALIDATION_ERROR')
      );
    }

    const mfgYear = Number(manufactureYear || year) || new Date().getFullYear();
    const currentYear = new Date().getFullYear();
    if (mfgYear < 1980 || mfgYear > currentYear + 1) {
      return res.status(400).json(
        createResponse(false, `Manufacture year must be between 1980 and ${currentYear + 1}`, undefined, 'VALIDATION_ERROR')
      );
    }

    const [vehicle] = await db
      .insert(customerVehiclesTable)
      .values({
        userId: auth.id,
        customerId: auth.customerId || null,
        brand: brand.trim(),
        model: model.trim(),
        vehicleType: vehicleType.trim(),
        registrationNumber: cleanReg,
        manufactureYear: mfgYear,
        vehicleAge: currentYear - mfgYear,
        color: color?.trim() || null,
        nickname: nickname?.trim() || null,
        notes: notes?.trim() || null,
      })
      .returning();

    return res.status(201).json(createResponse(true, 'Vehicle added', vehicle));
  }

  async updateVehicle(req: Request, res: Response) {
    const auth = getAuthUser(req);
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) {
      return res.status(400).json(createResponse(false, 'Invalid vehicle ID', undefined, 'VALIDATION_ERROR'));
    }

    const { brand, model, vehicleType, registrationNumber, manufactureYear, year, color, nickname, notes } = req.body;

    const [existing] = await db
      .select()
      .from(customerVehiclesTable)
      .where(and(eq(customerVehiclesTable.id, id), eq(customerVehiclesTable.userId, auth.id)));

    if (!existing) {
      return res.status(404).json(createResponse(false, 'Vehicle not found or unauthorized', undefined, 'NOT_FOUND'));
    }

    const updateData: Record<string, any> = { updatedAt: new Date() };
    if (brand?.trim()) updateData.brand = brand.trim();
    if (model?.trim()) updateData.model = model.trim();
    if (vehicleType?.trim()) updateData.vehicleType = vehicleType.trim();
    if (registrationNumber?.trim()) {
      const cleanReg = registrationNumber.replace(/\s+/g, '').toUpperCase();
      if (!isValidRegistrationNumber(cleanReg)) {
        return res.status(400).json(createResponse(false, 'Invalid registration number', undefined, 'VALIDATION_ERROR'));
      }
      updateData.registrationNumber = cleanReg;
    }
    if (manufactureYear || year) {
      const mfgYear = Number(manufactureYear || year);
      const currentYear = new Date().getFullYear();
      if (mfgYear >= 1980 && mfgYear <= currentYear + 1) {
        updateData.manufactureYear = mfgYear;
        updateData.vehicleAge = currentYear - mfgYear;
      }
    }
    if (color !== undefined) updateData.color = color?.trim() || null;
    if (nickname !== undefined) updateData.nickname = nickname?.trim() || null;
    if (notes !== undefined) updateData.notes = notes?.trim() || null;

    const [updated] = await db
      .update(customerVehiclesTable)
      .set(updateData)
      .where(eq(customerVehiclesTable.id, id))
      .returning();

    return res.json(createResponse(true, 'Vehicle updated', updated));
  }

  async deleteVehicle(req: Request, res: Response) {
    const auth = getAuthUser(req);
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) {
      return res.status(400).json(createResponse(false, 'Invalid vehicle ID', undefined, 'VALIDATION_ERROR'));
    }

    const [deleted] = await db
      .delete(customerVehiclesTable)
      .where(and(eq(customerVehiclesTable.id, id), eq(customerVehiclesTable.userId, auth.id)))
      .returning();

    if (!deleted) {
      return res.status(404).json(createResponse(false, 'Vehicle not found or unauthorized', undefined, 'NOT_FOUND'));
    }

    return res.json(createResponse(true, 'Vehicle removed', deleted));
  }

  // ================= ORDERS =================
  async listOrders(req: Request, res: Response) {
    const auth = getAuthUser(req);
    const orders = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.userId, auth.id))
      .orderBy(desc(ordersTable.createdAt));
    return res.json(createResponse(true, 'Orders fetched', orders));
  }

  async getOrderByNumber(req: Request, res: Response) {
    const auth = getAuthUser(req);
    const identifier = req.params.orderNumber;
    const isId = /^\d+$/.test(identifier);

    const condition = isId
      ? and(eq(ordersTable.id, parseInt(identifier, 10)), eq(ordersTable.userId, auth.id))
      : and(eq(ordersTable.orderNumber, identifier), eq(ordersTable.userId, auth.id));

    const [order] = await db.select().from(ordersTable).where(condition);
    if (!order) {
      return res.status(404).json(createResponse(false, 'Order not found or unauthorized', undefined, 'NOT_FOUND'));
    }

    const items = await db
      .select({
        id: orderItemsTable.id,
        productId: orderItemsTable.productId,
        quantity: orderItemsTable.quantity,
        price: orderItemsTable.price,
        product: {
          id: sparePartsTable.id,
          name: sparePartsTable.name,
          sku: sparePartsTable.sku,
          brand: sparePartsTable.brand,
          category: sparePartsTable.category,
        },
      })
      .from(orderItemsTable)
      .leftJoin(sparePartsTable, eq(orderItemsTable.productId, sparePartsTable.id))
      .where(eq(orderItemsTable.orderId, order.id));

    return res.json(createResponse(true, 'Order fetched', { ...order, items }));
  }

  // ================= BOOKINGS =================
  async listBookings(req: Request, res: Response) {
    const auth = getAuthUser(req);
    const bookings = await db
      .select()
      .from(bookingsTable)
      .where(eq(bookingsTable.userId, auth.id))
      .orderBy(desc(bookingsTable.createdAt));
    return res.json(createResponse(true, 'Bookings fetched', bookings));
  }

  async getBookingByNumber(req: Request, res: Response) {
    const auth = getAuthUser(req);
    const identifier = req.params.bookingNumber;
    const isId = /^\d+$/.test(identifier);

    const condition = isId
      ? and(eq(bookingsTable.id, parseInt(identifier, 10)), eq(bookingsTable.userId, auth.id))
      : and(eq(bookingsTable.bookingNumber, identifier), eq(bookingsTable.userId, auth.id));

    const [booking] = await db.select().from(bookingsTable).where(condition);
    if (!booking) {
      return res.status(404).json(createResponse(false, 'Booking not found or unauthorized', undefined, 'NOT_FOUND'));
    }

    return res.json(createResponse(true, 'Booking fetched', booking));
  }

  // ================= ESTIMATES =================
  async listEstimates(req: Request, res: Response) {
    const auth = getAuthUser(req);
    // Find all bookings belonging to user
    const userBookings = await db
      .select({ id: bookingsTable.id })
      .from(bookingsTable)
      .where(eq(bookingsTable.userId, auth.id));

    if (!userBookings.length) {
      return res.json(createResponse(true, 'Estimates fetched', []));
    }

    const bookingIds = userBookings.map((b) => b.id);
    const allEstimates = await db.select().from(serviceEstimatesTable);
    const estimates = allEstimates.filter((e) => bookingIds.includes(e.bookingId));

    return res.json(createResponse(true, 'Estimates fetched', estimates));
  }

  async getBookingEstimate(req: Request, res: Response) {
    const auth = getAuthUser(req);
    const bookingIdentifier = req.params.id;
    const bookingId = parseInt(bookingIdentifier, 10);

    const [booking] = await db
      .select()
      .from(bookingsTable)
      .where(and(eq(bookingsTable.id, bookingId), eq(bookingsTable.userId, auth.id)));

    if (!booking) {
      return res.status(404).json(createResponse(false, 'Booking not found or unauthorized', undefined, 'NOT_FOUND'));
    }

    const [estimate] = await db
      .select()
      .from(serviceEstimatesTable)
      .where(eq(serviceEstimatesTable.bookingId, booking.id));

    if (!estimate) {
      return res.status(404).json(createResponse(false, 'Estimate not found', undefined, 'NOT_FOUND'));
    }

    const items = await db
      .select()
      .from(serviceEstimateItemsTable)
      .where(eq(serviceEstimateItemsTable.estimateId, estimate.id));

    return res.json(createResponse(true, 'Estimate fetched', { ...estimate, items }));
  }

  async approveEstimate(req: Request, res: Response) {
    const auth = getAuthUser(req);
    const estimateId = parseInt(req.params.id, 10);

    // Verify estimate exists
    const [estimate] = await db
      .select()
      .from(serviceEstimatesTable)
      .where(eq(serviceEstimatesTable.id, estimateId));

    if (!estimate) {
      return res.status(404).json(createResponse(false, 'Estimate not found', undefined, 'NOT_FOUND'));
    }

    // Verify user owns the booking for this estimate
    const [booking] = await db
      .select()
      .from(bookingsTable)
      .where(and(eq(bookingsTable.id, estimate.bookingId), eq(bookingsTable.userId, auth.id)));

    if (!booking) {
      return res.status(403).json(createResponse(false, 'Unauthorized to approve this estimate', undefined, 'FORBIDDEN'));
    }

    // Verify state transition: can only approve if PENDING
    if (estimate.status !== 'PENDING') {
      return res.status(409).json(
        createResponse(false, `Cannot approve an estimate that is already ${estimate.status}`, undefined, 'INVALID_STATE')
      );
    }

    await db.transaction(async (tx) => {
      await tx
        .update(serviceEstimatesTable)
        .set({ status: 'APPROVED', updatedAt: new Date() })
        .where(eq(serviceEstimatesTable.id, estimate.id));

      await tx
        .update(bookingsTable)
        .set({ status: 'ESTIMATE_APPROVED', updatedAt: new Date() })
        .where(eq(bookingsTable.id, booking.id));
    });

    return res.json(createResponse(true, 'Estimate approved successfully'));
  }

  async rejectEstimate(req: Request, res: Response) {
    const auth = getAuthUser(req);
    const estimateId = parseInt(req.params.id, 10);

    const [estimate] = await db
      .select()
      .from(serviceEstimatesTable)
      .where(eq(serviceEstimatesTable.id, estimateId));

    if (!estimate) {
      return res.status(404).json(createResponse(false, 'Estimate not found', undefined, 'NOT_FOUND'));
    }

    const [booking] = await db
      .select()
      .from(bookingsTable)
      .where(and(eq(bookingsTable.id, estimate.bookingId), eq(bookingsTable.userId, auth.id)));

    if (!booking) {
      return res.status(403).json(createResponse(false, 'Unauthorized to reject this estimate', undefined, 'FORBIDDEN'));
    }

    if (estimate.status !== 'PENDING') {
      return res.status(409).json(
        createResponse(false, `Cannot reject an estimate that is already ${estimate.status}`, undefined, 'INVALID_STATE')
      );
    }

    await db.transaction(async (tx) => {
      await tx
        .update(serviceEstimatesTable)
        .set({ status: 'REJECTED', updatedAt: new Date() })
        .where(eq(serviceEstimatesTable.id, estimate.id));

      await tx
        .update(bookingsTable)
        .set({ status: 'ESTIMATE_REJECTED', updatedAt: new Date() })
        .where(eq(bookingsTable.id, booking.id));
    });

    return res.json(createResponse(true, 'Estimate rejected'));
  }

  // ================= NOTIFICATIONS =================
  async listNotifications(req: Request, res: Response) {
    const auth = getAuthUser(req);
    const notifications = await db
      .select()
      .from(notificationsTable)
      .where(eq(notificationsTable.userId, auth.id))
      .orderBy(desc(notificationsTable.createdAt));
    return res.json(createResponse(true, 'Notifications fetched', notifications));
  }

  async markNotificationRead(req: Request, res: Response) {
    const auth = getAuthUser(req);
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) {
      return res.status(400).json(createResponse(false, 'Invalid notification ID', undefined, 'VALIDATION_ERROR'));
    }

    const [updated] = await db
      .update(notificationsTable)
      .set({ isRead: true })
      .where(and(eq(notificationsTable.id, id), eq(notificationsTable.userId, auth.id)))
      .returning();

    if (!updated) {
      return res.status(404).json(createResponse(false, 'Notification not found or unauthorized', undefined, 'NOT_FOUND'));
    }

    return res.json(createResponse(true, 'Notification marked as read', updated));
  }
}

export const accountController = new AccountController();
