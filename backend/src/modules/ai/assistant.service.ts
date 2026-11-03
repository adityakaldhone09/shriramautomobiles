import { and, desc, eq, inArray, lte } from 'drizzle-orm';
import { db } from '../../db/client';
import {
  customersTable,
  invoicesTable,
  invoiceItemsTable,
  mechanicsTable,
  serviceBookingsTable,
  servicePartsTable,
  inventoryMovementsTable,
} from '../../db/schema';
import { aiService } from './ai.service';

export interface AssistantToolResult {
  toolName: string;
  data: any;
  summary: string;
}

export class AssistantService {
  /**
   * Tool 1: Revenue & Financials
   */
  async getRevenueReport() {
    const allInvoices = await db.select().from(invoicesTable);
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const monthInvoices = allInvoices.filter((i) => i.createdAt && new Date(i.createdAt) >= startOfMonth);
    const todayInvoices = allInvoices.filter((i) => i.createdAt && new Date(i.createdAt) >= startOfToday);

    const monthlyRevenue = monthInvoices.reduce((sum, i) => sum + Number(i.totalAmount || 0), 0);
    const dailySales = todayInvoices.reduce((sum, i) => sum + Number(i.totalAmount || 0), 0);
    const labourRevenue = monthInvoices.reduce((sum, i) => sum + Number(i.labourTotal || 0), 0);
    const partsRevenue = monthInvoices.reduce((sum, i) => sum + Number(i.partsTotal || 0), 0);
    const cgst = monthInvoices.reduce((sum, i) => sum + Number(i.cgstAmount || 0), 0);
    const sgst = monthInvoices.reduce((sum, i) => sum + Number(i.sgstAmount || 0), 0);

    const outstanding = allInvoices
      .filter((i) => ['PENDING', 'PARTIAL'].includes(i.paymentStatus))
      .reduce((sum, i) => sum + Math.max(0, Number(i.totalAmount || 0) - Number(i.paidAmount || 0)), 0);

    return {
      timeframe: 'Current Calendar Month',
      monthlyRevenue: Number(monthlyRevenue.toFixed(2)),
      dailySales: Number(dailySales.toFixed(2)),
      labourRevenue: Number(labourRevenue.toFixed(2)),
      partsRevenue: Number(partsRevenue.toFixed(2)),
      cgstCollected: Number(cgst.toFixed(2)),
      sgstCollected: Number(sgst.toFixed(2)),
      outstandingPayments: Number(outstanding.toFixed(2)),
      totalInvoicesMonth: monthInvoices.length,
    };
  }

  /**
   * Tool 2: Low-Stock Inventory Inspection
   */
  async getLowStockParts() {
    const allParts = await db.select().from(servicePartsTable).where(eq(servicePartsTable.isActive, true));
    const lowStock = allParts
      .filter((p) => Number(p.stockQuantity || 0) <= Number(p.lowStockThreshold || 5))
      .map((p) => ({
        id: p.id,
        sku: p.sku,
        name: p.name,
        category: p.category,
        currentStock: Number(p.stockQuantity || 0),
        minimumThreshold: Number(p.lowStockThreshold || 5),
        deficit: Math.max(0, Number(p.lowStockThreshold || 5) - Number(p.stockQuantity || 0)),
      }))
      .sort((a, b) => a.currentStock - b.currentStock);

    return {
      totalLowStockCount: lowStock.length,
      parts: lowStock,
    };
  }

