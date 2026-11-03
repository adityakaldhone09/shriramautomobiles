import type { Request, Response } from 'express';
import { invoicesService } from './invoices.service';
import { createResponse } from '../../utils/helpers';
import type { AuthUser } from '../../middleware/auth';

export class InvoicesController {
  async listInvoices(req: Request, res: Response) {
    try {
      const paymentStatus = req.query.paymentStatus as string | undefined;
      const invoiceType = req.query.invoiceType as string | undefined;
      const search = req.query.search as string | undefined;

      const invoices = await invoicesService.listInvoices({ paymentStatus, invoiceType, search });
      return res.json(createResponse(true, 'Invoices fetched', invoices));
    } catch (error: any) {
      return res.status(500).json(createResponse(false, 'Failed to fetch invoices', undefined, 'INTERNAL_ERROR'));
    }
  }

  async getInvoice(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id, 10);
      const invoice = await invoicesService.getInvoiceById(id);
      if (!invoice) {
        return res.status(404).json(createResponse(false, 'Invoice not found', undefined, 'NOT_FOUND'));
      }
      return res.json(createResponse(true, 'Invoice fetched', invoice));
    } catch (error: any) {
      return res.status(500).json(createResponse(false, 'Failed to fetch invoice', undefined, 'INTERNAL_ERROR'));
    }
  }

  async generateFromBooking(req: Request, res: Response) {
    try {
      const { bookingId, discountAmount, paymentMethod, paymentReference, paidAmount, notes } = req.body;
      if (!bookingId) {
        return res.status(400).json(createResponse(false, 'bookingId is required', undefined, 'VALIDATION_ERROR'));
      }

      const invoice = await invoicesService.generateFromBooking({
        bookingId: Number(bookingId),
        discountAmount: discountAmount ? Number(discountAmount) : 0,
        paymentMethod,
        paymentReference,
        paidAmount: paidAmount !== undefined ? Number(paidAmount) : undefined,
        notes,
      });

      return res.status(201).json(createResponse(true, 'Invoice generated successfully', invoice));
    } catch (error: any) {
      return res.status(500).json(createResponse(false, error.message || 'Failed to generate invoice', undefined, 'INTERNAL_ERROR'));
    }
  }

  async createDirectSale(req: Request, res: Response) {
    try {
      const { customerName, customerPhone, customerGstin, items, discountAmount, paymentMethod, paymentReference, notes } = req.body;
      const user = (req as Request & { user?: AuthUser }).user;

      if (!customerName || !customerPhone || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json(createResponse(false, 'Customer details and at least one item are required', undefined, 'VALIDATION_ERROR'));
      }

      const invoice = await invoicesService.createDirectSaleInvoice({
        customerName,
        customerPhone,
        customerGstin,
        items,
        discountAmount: discountAmount ? Number(discountAmount) : 0,
        paymentMethod,
        paymentReference,
        performedByUserId: user?.id,
        notes,
      });

      return res.status(201).json(createResponse(true, 'Direct sale invoice generated successfully', invoice));
    } catch (error: any) {
      if (error.message?.includes('Insufficient stock')) {
        return res.status(400).json(createResponse(false, error.message, undefined, 'INSUFFICIENT_STOCK'));
      }
      return res.status(500).json(createResponse(false, error.message || 'Failed to create sale invoice', undefined, 'INTERNAL_ERROR'));
    }
  }

  async recordPayment(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id, 10);
      const { paidAmount, paymentMethod = 'CASH', paymentReference } = req.body;

      if (paidAmount === undefined || Number(paidAmount) <= 0) {
        return res.status(400).json(createResponse(false, 'A valid positive paidAmount is required', undefined, 'VALIDATION_ERROR'));
      }

      const updated = await invoicesService.recordPayment(id, {
        paidAmount: Number(paidAmount),
        paymentMethod,
        paymentReference,
      });

      return res.json(createResponse(true, 'Payment recorded successfully', updated));
    } catch (error: any) {
      return res.status(500).json(createResponse(false, error.message || 'Failed to record payment', undefined, 'INTERNAL_ERROR'));
    }
  }
}

export const invoicesController = new InvoicesController();
