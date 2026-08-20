import { eq } from 'drizzle-orm';
import type { Request, Response } from 'express';
import { db } from '../lib/db';
import { brandsTable, insertBrandSchema } from '@workspace/db/schema';
import { createResponse } from '../utils/helpers';

export async function getBrands(req: Request, res: Response) {
  try {
    const brands = await db
      .select()
      .from(brandsTable)
      .where(eq(brandsTable.isActive, true));

    return res.json(
      createResponse(true, 'Brands fetched successfully', brands)
    );
  } catch (error) {
    console.error('Error fetching brands:', error);
    return res.status(500).json(
      createResponse(false, 'Failed to fetch brands', undefined, 'INTERNAL_ERROR')
    );
  }
}

export async function getBrandById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const brand = await db
      .select()
      .from(brandsTable)
      .where(eq(brandsTable.id, parseInt(String(id), 10)));

    if (!brand || brand.length === 0) {
      return res.status(404).json(
        createResponse(false, 'Brand not found', undefined, 'NOT_FOUND')
      );
    }

    return res.json(
      createResponse(true, 'Brand fetched successfully', brand[0])
    );
  } catch (error) {
    console.error('Error fetching brand:', error);
    return res.status(500).json(
      createResponse(false, 'Failed to fetch brand', undefined, 'INTERNAL_ERROR')
    );
  }
}

export async function createBrand(req: Request, res: Response) {
  try {
    const validatedData = insertBrandSchema.parse(req.body);
    const newBrand = await db
      .insert(brandsTable)
      .values(validatedData)
      .returning();

    return res.status(201).json(
      createResponse(true, 'Brand created successfully', newBrand[0])
    );
  } catch (error) {
    console.error('Error creating brand:', error);
    return res.status(400).json(
      createResponse(false, 'Failed to create brand', undefined, 'VALIDATION_ERROR')
    );
  }
}

export async function updateBrand(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const validatedData = insertBrandSchema.partial().parse(req.body);
    const updated = await db
      .update(brandsTable)
      .set({ ...validatedData, updatedAt: new Date() })
      .where(eq(brandsTable.id, parseInt(String(id), 10)))
      .returning();

    if (!updated || updated.length === 0) {
      return res.status(404).json(
        createResponse(false, 'Brand not found', undefined, 'NOT_FOUND')
      );
    }

    return res.json(
      createResponse(true, 'Brand updated successfully', updated[0])
    );
  } catch (error) {
    console.error('Error updating brand:', error);
    return res.status(400).json(
      createResponse(false, 'Failed to update brand', undefined, 'VALIDATION_ERROR')
    );
  }
}

export async function deleteBrand(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const deleted = await db
      .delete(brandsTable)
      .where(eq(brandsTable.id, parseInt(String(id), 10)))
      .returning();

    if (!deleted || deleted.length === 0) {
      return res.status(404).json(
        createResponse(false, 'Brand not found', undefined, 'NOT_FOUND')
      );
    }

    return res.json(
      createResponse(true, 'Brand deleted successfully', deleted[0])
    );
  } catch (error) {
    console.error('Error deleting brand:', error);
    return res.status(500).json(
      createResponse(false, 'Failed to delete brand', undefined, 'INTERNAL_ERROR')
    );
  }
}
