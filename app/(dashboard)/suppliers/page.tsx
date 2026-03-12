import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { SupplierSearch } from '@/components/suppliers/SupplierSearch'
import { Plus, Building2, Star, Clock, ShoppingCart } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ search?: string }>
}

function RatingDisplay({ rating }: { rating: number }) {
  const color =
    rating >= 4 ? 'text-emerald-600 dark:text-emerald-400'
    : rating >= 3 ? 'text-amber-600 dark:text-amber-400'
    : 'text-red-600 dark:text-red-400'

  return (
    <span className={`font-semibold ${color}`}>
      {rating.toFixed(1)}
    </span>
  )
}

export default async function SuppliersPage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions)
  const canEdit = ['ADMIN', 'WAREHOUSE_MANAGER'].includes(session?.user?.role ?? '')

  const { search = '' } = await searchParams

  const where = search
    ? {
        OR: [
          { name:    { contains: search, mode: 'insensitive' as const } },
          { email:   { contains: search, mode: 'insensitive' as const } },
          { phone:   { contains: search, mode: 'insensitive' as const } },
          { address: { contains: search, mode: 'insensitive' as const } },
        ],
      }
    : {}

  const suppliers = await prisma.supplier.findMany({
    where,
    orderBy: { name: 'asc' },
    include: { _count: { select: { purchaseOrders: true } } },
  })

  const total = suppliers.length
  const avgRating =
    total > 0
      ? suppliers.reduce((sum, s) => sum + Number(s.rating), 0) / total
      : 0
  const avgLeadTime =
    total > 0
      ? suppliers.reduce((sum, s) => sum + s.leadTimeDays, 0) / total
      : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Suppliers</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {total} supplier{total !== 1 ? 's' : ''} registered
          </p>
        </div>
        {canEdit && (
          <Button asChild>
            <Link href="/suppliers/new">
              <Plus className="h-4 w-4 mr-1.5" />
              Add Supplier
            </Link>
          </Button>
        )}
      </div>

      {/* Stats Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          {
            label: 'Total Suppliers',
            value: total,
            icon: Building2,
            color: 'text-indigo-600',
            bg: 'bg-indigo-50 dark:bg-indigo-950/40',
          },
          {
            label: 'Avg Rating',
            value: avgRating.toFixed(1),
            icon: Star,
            color: 'text-amber-600',
            bg: 'bg-amber-50 dark:bg-amber-950/40',
          },
          {
            label: 'Avg Lead Time',
            value: `${avgLeadTime.toFixed(0)} days`,
            icon: Clock,
            color: 'text-sky-600',
            bg: 'bg-sky-50 dark:bg-sky-950/40',
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

      {/* Search */}
      <SupplierSearch initialSearch={search} />

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                {['Name', 'Email', 'Phone', 'Rating', 'Lead Time', 'PO Count', ''].map((h) => (
                  <th
                    key={h}
                    className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400 ${
                      ['Rating', 'Lead Time', 'PO Count'].includes(h) ? 'text-right' : 'text-left'
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
              {suppliers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-400">
                    No suppliers found
                  </td>
                </tr>
              ) : (
                suppliers.map((s) => (
                  <tr
                    key={s.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/suppliers/${s.id}`}
                        className="font-medium text-gray-900 hover:text-indigo-600 dark:text-gray-100 dark:hover:text-indigo-400"
                      >
                        {s.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{s.email}</td>
                    <td className="px-4 py-3 text-gray-500">{s.phone ?? '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <RatingDisplay rating={Number(s.rating)} />
                      <span className="ml-1 text-xs text-gray-400">/ 5</span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                      {s.leadTimeDays}d
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Badge variant={s._count.purchaseOrders > 0 ? 'secondary' : 'outline'}>
                        <ShoppingCart className="h-3 w-3 mr-1" />
                        {s._count.purchaseOrders}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" asChild>
                        <Link href={`/suppliers/${s.id}`}>View</Link>
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
