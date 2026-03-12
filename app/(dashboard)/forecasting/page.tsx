import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'
import { ForecastChart, type ForecastDataPoint } from '@/components/charts/ForecastChart'
import { subMonths, startOfMonth, endOfMonth, format } from 'date-fns'
import { TrendingUp, AlertTriangle, BarChart3, Package, Info } from 'lucide-react'

export const dynamic = 'force-dynamic'

// Urgency thresholds (months of stock remaining)
const URGENT_THRESHOLD    = 1
const HIGH_THRESHOLD      = 2

function getUrgencyVariant(monthsLeft: number): 'destructive' | 'warning' | 'default' {
  if (monthsLeft <= URGENT_THRESHOLD) return 'destructive'
  if (monthsLeft <= HIGH_THRESHOLD)   return 'warning'
  return 'default'
}

function getUrgencyLabel(monthsLeft: number): string {
  if (monthsLeft <= URGENT_THRESHOLD) return 'Urgent'
  if (monthsLeft <= HIGH_THRESHOLD)   return 'High'
  return 'Medium'
}

export default async function ForecastingPage() {
  await getServerSession(authOptions)

  const now   = new Date()
  const start = startOfMonth(subMonths(now, 11)) // 12 months back

  // ── 1. Monthly revenue for the last 12 months ──────────────────────────────
  const salesOrders = await prisma.salesOrder.findMany({
    where: {
      status:    { not: 'CANCELLED' },
      createdAt: { gte: start },
    },
    select: { createdAt: true, totalAmount: true },
  })

  // Build a month→revenue map
  const monthMap: Record<string, number> = {}
  for (let i = 11; i >= 0; i--) {
    const label = format(subMonths(now, i), 'MMM yy')
    monthMap[label] = 0
  }
  for (const order of salesOrders) {
    const label = format(order.createdAt, 'MMM yy')
    if (label in monthMap) {
      monthMap[label] += Number(order.totalAmount)
    }
  }
  const chartData: ForecastDataPoint[] = Object.entries(monthMap).map(([month, revenue]) => ({
    month,
    revenue,
  }))

  // ── 2. Top 5 products by sales volume (last 12 months) ─────────────────────
  const soLineItems = await prisma.sOLineItem.findMany({
    where: {
      salesOrder: {
        status:    { not: 'CANCELLED' },
        createdAt: { gte: start },
      },
    },
    select: {
      productId: true,
      quantity:  true,
      salesOrder: { select: { createdAt: true } },
    },
  })

  // Aggregate by product
  const productQtyMap: Record<string, number> = {}
  for (const item of soLineItems) {
    productQtyMap[item.productId] = (productQtyMap[item.productId] ?? 0) + item.quantity
  }

  const top5ProductIds = Object.entries(productQtyMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([id]) => id)

  const top5Products = await prisma.product.findMany({
    where: { id: { in: top5ProductIds } },
    select: {
      id:           true,
      name:         true,
      sku:          true,
      currentStock: true,
      unit:         true,
      reorderLevel: true,
    },
  })

  // Sort back into top5 order
  const top5Sorted = top5ProductIds
    .map((id) => top5Products.find((p) => p.id === id))
    .filter(Boolean) as typeof top5Products

  // ── 3. All products with avg monthly sales for reorder suggestions ──────────
  // Get all products with stock and reorder level
  const allProducts = await prisma.product.findMany({
    select: {
      id:           true,
      name:         true,
      sku:          true,
      currentStock: true,
      reorderLevel: true,
      unit:         true,
    },
  })

  // Build a map of avgMonthlySales per product across last 12 months
  const avgMonthlySalesMap: Record<string, number> = {}
  for (const [productId, totalQty] of Object.entries(productQtyMap)) {
    avgMonthlySalesMap[productId] = totalQty / 12
  }

  // Reorder suggestions: products where (currentStock / avgMonthlySales) < 2
  const reorderSuggestions = allProducts
    .map((p) => {
      const avg       = avgMonthlySalesMap[p.id] ?? 0
      const monthsLeft = avg > 0 ? p.currentStock / avg : Infinity
      return { ...p, avgMonthlySales: avg, monthsLeft }
    })
    .filter((p) => p.monthsLeft < 2 && p.avgMonthlySales > 0)
    .sort((a, b) => a.monthsLeft - b.monthsLeft)
    .slice(0, 20)

  // Total revenue this year
  const totalRevenue = chartData.reduce((s, d) => s + d.revenue, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Demand Forecasting</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Sales trends and inventory reorder recommendations
          </p>
        </div>
        <Badge variant="secondary" className="flex items-center gap-1">
          <TrendingUp className="h-3 w-3" />
          AI Powered (Beta)
        </Badge>
      </div>

      {/* Revenue Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4 text-violet-600" />
              Historical Demand — Last 12 Months
            </CardTitle>
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {formatCurrency(totalRevenue)} total
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <ForecastChart data={chartData} />
        </CardContent>
      </Card>

      {/* Top 5 Products Forecast */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-gray-50">
          Top Products Forecast
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {top5Sorted.length === 0 ? (
            <div className="col-span-5 text-center py-8 text-sm text-gray-400">
              No sales data available yet.
            </div>
          ) : (
            top5Sorted.map((product) => {
              const totalQty       = productQtyMap[product.id] ?? 0
              const avgMonthly     = totalQty / 12
              const monthsLeft     = avgMonthly > 0 ? product.currentStock / avgMonthly : Infinity
              const isLow          = product.currentStock <= product.reorderLevel

              return (
                <Card key={product.id} className="relative overflow-hidden">
                  {isLow && (
                    <div className="absolute inset-x-0 top-0 h-0.5 bg-amber-400" />
                  )}
                  <CardContent className="p-4 space-y-3">
                    <div>
                      <p className="font-semibold text-sm text-gray-900 dark:text-gray-100 line-clamp-2">
                        {product.name}
                      </p>
                      <p className="text-xs text-gray-400 font-mono">{product.sku}</p>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Current Stock</span>
                        <span className={`font-medium ${isLow ? 'text-amber-600' : 'text-gray-700 dark:text-gray-300'}`}>
                          {product.currentStock} {product.unit}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Avg Monthly Sales</span>
                        <span className="font-medium text-gray-700 dark:text-gray-300">
                          {avgMonthly.toFixed(1)} {product.unit}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Stockout in</span>
                        <span className={`font-bold ${
                          monthsLeft <= 1 ? 'text-red-600' :
                          monthsLeft <= 2 ? 'text-amber-600' :
                          'text-emerald-600'
                        }`}>
                          {isFinite(monthsLeft) ? `${monthsLeft.toFixed(1)} mo` : 'N/A'}
                        </span>
                      </div>
                    </div>

                    {isLow && (
                      <Badge variant="warning" className="text-[10px] w-full justify-center">
                        Below Reorder Level
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      </div>

      {/* Reorder Suggestions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Reorder Suggestions
            {reorderSuggestions.length > 0 && (
              <Badge variant="destructive" className="ml-1">{reorderSuggestions.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                {['Product', 'SKU', 'Current Stock', 'Avg Monthly Sales', 'Months Left', 'Reorder Level', 'Urgency'].map((h) => (
                  <th
                    key={h}
                    className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400 ${
                      ['Current Stock', 'Avg Monthly Sales', 'Months Left', 'Reorder Level'].includes(h) ? 'text-right' : 'text-left'
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
              {reorderSuggestions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-400">
                    All products are sufficiently stocked based on current demand.
                  </td>
                </tr>
              ) : (
                reorderSuggestions.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                      <div className="flex items-center gap-2">
                        <Package className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                        {item.name}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{item.sku}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-semibold ${item.currentStock === 0 ? 'text-red-600' : 'text-amber-600'}`}>
                        {item.currentStock} {item.unit}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                      {item.avgMonthlySales.toFixed(1)} {item.unit}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-bold ${
                        item.monthsLeft <= URGENT_THRESHOLD ? 'text-red-600' :
                        item.monthsLeft <= HIGH_THRESHOLD   ? 'text-amber-600' :
                        'text-gray-700 dark:text-gray-300'
                      }`}>
                        {isFinite(item.monthsLeft) ? `${item.monthsLeft.toFixed(1)} mo` : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500">{item.reorderLevel}</td>
                    <td className="px-4 py-3">
                      <Badge variant={getUrgencyVariant(item.monthsLeft)}>
                        {getUrgencyLabel(item.monthsLeft)}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ML Note */}
      <div className="flex items-start gap-3 rounded-lg border border-indigo-100 bg-indigo-50/50 px-4 py-3 text-sm dark:border-indigo-900/30 dark:bg-indigo-950/20">
        <Info className="h-4 w-4 mt-0.5 text-indigo-500 shrink-0" />
        <p className="text-indigo-700 dark:text-indigo-300">
          Full ML forecasting powered by{' '}
          <span className="font-semibold">Prophet / ARIMA</span> is available via the Python backend microservice.
          Connect it at{' '}
          <code className="rounded bg-indigo-100 px-1 py-0.5 text-xs dark:bg-indigo-900">
            /api/forecasting/ml
          </code>{' '}
          to enable advanced seasonality detection and confidence intervals.
        </p>
      </div>
    </div>
  )
}
