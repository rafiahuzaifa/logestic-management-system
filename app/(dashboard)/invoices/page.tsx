import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, FileText, TrendingUp, TrendingDown, DollarSign } from 'lucide-react'
import { InvoiceActions } from '@/components/invoices/InvoiceActions'

export const dynamic = 'force-dynamic'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fmt(v: any) {
  if (v == null) return '—'
  return `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const statusColor: Record<string, string> = {
  UNPAID:  'destructive',
  PARTIAL: 'warning',
  PAID:    'default',
}

export default async function InvoicesPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const invoices = await prisma.invoice.findMany({
    include: { salesOrder: { include: { customer: true } } },
    orderBy: { createdAt: 'desc' },
  })

  const totalSelling  = invoices.reduce((s, i) => s + Number(i.amount), 0)
  const totalVendor   = invoices.reduce((s, i) => s + Number(i.vendorCost ?? 0), 0)
  const totalProfit   = totalSelling - totalVendor
  const profitMargin  = totalSelling > 0 ? ((totalProfit / totalSelling) * 100).toFixed(1) : '0.0'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Invoices</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Billing, vendor cost &amp; profit overview</p>
        </div>
        <Link href="/invoices/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Invoice
          </Button>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-indigo-50 dark:bg-indigo-900/20 p-2">
                <FileText className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Invoices</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">{invoices.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-sky-50 dark:bg-sky-900/20 p-2">
                <DollarSign className="h-5 w-5 text-sky-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Selling</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">
                  ${totalSelling.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 p-2">
                <TrendingDown className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Vendor Cost</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">
                  ${totalVendor.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`rounded-lg p-2 ${totalProfit >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                <TrendingUp className={`h-5 w-5 ${totalProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`} />
              </div>
              <div>
                <p className="text-xs text-gray-500">Net Profit ({profitMargin}%)</p>
                <p className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  ${totalProfit.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Invoices</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 dark:bg-gray-800/50 text-xs uppercase text-gray-500">
                  <th className="px-4 py-3 text-left font-medium">Invoice #</th>
                  <th className="px-4 py-3 text-left font-medium">Company Name</th>
                  <th className="px-4 py-3 text-left font-medium">Billing Period</th>
                  <th className="px-4 py-3 text-right font-medium">Vendor Price</th>
                  <th className="px-4 py-3 text-right font-medium">Selling Price</th>
                  <th className="px-4 py-3 text-right font-medium">Profit</th>
                  <th className="px-4 py-3 text-center font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Date</th>
                  <th className="px-4 py-3 text-left font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                      No invoices yet.{' '}
                      <Link href="/invoices/new" className="text-indigo-600 hover:underline">
                        Create one
                      </Link>
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => {
                    const profit = inv.vendorCost != null
                      ? Number(inv.amount) - Number(inv.vendorCost)
                      : null
                    const companyName = inv.companyName || inv.salesOrder.customer.name
                    return (
                      <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                        <td className="px-4 py-3 font-mono font-medium text-indigo-600">{inv.invoiceNumber}</td>
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{companyName}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{inv.billingPeriod ?? '—'}</td>
                        <td className="px-4 py-3 text-right text-amber-700 dark:text-amber-400">{fmt(inv.vendorCost)}</td>
                        <td className="px-4 py-3 text-right text-sky-700 dark:text-sky-400">{fmt(inv.amount)}</td>
                        <td className={`px-4 py-3 text-right font-semibold ${
                          profit == null ? 'text-gray-400' :
                          profit >= 0 ? 'text-emerald-600' : 'text-red-600'
                        }`}>
                          {profit == null ? '—' : `$${profit.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant={statusColor[inv.paidStatus] as 'default' | 'destructive' | 'warning' | 'secondary'}>
                            {inv.paidStatus}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {new Date(inv.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <InvoiceActions inv={{
                            id: inv.id,
                            invoiceNumber: inv.invoiceNumber,
                            companyName: inv.companyName,
                            billingPeriod: inv.billingPeriod,
                            amount: inv.amount.toString(),
                            vendorCost: inv.vendorCost?.toString() ?? null,
                            paidStatus: inv.paidStatus,
                          }} />
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
