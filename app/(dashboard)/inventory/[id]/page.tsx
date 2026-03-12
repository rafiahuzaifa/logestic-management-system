import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ProductForm } from '@/components/inventory/ProductForm'
import { StockAdjustModal } from '@/components/inventory/StockAdjustModal'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { ArrowUpCircle, ArrowDownCircle, RefreshCw, ArrowLeft, SlidersHorizontal } from 'lucide-react'

export const dynamic = 'force-dynamic'

const MOVEMENT_ICONS = {
  IN:         { icon: ArrowUpCircle,   color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
  OUT:        { icon: ArrowDownCircle, color: 'text-red-600',     bg: 'bg-red-50 dark:bg-red-950/30' },
  ADJUSTMENT: { icon: RefreshCw,       color: 'text-amber-600',   bg: 'bg-amber-50 dark:bg-amber-950/30' },
}

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  const canEdit = ['ADMIN', 'WAREHOUSE_MANAGER'].includes(session?.user?.role ?? '')
  const { id }  = await params

  const [product, categories] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        stockMovements: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    }),
    prisma.category.findMany({ orderBy: { name: 'asc' } }),
  ])

  if (!product) notFound()

  const isLow = product.currentStock <= product.reorderLevel
  const isOut = product.currentStock === 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/inventory"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">{product.name}</h1>
            <p className="text-sm text-gray-500 font-mono">{product.sku} · {product.category.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isOut   && <Badge variant="destructive">Out of Stock</Badge>}
          {!isOut && isLow && <Badge variant="warning">Low Stock</Badge>}
          {!isOut && !isLow && <Badge variant="success">In Stock</Badge>}
          {canEdit && (
            <StockAdjustModal productId={product.id} productName={product.name} currentStock={product.currentStock}>
              <Button variant="outline" className="gap-1.5">
                <SlidersHorizontal className="h-4 w-4" /> Adjust Stock
              </Button>
            </StockAdjustModal>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Edit form */}
        <div className="lg:col-span-2 space-y-6">
          {canEdit ? (
            <ProductForm
              categories={categories}
              mode="edit"
              productId={product.id}
              defaultValues={{
                name: product.name,
                sku: product.sku,
                categoryId: product.categoryId,
                unit: product.unit,
                price: Number(product.price),
                reorderLevel: product.reorderLevel,
                warehouseLocation: product.warehouseLocation ?? undefined,
              }}
            />
          ) : (
            <Card>
              <CardHeader><CardTitle className="text-base">Product Details</CardTitle></CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-4 text-sm">
                  {[
                    ['Name', product.name],
                    ['SKU', product.sku],
                    ['Category', product.category.name],
                    ['Unit', product.unit],
                    ['Price', formatCurrency(Number(product.price))],
                    ['Reorder Level', product.reorderLevel],
                    ['Location', product.warehouseLocation ?? '—'],
                  ].map(([label, value]) => (
                    <div key={String(label)}>
                      <dt className="text-gray-500">{label}</dt>
                      <dd className="font-medium text-gray-900 dark:text-gray-100">{value}</dd>
                    </div>
                  ))}
                </dl>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Stock info + movements */}
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Stock Overview</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-3xl font-bold text-gray-900 dark:text-gray-50">{product.currentStock}</p>
                  <p className="text-sm text-gray-500">{product.unit} in stock</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Reorder at</p>
                  <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">{product.reorderLevel}</p>
                </div>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                <div
                  className={`h-full rounded-full ${isOut ? 'bg-red-500' : isLow ? 'bg-amber-500' : 'bg-emerald-500'}`}
                  style={{ width: `${Math.min((product.currentStock / Math.max(product.reorderLevel * 2, 1)) * 100, 100)}%` }}
                />
              </div>
              <div className="pt-1 text-xs text-gray-400">
                Inventory value: <span className="font-medium text-gray-700 dark:text-gray-300">{formatCurrency(Number(product.price) * product.currentStock)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Movement History</CardTitle></CardHeader>
            <CardContent className="space-y-2.5">
              {product.stockMovements.length === 0 ? (
                <p className="text-sm text-gray-400">No movements recorded</p>
              ) : (
                product.stockMovements.map((m) => {
                  const { icon: Icon, color, bg } = MOVEMENT_ICONS[m.type as keyof typeof MOVEMENT_ICONS] ?? MOVEMENT_ICONS.ADJUSTMENT
                  return (
                    <div key={m.id} className="flex items-start gap-2.5">
                      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${bg} mt-0.5`}>
                        <Icon className={`h-3.5 w-3.5 ${color}`} />
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <div className="flex items-center justify-between">
                          <span className={`text-sm font-semibold ${color}`}>
                            {m.type === 'OUT' ? '-' : '+'}{m.quantity}
                          </span>
                          <span className="text-xs text-gray-400">{formatDateTime(m.createdAt)}</span>
                        </div>
                        {m.reference && <p className="truncate text-xs text-gray-500">{m.reference}</p>}
                      </div>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
