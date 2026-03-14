'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RefreshCw, Loader2, TrendingDown, Package, Truck, ShoppingCart, Users, Download } from 'lucide-react'

interface OrderStat  { status: string; _count: number; _sum: { totalAmount: string | null } }
interface ShipStat   { status: string; _count: number }
interface MovStat    { type: string;   _sum: { quantity: number | null } }
interface LowItem    { id: string; name: string; sku: string; currentStock: number; reorderLevel: number }

interface ReportData {
  inventory:     { totalProducts: number; totalStockUnits: number; lowStockCount: number; lowStockItems: LowItem[] }
  orders:        OrderStat[]
  shipments:     ShipStat[]
  suppliers:     { total: number; avgRating: string; avgLeadTimeDays: string }
  stockMovements: MovStat[]
}

const ORDER_COLORS: Record<string, string> = {
  DRAFT:     'secondary',
  CONFIRMED: 'default',
  PACKED:    'default',
  SHIPPED:   'default',
  DELIVERED: 'success',
  CANCELLED: 'destructive',
}

const SHIP_COLORS: Record<string, string> = {
  PENDING:    'secondary',
  IN_TRANSIT: 'default',
  DELIVERED:  'success',
  DELAYED:    'warning',
}

export function ReportsClient({ initialData }: { initialData: ReportData }) {
  const [data, setData]       = useState<ReportData>(initialData)
  const [loading, setLoading] = useState(false)

  const refresh = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/reports')
      if (res.ok) setData(await res.json())
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Reports & Analytics</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Live overview of all logistics operations</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            {(['inventory','sales-orders','invoices','customers','suppliers','shipments'] as const).map((type) => (
              <a
                key={type}
                href={`/api/reports/export?type=${type}`}
                download
                className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors"
              >
                <Download className="h-3 w-3" />
                {type.replace('-', ' ')}
              </a>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={refresh} disabled={loading} className="gap-1.5">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Products',  value: data.inventory.totalProducts,  icon: Package,      color: 'text-indigo-600',  bg: 'bg-indigo-50 dark:bg-indigo-950/40'   },
          { label: 'Stock Units',     value: data.inventory.totalStockUnits, icon: Package,      color: 'text-sky-600',     bg: 'bg-sky-50 dark:bg-sky-950/40'         },
          { label: 'Low Stock Items', value: data.inventory.lowStockCount,  icon: TrendingDown, color: 'text-red-600',     bg: 'bg-red-50 dark:bg-red-950/40'         },
          { label: 'Total Suppliers', value: data.suppliers.total,          icon: Users,        color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/40' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label}>
            <CardContent className="flex items-center gap-3 p-4">
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${bg}`}>
                <Icon className={`h-4 w-4 ${color}`} />
              </div>
              <div>
                <p className={`text-xl font-bold ${color}`}>{value}</p>
                <p className="text-xs text-gray-500">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Sales orders by status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-indigo-600" />Sales Orders by Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.orders.map(o => (
              <div key={o.status} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant={(ORDER_COLORS[o.status] ?? 'secondary') as any}>{o.status}</Badge>
                  <span className="text-gray-500">{o._count} orders</span>
                </div>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  ${Number(o._sum.totalAmount ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            ))}
            {data.orders.length === 0 && <p className="text-sm text-gray-400">No orders yet</p>}
          </CardContent>
        </Card>

        {/* Shipments by status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Truck className="h-4 w-4 text-sky-600" />Shipments by Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.shipments.map(s => (
              <div key={s.status} className="flex items-center justify-between text-sm">
                <Badge variant={(SHIP_COLORS[s.status] ?? 'secondary') as any}>{s.status.replace('_', ' ')}</Badge>
                <span className="font-medium text-gray-900 dark:text-gray-100">{s._count} shipment{s._count !== 1 ? 's' : ''}</span>
              </div>
            ))}
            {data.shipments.length === 0 && <p className="text-sm text-gray-400">No shipments yet</p>}
          </CardContent>
        </Card>

        {/* Stock movements */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Stock Movements (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.stockMovements.map(m => (
              <div key={m.type} className="flex items-center justify-between text-sm">
                <span className={`font-medium ${m.type === 'IN' ? 'text-emerald-600' : m.type === 'OUT' ? 'text-red-600' : 'text-amber-600'}`}>
                  {m.type}
                </span>
                <span className="text-gray-700 dark:text-gray-300">{m._sum.quantity ?? 0} units</span>
              </div>
            ))}
            {data.stockMovements.length === 0 && <p className="text-sm text-gray-400">No movements in last 30 days</p>}
          </CardContent>
        </Card>

        {/* Supplier summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-emerald-600" />Supplier Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {[
              ['Total Suppliers',    data.suppliers.total],
              ['Avg Rating',         `${data.suppliers.avgRating} / 5.0`],
              ['Avg Lead Time',      `${data.suppliers.avgLeadTimeDays} days`],
            ].map(([label, value]) => (
              <div key={String(label)} className="flex justify-between">
                <span className="text-gray-500">{label}</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{value}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Low stock items */}
      {data.inventory.lowStockItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-500" />Low Stock Items
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  {['Product', 'SKU', 'Current Stock', 'Reorder Level'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold uppercase text-gray-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                {data.inventory.lowStockItems.map(item => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{item.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{item.sku}</td>
                    <td className="px-4 py-3">
                      <span className={`font-bold ${item.currentStock === 0 ? 'text-red-600' : 'text-amber-600'}`}>
                        {item.currentStock}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{item.reorderLevel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
