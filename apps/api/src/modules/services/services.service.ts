import { eq } from 'drizzle-orm';
import { db } from '../../db/client';
import { servicesTable, serviceSymptomsTable } from '../../db/schema';

export class ServicesService {
  async getAllServices() {
    return db.select().from(servicesTable).where(eq(servicesTable.isActive, true));
  }

  async getServiceById(id: number) {
    const [service] = await db.select().from(servicesTable).where(eq(servicesTable.id, id));
    return service || null;
  }

  async getAllSymptoms() {
    return db.select().from(serviceSymptomsTable).where(eq(serviceSymptomsTable.isActive, true));
  }

  async createService(data: any) {
    const [newService] = await db.insert(servicesTable).values(data).returning();
    return newService;
  }

  async updateService(id: number, data: any) {
    const [updated] = await db.update(servicesTable).set({ ...data, updatedAt: new Date() }).where(eq(servicesTable.id, id)).returning();
    return updated || null;
  }

  async deleteService(id: number) {
    const [deleted] = await db.delete(servicesTable).where(eq(servicesTable.id, id)).returning();
    return deleted || null;
  }
}

export const servicesService = new ServicesService();
