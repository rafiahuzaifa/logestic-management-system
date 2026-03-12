import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { StockAdjustModal } from '@/components/inventory/StockAdjustModal'
import { InventoryFilters } from '@/components/inventory/InventoryFilters'
import { formatCurrency } from '@/lib/utils'
import { Plus, Package, AlertTriangle, Edit, ArrowUpDown } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: { search?: string; category?: string; lowStock?: string; page?: string }
}

export default async function InventoryPage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions)
  const canEdit = ['ADMIN', 'WAREHOUSE_MANAGER'].includes(session?.user?.role ?? '')

  const search     = searchParams.search ?? ''
  const categoryId = searchParams.category ?? ''
  const lowStock   = searchParams.lowStock === 'true'
  const page       = Math.max(1, Number(searchParams.page ?? 1))
  const limit      = 20

  const where: any = {}
  if (search)     where.OR = [{ name: { contains: search, mode: 'insensitive' } }, { sku: { contains: search, mode: 'insensitive' } }]
  if (categoryId) where.categoryId = categoryId

  const [allProducts, total, categories] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { category: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' },
      skip: (page - 1) * limit,
      take: lowStock ? undefined : limit,
    }),
    prisma.product.count({ where }),
    prisma.category.findMany({ orderBy: { name: 'asc' } }),
  ])

  const products = lowStock ? allProducts.filter((p) => p.currentStock <= p.reorderLevel) : allProducts
  const totalPages = Math.ceil(total / limit)

  const lowStockCount = allProducts.filter((p) => p.currentStock <= p.reorderLevel).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Inventory</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {total} products · {lowStockCount > 0 && <span className="text-amber-600 font-medium">{lowStockCount} low stock</span>}
          </p>
        </div>
        {canEdit && (
          <Button asChild>
            <Link href="/inventory/new"><Plus className="h-4 w-4 mr-1" /> Add Product</Link>
          </Button>
        )}
      </div>

      {/* Stats Strip */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Total Products', value: total, icon: Package, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-950/40' },
          { label: 'Low Stock', value: lowStockCount, icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/40' },
          { label: 'Categories', value: categories.length, icon: ArrowUpDown, color: 'text-sky-600', bg: 'bg-sky-50 dark:bg-sky-950/40' },
          { label: 'Total Value', value: formatCurrency(allProducts.reduce((s, p) => s + Number(p.price) * p.currentStock, 0)), icon: Package, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/40' },
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

      {/* Filters */}
      <InventoryFilters categories={categories} />

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                {['Product', 'SKU', 'Category', 'Location', 'Unit Price', 'Stock', 'Status', ''].map((h) => (
                  <th key={h} className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400 ${['Unit Price', 'Stock'].includes(h) ? 'text-right' : 'text-left'}`}>
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
                  return (
                    <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/inventory/${p.id}`} className="font-medium text-gray-900 hover:text-indigo-600 dark:text-gray-100 dark:hover:text-indigo-400">
                          {p.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.sku}</td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary">{p.category.name}</Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{p.warehouseLocation ?? '—'}</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-700 dark:text-gray-300">
                        {formatCurrency(Number(p.price))}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-bold ${isOut ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-gray-900 dark:text-gray-100'}`}>
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
                      <td className="px-4 py-3">
                        {canEdit && (
                          <div className="flex items-center gap-1">
                            <StockAdjustModal productId={p.id} productName={p.name} currentStock={p.currentStock} onSuccess={() => {}}>
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs">Adjust</Button>
                            </StockAdjustModal>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" asChild>
                              <Link href={`/inventory/${p.id}`}><Edit className="h-3.5 w-3.5" /></Link>
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 dark:border-gray-800">
            <p className="text-sm text-gray-500">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              {page > 1 && (
                <Button size="sm" variant="outline" asChild>
                  <Link href={`/inventory?page=${page - 1}&search=${search}&category=${categoryId}`}>Previous</Link>
                </Button>
              )}
              {page < totalPages && (
                <Button size="sm" variant="outline" asChild>
                  <Link href={`/inventory?page=${page + 1}&search=${search}&category=${categoryId}`}>Next</Link>
                </Button>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
