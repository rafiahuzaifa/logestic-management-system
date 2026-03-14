import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createNotifications } from '@/lib/notifications'
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

    if (rest.status === 'DELAYED') {
      await createNotifications({
        title: 'Shipment Delayed',
        message: `Shipment #${shipment.id.slice(-8).toUpperCase()} for ${(shipment as any).salesOrder?.customer?.name ?? 'a customer'} has been marked as delayed.`,
        type: 'SHIPMENT_DELAYED',
        entityType: 'shipment',
        entityId: id,
        roles: ['ADMIN', 'LOGISTICS_OFFICER', 'SALES_MANAGER'],
      })
    } else if (rest.status === 'DELIVERED') {
      await createNotifications({
        title: 'Shipment Delivered',
        message: `Shipment #${shipment.id.slice(-8).toUpperCase()} for ${(shipment as any).salesOrder?.customer?.name ?? 'a customer'} has been delivered.`,
        type: 'SHIPMENT_DELIVERED',
        entityType: 'shipment',
        entityId: id,
        roles: ['ADMIN', 'SALES_MANAGER'],
      })
    }

    return NextResponse.json(shipment)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to update shipment' }, { status: 500 })
  }
}