  /**
   * Tool 3: Active & Pending Service Bookings
   */
  async getPendingServices() {
    const allBookings = await db.select().from(serviceBookingsTable);
    const active = allBookings.filter((b) => ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS'].includes(b.status));

    const breakdown = {
      pending: active.filter((b) => b.status === 'PENDING').length,
      confirmed: active.filter((b) => b.status === 'CONFIRMED').length,
      checkedIn: active.filter((b) => b.status === 'CHECKED_IN').length,
      inProgress: active.filter((b) => b.status === 'IN_PROGRESS').length,
    };

    return {
      totalActiveServices: active.length,
      statusBreakdown: breakdown,
      recentActiveBookings: active.slice(0, 8).map((b) => ({
        bookingNumber: b.bookingNumber,
        status: b.status,
        appointmentDate: b.appointmentDate,
        timeSlot: b.timeSlot,
        assignedMechanicId: b.assignedMechanicId,
      })),
    };
  }

  /**
   * Tool 4: Mechanic Workloads & Bay Utilization
   */
  async getMechanicWorkloads() {
    const mechanics = await db.select().from(mechanicsTable).where(eq(mechanicsTable.isAvailable, true));
    const bookings = await db.select().from(serviceBookingsTable);

    const activeBookings = bookings.filter((b) => ['CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS'].includes(b.status));
    const completedBookings = bookings.filter((b) => ['COMPLETED', 'DELIVERED'].includes(b.status));

    const workloads = mechanics.map((m) => {
      const activeCount = activeBookings.filter((b) => b.assignedMechanicId === m.id).length;
      const completedCount = completedBookings.filter((b) => b.assignedMechanicId === m.id).length;
      return {
        id: m.id,
        name: m.name,
        specialization: m.specialization,
        activeJobsCount: activeCount,
        completedJobsCount: completedCount,
        bayStatus: activeCount >= 4 ? 'OVERLOADED' : activeCount > 0 ? 'ACTIVE' : 'AVAILABLE',
      };
    });

    workloads.sort((a, b) => b.activeJobsCount - a.activeJobsCount);

    return {
      totalMechanics: mechanics.length,
      busiestMechanic: workloads[0] || null,
      mechanicWorkloads: workloads,
    };
  }

  /**
   * Tool 5: Top Selling Products & High-Velocity Parts
   */
  async getTopSellingProducts() {
    const items = await db.select().from(invoiceItemsTable);
    const parts = await db.select().from(servicePartsTable);

    const partMap = new Map(parts.map((p) => [p.id, p]));
    const velocityMap: Record<number, { qty: number; revenue: number }> = {};

    for (const item of items) {
      if (item.partId) {
        const prev = velocityMap[item.partId] || { qty: 0, revenue: 0 };
        velocityMap[item.partId] = {
          qty: prev.qty + Number(item.quantity || 0),
          revenue: prev.revenue + Number(item.totalPrice || 0),
        };
      }
    }

    const ranked = Object.entries(velocityMap)
      .map(([partIdStr, metrics]) => {
        const part = partMap.get(Number(partIdStr));
        return {
          partId: Number(partIdStr),
          name: part?.name || 'Automotive Spare Part',
          sku: part?.sku || 'UNKNOWN',
          unitsSold: metrics.qty,
          totalRevenue: Number(metrics.revenue.toFixed(2)),
        };
      })
      .sort((a, b) => b.unitsSold - a.unitsSold);

    return {
      topProducts: ranked.slice(0, 10),
    };
  }

  /**
   * Tool 6: Customers Due for Periodic Servicing
   */
  async getDueServiceCustomers() {
    const customers = await db.select().from(customersTable);
    const bookings = await db.select().from(serviceBookingsTable);
    const now = new Date();

    const dueList: any[] = [];
    for (const c of customers) {
      const cBookings = bookings.filter((b) => b.customerId === c.id);
      let daysSince = 999;
      if (cBookings.length > 0) {
        const sorted = [...cBookings].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        if (sorted[0].createdAt) {
          daysSince = Math.floor((now.getTime() - new Date(sorted[0].createdAt).getTime()) / (1000 * 60 * 60 * 24));
        }
      }

      if (daysSince >= 90) {
        dueList.push({
          customerId: c.id,
          name: c.name,
          phone: c.phone,
          daysSinceLastService: daysSince === 999 ? 'No previous service recorded' : daysSince,
          outreachPriority: daysSince > 180 ? 'HIGH' : 'MEDIUM',
        });
      }
    }

    return {
      totalDueCustomers: dueList.length,
      dueCustomers: dueList.slice(0, 15),
    };
  }

  /**
   * Tool 7: Upcoming Purchase & Procurement Requirements
   */
  async getUpcomingPurchaseRequirements() {
    const forecast = await aiService.forecastInventory();
    const criticalOrHigh = forecast.forecasts.filter((f: any) => ['CRITICAL', 'HIGH'].includes(f.stockout_risk));

    return {
      urgentProcurementItemsCount: criticalOrHigh.length,
      procurementList: criticalOrHigh.map((item: any) => ({
        partId: item.part_id,
        sku: item.sku,
        name: item.name,
        currentStock: item.current_stock,
        recommendedReorderQty: item.recommended_reorder_qty,
        daysUntilStockout: item.days_until_stockout,
        risk: item.stockout_risk,
      })),
    };
  }

  /**
   * Main Assistant Orchestration:
   * Translates natural language questions (EN / HI / MR) into authenticated tool calls,
   * extracts verified database facts, and produces a structured, transparent response.
   */
  async askAssistant(question: string) {
    const q = question.toLowerCase();
    const executedTools: AssistantToolResult[] = [];
    let responseText = '';

    // Route 1: Revenue & Financials
    if (
      q.includes('revenue') ||
      q.includes('sales') ||
      q.includes('earnings') ||
      q.includes('income') ||
      q.includes('महसूल') ||
      q.includes('विक्री') ||
      q.includes('कमाई')
    ) {
      const data = await this.getRevenueReport();
      executedTools.push({ toolName: 'getRevenueReport', data, summary: `Queried real-time invoices for current month.` });
      responseText = `📊 **Financial & Revenue Summary (चालू महिना):**\n- **Monthly Revenue:** ₹${data.monthlyRevenue.toLocaleString('en-IN')}\n- **Today's Sales:** ₹${data.dailySales.toLocaleString('en-IN')}\n- **Labour Revenue:** ₹${data.labourRevenue.toLocaleString('en-IN')} | **Spare Parts Revenue:** ₹${data.partsRevenue.toLocaleString('en-IN')}\n- **GST Collected:** ₹${(data.cgstCollected + data.sgstCollected).toLocaleString('en-IN')} (CGST 9% + SGST 9%)\n- **Outstanding Balance:** ₹${data.outstandingPayments.toLocaleString('en-IN')} across ${data.totalInvoicesMonth} invoices.`;
    }
    // Route 2: Low-Stock Inventory
    else if (
      q.includes('low stock') ||
      q.includes('stock running') ||
      q.includes('inventory') ||
      q.includes('spare parts') ||
      q.includes('स्टॉक') ||
      q.includes('कमी माल') ||
      q.includes('पार्ट्स')
    ) {
      const data = await this.getLowStockParts();
      executedTools.push({ toolName: 'getLowStockParts', data, summary: `Scanned inventory for stock below threshold.` });
      const itemsList = data.parts.slice(0, 5).map((p) => `• ${p.name} (${p.sku}): **${p.currentStock} units** (Min: ${p.minimumThreshold})`).join('\n');
      responseText = `⚠️ **Inventory Alert (कमी स्टॉक असलेले स्पेअर पार्ट्स):**\nThere are **${data.totalLowStockCount} items** currently at or below minimum threshold:\n${itemsList || 'All parts currently have healthy stock levels.'}`;
    }
    // Route 3: Pending & Active Services
    else if (
      q.includes('pending') ||
      q.includes('booking') ||
      q.includes('service') ||
      q.includes('प्रलंबित') ||
      q.includes('बुकिंग') ||
      q.includes('सेवा')
    ) {
      const data = await this.getPendingServices();
      executedTools.push({ toolName: 'getPendingServices', data, summary: `Fetched active workshop service job cards.` });
      responseText = `📋 **Workshop Service Pipeline (सध्याच्या सर्व्हिस ऑपरेशन्स):**\n- **Total Active Service Jobs:** ${data.totalActiveServices}\n- **Pending Confirmation:** ${data.statusBreakdown.pending}\n- **Confirmed / Assigned:** ${data.statusBreakdown.confirmed}\n- **Checked-In / Inspection:** ${data.statusBreakdown.checkedIn}\n- **In-Progress on Lift:** ${data.statusBreakdown.inProgress}`;
    }
    // Route 4: Mechanic Workload
    else if (
      q.includes('mechanic') ||
      q.includes('technician') ||
      q.includes('workload') ||
      q.includes('busy') ||
      q.includes('मेकॅनिक') ||
      q.includes('कामगार') ||
      q.includes('व्यस्त')
    ) {
      const data = await this.getMechanicWorkloads();
      executedTools.push({ toolName: 'getMechanicWorkloads', data, summary: `Evaluated technician bay assignments and workloads.` });
      const busiest = data.busiestMechanic ? `${data.busiestMechanic.name} (${data.busiestMechanic.activeJobsCount} active jobs)` : 'No active assignments';
      const breakdown = data.mechanicWorkloads.map((m) => `• ${m.name} [${m.specialization}]: ${m.activeJobsCount} active jobs, ${m.completedJobsCount} completed (${m.bayStatus})`).join('\n');
      responseText = `🔧 **Mechanic Bay Workload (तंत्रज्ञ कामाचा भार):**\n- **Highest Active Workload:** **${busiest}**\n- **Technician Status Matrix:**\n${breakdown}`;
    }
    // Route 5: Due Service Customers
    else if (
      q.includes('due') ||
      q.includes('customer') ||
      q.includes('servicing') ||
      q.includes('ग्राहक') ||
      q.includes('स्मरणपत्र')
    ) {
      const data = await this.getDueServiceCustomers();
      executedTools.push({ toolName: 'getDueServiceCustomers', data, summary: `Filtered customers with >90 days since last service.` });
      const custList = data.dueCustomers.slice(0, 5).map((c) => `• ${c.name} (${c.phone}): ${c.daysSinceLastService} days ago [${c.outreachPriority}]`).join('\n');
      responseText = `👥 **Customer Service Due Intelligence (सर्व्हिस बाकी असलेले ग्राहक):**\nIdentified **${data.totalDueCustomers} customers** due for periodic maintenance (>90 days):\n${custList}`;
    }
    // Route 6: Upcoming Procurement Needs
    else if (
      q.includes('purchase') ||
      q.includes('procurement') ||
      q.includes('reorder') ||
      q.includes('खरेदी') ||
      q.includes('मागणी')
    ) {
      const data = await this.getUpcomingPurchaseRequirements();
      executedTools.push({ toolName: 'getUpcomingPurchaseRequirements', data, summary: `Computed ROP and demand forecasting requirements.` });
      const procList = data.procurementList.slice(0, 5).map((p: any) => `• ${p.name}: Reorder **${p.recommendedReorderQty} units** (${p.daysUntilStockout} days until stockout)`).join('\n');
      responseText = `📦 **Upcoming Procurement Requirements (खरेदी आवश्यकता):**\nFound **${data.urgentProcurementItemsCount} critical/high risk items** requiring purchase orders:\n${procList || 'No critical purchase orders urgently required.'}`;
    }
    // Default comprehensive overview tool invocation
    else {
      const rev = await this.getRevenueReport();
      const pending = await this.getPendingServices();
      const low = await this.getLowStockParts();
      executedTools.push(
        { toolName: 'getRevenueReport', data: rev, summary: 'Overview financial status' },
        { toolName: 'getPendingServices', data: pending, summary: 'Overview service queue' },
        { toolName: 'getLowStockParts', data: low, summary: 'Overview stock alerts' }
      );
      responseText = `🤖 **Shriram Automobiles Workshop Assistant (कार्यशाळा मदतनीस):**\nHere is your current operational snapshot:\n- **Monthly Revenue:** ₹${rev.monthlyRevenue.toLocaleString('en-IN')}\n- **Active Services in Workshop:** ${pending.totalActiveServices}\n- **Low Stock Inventory Items:** ${low.totalLowStockCount}\n\nYou can ask me specific questions like:\n• *"How much revenue did we generate this month?"*\n• *"Which spare parts are running low?"*\n• *"Which mechanic has the highest workload?"*\n• *"Which customers are due for servicing?"*`;
    }

    return {
      query: question,
      response: responseText,
      executedTools,
      timestamp: new Date().toISOString(),
      disclaimer: 'Generated from real-time database records. Financial or stock-altering actions require manual staff confirmation.',
    };
  }
}

export const assistantService = new AssistantService();
