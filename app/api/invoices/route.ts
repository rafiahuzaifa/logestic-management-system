import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const invoices = await prisma.invoice.findMany({
      include: {
        salesOrder: {
          include: { customer: true },
        },
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
    const { salesOrderId, invoiceNumber, companyName, billingPeriod, amount, vendorCost, paidStatus } = body

    const invoice = await prisma.invoice.create({
      data: {
        salesOrderId,
        invoiceNumber,
        companyName: companyName || null,
        billingPeriod: billingPeriod || null,
        amount,
        vendorCost: vendorCost ?? null,
        paidStatus: paidStatus ?? 'UNPAID',
      },
      include: { salesOrder: { include: { customer: true } } },
    })
    return NextResponse.json(invoice, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
