import type { Request, Response } from 'express';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { db } from '../../db/client';
import {
  customerVehiclesTable,
  servicePartsTable,
  servicesTable,
  serviceSymptomsTable,
  symptomPartMappingTable,
  symptomServiceMappingTable,
  vehicleModelsTable,
  vehiclePartCompatibilityTable,
} from '../../db/schema';
import { createResponse } from '../../utils/helpers';

const symptomKeywords: Array<{ id: string; keywords: string[] }> = [
  { id: 'symp-not-starting', keywords: ['start', 'starting', 'crank', 'dead', 'self', 'kick', 'ignit'] },
  { id: 'symp-low-pickup', keywords: ['pickup', 'pick-up', 'pulling', 'slow', 'power', 'hesitat', 'acceleration', 'choke'] },
  { id: 'symp-poor-mileage', keywords: ['mileage', 'petrol', 'fuel', 'average', 'consumption'] },
  { id: 'symp-brake-weak', keywords: ['brake', 'stopping', 'skid', 'brake sound', 'screech', 'lever'] },
  { id: 'symp-chain-noise', keywords: ['chain', 'sprocket', 'rattle', 'slack', 'clatter'] },
  { id: 'symp-engine-noise', keywords: ['engine', 'tappet', 'knocking', 'smoke', 'heat', 'vibration', 'oil'] },
  { id: 'symp-battery-problem', keywords: ['battery', 'horn', 'charging', 'electrical', 'fuse'] },
  { id: 'symp-tyre-problem', keywords: ['tyre', 'tire', 'puncture', 'air', 'wobble', 'tube'] },
  { id: 'symp-headlight-problem', keywords: ['light', 'headlight', 'headlamp', 'indicator', 'bulb'] },
  { id: 'symp-suspension-problem', keywords: ['suspension', 'fork', 'shock', 'jump', 'oil leak'] },
  { id: 'symp-wheel-noise', keywords: ['bearing', 'wheel', 'cone', 'steering'] },
  { id: 'symp-general-service', keywords: ['general', 'servicing', 'periodic', 'regular', 'tuneup', 'routine'] },
];

export async function listSymptoms(_req: Request, res: Response) {
  try {
    const symptoms = await db
      .select({
        id: serviceSymptomsTable.id,
        symptomId: serviceSymptomsTable.symptomId,
        symptom: serviceSymptomsTable.symptom,
        name: serviceSymptomsTable.symptom,
        slug: serviceSymptomsTable.slug,
        description: serviceSymptomsTable.description,
        severity: serviceSymptomsTable.severity,
      })
      .from(serviceSymptomsTable)
      .where(eq(serviceSymptomsTable.isActive, true))
      .orderBy(asc(serviceSymptomsTable.id));

    return res.json(createResponse(true, 'Service symptoms fetched', symptoms));
  } catch (error: any) {
    return res.status(500).json(createResponse(false, 'Failed to fetch symptoms', undefined, 'INTERNAL_ERROR'));
  }
}

