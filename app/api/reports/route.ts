import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const [
      inventoryStats,
      orderStats,
      shipmentStats,
      supplierStats,
      stockMovements,
      lowStockProducts,
    ] = await Promise.all([
      // Inventory summary
      prisma.product.aggregate({ _count: { _all: true }, _sum: { currentStock: true } }),

      // Sales orders by status
      prisma.salesOrder.groupBy({ by: ['status'], _count: true, _sum: { totalAmount: true } }),

      // Shipments by status
      prisma.shipment.groupBy({ by: ['status'], _count: true }),

      // Supplier summary
      prisma.supplier.aggregate({ _count: { _all: true }, _avg: { rating: true, leadTimeDays: true } }),

      // Stock movements last 30 days
      prisma.stockMovement.groupBy({
        by:   ['type'],
        _sum: { quantity: true },
        where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
      }),

      // Low stock
      prisma.product.findMany({ select: { id: true, name: true, sku: true, currentStock: true, reorderLevel: true } }),
    ])

    const lowStock = lowStockProducts.filter(p => p.currentStock <= p.reorderLevel)

    return NextResponse.json({
      inventory: {
        totalProducts:  inventoryStats._count._all,
        totalStockUnits: inventoryStats._sum.currentStock ?? 0,
        lowStockCount:   lowStock.length,
        lowStockItems:   lowStock.slice(0, 10),
      },
      orders:    orderStats,
      shipments: shipmentStats,
      suppliers: {
        total:          supplierStats._count._all,
        avgRating:      Number(supplierStats._avg.rating ?? 0).toFixed(1),
        avgLeadTimeDays: Number(supplierStats._avg.leadTimeDays ?? 0).toFixed(0),
      },
      stockMovements,
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
  }
}
