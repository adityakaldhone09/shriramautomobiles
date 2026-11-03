import type { Request, Response } from 'express';
import { analyticsService } from './analytics.service';
import { createResponse } from '../../utils/helpers';

export class AnalyticsController {
  async getSummary(req: Request, res: Response) {
    try {
      const summary = await analyticsService.getSummaryMetrics();
      return res.json(createResponse(true, 'Executive analytics summary fetched', summary));
    } catch (error: any) {
      return res.status(500).json(createResponse(false, 'Failed to fetch analytics summary', undefined, 'INTERNAL_ERROR'));
    }
  }

  async getTrends(req: Request, res: Response) {
    try {
      const months = req.query.months ? Math.min(12, Math.max(1, Number(req.query.months))) : 6;
      const trends = await analyticsService.getMonthlyTrends(months);
      return res.json(createResponse(true, 'Monthly trends fetched', trends));
    } catch (error: any) {
      return res.status(500).json(createResponse(false, 'Failed to fetch monthly trends', undefined, 'INTERNAL_ERROR'));
    }
  }

  async exportCsv(_req: Request, res: Response) {
    try {
      const csv = await analyticsService.exportReportCsv();
      const filename = `shriram_automobiles_report_${new Date().toISOString().slice(0, 10)}.csv`;

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(csv);
    } catch (error: any) {
      return res.status(500).json(createResponse(false, 'Failed to generate report export', undefined, 'INTERNAL_ERROR'));
    }
  }
}

export const analyticsController = new AnalyticsController();
