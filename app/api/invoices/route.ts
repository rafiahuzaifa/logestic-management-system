import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createNotifications } from '@/lib/notifications'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const invoices = await prisma.invoice.findMany({
      include: {
        salesOrder: { include: { customer: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(invoices)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const {
      salesOrderId, invoiceNumber, companyName, billingPeriod,
      amount, vendorCost, paidStatus,
      subtotal, taxRate, taxAmount, currency,
      dueDate, paymentDate, paymentMethod, notes,
    } = body

    // Check for overdue: if dueDate is in past and unpaid
    const isOverdue = dueDate && new Date(dueDate) < new Date() && (!paidStatus || paidStatus === 'UNPAID')

    const invoice = await prisma.invoice.create({
      data: {
        salesOrderId,
        invoiceNumber,
        companyName:   companyName   || null,
        billingPeriod: billingPeriod || null,
        currency:      currency      || 'USD',
        subtotal:      subtotal      ?? null,
        taxRate:       taxRate       ?? null,
        taxAmount:     taxAmount     ?? null,
        amount,
        vendorCost:    vendorCost    ?? null,
        paidStatus:    paidStatus    ?? 'UNPAID',
        dueDate:       dueDate       ? new Date(dueDate)    : null,
        paymentDate:   paymentDate   ? new Date(paymentDate): null,
        paymentMethod: paymentMethod || null,
        notes:         notes         || null,
      },
      include: { salesOrder: { include: { customer: true } } },
    })

    if (isOverdue) {
      await createNotifications({
        title: 'Invoice Overdue',
        message: `Invoice ${invoiceNumber} for ${(invoice.salesOrder as any)?.customer?.name ?? 'a customer'} is overdue.`,
        type: 'INVOICE_OVERDUE',
        entityType: 'invoice',
        entityId: invoice.id,
        roles: ['ADMIN', 'SALES_MANAGER'],
      })
    }

    return NextResponse.json(invoice, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
