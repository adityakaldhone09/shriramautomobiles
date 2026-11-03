import type { Request, Response } from 'express';
import { aiService } from './ai.service';
import { createResponse } from '../../utils/helpers';

export class AiController {
  async getHealth(_req: Request, res: Response) {
    return res.json(
      createResponse(true, 'AI Engine operational', {
        modules: [
          'Module 1: Vehicle Maintenance Recommendation',
          'Module 2: AI Spare-Part Recommendation',
          'Module 3: Predictive Maintenance & Mileage Thresholds',
          'Module 4: Inventory Demand Forecasting',
          'Module 5: Customer Intelligence & Retention Analytics',
        ],
        timestamp: new Date().toISOString(),
      })
    );
  }

  async recommendMaintenance(req: Request, res: Response) {
    try {
      const { brand, model, mileage, year, customerReportedProblem, previousServiceHistory, partsReplaced } = req.body;

      if (!brand || !model || mileage === undefined) {
        return res
          .status(400)
          .json(createResponse(false, 'Missing required fields: brand, model, and mileage are mandatory', undefined, 'BAD_REQUEST'));
      }

      const result = await aiService.recommendMaintenance({
        brand: String(brand),
        model: String(model),
        mileage: Number(mileage),
        year: year ? Number(year) : undefined,
        customerReportedProblem: customerReportedProblem ? String(customerReportedProblem) : undefined,
        previousServiceHistory,
        partsReplaced,
      });

      return res.json(createResponse(true, 'AI maintenance recommendations generated', result));
    } catch (error: any) {
      return res.status(500).json(createResponse(false, error.message || 'Failed to generate recommendations', undefined, 'INTERNAL_ERROR'));
    }
  }

  async recommendParts(req: Request, res: Response) {
    try {
      const { modelSlug, serviceCategory, symptomKeywords, previouslyReplacedParts } = req.body;

      if (!modelSlug) {
        return res
          .status(400)
          .json(createResponse(false, 'Missing required field: modelSlug is mandatory', undefined, 'BAD_REQUEST'));
      }

      const result = await aiService.recommendParts({
        modelSlug: String(modelSlug),
        serviceCategory: serviceCategory ? String(serviceCategory) : undefined,
        symptomKeywords,
        previouslyReplacedParts,
      });

      return res.json(createResponse(true, 'AI spare parts recommendations generated', result));
    } catch (error: any) {
      return res.status(500).json(createResponse(false, error.message || 'Failed to recommend spare parts', undefined, 'INTERNAL_ERROR'));
    }
  }

  async predictMaintenance(req: Request, res: Response) {
    try {
      const { model, currentMileage, lastServiceMileage, lastServiceDate, avgMonthlyKm } = req.body;

      if (!model || currentMileage === undefined) {
        return res
          .status(400)
          .json(createResponse(false, 'Missing required fields: model and currentMileage are mandatory', undefined, 'BAD_REQUEST'));
      }

      const result = await aiService.predictMaintenance({
        model: String(model),
        currentMileage: Number(currentMileage),
        lastServiceMileage: lastServiceMileage !== undefined ? Number(lastServiceMileage) : undefined,
        lastServiceDate: lastServiceDate ? String(lastServiceDate) : undefined,
        avgMonthlyKm: avgMonthlyKm ? Number(avgMonthlyKm) : undefined,
      });

      return res.json(createResponse(true, 'Predictive maintenance assessment generated', result));
    } catch (error: any) {
      return res.status(500).json(createResponse(false, error.message || 'Failed to calculate predictive maintenance', undefined, 'INTERNAL_ERROR'));
    }
  }

  async forecastInventory(_req: Request, res: Response) {
    try {
      const result = await aiService.forecastInventory();
      return res.json(createResponse(true, 'Inventory demand forecast calculated', result));
    } catch (error: any) {
      return res.status(500).json(createResponse(false, error.message || 'Failed to forecast inventory', undefined, 'INTERNAL_ERROR'));
    }
  }

  async analyzeCustomerIntelligence(_req: Request, res: Response) {
    try {
      const result = await aiService.analyzeCustomerIntelligence();
      return res.json(createResponse(true, 'Customer intelligence analysis calculated', result));
    } catch (error: any) {
      return res.status(500).json(createResponse(false, error.message || 'Failed to analyze customer intelligence', undefined, 'INTERNAL_ERROR'));
    }
  }
}

export const aiController = new AiController();
