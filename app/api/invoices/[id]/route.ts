import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { salesOrder: { include: { customer: true, lineItems: { include: { product: true } } } } },
    })
    if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(invoice)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  try {
    const body = await req.json()
    const { companyName, billingPeriod, amount, vendorCost, paidStatus } = body

    const invoice = await prisma.invoice.update({
      where: { id },
      data: {
        ...(companyName !== undefined && { companyName }),
        ...(billingPeriod !== undefined && { billingPeriod }),
        ...(amount !== undefined && { amount }),
        ...(vendorCost !== undefined && { vendorCost }),
        ...(paidStatus !== undefined && { paidStatus }),
      },
      include: { salesOrder: { include: { customer: true } } },
    })
    return NextResponse.json(invoice)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  try {
    await prisma.invoice.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
