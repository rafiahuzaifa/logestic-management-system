import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'

const createSchema = z.object({
  salesOrderId:      z.string().min(1, 'Sales order is required'),
  carrierId:         z.string().min(1, 'Carrier is required'),
  trackingNumber:    z.string().optional(),
  estimatedDelivery: z.string().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const status    = searchParams.get('status')
    const carrierId = searchParams.get('carrierId')
    const page      = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
    const limit     = 20
    const skip      = (page - 1) * limit

    const where: Record<string, unknown> = {}
    if (status)    where.status    = status
    if (carrierId) where.carrierId = carrierId

    const [shipments, total] = await Promise.all([
      prisma.shipment.findMany({
        where,
        include: {
          carrier:    { select: { id: true, name: true } },
          salesOrder: { select: { id: true, customer: { select: { name: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.shipment.count({ where }),
    ])

    return NextResponse.json({ shipments, total, page, pages: Math.ceil(total / limit) })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to fetch shipments' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!['ADMIN', 'WAREHOUSE_MANAGER', 'LOGISTICS_OFFICER'].includes(session?.user?.role ?? '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const body = await req.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Validation error' }, { status: 400 })
    }
    const { estimatedDelivery, ...rest } = parsed.data
    const shipment = await prisma.shipment.create({
      data: {
        ...rest,
        trackingNumber:    rest.trackingNumber || null,
        estimatedDelivery: estimatedDelivery ? new Date(estimatedDelivery) : null,
        status:            'PENDING',
      },
      include: { carrier: true, salesOrder: { include: { customer: true } } },
    })
    return NextResponse.json(shipment, { status: 201 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to create shipment' }, { status: 500 })
  }
}
