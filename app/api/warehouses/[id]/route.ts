import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { name, description } = await req.json()

  try {
    const existing = await prisma.warehouse.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const oldName = existing.name

    // Rename warehouse and update all products that reference the old name
    const [warehouse] = await Promise.all([
      prisma.warehouse.update({
        where: { id },
        data: {
          ...(name !== undefined && { name: name.trim() }),
          ...(description !== undefined && { description }),
        },
      }),
      name !== undefined && name.trim() !== oldName
        ? prisma.product.updateMany({
            where: { warehouseLocation: oldName },
            data: { warehouseLocation: name.trim() },
          })
        : Promise.resolve(),
    ])

    return NextResponse.json(warehouse)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  try {
    const warehouse = await prisma.warehouse.findUnique({ where: { id } })
    if (!warehouse) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Unassign all products in this warehouse
    await prisma.product.updateMany({
      where: { warehouseLocation: warehouse.name },
      data: { warehouseLocation: null },
    })

    await prisma.warehouse.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
