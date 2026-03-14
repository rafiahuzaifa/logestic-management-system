import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        salesOrders: { orderBy: { createdAt: 'desc' }, take: 10 },
        _count: { select: { salesOrders: true } },
      },
    })
    if (!customer) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(customer)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  try {
    const b = await req.json()
    const customer = await prisma.customer.update({
      where: { id },
      data: {
        ...(b.name        !== undefined && { name: b.name }),
        ...(b.email       !== undefined && { email: b.email }),
        ...(b.phone       !== undefined && { phone: b.phone || null }),
        ...(b.address     !== undefined && { address: b.address || null }),
        ...(b.companyType !== undefined && { companyType: b.companyType || null }),
        ...(b.taxId       !== undefined && { taxId: b.taxId || null }),
        ...(b.creditLimit !== undefined && { creditLimit: b.creditLimit ? Number(b.creditLimit) : null }),
      },
    })
    return NextResponse.json(customer)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  try {
    await prisma.customer.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
