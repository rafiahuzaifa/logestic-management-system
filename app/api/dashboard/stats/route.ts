import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { subMonths, startOfMonth, endOfMonth, format } from 'date-fns'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const now = new Date()

  // ── Run all queries in parallel ────────────────────────────────────────────
  const [
    totalProducts,
    lowStockCandidates,
    openPOs,
    activeShipments,
    delayedShipments,
    salesOrders,
    recentOrders,
    topProducts,
    revenueByMonth,
    orderStatusCounts,
    shipmentStatusCounts,
  ] = await Promise.all([
    // 1. Total products
    prisma.product.count(),

    // 2. Candidates for low-stock (filter in JS — Prisma can't compare two columns natively)
    prisma.product.findMany({
      select: { id: true, name: true, sku: true, currentStock: true, reorderLevel: true, warehouseLocation: true },
      orderBy: { currentStock: 'asc' },
      take: 30,
    }),

    // 3. Open purchase orders
    prisma.purchaseOrder.count({
      where: { status: { in: ['PENDING', 'APPROVED'] } },
    }),

    // 4. Active shipments
    prisma.shipment.count({
      where: { status: { in: ['PENDING', 'IN_TRANSIT'] } },
    }),

    // 5. Delayed shipments
    prisma.shipment.count({ where: { status: 'DELAYED' } }),

    // 6. All sales orders for revenue calc
    prisma.salesOrder.findMany({
      select: { totalAmount: true, createdAt: true, status: true },
    }),

    // 7. Recent 10 orders with relations
    prisma.salesOrder.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        totalAmount: true,
        status: true,
        createdAt: true,
        customer: { select: { name: true } },
        lineItems: { select: { quantity: true } },
      },
    }),

    // 8. Top 5 products by total quantity sold
    prisma.sOLineItem.groupBy({
      by: ['productId'],
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5,
    }),

    // 9. Revenue by month (last 6 months) — fetch and aggregate in JS
    prisma.salesOrder.findMany({
      where: {
        status: { notIn: ['CANCELLED', 'DRAFT'] },
        createdAt: { gte: subMonths(now, 5) },
      },
      select: { totalAmount: true, createdAt: true },
    }),

    // 10. Order status distribution
    prisma.salesOrder.groupBy({
      by: ['status'],
      _count: { id: true },
    }),

    // 11. Shipment status distribution
    prisma.shipment.groupBy({
      by: ['status'],
      _count: { id: true },
    }),
  ])

  // ── Enrich top products with names ────────────────────────────────────────
  const topProductIds = topProducts.map((p) => p.productId)
  const productDetails = await prisma.product.findMany({
    where: { id: { in: topProductIds } },
    select: { id: true, name: true, sku: true, currentStock: true },
  })
  const productMap = Object.fromEntries(productDetails.map((p) => [p.id, p]))

  // ── Monthly revenue aggregation ───────────────────────────────────────────
  const monthlyRevenue: Record<string, number> = {}
  for (let i = 5; i >= 0; i--) {
    const label = format(subMonths(now, i), 'MMM yy')
    monthlyRevenue[label] = 0
  }
  for (const so of revenueByMonth) {
    const label = format(so.createdAt, 'MMM yy')
    if (label in monthlyRevenue) {
      monthlyRevenue[label] += Number(so.totalAmount)
    }
  }
  const revenueChart = Object.entries(monthlyRevenue).map(([month, revenue]) => ({ month, revenue }))

  // ── MTD revenue ───────────────────────────────────────────────────────────
  const mtdStart = startOfMonth(now)
  const mtdRevenue = salesOrders
    .filter((o) => o.status !== 'CANCELLED' && o.status !== 'DRAFT' && o.createdAt >= mtdStart)
    .reduce((sum, o) => sum + Number(o.totalAmount), 0)

  const prevMonthStart = startOfMonth(subMonths(now, 1))
  const prevMonthEnd = endOfMonth(subMonths(now, 1))
  const prevRevenue = salesOrders
    .filter((o) => o.status !== 'CANCELLED' && o.status !== 'DRAFT' && o.createdAt >= prevMonthStart && o.createdAt <= prevMonthEnd)
    .reduce((sum, o) => sum + Number(o.totalAmount), 0)

  const revenueGrowth = prevRevenue > 0 ? (((mtdRevenue - prevRevenue) / prevRevenue) * 100).toFixed(1) : null

  const lowStockProducts = lowStockCandidates.filter((p) => p.currentStock <= p.reorderLevel).slice(0, 10)

  return NextResponse.json({
    kpis: {
      totalProducts,
      lowStockCount: lowStockProducts.length,
      openPOs,
      activeShipments,
      delayedShipments,
      mtdRevenue,
      revenueGrowth,
    },
    revenueChart,
    orderStatusChart: orderStatusCounts.map((s) => ({ status: s.status, count: s._count.id })),
    shipmentStatusChart: shipmentStatusCounts.map((s) => ({ status: s.status, count: s._count.id })),
    topProducts: topProducts.map((p) => ({
      ...productMap[p.productId],
      totalSold: p._sum.quantity ?? 0,
    })),
    lowStockProducts,
    recentOrders: recentOrders.map((o) => ({
      id: o.id,
      customer: o.customer.name,
      status: o.status,
      amount: Number(o.totalAmount),
      items: o.lineItems.reduce((s, l) => s + l.quantity, 0),
      date: o.createdAt,
    })),
  })
}
