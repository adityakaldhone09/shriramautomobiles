import type { Request, Response } from 'express';
import { and, eq } from 'drizzle-orm';
import { db } from '../lib/db';
import { availableSlotsTable } from '@workspace/db/schema';
import { createResponse, getAvailableTimeSlots } from '../utils/helpers';

export async function getAvailableSlots(req: Request, res: Response) {
  const date = typeof req.query.date === 'string' ? req.query.date : '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json(
      createResponse(false, 'A valid date is required', undefined, 'VALIDATION_ERROR'),
    );
  }

  try {
    const start = new Date(`${date}T00:00:00.000Z`);
    const end = new Date(`${date}T23:59:59.999Z`);
    const configured = await db
      .select()
      .from(availableSlotsTable)
      .where(and(eq(availableSlotsTable.date, start), eq(availableSlotsTable.isAvailable, true)));

    const configuredByTime = new Map(configured.map((slot) => [slot.timeSlot, slot]));
    const slots = getAvailableTimeSlots().map((timeSlot) => {
      const slot = configuredByTime.get(timeSlot);
      return {
        timeSlot,
        available: slot ? slot.currentBookings < slot.maxBookings : true,
        remaining: slot ? Math.max(slot.maxBookings - slot.currentBookings, 0) : 3,
      };
    });

    return res.json(createResponse(true, 'Available slots fetched successfully', slots));
  } catch (error) {
    console.error('Error fetching available slots:', error);
    return res.status(500).json(
      createResponse(false, 'Failed to fetch available slots', undefined, 'INTERNAL_ERROR'),
    );
  }
}
