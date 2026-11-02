import type { Request, Response } from 'express';
import { and, desc, eq, ilike, lte, or, sql } from 'drizzle-orm';
import { db } from '../../db/client';
import {
  bookingsTable,
  customersTable,
  customerVehiclesTable,
  mechanicsTable,
  ordersTable,
  sparePartsTable,
  usersTable,
} from '../../db/schema';
import { createResponse, isValidEmail, isValidPhone, isValidRegistrationNumber } from '../../utils/helpers';

export class AdminController {
  // ================= 1. OVERVIEW & ANALYTICS =================
  async getOverview(_req: Request, res: Response) {
    try {
      const [allCustomers, allVehicles, allBookings, allMechanics, allParts, allOrders] = await Promise.all([
        db.select().from(customersTable),
        db.select().from(customerVehiclesTable),
        db.select().from(bookingsTable),
        db.select().from(mechanicsTable),
        db.select().from(sparePartsTable),
        db.select().from(ordersTable),
      ]);

      const pendingBookings = allBookings.filter((b) => b.status === 'PENDING').length;
      const inProgressBookings = allBookings.filter((b) =>
        ['CONFIRMED', 'IN_SERVICE', 'IN_PROGRESS', 'ESTIMATE_APPROVED'].includes(b.status)
      ).length;
      const completedBookings = allBookings.filter((b) => b.status === 'COMPLETED').length;

      const lowStockParts = allParts.filter((p) => p.stockQuantity <= p.lowStockThreshold);
      const activeMechanics = allMechanics.filter((m) => m.isAvailable).length;

      // Calculate total order revenue
      const totalOrderRevenue = allOrders
        .filter((o) => o.paymentStatus === 'PAID')
        .reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);

      // Latest 5 bookings
      const recentBookings = [...allBookings]
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
        .slice(0, 5);

      // Latest 5 orders
      const recentOrders = [...allOrders]
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
        .slice(0, 5);

      return res.json(
        createResponse(true, 'Overview analytics fetched successfully', {
          kpis: {
            totalCustomers: allCustomers.length,
            totalVehicles: allVehicles.length,
            totalBookings: allBookings.length,
            pendingBookings,
            inProgressBookings,
            completedBookings,
            activeMechanics,
            totalMechanics: allMechanics.length,
            totalSpareParts: allParts.length,
            lowStockCount: lowStockParts.length,
            totalOrders: allOrders.length,
            totalOrderRevenue: totalOrderRevenue.toFixed(2),
          },
          recentBookings,
          recentOrders,
          lowStockPreview: lowStockParts.slice(0, 5),
        })
      );
    } catch (error: any) {
      return res.status(500).json(createResponse(false, 'Failed to fetch overview analytics', undefined, 'INTERNAL_ERROR'));
    }
  }

  // ================= 2. CUSTOMER MANAGEMENT =================
  async listCustomers(req: Request, res: Response) {
    try {
      const q = req.query.q ? String(req.query.q).trim().toLowerCase() : '';
      const allCustomers = await db.select().from(customersTable);
      const vehicles = await db.select().from(customerVehiclesTable);
      const bookings = await db.select().from(bookingsTable);

      const vehicleCountMap = new Map<number, number>();
      for (const v of vehicles) {
        if (v.customerId) {
          vehicleCountMap.set(v.customerId, (vehicleCountMap.get(v.customerId) || 0) + 1);
        }
      }

      const bookingCountMap = new Map<number, number>();
      for (const b of bookings) {
        if (b.customerId) {
          bookingCountMap.set(b.customerId, (bookingCountMap.get(b.customerId) || 0) + 1);
        }
      }

      let filtered = allCustomers.map((c) => ({
        ...c,
        totalVehicles: vehicleCountMap.get(c.id) || 0,
        totalBookings: bookingCountMap.get(c.id) || 0,
      }));

      if (q) {
        filtered = filtered.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            c.phone.toLowerCase().includes(q) ||
            c.email.toLowerCase().includes(q)
        );
      }

      return res.json(createResponse(true, 'Customers fetched', filtered));
    } catch (error: any) {
      return res.status(500).json(createResponse(false, 'Failed to fetch customers', undefined, 'INTERNAL_ERROR'));
    }
  }

  async getCustomerById(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id)) {
        return res.status(400).json(createResponse(false, 'Invalid customer ID', undefined, 'VALIDATION_ERROR'));
      }

      const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, id));
      if (!customer) {
        return res.status(404).json(createResponse(false, 'Customer not found', undefined, 'NOT_FOUND'));
      }

      const [vehicles, bookings, orders] = await Promise.all([
        db.select().from(customerVehiclesTable).where(eq(customerVehiclesTable.customerId, id)),
        db.select().from(bookingsTable).where(eq(bookingsTable.customerId, id)),
        db.select().from(ordersTable).where(eq(ordersTable.userId, id)), // best-effort order match
      ]);

      const [userAccount] = await db.select().from(usersTable).where(eq(usersTable.customerId, id));

      return res.json(
        createResponse(true, 'Customer details fetched', {
          customer,
          userAccount: userAccount ? { id: userAccount.id, role: userAccount.role, email: userAccount.email } : null,
          vehicles,
          bookings,
          orders,
        })
      );
    } catch (error: any) {
      return res.status(500).json(createResponse(false, 'Failed to fetch customer details', undefined, 'INTERNAL_ERROR'));
    }
  }

  async createCustomer(req: Request, res: Response) {
    try {
      const { name, phone, email } = req.body;
      if (!name?.trim() || !phone?.trim() || !email?.trim()) {
        return res.status(400).json(
          createResponse(false, 'Name, phone, and email are required', undefined, 'VALIDATION_ERROR')
        );
      }

      if (!isValidPhone(phone)) {
        return res.status(400).json(createResponse(false, 'Invalid phone number format', undefined, 'VALIDATION_ERROR'));
      }

      if (!isValidEmail(email)) {
        return res.status(400).json(createResponse(false, 'Invalid email address format', undefined, 'VALIDATION_ERROR'));
      }

      const cleanPhone = phone.trim().replace(/[\s\-+]/g, '');
      const cleanEmail = email.trim().toLowerCase();

      const [existingPhone] = await db.select().from(customersTable).where(eq(customersTable.phone, cleanPhone));
      if (existingPhone) {
        return res.status(409).json(createResponse(false, 'A customer with this phone number already exists', undefined, 'CONFLICT'));
      }

      const [existingEmail] = await db.select().from(customersTable).where(eq(customersTable.email, cleanEmail));
      if (existingEmail) {
        return res.status(409).json(createResponse(false, 'A customer with this email already exists', undefined, 'CONFLICT'));
      }

      const [customer] = await db
        .insert(customersTable)
        .values({
          name: name.trim(),
          phone: cleanPhone,
          email: cleanEmail,
        })
        .returning();

      return res.status(201).json(createResponse(true, 'Customer created successfully', customer));
    } catch (error: any) {
      return res.status(500).json(createResponse(false, 'Failed to create customer', undefined, 'INTERNAL_ERROR'));
    }
  }

  async updateCustomer(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id)) {
        return res.status(400).json(createResponse(false, 'Invalid customer ID', undefined, 'VALIDATION_ERROR'));
      }

      const { name, phone, email } = req.body;
      const updateData: Partial<typeof customersTable.$inferInsert> = { updatedAt: new Date() };

      if (name?.trim()) updateData.name = name.trim();
      if (phone?.trim()) {
        if (!isValidPhone(phone)) {
          return res.status(400).json(createResponse(false, 'Invalid phone number format', undefined, 'VALIDATION_ERROR'));
        }
        updateData.phone = phone.trim().replace(/[\s\-+]/g, '');
      }
      if (email?.trim()) {
        if (!isValidEmail(email)) {
          return res.status(400).json(createResponse(false, 'Invalid email address format', undefined, 'VALIDATION_ERROR'));
        }
        updateData.email = email.trim().toLowerCase();
      }

      const [updated] = await db
        .update(customersTable)
        .set(updateData)
        .where(eq(customersTable.id, id))
        .returning();

      if (!updated) {
        return res.status(404).json(createResponse(false, 'Customer not found', undefined, 'NOT_FOUND'));
      }

      return res.json(createResponse(true, 'Customer updated successfully', updated));
    } catch (error: any) {
      return res.status(500).json(createResponse(false, 'Failed to update customer', undefined, 'INTERNAL_ERROR'));
    }
  }

  // ================= 3. VEHICLE MANAGEMENT =================
  async listVehicles(req: Request, res: Response) {
    try {
      const q = req.query.q ? String(req.query.q).trim().toLowerCase() : '';
      const vehicles = await db
        .select({
          id: customerVehiclesTable.id,
          customerId: customerVehiclesTable.customerId,
          customerName: customersTable.name,
          customerPhone: customersTable.phone,
          brand: customerVehiclesTable.brand,
          model: customerVehiclesTable.model,
          vehicleType: customerVehiclesTable.vehicleType,
          registrationNumber: customerVehiclesTable.registrationNumber,
          nickname: customerVehiclesTable.nickname,
          manufactureYear: customerVehiclesTable.manufactureYear,
          variant: customerVehiclesTable.variant,
          color: customerVehiclesTable.color,
          createdAt: customerVehiclesTable.createdAt,
        })
        .from(customerVehiclesTable)
        .leftJoin(customersTable, eq(customerVehiclesTable.customerId, customersTable.id))
        .orderBy(desc(customerVehiclesTable.id));

      let result = vehicles;
      if (q) {
        result = vehicles.filter(
          (v) =>
            v.brand?.toLowerCase().includes(q) ||
            v.model?.toLowerCase().includes(q) ||
            v.registrationNumber?.toLowerCase().includes(q) ||
            v.customerName?.toLowerCase().includes(q) ||
            v.customerPhone?.toLowerCase().includes(q)
        );
      }

      return res.json(createResponse(true, 'Vehicles fetched', result));
    } catch (error: any) {
      return res.status(500).json(createResponse(false, 'Failed to fetch vehicles', undefined, 'INTERNAL_ERROR'));
    }
  }

  async createVehicleForCustomer(req: Request, res: Response) {
    try {
      const { customerId, brand, model, vehicleType = 'Motorcycle', registrationNumber, manufactureYear, variant, color, notes } = req.body;
      if (!customerId || !brand?.trim() || !model?.trim() || !registrationNumber?.trim()) {
        return res.status(400).json(
          createResponse(false, 'Customer ID, brand, model, and registration number are required', undefined, 'VALIDATION_ERROR')
        );
      }

      const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, Number(customerId)));
      if (!customer) {
        return res.status(404).json(createResponse(false, 'Customer not found', undefined, 'NOT_FOUND'));
      }

      const cleanReg = registrationNumber.trim().toUpperCase();

      const [vehicle] = await db
        .insert(customerVehiclesTable)
        .values({
          customerId: Number(customerId),
          brand: brand.trim(),
          model: model.trim(),
          vehicleType: vehicleType.trim(),
          registrationNumber: cleanReg,
          manufactureYear: manufactureYear ? Number(manufactureYear) : null,
          variant: variant ? variant.trim() : null,
          color: color ? color.trim() : null,
          notes: notes ? notes.trim() : null,
        })
        .returning();

      return res.status(201).json(createResponse(true, 'Vehicle registered for customer successfully', vehicle));
    } catch (error: any) {
      return res.status(500).json(createResponse(false, 'Failed to register vehicle', undefined, 'INTERNAL_ERROR'));
    }
  }

  // ================= 4. INVENTORY & STOCK =================
  async listInventory(_req: Request, res: Response) {
    try {
      const inventory = await db.select().from(sparePartsTable);
      return res.json(createResponse(true, 'Inventory fetched', inventory));
    } catch (error: any) {
      return res.status(500).json(createResponse(false, 'Failed to fetch inventory', undefined, 'INTERNAL_ERROR'));
    }
  }

  async listLowStock(_req: Request, res: Response) {
    try {
      const lowStock = await db
        .select()
        .from(sparePartsTable)
        .where(lte(sparePartsTable.stockQuantity, sparePartsTable.lowStockThreshold));
      return res.json(createResponse(true, 'Low stock fetched', lowStock));
    } catch (error: any) {
      return res.status(500).json(createResponse(false, 'Failed to fetch low stock parts', undefined, 'INTERNAL_ERROR'));
    }
  }

  // ================= 5. MECHANICS & WORKLOAD =================
  async listMechanics(_req: Request, res: Response) {
    try {
      const mechanics = await db.select().from(mechanicsTable);
      const activeBookings = await db
        .select()
        .from(bookingsTable)
        .where(
          and(
            sql`${bookingsTable.status} IN ('CONFIRMED', 'IN_SERVICE', 'IN_PROGRESS', 'ESTIMATE_APPROVED')`,
            sql`${bookingsTable.assignedMechanicId} IS NOT NULL`
          )
        );

      const workloadMap = new Map<number, number>();
      for (const b of activeBookings) {
        if (b.assignedMechanicId) {
          workloadMap.set(b.assignedMechanicId, (workloadMap.get(b.assignedMechanicId) || 0) + 1);
        }
      }

      const result = mechanics.map((m) => ({
        ...m,
        activeWorkload: workloadMap.get(m.id) || 0,
      }));

      return res.json(createResponse(true, 'Mechanics fetched', result));
    } catch (error: any) {
      return res.status(500).json(createResponse(false, 'Failed to fetch mechanics', undefined, 'INTERNAL_ERROR'));
    }
  }

  // ================= 6. ORDERS & ASSIGNMENTS =================
  async updateOrderStatus(req: Request, res: Response) {
    try {
      const statuses = ['PENDING', 'CONFIRMED', 'PROCESSING', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'];
      const { status } = req.body;
      if (!statuses.includes(status)) {
        return res.status(400).json(createResponse(false, 'Invalid order status', undefined, 'VALIDATION_ERROR'));
      }
      const [order] = await db
        .update(ordersTable)
        .set({ status })
        .where(eq(ordersTable.id, Number(req.params.id)))
        .returning();
      if (!order) return res.status(404).json(createResponse(false, 'Order not found', undefined, 'NOT_FOUND'));
      return res.json(createResponse(true, 'Order status updated', order));
    } catch (error: any) {
      return res.status(500).json(createResponse(false, 'Failed to update order status', undefined, 'INTERNAL_ERROR'));
    }
  }

  async assignMechanic(req: Request, res: Response) {
    try {
      const mechanicId = Number(req.body.mechanicId);
      const [mechanic] = await db
        .select()
        .from(mechanicsTable)
        .where(and(eq(mechanicsTable.id, mechanicId), eq(mechanicsTable.isAvailable, true)));
      if (!mechanic) return res.status(409).json(createResponse(false, 'Mechanic is unavailable', undefined, 'MECHANIC_UNAVAILABLE'));

      const [booking] = await db
        .update(bookingsTable)
        .set({ assignedMechanicId: mechanic.id, updatedAt: new Date() })
        .where(eq(bookingsTable.id, Number(req.params.id)))
        .returning();
      if (!booking) return res.status(404).json(createResponse(false, 'Booking not found', undefined, 'NOT_FOUND'));
      return res.json(createResponse(true, 'Mechanic assigned', booking));
    } catch (error: any) {
      return res.status(500).json(createResponse(false, 'Failed to assign mechanic', undefined, 'INTERNAL_ERROR'));
    }
  }
}

export const adminController = new AdminController();
