import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createNotifications } from '@/lib/notifications'
import { triggerWatchers } from '@/lib/watchers'

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

    const customer = (invoice.salesOrder as any)?.customer?.name ?? 'a customer'
    if (isOverdue) {
      const overdueMsg = `Invoice ${invoiceNumber} for ${customer} is overdue.`
      await createNotifications({ title: 'Invoice Overdue', message: overdueMsg, type: 'INVOICE_OVERDUE', entityType: 'invoice', entityId: invoice.id, roles: ['ADMIN', 'SALES_MANAGER'] })
      await triggerWatchers({ entityType: 'invoice', eventType: 'overdue', entityId: invoice.id, title: 'Invoice Overdue', message: overdueMsg, details: { 'Invoice': invoiceNumber, 'Customer': customer, 'Amount': `$${amount}`, 'Due Date': dueDate } })
    }
    await triggerWatchers({ entityType: 'invoice', eventType: 'created', entityId: invoice.id, title: 'New Invoice Created', message: `Invoice ${invoiceNumber} created for ${customer} — $${amount}`, details: { 'Invoice': invoiceNumber, 'Customer': customer, 'Amount': `$${amount}`, 'Status': paidStatus ?? 'UNPAID' } })

    return NextResponse.json(invoice, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
