import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { Plus } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ search?: string; type?: string }>
}

export default async function CustomersPage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  const sp = await searchParams
  const search = sp.search ?? ''
  const typeFilter = sp.type ?? ''

  const rawCustomers = await prisma.customer.findMany({
    include: {
      salesOrders: { select: { totalAmount: true } },
      _count: { select: { salesOrders: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const customers = rawCustomers.filter((c) => {
    const matchSearch = !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      (c.phone ?? '').includes(search)
    const matchType = !typeFilter || c.companyType === typeFilter
    return matchSearch && matchType
  })

  const totalRevenue = rawCustomers.reduce(
    (s, c) => s + c.salesOrders.reduce((ss, o) => ss + Number(o.totalAmount), 0), 0
  )
  const activeCustomers = rawCustomers.filter((c) => c._count.salesOrders > 0).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Customers</h1>
          <p className="text-sm text-gray-500">{customers.length} of {rawCustomers.length} customers</p>
        </div>
        <Link href="/customers/new">
          <Button className="bg-[#387dff] hover:bg-[#2563eb]">
            <Plus className="mr-2 h-4 w-4" /> Add Customer
          </Button>
        </Link>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Total Customers', value: rawCustomers.length },
          { label: 'Active (with orders)', value: activeCustomers },
          { label: 'Total Orders', value: rawCustomers.reduce((s, c) => s + c._count.salesOrders, 0) },
          { label: 'Total Revenue', value: formatCurrency(totalRevenue) },
        ].map(({ label, value }) => (
          <Card key={label}>
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">{value}</p>
              <p className="text-xs text-gray-500 mt-1">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <form method="get" className="flex flex-wrap gap-3">
            <input
              name="search"
              defaultValue={search}
              placeholder="Search by name, email, phone…"
              className="h-9 flex-1 min-w-[200px] rounded-lg border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#387dff] dark:bg-gray-900 dark:border-gray-700"
            />
            <select
              name="type"
              defaultValue={typeFilter}
              className="h-9 rounded-lg border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#387dff] dark:bg-gray-900 dark:border-gray-700"
            >
              <option value="">All Types</option>
              <option value="Corporate">Corporate</option>
              <option value="SME">SME</option>
              <option value="Retail">Retail</option>
              <option value="Government">Government</option>
              <option value="Other">Other</option>
            </select>
            <Button type="submit" variant="outline" size="sm">Filter</Button>
            {(search || typeFilter) && (
              <Button variant="ghost" size="sm" asChild><Link href="/customers">Clear</Link></Button>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 dark:bg-gray-800/50 text-xs uppercase text-gray-500">
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Email</th>
                <th className="px-4 py-3 text-left font-medium">Phone</th>
                <th className="px-4 py-3 text-left font-medium">Type</th>
                <th className="px-4 py-3 text-right font-medium">Credit Limit</th>
                <th className="px-4 py-3 text-center font-medium">Orders</th>
                <th className="px-4 py-3 text-right font-medium">Revenue</th>
                <th className="px-4 py-3 text-left font-medium">Joined</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {customers.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-10 text-center text-gray-400">No customers found</td></tr>
              ) : (
                customers.map((c) => {
                  const revenue = c.salesOrders.reduce((s, o) => s + Number(o.totalAmount), 0)
                  return (
                    <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{c.name}</td>
                      <td className="px-4 py-3 text-gray-500">{c.email}</td>
                      <td className="px-4 py-3 text-gray-500">{c.phone ?? '—'}</td>
                      <td className="px-4 py-3">
                        {c.companyType
                          ? <Badge variant="secondary">{c.companyType}</Badge>
                          : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                        {c.creditLimit != null ? formatCurrency(Number(c.creditLimit)) : '—'}
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-[#387dff]">{c._count.salesOrders}</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-700 dark:text-gray-300">
                        {revenue > 0 ? formatCurrency(revenue) : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {new Date(c.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/customers/${c.id}`}>View</Link>
                        </Button>
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
  )
}
