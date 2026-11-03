import { eq, desc, and, sql, gte } from 'drizzle-orm';
import { db } from '../../db/client';
import { invoicesTable, invoiceItemsTable } from '../../db/schema/invoices';
import { serviceBookingsTable, serviceJobCardsTable, jobCardPartsTable } from '../../db/schema/bookings';
import { servicePartsTable } from '../../db/schema/parts';
import { inventoryMovementsTable } from '../../db/schema/inventory';
import { mechanicsTable } from '../../db/schema/mechanics';
import { customersTable } from '../../db/schema/customers';
import { customerVehiclesTable } from '../../db/schema/vehicles';

export class AnalyticsService {
  async getSummaryMetrics() {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [allInvoices, allBookings, allJobCards, allParts, allMovements, allMechanics, allCustomers, allVehicles] = await Promise.all([
      db.select().from(invoicesTable),
      db.select().from(serviceBookingsTable),
      db.select().from(serviceJobCardsTable),
      db.select().from(servicePartsTable),
      db.select().from(inventoryMovementsTable),
      db.select().from(mechanicsTable),
      db.select().from(customersTable),
      db.select().from(customerVehiclesTable),
    ]);

    // Financial calculations
    const todayInvoices = allInvoices.filter((inv) => inv.createdAt && new Date(inv.createdAt) >= startOfToday);
    const dailySales = todayInvoices.reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0);

