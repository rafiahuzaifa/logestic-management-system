import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createNotifications } from '@/lib/notifications'

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
    const prev = await prisma.invoice.findUnique({ where: { id } })

    const invoice = await prisma.invoice.update({
      where: { id },
      data: {
        ...(body.companyName   !== undefined && { companyName:   body.companyName }),
        ...(body.billingPeriod !== undefined && { billingPeriod: body.billingPeriod }),
        ...(body.amount        !== undefined && { amount:        body.amount }),
        ...(body.vendorCost    !== undefined && { vendorCost:    body.vendorCost }),
        ...(body.paidStatus    !== undefined && { paidStatus:    body.paidStatus }),
        ...(body.subtotal      !== undefined && { subtotal:      body.subtotal }),
        ...(body.taxRate       !== undefined && { taxRate:       body.taxRate }),
        ...(body.taxAmount     !== undefined && { taxAmount:     body.taxAmount }),
        ...(body.currency      !== undefined && { currency:      body.currency }),
        ...(body.dueDate       !== undefined && { dueDate:       body.dueDate ? new Date(body.dueDate) : null }),
        ...(body.paymentDate   !== undefined && { paymentDate:   body.paymentDate ? new Date(body.paymentDate) : null }),
        ...(body.paymentMethod !== undefined && { paymentMethod: body.paymentMethod }),
        ...(body.notes         !== undefined && { notes:         body.notes }),
      },
      include: { salesOrder: { include: { customer: true } } },
    })

    if (body.paidStatus === 'PAID' && prev?.paidStatus !== 'PAID') {
      await createNotifications({
        title: 'Invoice Paid',
        message: `Invoice ${invoice.invoiceNumber} has been marked as paid.`,
        type: 'INVOICE_PAID',
        entityType: 'invoice',
        entityId: id,
        roles: ['ADMIN', 'SALES_MANAGER'],
      })
    }

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
