import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createNotifications } from '@/lib/notifications'
import { triggerWatchers } from '@/lib/watchers'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const orders = await prisma.salesOrder.findMany({
      include: {
        customer: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true } },
        _count: { select: { lineItems: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(orders)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const b = await req.json()
    const totalAmount = (b.lineItems as { quantity: number; unitPrice: number }[])
      .reduce((s, li) => s + li.quantity * li.unitPrice, 0)

    const order = await prisma.salesOrder.create({
      data: {
        customerId:      b.customerId,
        createdById:     session.user.id,
        status:          b.status ?? 'DRAFT',
        priority:        b.priority ?? 'NORMAL',
        currency:        b.currency ?? 'USD',
        totalAmount,
        discount:        b.discount ?? null,
        deliveryAddress: b.deliveryAddress ?? null,
        notes:           b.notes ?? null,
        dueDate:         b.dueDate ? new Date(b.dueDate) : null,
        lineItems: {
          create: (b.lineItems as { productId: string; quantity: number; unitPrice: number; discount?: number }[]).map((li) => ({
            productId: li.productId,
            quantity:  li.quantity,
            unitPrice: li.unitPrice,
            discount:  li.discount ?? 0,
          })),
        },
      },
      include: {
        customer: true,
        lineItems: { include: { product: true } },
      },
    })

    const orderMsg = `Order #${order.id.slice(-8).toUpperCase()} created for ${order.customer.name} — $${totalAmount.toFixed(2)}`
    await createNotifications({ title: 'New Sales Order', message: orderMsg, type: 'NEW_ORDER', entityType: 'sales_order', entityId: order.id, roles: ['ADMIN', 'SALES_MANAGER'] })
    await triggerWatchers({ entityType: 'sales_order', eventType: 'created', entityId: order.id, title: 'New Sales Order', message: orderMsg, details: { 'Order': `#${order.id.slice(-8).toUpperCase()}`, 'Customer': order.customer.name, 'Total': `$${totalAmount.toFixed(2)}`, 'Items': String(order.lineItems.length) } })

    return NextResponse.json(order, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