    const monthInvoices = allInvoices.filter((inv) => inv.createdAt && new Date(inv.createdAt) >= startOfMonth);
    const monthlyRevenue = monthInvoices.reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0);

    const outstandingPayments = allInvoices
      .filter((inv) => ['PENDING', 'PARTIAL'].includes(inv.paymentStatus))
      .reduce((sum, inv) => {
        const total = Number(inv.totalAmount || 0);
        const paid = Number(inv.paidAmount || 0);
        return sum + Math.max(0, total - paid);
      }, 0);

    const labourRevenue = allInvoices.reduce((sum, inv) => sum + Number(inv.labourTotal || 0), 0);
    const partsRevenue = allInvoices.reduce((sum, inv) => sum + Number(inv.partsTotal || 0), 0);
    const cgstCollected = allInvoices.reduce((sum, inv) => sum + Number(inv.cgstAmount || 0), 0);
    const sgstCollected = allInvoices.reduce((sum, inv) => sum + Number(inv.sgstAmount || 0), 0);
    const totalRevenueAllTime = allInvoices.reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0);

    // Service operations metrics
    const nonCancelledBookings = allBookings.filter((b) => b.status !== 'CANCELLED');
    const completedBookings = nonCancelledBookings.filter((b) => ['COMPLETED', 'DELIVERED'].includes(b.status));
    const serviceCompletionRate = nonCancelledBookings.length > 0
      ? Number(((completedBookings.length / nonCancelledBookings.length) * 100).toFixed(1))
      : 100.0;

    // Turnaround time calculation in hours
    const completedCardsWithDates = allJobCards.filter((c) => c.startedAt && c.completedAt);
    let avgTurnaroundHours = 2.5; // fallback industry standard default
    if (completedCardsWithDates.length > 0) {
      const totalHours = completedCardsWithDates.reduce((sum, c) => {
        const diffMs = new Date(c.completedAt!).getTime() - new Date(c.startedAt!).getTime();
        return sum + Math.max(0.5, diffMs / (1000 * 60 * 60));
      }, 0);
      avgTurnaroundHours = Number((totalHours / completedCardsWithDates.length).toFixed(1));
    }

    // Vehicle Brand Distribution
    const vehicleMap = new Map(allVehicles.map((v) => [v.id, v.brand]));
    const brandCounts: Record<string, number> = {};
    for (const b of allBookings) {
      const brand = ((b.customerVehicleId ? vehicleMap.get(b.customerVehicleId) : null) || (b as any).vehicleBrand || 'Hero').trim();
      brandCounts[brand] = (brandCounts[brand] || 0) + 1;
    }
    const brandDistribution = Object.entries(brandCounts)
      .map(([brand, count]) => ({
        brand,
        count,
        percentage: Number(((count / (allBookings.length || 1)) * 100).toFixed(1)),
      }))
      .sort((a, b) => b.count - a.count);

    // Service Category Distribution
    const categoryCounts: Record<string, number> = {};
    for (const b of allBookings) {
      const cat = String((b as any).serviceType || 'GENERAL_SERVICE').trim();
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    }
    const categoryDistribution = Object.entries(categoryCounts).map(([category, count]) => ({
      category,
      count,
    }));

    // Inventory Depletion Velocity (last 30 days)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const recentOutMovements = allMovements.filter(
      (m) => m.createdAt && new Date(m.createdAt) >= thirtyDaysAgo && ['OUT', 'JOB_CARD', 'SALE'].includes(m.movementType)
    );

    const partConsumptionMap: Record<number, number> = {};
    for (const m of recentOutMovements) {
      if (m.partId) {
        partConsumptionMap[m.partId] = (partConsumptionMap[m.partId] || 0) + Math.abs(Number(m.quantity || 0));
      }
    }

    const inventoryVelocity = allParts.map((p) => {
      const unitsConsumed30d = partConsumptionMap[p.id] || 0;
      const dailyConsumption = Number((unitsConsumed30d / 30).toFixed(2));
      const currentStock = Number(p.stockQuantity ?? 0);
      const daysUntilStockout = dailyConsumption > 0 ? Math.round(currentStock / dailyConsumption) : 999;

      return {
        partId: p.id,
        name: p.name,
        sku: p.sku,
        currentStock,
        lowStockThreshold: p.lowStockThreshold,
        unitsConsumed30d,
        dailyConsumption,
        daysUntilStockout,
        status: currentStock <= p.lowStockThreshold ? 'CRITICAL' : daysUntilStockout < 15 ? 'WARNING' : 'HEALTHY',
      };
    }).sort((a, b) => a.daysUntilStockout - b.daysUntilStockout);

    // Top Selling / Consumed Parts
    const topParts = [...inventoryVelocity]
      .sort((a, b) => b.unitsConsumed30d - a.unitsConsumed30d)
      .slice(0, 5);

    // Mechanic Productivity
    const mechanicCardCounts: Record<number, { total: number; completed: number }> = {};
    for (const card of allJobCards) {
      if (card.mechanicId) {
        if (!mechanicCardCounts[card.mechanicId]) {
          mechanicCardCounts[card.mechanicId] = { total: 0, completed: 0 };
        }
        mechanicCardCounts[card.mechanicId].total++;
        if (card.status === 'COMPLETED' || card.status === 'DELIVERED') {
          mechanicCardCounts[card.mechanicId].completed++;
        }
      }
    }

    const mechanicProductivity = allMechanics.map((m) => {
      const stats = mechanicCardCounts[m.id] || { total: 0, completed: 0 };
      const efficiency = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 100;
      return {
        id: m.id,
        name: m.name,
        specialization: m.specialization,
        experience: m.experience,
        assignedJobs: stats.total,
        completedJobs: stats.completed,
        efficiencyPercent: efficiency,
      };
    });

    return {
      financial: {
        dailySales: Number(dailySales.toFixed(2)),
        monthlyRevenue: Number(monthlyRevenue.toFixed(2)),
        totalRevenueAllTime: Number(totalRevenueAllTime.toFixed(2)),
        outstandingPayments: Number(outstandingPayments.toFixed(2)),
        labourRevenue: Number(labourRevenue.toFixed(2)),
        partsRevenue: Number(partsRevenue.toFixed(2)),
        cgstCollected: Number(cgstCollected.toFixed(2)),
        sgstCollected: Number(sgstCollected.toFixed(2)),
      },
      operations: {
        totalCustomers: allCustomers.length,
        totalVehicles: allVehicles.length,
        totalBookings: allBookings.length,
        completedBookings: completedBookings.length,
        pendingBookings: allBookings.filter((b) => b.status === 'PENDING').length,
        serviceCompletionRate,
        avgTurnaroundHours,
        activeMechanicsCount: allMechanics.filter((m) => m.isAvailable).length,
      },
      brandDistribution,
      categoryDistribution,
      topParts,
      inventoryVelocity: inventoryVelocity.slice(0, 10),
      mechanicProductivity,
    };
  }

  async getMonthlyTrends(monthsCount = 6) {
    const allInvoices = await db.select().from(invoicesTable);
    const allBookings = await db.select().from(serviceBookingsTable);

    const now = new Date();
    const monthsData = [];

    for (let i = monthsCount - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const monthLabel = d.toLocaleString('en-IN', { month: 'short', year: 'numeric' });

      const monthInvoices = allInvoices.filter((inv) => {
        if (!inv.createdAt) return false;
        const invDate = new Date(inv.createdAt);
        return invDate >= d && invDate < nextMonth;
      });

      const monthBookings = allBookings.filter((b) => {
        if (!b.createdAt) return false;
        const bDate = new Date(b.createdAt);
        return bDate >= d && bDate < nextMonth;
      });

      const revenue = monthInvoices.reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0);
      const completed = monthBookings.filter((b) => ['COMPLETED', 'DELIVERED'].includes(b.status)).length;

      monthsData.push({
        month: monthLabel,
        revenue: Number(revenue.toFixed(2)),
        bookings: monthBookings.length,
        completed,
      });
    }

    return monthsData;
  }

  async exportReportCsv(): Promise<string> {
    const summary = await this.getSummaryMetrics();
    const allInvoices = await db.select().from(invoicesTable).orderBy(desc(invoicesTable.createdAt));
    const allParts = await db.select().from(servicePartsTable);

    const lines: string[] = [];
    lines.push('SHRIRAM AUTOMOBILES - EXECUTIVE OPERATIONS & FINANCIAL REPORT');
    lines.push(`Generated At,${new Date().toLocaleString('en-IN')}`);
    lines.push(`Location,Main Road Sangola Solapur Maharashtra - 413307`);
    lines.push(`GSTIN,27AABCS1429B1Z8`);
    lines.push('');

    // Summary Section
    lines.push('--- EXECUTIVE SUMMARY METRICS ---');
    lines.push('Metric,Value');
    lines.push(`Today Sales (INR),${summary.financial.dailySales}`);
    lines.push(`Monthly Revenue (INR),${summary.financial.monthlyRevenue}`);
    lines.push(`Total Revenue All Time (INR),${summary.financial.totalRevenueAllTime}`);
    lines.push(`Outstanding Payments (INR),${summary.financial.outstandingPayments}`);
    lines.push(`Labour Charges Revenue (INR),${summary.financial.labourRevenue}`);
    lines.push(`Parts Sales Revenue (INR),${summary.financial.partsRevenue}`);
    lines.push(`CGST (9%) Collected (INR),${summary.financial.cgstCollected}`);
    lines.push(`SGST (9%) Collected (INR),${summary.financial.sgstCollected}`);
    lines.push(`Service Completion Rate (%),${summary.financial ? summary.operations.serviceCompletionRate : 100}%`);
    lines.push(`Average Workshop Turnaround (Hours),${summary.operations.avgTurnaroundHours} hrs`);
    lines.push('');

    // Invoices Section
    lines.push('--- INVOICES REGISTER ---');
    lines.push('Invoice Number,Date,Type,Customer Name,Customer Phone,Taxable Value,CGST (9%),SGST (9%),Total Amount,Payment Status,Payment Method');
    for (const inv of allInvoices) {
      lines.push(
        `"${inv.invoiceNumber}","${inv.createdAt ? new Date(inv.createdAt).toLocaleDateString('en-IN') : ''}","${inv.invoiceType}","${inv.customerName}","${inv.customerPhone}",${inv.taxableAmount},${inv.cgstAmount},${inv.sgstAmount},${inv.totalAmount},"${inv.paymentStatus}","${inv.paymentMethod}"`
      );
    }
    lines.push('');

    // Inventory Section
    lines.push('--- SPARE PARTS INVENTORY STATUS ---');
    lines.push('SKU,Part Name,Category,Brand,Stock Quantity,Low Stock Threshold,Price,Stock Status');
    for (const p of allParts) {
      const isLow = Number(p.stockQuantity ?? 0) <= Number(p.lowStockThreshold ?? 5);
      lines.push(
        `"${p.sku}","${p.name}","${p.category}","${p.brand}",${p.stockQuantity},${p.lowStockThreshold},${p.price},"${isLow ? 'LOW_STOCK' : 'IN_STOCK'}"`
      );
    }

    return lines.join('\n');
  }
}

export const analyticsService = new AnalyticsService();
