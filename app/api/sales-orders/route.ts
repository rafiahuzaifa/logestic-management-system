import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

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
    // b.lineItems: [{ productId, quantity, unitPrice }]
    const totalAmount = (b.lineItems as { quantity: number; unitPrice: number }[])
      .reduce((s, li) => s + li.quantity * li.unitPrice, 0)

    const order = await prisma.salesOrder.create({
      data: {
        customerId: b.customerId,
        createdById: session.user.id,
        status: b.status ?? 'DRAFT',
        totalAmount,
        lineItems: {
          create: (b.lineItems as { productId: string; quantity: number; unitPrice: number }[]).map((li) => ({
            productId: li.productId,
            quantity: li.quantity,
            unitPrice: li.unitPrice,
          })),
        },
      },
      include: {
        customer: true,
        lineItems: { include: { product: true } },
      },
    })
    return NextResponse.json(order, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
