import type { Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../lib/db';
import { mechanicsTable } from '@workspace/db/schema';
import { createResponse } from '../utils/helpers';

export async function listMechanics(req: Request, res: Response) {
  const { date, slot } = req.query;
  const mechanics = await db.select().from(mechanicsTable).where(eq(mechanicsTable.isAvailable, true));
  return res.json(createResponse(true, 'Available mechanics fetched', mechanics));
}

export async function createMechanic(req: Request, res: Response) {
  const { name, phone, experience = 0, specialization, languages = 'Marathi, Hindi', profileImage } = req.body;
  if (!name || !specialization) return res.status(400).json(createResponse(false, 'Name and specialization are required', undefined, 'VALIDATION_ERROR'));
  const [mechanic] = await db.insert(mechanicsTable).values({ name, phone, experience: Number(experience), specialization, languages, profileImage }).returning();
  return res.status(201).json(createResponse(true, 'Mechanic created', mechanic));
}
