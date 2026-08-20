import { eq, and } from 'drizzle-orm';
import type { Request, Response } from 'express';
import { db } from '../lib/db';
import { servicesTable, insertServiceSchema } from '@workspace/db/schema';
import { createResponse } from '../utils/helpers';

export async function getServices(req: Request, res: Response) {
  try {
    const services = await db
      .select()
      .from(servicesTable)
      .where(eq(servicesTable.isActive, true));

    return res.json(
      createResponse(true, 'Services fetched successfully', services)
    );
  } catch (error) {
    console.error('Error fetching services:', error);
    return res.status(500).json(
      createResponse(false, 'Failed to fetch services', undefined, 'INTERNAL_ERROR')
    );
  }
}

export async function getServiceById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const service = await db
      .select()
      .from(servicesTable)
      .where(eq(servicesTable.id, parseInt(String(id), 10)));

    if (!service || service.length === 0) {
      return res.status(404).json(
        createResponse(false, 'Service not found', undefined, 'NOT_FOUND')
      );
    }

    return res.json(
      createResponse(true, 'Service fetched successfully', service[0])
    );
  } catch (error) {
    console.error('Error fetching service:', error);
    return res.status(500).json(
      createResponse(false, 'Failed to fetch service', undefined, 'INTERNAL_ERROR')
    );
  }
}

export async function createService(req: Request, res: Response) {
  try {
    const validatedData = insertServiceSchema.parse(req.body);
    const newService = await db
      .insert(servicesTable)
      .values(validatedData)
      .returning();

    return res.status(201).json(
      createResponse(true, 'Service created successfully', newService[0])
    );
  } catch (error) {
    console.error('Error creating service:', error);
    return res.status(400).json(
      createResponse(false, 'Failed to create service', undefined, 'VALIDATION_ERROR')
    );
  }
}

export async function updateService(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const validatedData = insertServiceSchema.partial().parse(req.body);
    const updated = await db
      .update(servicesTable)
      .set({ ...validatedData, updatedAt: new Date() })
      .where(eq(servicesTable.id, parseInt(String(id), 10)))
      .returning();

    if (!updated || updated.length === 0) {
      return res.status(404).json(
        createResponse(false, 'Service not found', undefined, 'NOT_FOUND')
      );
    }

    return res.json(
      createResponse(true, 'Service updated successfully', updated[0])
    );
  } catch (error) {
    console.error('Error updating service:', error);
    return res.status(400).json(
      createResponse(false, 'Failed to update service', undefined, 'VALIDATION_ERROR')
    );
  }
}

export async function deleteService(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const deleted = await db
      .delete(servicesTable)
      .where(eq(servicesTable.id, parseInt(String(id), 10)))
      .returning();

    if (!deleted || deleted.length === 0) {
      return res.status(404).json(
        createResponse(false, 'Service not found', undefined, 'NOT_FOUND')
      );
    }

    return res.json(
      createResponse(true, 'Service deleted successfully', deleted[0])
    );
  } catch (error) {
    console.error('Error deleting service:', error);
    return res.status(500).json(
      createResponse(false, 'Failed to delete service', undefined, 'INTERNAL_ERROR')
    );
  }
}
