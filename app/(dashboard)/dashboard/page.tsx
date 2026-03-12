import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { subMonths, startOfMonth, endOfMonth, format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { KpiCard } from '@/components/dashboard/KpiCard'
import { LowStockPanel } from '@/components/dashboard/LowStockPanel'
import { RecentOrdersTable } from '@/components/dashboard/RecentOrdersTable'
import { TopProductsTable } from '@/components/dashboard/TopProductsTable'
import { RevenueChart } from '@/components/charts/RevenueChart'
import { OrderStatusChart } from '@/components/charts/OrderStatusChart'
import { ShipmentStatusChart } from '@/components/charts/ShipmentStatusChart'
import { StockLevelChart } from '@/components/charts/StockLevelChart'
import { formatCurrency } from '@/lib/utils'
import {
  Package,
  ShoppingCart,
  Truck,
  DollarSign,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

async function getDashboardData() {
  const now = new Date()

  const [
    totalProducts,
    lowStockProducts_raw,
    openPOs,
    activeShipments,
    delayedShipments,
    revenueData,
    recentOrders,
    topProductsRaw,
    orderStatusCounts,
    shipmentStatusCounts,
    allProducts,
  ] = await Promise.all([
    prisma.product.count(),

    // low stock: fetch top-20 by stock ascending, filter in JS (Prisma can't compare columns natively)
    prisma.product.findMany({
      select: { id: true, name: true, sku: true, currentStock: true, reorderLevel: true, warehouseLocation: true },
      orderBy: { currentStock: 'asc' },
      take: 20,
    }),

    prisma.purchaseOrder.count({ where: { status: { in: ['PENDING', 'APPROVED'] } } }),

    prisma.shipment.count({ where: { status: { in: ['PENDING', 'IN_TRANSIT'] } } }),

    prisma.shipment.count({ where: { status: 'DELAYED' } }),

    prisma.salesOrder.findMany({
      where: { status: { notIn: ['CANCELLED', 'DRAFT'] } },
      select: { totalAmount: true, createdAt: true },
    }),

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

    prisma.sOLineItem.groupBy({
      by: ['productId'],
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5,
    }),

    prisma.salesOrder.groupBy({ by: ['status'], _count: { id: true } }),

    prisma.shipment.groupBy({ by: ['status'], _count: { id: true } }),

    prisma.product.findMany({
      select: { id: true, name: true, sku: true, currentStock: true, reorderLevel: true },
      orderBy: { currentStock: 'asc' },
      take: 10,
    }),
  ])

  // Revenue by month (last 6)
  // Filter low-stock products in JS
  const lowStockProducts = lowStockProducts_raw.filter((p) => p.currentStock <= p.reorderLevel).slice(0, 8)

  const monthlyRevenue: Record<string, number> = {}
  for (let i = 5; i >= 0; i--) {
    monthlyRevenue[format(subMonths(now, i), 'MMM yy')] = 0
  }
  for (const so of revenueData) {
    const label = format(so.createdAt, 'MMM yy')
    if (label in monthlyRevenue) monthlyRevenue[label] += Number(so.totalAmount)
  }
  const revenueChart = Object.entries(monthlyRevenue).map(([month, revenue]) => ({ month, revenue }))

  // MTD revenue
  const mtdStart = startOfMonth(now)
  const prevMonthStart = startOfMonth(subMonths(now, 1))
  const prevMonthEnd = endOfMonth(subMonths(now, 1))

  const mtdRevenue = revenueData
    .filter((o) => o.createdAt >= mtdStart)
    .reduce((s, o) => s + Number(o.totalAmount), 0)

  const prevRevenue = revenueData
    .filter((o) => o.createdAt >= prevMonthStart && o.createdAt <= prevMonthEnd)
    .reduce((s, o) => s + Number(o.totalAmount), 0)

  const revenueGrowth = prevRevenue > 0 ? (((mtdRevenue - prevRevenue) / prevRevenue) * 100).toFixed(1) : null

  // Top products with names
  const productIds = topProductsRaw.map((p) => p.productId)
  const productDetails = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true, sku: true, currentStock: true },
  })
  const productMap = Object.fromEntries(productDetails.map((p) => [p.id, p]))
  const topProducts = topProductsRaw.map((p) => ({
    ...productMap[p.productId],
    totalSold: p._sum.quantity ?? 0,
  }))

  const orders = recentOrders.map((o) => ({
    id: o.id,
    customer: o.customer.name,
    status: o.status,
    amount: Number(o.totalAmount),
    items: o.lineItems.reduce((s, l) => s + l.quantity, 0),
    date: o.createdAt.toISOString(),
  }))

  return {
    kpis: { totalProducts, lowStockCount: lowStockProducts.length, openPOs, activeShipments, delayedShipments, mtdRevenue, revenueGrowth },
    revenueChart,
    orderStatusChart: orderStatusCounts.map((s) => ({ status: s.status, count: s._count.id })),
    shipmentStatusChart: shipmentStatusCounts.map((s) => ({ status: s.status, count: s._count.id })),
    topProducts,
    lowStockProducts,
    recentOrders: orders,
    allProducts,
  }
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  const data = await getDashboardData()
  const { kpis } = data

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Welcome back, {session?.user?.name?.split(' ')[0]}! Here&apos;s what&apos;s happening today.
          </p>
        </div>
        <Badge variant="secondary" className="gap-1 text-xs">
          <TrendingUp className="h-3 w-3" /> Live data
        </Badge>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Total Products"
          value={kpis.totalProducts.toString()}
          delta={kpis.lowStockCount > 0 ? `${kpis.lowStockCount} below reorder level` : 'All stock levels OK'}
          deltaType={kpis.lowStockCount > 0 ? 'down' : 'up'}
          icon={Package}
          iconColor="text-indigo-600"
          iconBg="bg-indigo-50 dark:bg-indigo-950/40"
        />
        <KpiCard
          label="Open Purchase Orders"
          value={kpis.openPOs.toString()}
          delta="Pending or awaiting approval"
          deltaType="neutral"
          icon={ShoppingCart}
          iconColor="text-amber-600"
          iconBg="bg-amber-50 dark:bg-amber-950/40"
        />
        <KpiCard
          label="Active Shipments"
          value={kpis.activeShipments.toString()}
          delta={kpis.delayedShipments > 0 ? `${kpis.delayedShipments} delayed` : 'All on schedule'}
          deltaType={kpis.delayedShipments > 0 ? 'down' : 'up'}
          icon={Truck}
          iconColor="text-sky-600"
          iconBg="bg-sky-50 dark:bg-sky-950/40"
        />
        <KpiCard
          label="Revenue (MTD)"
          value={formatCurrency(kpis.mtdRevenue)}
          delta={kpis.revenueGrowth ? `${Number(kpis.revenueGrowth) >= 0 ? '+' : ''}${kpis.revenueGrowth}% vs last month` : 'No prior month data'}
          deltaType={kpis.revenueGrowth ? (Number(kpis.revenueGrowth) >= 0 ? 'up' : 'down') : 'neutral'}
          icon={DollarSign}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50 dark:bg-emerald-950/40"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Revenue Trend (Last 6 Months)</CardTitle>
          </CardHeader>
          <CardContent>
            <RevenueChart data={data.revenueChart} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Order Status</CardTitle>
          </CardHeader>
          <CardContent>
            <OrderStatusChart data={data.orderStatusChart} />
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Shipment Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ShipmentStatusChart data={data.shipmentStatusChart} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Stock Levels (Lowest 10)</CardTitle>
          </CardHeader>
          <CardContent>
            <StockLevelChart data={data.allProducts} />
          </CardContent>
        </Card>
      </div>

      {/* Data Tables Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Orders */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Recent Sales Orders</CardTitle>
              <a href="/purchase-orders" className="text-xs text-indigo-600 hover:underline dark:text-indigo-400">View all →</a>
            </div>
          </CardHeader>
          <CardContent className="p-0 pb-2">
            <RecentOrdersTable orders={data.recentOrders} />
          </CardContent>
        </Card>

        {/* Right column */}
        <div className="space-y-6">
          {/* Low Stock */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">Low Stock Alerts</CardTitle>
                  {data.lowStockProducts.length > 0 && (
                    <Badge variant="destructive" className="text-[10px] px-1.5">
                      {data.lowStockProducts.length}
                    </Badge>
                  )}
                </div>
                <a href="/inventory" className="text-xs text-indigo-600 hover:underline dark:text-indigo-400">View all →</a>
              </div>
            </CardHeader>
            <CardContent>
              <LowStockPanel products={data.lowStockProducts} />
            </CardContent>
          </Card>

          {/* Top Products */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Top Products</CardTitle>
                <span className="text-xs text-gray-400">by qty sold</span>
              </div>
            </CardHeader>
            <CardContent>
              <TopProductsTable products={data.topProducts} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
