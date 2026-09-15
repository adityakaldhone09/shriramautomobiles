import { eq, and, desc, inArray } from 'drizzle-orm';
import type { Request, Response } from 'express';
import { db } from '../lib/db';
import {
  bookingsTable,
  bookingServicesTable,
  bookingInspectionsTable,
  serviceEstimatesTable,
  customersTable,
  customerVehiclesTable,
  servicesTable,
  availableSlotsTable,
  mechanicsTable,
  usersTable,
} from '@workspace/db/schema';
import { createResponse, isValidEmail, isValidPhone } from '../utils/helpers';

export function generateBookingNumber(): string {
  const year = new Date().getFullYear();
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `SAB-${year}-${rand}`;
}

export async function createBooking(req: Request, res: Response) {
  try {
    const {
      fullName,
      phone,
      email,
      customerVehicleId,
      vehicleId: inputVehicleId,
      vehicleBrand,
      vehicleModel,
      brand: brandInput,
      model: modelInput,
      vehicleType = 'Motorcycle',
      registrationNumber,
      vehicleAge,
      selectedServices,
      serviceId,
      symptomId,
      appointmentDate,
      bookingDate,
      timeSlot,
      problemDescription,
      imageUrl,
      preferredMechanicId,
      customerNotes,
    } = req.body;

    const brand = brandInput || vehicleBrand;
    const model = modelInput || vehicleModel;
    const effectiveDate = new Date(appointmentDate || bookingDate || Date.now());

    // Basic Validation
    if (email && !isValidEmail(email)) {
      return res.status(400).json(createResponse(false, 'Invalid email format', undefined, 'VALIDATION_ERROR'));
    }

    if (phone && !isValidPhone(phone)) {
      return res.status(400).json(createResponse(false, 'Invalid phone format', undefined, 'VALIDATION_ERROR'));
    }

    if (!timeSlot) {
      return res.status(400).json(createResponse(false, 'Time slot is required', undefined, 'VALIDATION_ERROR'));
    }

    const servicesToBook: number[] = [];
    if (Array.isArray(selectedServices) && selectedServices.length > 0) {
      servicesToBook.push(...selectedServices.map(Number));
    } else if (serviceId) {
      servicesToBook.push(Number(serviceId));
    }

    if (servicesToBook.length === 0) {
      return res.status(400).json(createResponse(false, 'Please select at least one service', undefined, 'VALIDATION_ERROR'));
    }

    // Mechanic validation if selected
    if (preferredMechanicId) {
      const [mechanic] = await db
        .select()
        .from(mechanicsTable)
        .where(and(eq(mechanicsTable.id, Number(preferredMechanicId)), eq(mechanicsTable.isAvailable, true)));
      if (!mechanic) {
        return res.status(409).json(createResponse(false, 'Preferred mechanic is unavailable', undefined, 'MECHANIC_UNAVAILABLE'));
      }
    }

    // Check slot availability
    const existingSlot = await db
      .select()
      .from(availableSlotsTable)
      .where(and(eq(availableSlotsTable.timeSlot, timeSlot), eq(availableSlotsTable.date, effectiveDate)));

    if (existingSlot && existingSlot.length > 0) {
      const slot = existingSlot[0];
      if (slot.currentBookings >= slot.maxBookings) {
        return res.status(400).json(
          createResponse(false, 'This time slot is fully booked. Please select another time.', undefined, 'SLOT_FULL')
        );
      }
    } else {
      await db.insert(availableSlotsTable).values({
        date: effectiveDate,
        timeSlot,
        maxBookings: 3,
        currentBookings: 1,
        isAvailable: true,
      });
    }

    // Resolve customer and vehicle
    let customerId: number | null = null;
    let authUserId: number | null = null;
    const authUser = (req as any).user;
    if (authUser?.id) {
      authUserId = authUser.id;
      const [userRec] = await db.select().from(usersTable).where(eq(usersTable.id, authUser.id));
      if (userRec?.customerId) customerId = userRec.customerId;
    }

    if (!customerId && phone) {
      let [existingCust] = await db.select().from(customersTable).where(eq(customersTable.phone, phone));
      if (!existingCust) {
        const [newCust] = await db.insert(customersTable).values({
          name: fullName || 'Customer',
          phone,
          email: email || `${phone}@shriramautomobiles.com`,
        }).returning();
        existingCust = newCust;
      }
      customerId = existingCust.id;
    }

    let resolvedVehicleId: number | null = inputVehicleId || customerVehicleId || null;
    if (!resolvedVehicleId && brand && model && registrationNumber) {
      const [newVehicle] = await db.insert(customerVehiclesTable).values({
        userId: authUserId,
        customerId: customerId || undefined,
        brand,
        model,
        vehicleType: vehicleType || 'Motorcycle',
        registrationNumber: registrationNumber.toUpperCase(),
        vehicleAge: vehicleAge ? parseInt(vehicleAge, 10) : null,
      }).returning();
      resolvedVehicleId = newVehicle.id;
    }

    const bookingNumber = generateBookingNumber();

    // Calculate initial starting total
    const servicesData = await db.select().from(servicesTable).where(inArray(servicesTable.id, servicesToBook));
    const totalPrice = servicesData.reduce((sum, s) => sum + parseFloat(s.startingPrice as any || 0), 0);

    // Create booking
    const [newBooking] = await db.insert(bookingsTable).values({
      bookingNumber,
      bookingId: bookingNumber,
      userId: authUserId || null,
      customerId: customerId || null,
      customerVehicleId: resolvedVehicleId || null,
      vehicleId: resolvedVehicleId || null,
      serviceId: servicesToBook[0] || null,
      symptomId: symptomId ? Number(symptomId) : null,
      preferredMechanicId: preferredMechanicId ? Number(preferredMechanicId) : null,
      assignedMechanicId: preferredMechanicId ? Number(preferredMechanicId) : null,
      bookingDate: effectiveDate,
      appointmentDate: effectiveDate,
      timeSlot,
      problemDescription: problemDescription || null,
      imageUrl: imageUrl || null,
      customerNotes: customerNotes || null,
      status: 'PENDING',
      totalPrice: totalPrice.toFixed(2),
    }).returning();

    // Add services to booking
    for (const sId of servicesToBook) {
      const svc = servicesData.find((s) => s.id === sId);
      if (svc) {
        await db.insert(bookingServicesTable).values({
          bookingId: newBooking.id,
          serviceId: svc.id,
          price: svc.startingPrice,
        });
      }
    }

    // Update slot booking count
    if (existingSlot && existingSlot.length > 0) {
      await db
        .update(availableSlotsTable)
        .set({ currentBookings: existingSlot[0].currentBookings + 1 })
        .where(eq(availableSlotsTable.id, existingSlot[0].id));
    }

    return res.status(201).json(
      createResponse(true, 'Booking created successfully', {
        id: newBooking.id,
        bookingNumber: newBooking.bookingNumber,
        bookingId: newBooking.bookingNumber,
        status: newBooking.status,
        appointmentDate: effectiveDate.toISOString(),
        timeSlot,
        totalPrice: totalPrice.toFixed(2),
      })
    );
  } catch (error: any) {
    console.error('Error creating booking:', error);
    return res.status(500).json(createResponse(false, 'Failed to create booking', undefined, 'INTERNAL_ERROR'));
  }
}

