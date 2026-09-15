import type { Request, Response } from 'express';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { db } from '../lib/db';
import {
  customerVehiclesTable,
  servicePartsTable,
  servicesTable,
  serviceSymptomsTable,
  symptomPartMappingTable,
  symptomServiceMappingTable,
  vehicleModelsTable,
  vehiclePartCompatibilityTable,
} from '@workspace/db/schema';
import { createResponse } from '../utils/helpers';

// Helper to determine symptom keywords for optional natural language query interpretation
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
    console.error('Error fetching symptoms:', error);
    return res.status(500).json(createResponse(false, 'Failed to fetch symptoms', undefined, 'INTERNAL_ERROR'));
  }
}

export async function getRecommendations(req: Request, res: Response) {
  try {
    const { vehicleId, vehicleModelId: rawModelId, symptomId: rawSymptomId, description } = req.query;

    let targetModelId: number | null = null;
    let targetVehicleType = 'Motorcycle';
    let targetModelName = '';

    // 1. Resolve vehicle model
    if (rawModelId && !Number.isNaN(Number(rawModelId))) {
      targetModelId = Number(rawModelId);
    } else if (vehicleId && !Number.isNaN(Number(vehicleId))) {
      const [vehicle] = await db
        .select()
        .from(customerVehiclesTable)
        .where(eq(customerVehiclesTable.id, Number(vehicleId)));
      if (vehicle) {
        targetModelId = vehicle.vehicleModelId || null;
        targetVehicleType = vehicle.vehicleType || 'Motorcycle';
        targetModelName = `${vehicle.brand} ${vehicle.model}`;
      }
    }

    if (targetModelId) {
      const [model] = await db.select().from(vehicleModelsTable).where(eq(vehicleModelsTable.id, targetModelId));
      if (model) {
        targetVehicleType = model.vehicleType;
        targetModelName = model.name;
      }
    }

    // 2. Resolve symptom(s)
    let resolvedSymptomIds: number[] = [];
    if (rawSymptomId) {
      const symptomQuery = String(rawSymptomId);
      const isNumeric = !Number.isNaN(Number(symptomQuery));
      const [found] = await db
        .select()
        .from(serviceSymptomsTable)
        .where(
          isNumeric
            ? eq(serviceSymptomsTable.id, Number(symptomQuery))
            : eq(serviceSymptomsTable.symptomId, symptomQuery)
        );
      if (found) {
        resolvedSymptomIds.push(found.id);
      }
    }

    // 3. If description is provided and no symptom or additional symptoms to detect
    if (description && typeof description === 'string') {
      const lower = description.toLowerCase();
      for (const map of symptomKeywords) {
        if (map.keywords.some((kw) => lower.includes(kw))) {
          const [match] = await db
            .select()
            .from(serviceSymptomsTable)
            .where(eq(serviceSymptomsTable.symptomId, map.id));
          if (match && !resolvedSymptomIds.includes(match.id)) {
            resolvedSymptomIds.push(match.id);
          }
        }
      }
    }

    // Fallback to general service if nothing resolved
    if (resolvedSymptomIds.length === 0) {
      const [gen] = await db
        .select()
        .from(serviceSymptomsTable)
        .where(eq(serviceSymptomsTable.symptomId, 'symp-general-service'));
      if (gen) resolvedSymptomIds.push(gen.id);
    }

    // 4. Retrieve mapped services
    const serviceMappings = await db
      .select({
        service: servicesTable,
        priority: symptomServiceMappingTable.priority,
      })
      .from(symptomServiceMappingTable)
      .innerJoin(servicesTable, eq(symptomServiceMappingTable.serviceId, servicesTable.id))
      .where(
        and(
          inArray(symptomServiceMappingTable.symptomId, resolvedSymptomIds),
          eq(servicesTable.isActive, true)
        )
      )
      .orderBy(asc(symptomServiceMappingTable.priority));

    // Filter services by vehicle type (e.g. Scooter CVT Service only for scooters, Chain & Sprocket for motorcycles)
    const isScooter = /scooter|activa|dio|jupiter|access|ntorq|chetak/i.test(targetVehicleType + ' ' + targetModelName);
    const filteredServices = serviceMappings
      .map((entry) => entry.service)
      .filter((svc) => {
        if (isScooter && svc.slug === 'chain-sprocket-service') return false;
        if (!isScooter && svc.slug === 'scooter-cvt-service') return false;
        return true;
      });

    // Remove duplicates
    const uniqueServices = Array.from(new Map(filteredServices.map((s) => [s.id, s])).values());

    // 5. Intersect symptom-part mappings with vehicle compatibility
    // Fetch all parts mapped to the resolved symptoms
    const symptomParts = await db
      .select({
        part: servicePartsTable,
        priority: symptomPartMappingTable.priority,
        reasoning: symptomPartMappingTable.reasoning,
      })
      .from(symptomPartMappingTable)
      .innerJoin(servicePartsTable, eq(symptomPartMappingTable.partId, servicePartsTable.id))
      .where(
        and(
          inArray(symptomPartMappingTable.symptomId, resolvedSymptomIds),
          eq(servicePartsTable.isActive, true)
        )
      );

    // Fetch compatibility for this vehicle model if known
    let modelCompatibilities: Array<{ partId: number; fitmentConfidence: string; notes: string | null }> = [];
    if (targetModelId) {
      modelCompatibilities = await db
        .select({
          partId: vehiclePartCompatibilityTable.partId,
          fitmentConfidence: vehiclePartCompatibilityTable.fitmentConfidence,
          notes: vehiclePartCompatibilityTable.notes,
        })
        .from(vehiclePartCompatibilityTable)
        .where(
          and(
            eq(vehiclePartCompatibilityTable.vehicleModelId, targetModelId),
            eq(vehiclePartCompatibilityTable.isActive, true)
          )
        );
    }

    const compatMap = new Map(modelCompatibilities.map((c) => [c.partId, c]));

    // Rank & Filter likely parts
    const likelyParts: any[] = [];
    const seenPartSkus = new Set<string>();

    for (const sp of symptomParts) {
      const { part, priority, reasoning } = sp;
      if (seenPartSkus.has(part.sku)) continue;

      // Strict physical vehicle type compatibility filter:
      if (isScooter) {
        // Scooters do NOT have chain sprockets or manual clutch cables/plates
        if (['PART-CHN-SPRK-SET', 'PART-CLT-PLT-SET', 'PART-CLT-CBL', 'PART-LVR-CLT', 'PART-TYR-F-27518', 'PART-TYR-R-30018'].includes(part.sku)) {
          continue;
        }
      } else {
        // Motorcycles do NOT have CVT drive belts or CVT rollers or scooter filters
        if (['PART-CVT-BLT', 'PART-CVT-RLR-SET', 'PART-CVT-FLT', 'PART-AIR-FLT-SCOOT', 'PART-TYR-F-9090', 'PART-TYR-R-9090'].includes(part.sku)) {
          continue;
        }
      }

      const compat = compatMap.get(part.id);
      let fitmentConfidence = compat ? compat.fitmentConfidence : 'VERIFY_BEFORE_ORDER';
      let confidenceNote = compat?.notes || null;

      if (!compat && targetModelId) {
        // If not explicitly mapped for this model, mark as verify before order
        fitmentConfidence = 'VERIFY_BEFORE_ORDER';
        confidenceNote = 'Compatibility will be confirmed by our mechanic.';
      }

      if (fitmentConfidence === 'VARIANT_DEPENDENT') {
        confidenceNote = confidenceNote || 'Compatibility will be confirmed by our mechanic.';
      }

      seenPartSkus.add(part.sku);
      likelyParts.push({
        id: part.id,
        sku: part.sku,
        name: part.name,
        category: part.category,
        subCategory: part.subCategory,
        partType: part.partType,
        price: part.price,
        stockQuantity: part.stockQuantity,
        availability: part.availability,
        fitmentConfidence,
        confidenceNote,
        reasoning: reasoning || 'Recommended for diagnostic inspection based on reported symptom',
        priority,
      });
    }

    // Sort parts: Priority > In Stock
    likelyParts.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      if (a.fitmentConfidence === 'MODEL_SPECIFIC' && b.fitmentConfidence !== 'MODEL_SPECIFIC') return -1;
      return 0;
    });

    const servicesList = uniqueServices.map((s) => ({
      id: s.id,
      serviceId: s.id,
      name: s.name,
      slug: s.slug,
      description: s.description,
      duration: s.estimatedDuration,
      startingPrice: s.startingPrice,
      reason: `Targeted service designed to diagnose and resolve reported vehicle symptoms`,
    }));

    return res.json(
      createResponse(true, 'Recommendations generated', {
        vehicle: {
          modelId: targetModelId,
          modelName: targetModelName,
          vehicleType: targetVehicleType,
          isScooter,
        },
        symptomsResolved: resolvedSymptomIds,
        services: servicesList,
        recommendedServices: servicesList,
        parts: likelyParts,
        likelyPartsChecks: likelyParts,
        disclaimer: 'Final replacement parts will be confirmed after inspection.',
      })
    );
  } catch (error: any) {
    console.error('Error generating recommendations:', error);
    return res.status(500).json(createResponse(false, 'Failed to generate recommendations', undefined, 'INTERNAL_ERROR'));
  }
}

