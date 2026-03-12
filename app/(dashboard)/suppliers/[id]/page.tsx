import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { SupplierForm } from '@/components/suppliers/SupplierForm'
import { formatCurrency, formatDate } from '@/lib/utils'
import { ArrowLeft, Building2, Mail, Phone, MapPin, Star, Clock, ShoppingCart } from 'lucide-react'

export const dynamic = 'force-dynamic'

type POStatus = 'PENDING' | 'APPROVED' | 'RECEIVED' | 'CANCELLED'

const PO_STATUS_VARIANTS: Record<POStatus, 'warning' | 'default' | 'success' | 'destructive'> = {
  PENDING:   'warning',
  APPROVED:  'default',
  RECEIVED:  'success',
  CANCELLED: 'destructive',
}

function RatingBadge({ rating }: { rating: number }) {
  const color =
    rating >= 4 ? 'text-emerald-600 dark:text-emerald-400'
    : rating >= 3 ? 'text-amber-600 dark:text-amber-400'
    : 'text-red-600 dark:text-red-400'
  return <span className={`text-2xl font-bold ${color}`}>{rating.toFixed(1)}</span>
}

export default async function SupplierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getServerSession(authOptions)
  const canEdit   = ['ADMIN', 'WAREHOUSE_MANAGER'].includes(session?.user?.role ?? '')
  const isAdmin   = session?.user?.role === 'ADMIN'

  const { id } = await params

  const supplier = await prisma.supplier.findUnique({
    where: { id },
    include: {
      purchaseOrders: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id:          true,
          status:      true,
          totalAmount: true,
          createdAt:   true,
        },
      },
      _count: { select: { purchaseOrders: true } },
    },
  })

  if (!supplier) notFound()

  const rating     = Number(supplier.rating)
  const lastPODate = supplier.purchaseOrders[0]?.createdAt

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/suppliers">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">{supplier.name}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{supplier.email}</p>
          </div>
        </div>
        {isAdmin && (
          <Button variant="destructive" size="sm" asChild>
            {/* Delete handled client-side via a small inline form or redirect */}
            <Link href={`/suppliers/${id}/delete`}>Delete Supplier</Link>
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Edit form (col-span-2) */}
        <div className="lg:col-span-2 space-y-6">
          {canEdit ? (
            <SupplierForm
              mode="edit"
              supplierId={supplier.id}
              defaultValues={{
                name:         supplier.name,
                email:        supplier.email,
                phone:        supplier.phone ?? undefined,
                address:      supplier.address ?? undefined,
                rating:       rating,
                leadTimeDays: supplier.leadTimeDays,
              }}
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Supplier Details</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-4 text-sm">
                  {([
                    ['Name',    supplier.name],
                    ['Email',   supplier.email],
                    ['Phone',   supplier.phone ?? '—'],
                    ['Address', supplier.address ?? '—'],
                    ['Rating',  `${rating.toFixed(1)} / 5`],
                    ['Lead Time', `${supplier.leadTimeDays} days`],
                  ] as [string, string][]).map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-gray-500">{label}</dt>
                      <dd className="font-medium text-gray-900 dark:text-gray-100">{value}</dd>
                    </div>
                  ))}
                </dl>
              </CardContent>
            </Card>
          )}

          {/* PO History Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Purchase Order History</CardTitle>
              <CardDescription>
                {supplier._count.purchaseOrders} total order{supplier._count.purchaseOrders !== 1 ? 's' : ''}
                {lastPODate && ` · Last order ${formatDate(lastPODate)}`}
              </CardDescription>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    {['Order ID', 'Date', 'Status', 'Amount'].map((h) => (
                      <th
                        key={h}
                        className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400 ${
                          h === 'Amount' ? 'text-right' : 'text-left'
                        }`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                  {supplier.purchaseOrders.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-400">
                        No purchase orders yet
                      </td>
                    </tr>
                  ) : (
                    supplier.purchaseOrders.map((po) => (
                      <tr key={po.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-gray-500">
                          {po.id.slice(0, 8)}…
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                          {formatDate(po.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={PO_STATUS_VARIANTS[po.status as POStatus] ?? 'outline'}>
                            {po.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-gray-700 dark:text-gray-300">
                          {formatCurrency(Number(po.totalAmount))}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Right: Summary cards */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Supplier Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Rating */}
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-950/40">
                  <Star className="h-4 w-4 text-amber-600" />
                </div>
                <div>
                  <RatingBadge rating={rating} />
                  <p className="text-xs text-gray-500">Quality rating</p>
                </div>
              </div>

              {/* Lead time */}
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-50 dark:bg-sky-950/40">
                  <Clock className="h-4 w-4 text-sky-600" />
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900 dark:text-gray-50">
                    {supplier.leadTimeDays} days
                  </p>
                  <p className="text-xs text-gray-500">Lead time</p>
                </div>
              </div>

              {/* PO count */}
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/40">
                  <ShoppingCart className="h-4 w-4 text-indigo-600" />
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900 dark:text-gray-50">
                    {supplier._count.purchaseOrders}
                  </p>
                  <p className="text-xs text-gray-500">Purchase orders</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-start gap-2.5">
                <Building2 className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                <span className="text-gray-700 dark:text-gray-300">{supplier.name}</span>
              </div>
              <div className="flex items-start gap-2.5">
                <Mail className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                <a href={`mailto:${supplier.email}`} className="text-indigo-600 hover:underline dark:text-indigo-400">
                  {supplier.email}
                </a>
              </div>
              {supplier.phone && (
                <div className="flex items-start gap-2.5">
                  <Phone className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                  <a href={`tel:${supplier.phone}`} className="text-gray-700 dark:text-gray-300 hover:text-indigo-600">
                    {supplier.phone}
                  </a>
                </div>
              )}
              {supplier.address && (
                <div className="flex items-start gap-2.5">
                  <MapPin className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                  <span className="text-gray-700 dark:text-gray-300">{supplier.address}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
