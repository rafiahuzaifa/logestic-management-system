import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { ShipmentForm } from '@/components/shipments/ShipmentForm'

export default async function NewShipmentPage() {
  const session = await getServerSession(authOptions)
  if (!['ADMIN', 'WAREHOUSE_MANAGER', 'LOGISTICS_OFFICER'].includes(session?.user?.role ?? '')) {
    redirect('/shipments')
  }

  const [carriers, salesOrders] = await Promise.all([
    prisma.carrier.findMany({ orderBy: { name: 'asc' } }),
    prisma.salesOrder.findMany({
      where:   { status: { in: ['CONFIRMED', 'PACKED'] } },
      include: { customer: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take:    100,
    }),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">New Shipment</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Create a shipment record for a sales order</p>
      </div>
      <ShipmentForm carriers={carriers} salesOrders={salesOrders} />
    </div>
  )
}
