import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { Warehouse, Package, BarChart3, DollarSign, Edit, MapPin } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface LocationGroup {
  location:     string
  products:     Array<{
    id:               string
    name:             string
    sku:              string
    currentStock:     number
    reorderLevel:     number
    price:            number
    warehouseLocation: string | null
    categoryName:     string
  }>
  productCount: number
  totalStock:   number
  totalValue:   number
}

export default async function WarehousesPage() {
  const session = await getServerSession(authOptions)
  const canEdit = ['ADMIN', 'WAREHOUSE_MANAGER'].includes(session?.user?.role ?? '')

  const rawProducts = await prisma.product.findMany({
    include: { category: { select: { name: true } } },
    orderBy: [{ warehouseLocation: 'asc' }, { name: 'asc' }],
  })

  // Map to a flat shape
  const products = rawProducts.map((p) => ({
    id:                p.id,
    name:              p.name,
    sku:               p.sku,
    currentStock:      p.currentStock,
    reorderLevel:      p.reorderLevel,
    price:             Number(p.price),
    warehouseLocation: p.warehouseLocation,
    categoryName:      p.category.name,
  }))

  // Group by warehouseLocation in JS
  const locationMap = new Map<string, LocationGroup>()

  for (const p of products) {
    const loc = p.warehouseLocation?.trim() || 'Unassigned'

    if (!locationMap.has(loc)) {
      locationMap.set(loc, {
        location:     loc,
        products:     [],
        productCount: 0,
        totalStock:   0,
        totalValue:   0,
      })
    }

    const group = locationMap.get(loc)!
    group.products.push(p)
    group.productCount += 1
    group.totalStock   += p.currentStock
    group.totalValue   += p.price * p.currentStock
  }

  const locationGroups: LocationGroup[] = Array.from(locationMap.values()).sort((a, b) => {
    if (a.location === 'Unassigned') return 1
    if (b.location === 'Unassigned') return -1
    return a.location.localeCompare(b.location)
  })

  // Summary stats
  const totalLocations = locationGroups.filter((g) => g.location !== 'Unassigned').length
  const totalProducts  = products.length
  const totalStock     = products.reduce((s, p) => s + p.currentStock, 0)
  const totalValue     = products.reduce((s, p) => s + p.price * p.currentStock, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Warehouse Management</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Inventory organised by warehouse location
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          {
            label: 'Locations',
            value: totalLocations,
            icon:  Warehouse,
            color: 'text-indigo-600',
            bg:    'bg-indigo-50 dark:bg-indigo-950/40',
          },
          {
            label: 'Total Products',
            value: totalProducts,
            icon:  Package,
            color: 'text-sky-600',
            bg:    'bg-sky-50 dark:bg-sky-950/40',
          },
          {
            label: 'Total Stock Units',
            value: totalStock.toLocaleString(),
            icon:  BarChart3,
            color: 'text-emerald-600',
            bg:    'bg-emerald-50 dark:bg-emerald-950/40',
          },
          {
            label: 'Inventory Value',
            value: formatCurrency(totalValue),
            icon:  DollarSign,
            color: 'text-amber-600',
            bg:    'bg-amber-50 dark:bg-amber-950/40',
          },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label}>
            <CardContent className="flex items-center gap-3 p-4">
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${bg}`}>
                <Icon className={`h-4 w-4 ${color}`} />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900 dark:text-gray-50">{value}</p>
                <p className="text-xs text-gray-500">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Location Cards Grid */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
          Locations
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {locationGroups.map((group) => {
            const top3 = group.products.slice(0, 3)
            return (
              <Card key={group.location} className="flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-indigo-500 shrink-0" />
                      <CardTitle className="text-sm font-semibold">{group.location}</CardTitle>
                    </div>
                    <Badge variant={group.location === 'Unassigned' ? 'outline' : 'secondary'}>
                      {group.productCount} product{group.productCount !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 space-y-3">
                  {/* Location summary */}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-xs text-gray-400">Total Stock</p>
                      <p className="font-semibold text-gray-800 dark:text-gray-200">
                        {group.totalStock.toLocaleString()} units
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Total Value</p>
                      <p className="font-semibold text-gray-800 dark:text-gray-200">
                        {formatCurrency(group.totalValue)}
                      </p>
                    </div>
                  </div>

                  {/* Top 3 products */}
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                      Top products
                    </p>
                    {top3.map((p) => {
                      const isLow = p.currentStock <= p.reorderLevel
                      const isOut = p.currentStock === 0
                      return (
                        <div
                          key={p.id}
                          className="flex items-center justify-between rounded-md bg-gray-50 dark:bg-gray-800/40 px-2.5 py-1.5"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-medium text-gray-800 dark:text-gray-200">
                              {p.name}
                            </p>
                            <p className="text-xs text-gray-400 font-mono">{p.sku}</p>
                          </div>
                          <div className="ml-2 flex items-center gap-1.5 shrink-0">
                            <span
                              className={`text-xs font-bold ${
                                isOut   ? 'text-red-600'
                                : isLow ? 'text-amber-600'
                                :         'text-emerald-600'
                              }`}
                            >
                              {p.currentStock}
                            </span>
                            {isOut   && <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500" />}
                            {!isOut && isLow && <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />}
                            {!isOut && !isLow && <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />}
                          </div>
                        </div>
                      )
                    })}
                    {group.productCount > 3 && (
                      <p className="text-xs text-gray-400 text-center pt-0.5">
                        +{group.productCount - 3} more product{group.productCount - 3 !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Full Products Table */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
          All Products by Location
        </h2>
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  {['Location', 'Product', 'SKU', 'Category', 'Stock', 'Status', 'Value', ''].map((h) => (
                    <th
                      key={h}
                      className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400 ${
                        ['Stock', 'Value'].includes(h) ? 'text-right' : 'text-left'
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-sm text-gray-400">
                      No products found
                    </td>
                  </tr>
                ) : (
                  products.map((p) => {
                    const isLow = p.currentStock <= p.reorderLevel
                    const isOut = p.currentStock === 0
                    const loc   = p.warehouseLocation?.trim() || 'Unassigned'

                    return (
                      <tr
                        key={p.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="h-3 w-3 text-gray-400 shrink-0" />
                            <span className={`text-xs font-medium ${loc === 'Unassigned' ? 'text-gray-400 italic' : 'text-gray-600 dark:text-gray-400'}`}>
                              {loc}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/inventory/${p.id}`}
                            className="font-medium text-gray-900 hover:text-indigo-600 dark:text-gray-100 dark:hover:text-indigo-400"
                          >
                            {p.name}
                          </Link>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.sku}</td>
                        <td className="px-4 py-3">
                          <Badge variant="secondary">{p.categoryName}</Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span
                            className={`font-bold ${
                              isOut   ? 'text-red-600'
                              : isLow ? 'text-amber-600'
                              :         'text-gray-900 dark:text-gray-100'
                            }`}
                          >
                            {p.currentStock}
                          </span>
                          <span className="ml-1 text-xs text-gray-400">/ {p.reorderLevel}</span>
                        </td>
                        <td className="px-4 py-3">
                          {isOut
                            ? <Badge variant="destructive">Out of Stock</Badge>
                            : isLow
                            ? <Badge variant="warning">Low Stock</Badge>
                            : <Badge variant="success">In Stock</Badge>
                          }
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-gray-700 dark:text-gray-300">
                          {formatCurrency(p.price * p.currentStock)}
                        </td>
                        <td className="px-4 py-3">
                          {canEdit && (
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" asChild>
                              <Link href={`/inventory/${p.id}`}>
                                <Edit className="h-3.5 w-3.5" />
                              </Link>
                            </Button>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  )
}
