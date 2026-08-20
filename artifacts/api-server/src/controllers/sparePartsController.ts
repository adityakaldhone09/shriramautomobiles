import { eq, and } from 'drizzle-orm';
import type { Request, Response } from 'express';
import { db } from '../lib/db';
import { sparePartsTable, insertSparePartSchema } from '@workspace/db/schema';
import { createResponse } from '../utils/helpers';

export async function getSpareParts(req: Request, res: Response) {
  try {
    const { brand, category, search } = req.query;

    const filters = [eq(sparePartsTable.isActive, true)];
    if (brand && typeof brand === 'string') filters.push(eq(sparePartsTable.brand, brand));
    if (category && typeof category === 'string') filters.push(eq(sparePartsTable.category, category));
    const parts = await db.select().from(sparePartsTable).where(and(...filters));

    // Client-side search filter
    let filtered = parts;
    if (search) {
      const searchTerm = (search as string).toLowerCase();
      filtered = parts.filter(
        (part) =>
          part.name.toLowerCase().includes(searchTerm) ||
          part.description?.toLowerCase().includes(searchTerm)
      );
    }

    return res.json(
      createResponse(true, 'Spare parts fetched successfully', filtered)
    );
  } catch (error) {
    console.error('Error fetching spare parts:', error);
    return res.status(500).json(
      createResponse(false, 'Failed to fetch spare parts', undefined, 'INTERNAL_ERROR')
    );
  }
}

export async function getSparePartById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const part = await db
      .select()
      .from(sparePartsTable)
      .where(eq(sparePartsTable.id, parseInt(String(id), 10)));

    if (!part || part.length === 0) {
      return res.status(404).json(
        createResponse(false, 'Spare part not found', undefined, 'NOT_FOUND')
      );
    }

    return res.json(
      createResponse(true, 'Spare part fetched successfully', part[0])
    );
  } catch (error) {
    console.error('Error fetching spare part:', error);
    return res.status(500).json(
      createResponse(false, 'Failed to fetch spare part', undefined, 'INTERNAL_ERROR')
    );
  }
}

export async function createSparePart(req: Request, res: Response) {
  try {
    const validatedData = insertSparePartSchema.parse(req.body);
    const newPart = await db
      .insert(sparePartsTable)
      .values(validatedData)
      .returning();

    return res.status(201).json(
      createResponse(true, 'Spare part created successfully', newPart[0])
    );
  } catch (error) {
    console.error('Error creating spare part:', error);
    return res.status(400).json(
      createResponse(false, 'Failed to create spare part', undefined, 'VALIDATION_ERROR')
    );
  }
}

export async function updateSparePart(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const validatedData = insertSparePartSchema.partial().parse(req.body);
    const updated = await db
      .update(sparePartsTable)
      .set({ ...validatedData, updatedAt: new Date() })
      .where(eq(sparePartsTable.id, parseInt(String(id), 10)))
      .returning();

    if (!updated || updated.length === 0) {
      return res.status(404).json(
        createResponse(false, 'Spare part not found', undefined, 'NOT_FOUND')
      );
    }

    return res.json(
      createResponse(true, 'Spare part updated successfully', updated[0])
    );
  } catch (error) {
    console.error('Error updating spare part:', error);
    return res.status(400).json(
      createResponse(false, 'Failed to update spare part', undefined, 'VALIDATION_ERROR')
    );
  }
}

export async function deleteSparePart(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const deleted = await db
      .delete(sparePartsTable)
      .where(eq(sparePartsTable.id, parseInt(String(id), 10)))
      .returning();

    if (!deleted || deleted.length === 0) {
      return res.status(404).json(
        createResponse(false, 'Spare part not found', undefined, 'NOT_FOUND')
      );
    }

    return res.json(
      createResponse(true, 'Spare part deleted successfully', deleted[0])
    );
  } catch (error) {
    console.error('Error deleting spare part:', error);
    return res.status(500).json(
      createResponse(false, 'Failed to delete spare part', undefined, 'INTERNAL_ERROR')
    );
  }
}
