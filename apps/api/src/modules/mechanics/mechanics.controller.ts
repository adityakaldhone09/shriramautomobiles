import type { Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../../db/client';
import { mechanicsTable, availableSlotsTable } from '../../db/schema';
import { createResponse } from '../../utils/helpers';

export class MechanicsController {
  async getMechanics(_req: Request, res: Response) {
    const mechanics = await db.select().from(mechanicsTable).where(eq(mechanicsTable.isAvailable, true));
    return res.json(createResponse(true, 'Mechanics fetched', mechanics));
  }

  async getAvailableSlots(_req: Request, res: Response) {
    const slots = await db.select().from(availableSlotsTable).where(eq(availableSlotsTable.isAvailable, true));
    return res.json(createResponse(true, 'Available slots fetched', slots));
  }
}

export const mechanicsController = new MechanicsController();
