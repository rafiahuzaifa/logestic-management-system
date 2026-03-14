import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createNotifications } from '@/lib/notifications'
import { z } from 'zod'

const schema = z.object({
  type:      z.enum(['IN', 'OUT', 'ADJUSTMENT']),
  quantity:  z.number().int().positive(),
  reference: z.string().optional(),
})

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['ADMIN', 'WAREHOUSE_MANAGER'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { id } = await params
    const body = await req.json()
    const { type, quantity, reference } = schema.parse(body)

    const product = await prisma.product.findUnique({ where: { id } })
    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

    const delta = type === 'OUT' ? -quantity : quantity
    const newStock = product.currentStock + delta

    if (newStock < 0) {
      return NextResponse.json({ error: `Insufficient stock. Current: ${product.currentStock}, requested: ${quantity}` }, { status: 422 })
    }

    const [movement, updated] = await prisma.$transaction([
      prisma.stockMovement.create({
        data: { productId: id, type, quantity, reference },
      }),
      prisma.product.update({
        where: { id: id },
        data: { currentStock: newStock },
      }),
    ])

    await prisma.auditLog.create({
      data: { userId: session.user.id, action: 'STOCK_ADJUST', entity: 'Product', entityId: id },
    })

    // Fire low-stock notification if stock dropped below reorder level
    if (newStock <= updated.reorderLevel && (type === 'OUT' || type === 'ADJUSTMENT')) {
      await createNotifications({
        title: 'Low Stock Alert',
        message: `${updated.name} (${updated.sku}) is low: ${newStock} units remaining (reorder at ${updated.reorderLevel}).`,
        type: 'LOW_STOCK',
        entityType: 'product',
        entityId: id,
        roles: ['ADMIN', 'WAREHOUSE_MANAGER'],
      })
    }

    return NextResponse.json({ movement, product: updated })
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues[0]?.message }, { status: 400 })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
