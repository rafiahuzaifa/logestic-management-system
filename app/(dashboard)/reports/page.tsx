import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { ReportsClient } from '@/components/reports/ReportsClient'

export const dynamic = 'force-dynamic'

export default async function ReportsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const [inventoryStats, orderStats, shipmentStats, supplierStats, stockMovements, allProducts] = await Promise.all([
    prisma.product.aggregate({ _count: { _all: true }, _sum: { currentStock: true } }),
    prisma.salesOrder.groupBy({ by: ['status'], _count: true, _sum: { totalAmount: true } }),
    prisma.shipment.groupBy({ by: ['status'], _count: true }),
    prisma.supplier.aggregate({ _count: { _all: true }, _avg: { rating: true, leadTimeDays: true } }),
    prisma.stockMovement.groupBy({
      by:   ['type'],
      _sum: { quantity: true },
      where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
    }),
    prisma.product.findMany({ select: { id: true, name: true, sku: true, currentStock: true, reorderLevel: true } }),
  ])

  const lowStockItems = allProducts.filter(p => p.currentStock <= p.reorderLevel)

  const initialData = {
    inventory: {
      totalProducts:   inventoryStats._count._all,
      totalStockUnits: inventoryStats._sum.currentStock ?? 0,
      lowStockCount:   lowStockItems.length,
      lowStockItems:   lowStockItems.slice(0, 10),
    },
    orders:    orderStats.map(o => ({
      status: o.status,
      _count: o._count,
      _sum:   { totalAmount: o._sum.totalAmount?.toString() ?? null },
    })),
    shipments: shipmentStats.map(s => ({ status: s.status, _count: s._count })),
    suppliers: {
      total:           supplierStats._count._all,
      avgRating:       Number(supplierStats._avg.rating ?? 0).toFixed(1),
      avgLeadTimeDays: Number(supplierStats._avg.leadTimeDays ?? 0).toFixed(0),
    },
    stockMovements: stockMovements.map(m => ({
      type: m.type,
      _sum: { quantity: m._sum.quantity ?? 0 },
    })),
  }

  return <ReportsClient initialData={initialData} />
}
