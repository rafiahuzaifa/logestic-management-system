import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateSchema = z.object({
  name:         z.string().min(2, 'Name must be at least 2 characters').optional(),
  email:        z.string().email('Invalid email address').optional(),
  phone:        z.string().optional(),
  address:      z.string().optional(),
  rating:       z.number().min(0).max(5).optional(),
  leadTimeDays: z.number().int().positive().optional(),
})

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const supplier = await prisma.supplier.findUnique({
    where: { id },
    include: {
      purchaseOrders: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id:          true,
          status:      true,
          totalAmount: true,
          createdAt:   true,
        },
      },
      _count: { select: { purchaseOrders: true } },
    },
  })

  if (!supplier) return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })

  const lastPO = supplier.purchaseOrders[0]?.createdAt ?? null

  return NextResponse.json({ ...supplier, lastPODate: lastPO })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['ADMIN', 'WAREHOUSE_MANAGER'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params

  try {
    const body = await req.json()
    const data = updateSchema.parse(body)

    const existing = await prisma.supplier.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })

    if (data.email && data.email !== existing.email) {
      const emailConflict = await prisma.supplier.findUnique({ where: { email: data.email } })
      if (emailConflict) return NextResponse.json({ error: 'Email already in use' }, { status: 409 })
    }

    const supplier = await prisma.supplier.update({ where: { id }, data })

    await prisma.auditLog.create({
      data: { userId: session.user.id, action: 'UPDATE', entity: 'Supplier', entityId: id },
    })

    return NextResponse.json(supplier)
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues[0]?.message }, { status: 400 })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden – ADMIN only' }, { status: 403 })
  }

  const { id } = await params

  const existing = await prisma.supplier.findUnique({
    where: { id },
    include: { _count: { select: { purchaseOrders: true } } },
  })
  if (!existing) return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })

  // Check for active (non-cancelled) POs
  const activePOs = await prisma.purchaseOrder.count({
    where: { supplierId: id, status: { not: 'CANCELLED' } },
  })
  if (activePOs > 0) {
    return NextResponse.json(
      { error: `Cannot delete: supplier has ${activePOs} active purchase order(s)` },
      { status: 409 }
    )
  }

  await prisma.supplier.delete({ where: { id } })

  await prisma.auditLog.create({
    data: { userId: session.user.id, action: 'DELETE', entity: 'Supplier', entityId: id },
  })

  return NextResponse.json({ success: true })
}
