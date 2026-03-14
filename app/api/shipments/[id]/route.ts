import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createNotifications } from '@/lib/notifications'
import { triggerWatchers } from '@/lib/watchers'
import { z } from 'zod'

const updateSchema = z.object({
  trackingNumber:    z.string().optional(),
  status:            z.enum(['PENDING', 'IN_TRANSIT', 'DELIVERED', 'DELAYED']).optional(),
  estimatedDelivery: z.string().optional(),
})

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const shipment = await prisma.shipment.findUnique({
      where: { id },
      include: {
        carrier:    true,
        salesOrder: { include: { customer: true, lineItems: { include: { product: true } } } },
      },
    })
    if (!shipment) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(shipment)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to fetch shipment' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!['ADMIN', 'WAREHOUSE_MANAGER', 'LOGISTICS_OFFICER'].includes(session?.user?.role ?? '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const { id } = await params
    const body = await req.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Validation error' }, { status: 400 })
    }
    const { estimatedDelivery, ...rest } = parsed.data
    const shipment = await prisma.shipment.update({
      where: { id },
      data: {
        ...rest,
        estimatedDelivery: estimatedDelivery ? new Date(estimatedDelivery) : undefined,
      },
      include: { carrier: true, salesOrder: { include: { customer: true } } },
    })

    const customer = (shipment as any).salesOrder?.customer?.name ?? 'a customer'
    const carrier  = shipment.carrier?.name ?? '—'
    const ref      = `#${shipment.id.slice(-8).toUpperCase()}`

    if (rest.status === 'DELAYED') {
      const msg = `Shipment ${ref} for ${customer} via ${carrier} has been marked as delayed.`
      await createNotifications({ title: 'Shipment Delayed', message: msg, type: 'SHIPMENT_DELAYED', entityType: 'shipment', entityId: id, roles: ['ADMIN', 'LOGISTICS_OFFICER', 'SALES_MANAGER'] })
      await triggerWatchers({ entityType: 'shipment', eventType: 'delayed', entityId: id, title: 'Shipment Delayed', message: msg, details: { 'Shipment': ref, 'Customer': customer, 'Carrier': carrier, 'Tracking': shipment.trackingNumber ?? '—' } })
    } else if (rest.status === 'DELIVERED') {
      const msg = `Shipment ${ref} for ${customer} has been delivered.`
      await createNotifications({ title: 'Shipment Delivered', message: msg, type: 'SHIPMENT_DELIVERED', entityType: 'shipment', entityId: id, roles: ['ADMIN', 'SALES_MANAGER'] })
      await triggerWatchers({ entityType: 'shipment', eventType: 'status_change', entityId: id, title: 'Shipment Delivered', message: msg, details: { 'Shipment': ref, 'Customer': customer, 'Carrier': carrier } })
    } else if (rest.status === 'IN_TRANSIT') {
      await triggerWatchers({ entityType: 'shipment', eventType: 'status_change', entityId: id, title: 'Shipment In Transit', message: `Shipment ${ref} for ${customer} is now in transit.`, details: { 'Shipment': ref, 'Customer': customer, 'Carrier': carrier, 'Tracking': shipment.trackingNumber ?? '—' } })
    }

    return NextResponse.json(shipment)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to update shipment' }, { status: 500 })
  }
}