// POST /api/ai/diagnose-symptoms
// Converts free-text natural language complaints into structured symptoms
export async function diagnoseSymptoms(req: Request, res: Response) {
  try {
    const { complaint } = req.body;
    if (!complaint || typeof complaint !== 'string') {
      return res.status(400).json(createResponse(false, 'Complaint text is required', undefined, 'VALIDATION_ERROR'));
    }

    const lower = complaint.toLowerCase();
    const matchedSymptomIds: string[] = [];

    for (const map of symptomKeywords) {
      if (map.keywords.some((kw) => lower.includes(kw))) {
        matchedSymptomIds.push(map.id);
      }
    }

    if (matchedSymptomIds.length === 0) {
      matchedSymptomIds.push('symp-general-service');
    }

    const symptoms = await db
      .select()
      .from(serviceSymptomsTable)
      .where(inArray(serviceSymptomsTable.symptomId, matchedSymptomIds));

    return res.json(
      createResponse(true, 'Symptoms extracted', {
        complaint,
        structuredSymptoms: symptoms,
        symptom: symptoms[0] || null,
        confidence: symptoms.length > 0 ? 0.95 : 0.5,
        reasoning: symptoms.length > 0
          ? `Identified key match "${symptoms[0].symptom}" from customer complaint description.`
          : 'Referred to standard inspection based on general inquiry.',
      })
    );
  } catch (error: any) {
    console.error('Error in diagnoseSymptoms:', error);
    return res.status(500).json(createResponse(false, 'Failed to diagnose symptoms', undefined, 'INTERNAL_ERROR'));
  }
}
