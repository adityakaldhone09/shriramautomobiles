import { eq, and, desc, inArray } from 'drizzle-orm';
import type { Request, Response } from 'express';
import { db } from '../lib/db';
import {
  bookingsTable,
  bookingServicesTable,
  customersTable,
  vehiclesTable,
  servicesTable,
  availableSlotsTable,
  insertBookingSchema,
  insertCustomerSchema,
  insertVehicleSchema,
  insertAvailableSlotSchema,
} from '@workspace/db/schema';
import { createResponse, generateBookingId, isValidEmail, isValidPhone } from '../utils/helpers';

export async function createBooking(req: Request, res: Response) {
  try {
    const {
      fullName,
      phone,
      email,
      brand,
      model,
      vehicleType,
      registrationNumber,
      vehicleAge,
      selectedServices,
      appointmentDate,
      timeSlot,
      problemDescription,
      imageUrl,
    } = req.body;

    // Validation
    if (!isValidEmail(email)) {
      return res.status(400).json(
        createResponse(false, 'Invalid email format', undefined, 'VALIDATION_ERROR')
      );
    }

    if (!isValidPhone(phone)) {
      return res.status(400).json(
        createResponse(false, 'Invalid phone format', undefined, 'VALIDATION_ERROR')
      );
    }

    if (!Array.isArray(selectedServices) || selectedServices.length === 0) {
      return res.status(400).json(
        createResponse(false, 'Please select at least one service', undefined, 'VALIDATION_ERROR')
      );
    }

    // Start transaction
    try {
      // Get or create customer
      let customer = await db
        .select()
        .from(customersTable)
        .where(eq(customersTable.phone, phone));

      let customerId: number;
      if (!customer || customer.length === 0) {
        const newCustomer = await db
          .insert(customersTable)
          .values({ name: fullName, phone, email })
          .returning();
        customerId = newCustomer[0].id;
      } else {
        customerId = customer[0].id;
      }

      // Create vehicle
      const newVehicle = await db
        .insert(vehiclesTable)
        .values({
          customerId,
          brand,
          model,
          vehicleType,
          registrationNumber,
          vehicleAge: vehicleAge ? parseInt(vehicleAge) : null,
        })
        .returning();
      const vehicleId = newVehicle[0].id;

      // Check slot availability
      const existingSlot = await db
        .select()
        .from(availableSlotsTable)
        .where(
          and(
            eq(availableSlotsTable.timeSlot, timeSlot),
            eq(availableSlotsTable.date, new Date(appointmentDate))
          )
        );

      if (existingSlot && existingSlot.length > 0) {
        const slot = existingSlot[0];
        if (slot.currentBookings >= slot.maxBookings) {
          return res.status(400).json(
            createResponse(
              false,
              'This time slot is fully booked. Please select another time.',
              undefined,
              'SLOT_FULL'
            )
          );
        }
      } else {
        // Create slot if it doesn't exist
        await db
          .insert(availableSlotsTable)
          .values({
            date: new Date(appointmentDate),
            timeSlot,
            currentBookings: 1,
          });
      }

      // Generate booking ID
      const bookingId = generateBookingId();

      // Calculate total price
      const servicesData = await db
        .select()
        .from(servicesTable)
        .where(inArray(servicesTable.id, selectedServices.map(Number)));

      const totalPrice = servicesData.reduce(
        (sum, service) => sum + parseFloat(service.startingPrice as any),
        0
      );

      // Create booking
      const newBooking = await db
        .insert(bookingsTable)
        .values({
          bookingId,
          customerId,
          vehicleId,
          appointmentDate: new Date(appointmentDate),
          timeSlot,
          problemDescription,
          imageUrl,
          status: 'PENDING',
          totalPrice: totalPrice.toString(),
        })
        .returning();

      const bookingDbId = newBooking[0].id;

      // Add services to booking
      for (const serviceId of selectedServices) {
        const serviceData = await db
          .select()
          .from(servicesTable)
          .where(eq(servicesTable.id, serviceId));

        if (serviceData.length > 0) {
          await db
            .insert(bookingServicesTable)
            .values({
              bookingId: bookingDbId,
              serviceId,
              price: serviceData[0].startingPrice,
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
          bookingId,
          status: 'PENDING',
          appointmentDate,
          timeSlot,
          totalPrice,
        })
      );
    } catch (txnError) {
      console.error('Transaction error:', txnError);
      throw txnError;
    }
  } catch (error) {
    console.error('Error creating booking:', error);
    return res.status(500).json(
      createResponse(false, 'Failed to create booking', undefined, 'INTERNAL_ERROR')
    );
  }
}

export async function getBooking(req: Request, res: Response) {
  try {
    const bookingId = String(req.params.bookingId);

    const booking = await db
      .select()
      .from(bookingsTable)
      .where(eq(bookingsTable.bookingId, bookingId));

    if (!booking || booking.length === 0) {
      return res.status(404).json(
        createResponse(false, 'Booking not found', undefined, 'NOT_FOUND')
      );
    }

    // Fetch related data
    const customer = await db
      .select()
      .from(customersTable)
      .where(eq(customersTable.id, booking[0].customerId));

    const vehicle = await db
      .select()
      .from(vehiclesTable)
      .where(eq(vehiclesTable.id, booking[0].vehicleId));

    const services = await db
      .select({
        id: servicesTable.id,
        name: servicesTable.name,
        description: servicesTable.description,
        estimatedDuration: servicesTable.estimatedDuration,
        startingPrice: servicesTable.startingPrice,
      })
      .from(bookingServicesTable)
      .innerJoin(servicesTable, eq(bookingServicesTable.serviceId, servicesTable.id))
      .where(eq(bookingServicesTable.bookingId, booking[0].id));

    return res.json(
      createResponse(true, 'Booking fetched successfully', {
        booking: booking[0],
        customer: customer[0],
        vehicle: vehicle[0],
        services,
      })
    );
  } catch (error) {
    console.error('Error fetching booking:', error);
    return res.status(500).json(
      createResponse(false, 'Failed to fetch booking', undefined, 'INTERNAL_ERROR')
    );
  }
}

export async function updateBookingStatus(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json(
        createResponse(false, 'Invalid status', undefined, 'VALIDATION_ERROR')
      );
    }

    const updated = await db
      .update(bookingsTable)
      .set({ status, updatedAt: new Date() })
      .where(eq(bookingsTable.id, parseInt(String(id), 10)))
      .returning();

    if (!updated || updated.length === 0) {
      return res.status(404).json(
        createResponse(false, 'Booking not found', undefined, 'NOT_FOUND')
      );
    }

    return res.json(
      createResponse(true, 'Booking status updated', updated[0])
    );
  } catch (error) {
    console.error('Error updating booking:', error);
    return res.status(500).json(
      createResponse(false, 'Failed to update booking', undefined, 'INTERNAL_ERROR')
    );
  }
}

export async function listBookings(req: Request, res: Response) {
  try {
    const bookings = await db.select().from(bookingsTable).orderBy(desc(bookingsTable.createdAt));

    return res.json(
      createResponse(true, 'Bookings fetched successfully', bookings)
    );
  } catch (error) {
    console.error('Error listing bookings:', error);
    return res.status(500).json(
      createResponse(false, 'Failed to list bookings', undefined, 'INTERNAL_ERROR')
    );
  }
}