export async function getRecommendations(req: Request, res: Response) {
  try {
    const { vehicleId, vehicleModelId: rawModelId, symptomId: rawSymptomId, description } = req.query;

    let targetModelId: number | null = null;
    let targetVehicleType = 'Motorcycle';

    if (vehicleId && Number(vehicleId)) {
      const [vehicle] = await db.select().from(customerVehiclesTable).where(eq(customerVehiclesTable.id, Number(vehicleId)));
      if (vehicle) {
        targetModelId = vehicle.vehicleModelId;
        targetVehicleType = vehicle.vehicleType || 'Motorcycle';
      }
    } else if (rawModelId && Number(rawModelId)) {
      targetModelId = Number(rawModelId);
      const [model] = await db.select().from(vehicleModelsTable).where(eq(vehicleModelsTable.id, targetModelId));
      if (model) targetVehicleType = model.vehicleType || 'Motorcycle';
    }

    let activeSymptomDbId: number | null = null;
    let identifiedSymptom: any = null;

    if (rawSymptomId) {
      const symptomQuery = String(rawSymptomId);
      const [symptom] = await db
        .select()
        .from(serviceSymptomsTable)
        .where(
          Number.isInteger(Number(symptomQuery))
            ? eq(serviceSymptomsTable.id, Number(symptomQuery))
            : eq(serviceSymptomsTable.symptomId, symptomQuery)
        );
      if (symptom) {
        activeSymptomDbId = symptom.id;
        identifiedSymptom = symptom;
      }
    } else if (description && typeof description === 'string') {
      const text = description.toLowerCase();
      for (const entry of symptomKeywords) {
        if (entry.keywords.some((kw) => text.includes(kw))) {
          const [matched] = await db.select().from(serviceSymptomsTable).where(eq(serviceSymptomsTable.symptomId, entry.id));
          if (matched) {
            activeSymptomDbId = matched.id;
            identifiedSymptom = matched;
            break;
          }
        }
      }
    }

    let recommendedServices: any[] = [];
    let recommendedParts: any[] = [];

    if (activeSymptomDbId) {
      const mappedServices = await db
        .select({
          id: servicesTable.id,
          name: servicesTable.name,
          slug: servicesTable.slug,
          description: servicesTable.description,
          vehicleType: servicesTable.vehicleType,
          typicalDurationMinutes: servicesTable.typicalDurationMinutes,
          estimatedDuration: servicesTable.estimatedDuration,
          startingPrice: servicesTable.startingPrice,
          icon: servicesTable.icon,
          priority: symptomServiceMappingTable.priority,
        })
        .from(symptomServiceMappingTable)
        .innerJoin(servicesTable, eq(symptomServiceMappingTable.serviceId, servicesTable.id))
        .where(and(eq(symptomServiceMappingTable.symptomId, activeSymptomDbId), eq(servicesTable.isActive, true)))
        .orderBy(asc(symptomServiceMappingTable.priority));

      recommendedServices = mappedServices;

      const mappedParts = await db
        .select({
          id: servicePartsTable.id,
          sku: servicePartsTable.sku,
          name: servicePartsTable.name,
          category: servicePartsTable.category,
          subCategory: servicePartsTable.subCategory,
          brand: servicePartsTable.brand,
          partType: servicePartsTable.partType,
          price: servicePartsTable.price,
          availability: servicePartsTable.availability,
          stockQuantity: servicePartsTable.stockQuantity,
          reasoning: symptomPartMappingTable.reasoning,
          priority: symptomPartMappingTable.priority,
        })
        .from(symptomPartMappingTable)
        .innerJoin(servicePartsTable, eq(symptomPartMappingTable.partId, servicePartsTable.id))
        .where(and(eq(symptomPartMappingTable.symptomId, activeSymptomDbId), eq(servicePartsTable.isActive, true)))
        .orderBy(asc(symptomPartMappingTable.priority));

      if (targetModelId) {
        const compat = await db
          .select({
            partId: vehiclePartCompatibilityTable.partId,
            fitmentConfidence: vehiclePartCompatibilityTable.fitmentConfidence,
          })
          .from(vehiclePartCompatibilityTable)
          .where(
            and(
              eq(vehiclePartCompatibilityTable.vehicleModelId, targetModelId),
              eq(vehiclePartCompatibilityTable.isActive, true)
            )
          );
        const compatMap = new Map(compat.map((c) => [c.partId, c.fitmentConfidence]));

        recommendedParts = mappedParts.map((part) => ({
          ...part,
          compatibleWithVehicle: compatMap.has(part.id),
          fitmentConfidence: compatMap.get(part.id) || 'VERIFY_BEFORE_ORDER',
        }));
      } else {
        recommendedParts = mappedParts;
      }
    }

    if (!recommendedServices.length) {
      recommendedServices = await db
        .select()
        .from(servicesTable)
        .where(and(eq(servicesTable.slug, 'general-service'), eq(servicesTable.isActive, true)))
        .limit(1);
    }

    const estimatedLabour = recommendedServices.reduce((sum, s) => sum + Number(s.startingPrice || 0), 0);
    const estimatedParts = recommendedParts.reduce((sum, p) => sum + Number(p.price || 0), 0);
    const totalEstimate = estimatedLabour + estimatedParts;

    return res.json(
      createResponse(true, 'Service recommendations generated', {
        symptom: identifiedSymptom,
        vehicleType: targetVehicleType,
        recommendedServices,
        recommendedParts,
        costEstimate: {
          estimatedLabourCost: estimatedLabour.toFixed(2),
          estimatedPartsCost: estimatedParts.toFixed(2),
          estimatedTotalCost: totalEstimate.toFixed(2),
          currency: 'INR',
        },
      })
    );
  } catch (error: any) {
    return res.status(500).json(createResponse(false, 'Failed to generate recommendations', undefined, 'INTERNAL_ERROR'));
  }
}
