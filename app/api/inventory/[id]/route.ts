import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateSchema = z.object({
  name:              z.string().min(2).optional(),
  categoryId:        z.string().optional(),
  unit:              z.string().optional(),
  price:             z.number().positive().optional(),
  reorderLevel:      z.number().int().min(0).optional(),
  warehouseLocation: z.string().optional().nullable(),
})

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      category: true,
      stockMovements: { orderBy: { createdAt: 'desc' }, take: 20 },
    },
  })

  if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  return NextResponse.json(product)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['ADMIN', 'WAREHOUSE_MANAGER'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { id } = await params

  try {
    const body = await req.json()
    const data = updateSchema.parse(body)

    const product = await prisma.product.update({
      where: { id },
      data,
      include: { category: { select: { id: true, name: true } } },
    })

    await prisma.auditLog.create({
      data: { userId: session.user.id, action: 'UPDATE', entity: 'Product', entityId: product.id },
    })

    return NextResponse.json(product)
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues[0]?.message }, { status: 400 })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params

  await prisma.product.delete({ where: { id } })
  await prisma.auditLog.create({
    data: { userId: session.user.id, action: 'DELETE', entity: 'Product', entityId: id },
  })

  return new NextResponse(null, { status: 204 })
}