export async function getBooking(req: Request, res: Response) {
  try {
    const bookingIdentifier = String(req.params.bookingId || req.params.bookingNumber || req.params.id);

    // Search by bookingNumber or numeric id
    let booking: any = null;
    if (!Number.isNaN(Number(bookingIdentifier)) && Number(bookingIdentifier) > 0) {
      const [found] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, Number(bookingIdentifier)));
      booking = found;
    }
    if (!booking) {
      const [found] = await db.select().from(bookingsTable).where(eq(bookingsTable.bookingNumber, bookingIdentifier));
      booking = found;
    }

    if (!booking) {
      return res.status(404).json(createResponse(false, 'Booking not found', undefined, 'NOT_FOUND'));
    }

    // Related customer
    const [customer] = booking.customerId
      ? await db.select().from(customersTable).where(eq(customersTable.id, booking.customerId))
      : [];

    // Related vehicle
    const vehicleId = booking.customerVehicleId || booking.vehicleId;
    const [vehicle] = vehicleId
      ? await db.select().from(customerVehiclesTable).where(eq(customerVehiclesTable.id, vehicleId))
      : [];

    // Related services
    const services = await db
      .select({
        id: servicesTable.id,
        name: servicesTable.name,
        slug: servicesTable.slug,
        description: servicesTable.description,
        estimatedDuration: servicesTable.estimatedDuration,
        startingPrice: servicesTable.startingPrice,
      })
      .from(bookingServicesTable)
      .innerJoin(servicesTable, eq(bookingServicesTable.serviceId, servicesTable.id))
      .where(eq(bookingServicesTable.bookingId, booking.id));

    // Related inspections
    const inspections = await db
      .select()
      .from(bookingInspectionsTable)
      .where(eq(bookingInspectionsTable.bookingId, booking.id));

    // Related estimate
    const [estimate] = await db
      .select()
      .from(serviceEstimatesTable)
      .where(eq(serviceEstimatesTable.bookingId, booking.id))
      .orderBy(desc(serviceEstimatesTable.createdAt));

    // Mechanic details
    const [mechanic] = booking.assignedMechanicId || booking.preferredMechanicId
      ? await db.select().from(mechanicsTable).where(eq(mechanicsTable.id, (booking.assignedMechanicId || booking.preferredMechanicId)!))
      : [];

    return res.json(
      createResponse(true, 'Booking fetched successfully', {
        ...booking,
        customer: customer || null,
        vehicle: vehicle || null,
        mechanic: mechanic || null,
        services,
        inspections,
        estimate: estimate || null,
      })
    );
  } catch (error: any) {
    console.error('Error fetching booking:', error);
    return res.status(500).json(createResponse(false, 'Failed to fetch booking', undefined, 'INTERNAL_ERROR'));
  }
}

export async function updateBookingStatus(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { status, mechanicNotes } = req.body;

    const validStatuses = [
      'PENDING',
      'CONFIRMED',
      'VEHICLE_RECEIVED',
      'INSPECTION',
      'ESTIMATE_PENDING',
      'CUSTOMER_APPROVAL_REQUIRED',
      'IN_SERVICE',
      'WAITING_FOR_PARTS',
      'READY_FOR_PICKUP',
      'COMPLETED',
      'CANCELLED',
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json(createResponse(false, `Invalid status. Must be one of: ${validStatuses.join(', ')}`, undefined, 'VALIDATION_ERROR'));
    }

    const [updated] = await db
      .update(bookingsTable)
      .set({
        status,
        mechanicNotes: mechanicNotes !== undefined ? mechanicNotes : undefined,
        updatedAt: new Date(),
      })
      .where(eq(bookingsTable.id, parseInt(String(id), 10)))
      .returning();

    if (!updated) {
      return res.status(404).json(createResponse(false, 'Booking not found', undefined, 'NOT_FOUND'));
    }

    return res.json(createResponse(true, 'Booking status updated', updated));
  } catch (error: any) {
    console.error('Error updating booking status:', error);
    return res.status(500).json(createResponse(false, 'Failed to update booking', undefined, 'INTERNAL_ERROR'));
  }
}

export async function listBookings(req: Request, res: Response) {
  try {
    const bookings = await db.select().from(bookingsTable).orderBy(desc(bookingsTable.createdAt));
    return res.json(createResponse(true, 'Bookings fetched successfully', bookings));
  } catch (error: any) {
    console.error('Error listing bookings:', error);
    return res.status(500).json(createResponse(false, 'Failed to list bookings', undefined, 'INTERNAL_ERROR'));
  }
}

export async function listAccountBookings(req: Request, res: Response) {
  try {
    const auth = (req as any).user;
    if (!auth) return res.status(401).json(createResponse(false, 'Unauthorized', undefined, 'UNAUTHORIZED'));

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, auth.id));
    let bookings: any[] = [];
    if (user?.customerId) {
      bookings = await db.select().from(bookingsTable).where(eq(bookingsTable.customerId, user.customerId)).orderBy(desc(bookingsTable.createdAt));
    } else if (auth.id) {
      bookings = await db.select().from(bookingsTable).where(eq(bookingsTable.userId, auth.id)).orderBy(desc(bookingsTable.createdAt));
    }
    return res.json(createResponse(true, 'Bookings fetched', bookings));
  } catch (error: any) {
    console.error('Error listing account bookings:', error);
    return res.status(500).json(createResponse(false, 'Failed to list account bookings', undefined, 'INTERNAL_ERROR'));
  }
}

export async function getAccountBooking(req: Request, res: Response) {
  return getBooking(req, res);
}
