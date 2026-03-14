import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function toCSV(rows: Record<string, unknown>[]): string {
  if (!rows.length) return ''
  const headers = Object.keys(rows[0])
  const escape = (v: unknown) => {
    const s = v == null ? '' : String(v)
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s
  }
  return [
    headers.join(','),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(',')),
  ].join('\n')
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const type = req.nextUrl.searchParams.get('type') ?? 'inventory'

  let csv = ''
  let filename = 'export.csv'

  if (type === 'inventory') {
    const products = await prisma.product.findMany({
      include: { category: { select: { name: true } } },
      orderBy: { name: 'asc' },
    })
    csv = toCSV(products.map((p) => ({
      SKU:               p.sku,
      Name:              p.name,
      Brand:             p.brand ?? '',
      Category:          p.category.name,
      Unit:              p.unit,
      Price:             p.price.toString(),
      'Current Stock':   p.currentStock,
      'Reorder Level':   p.reorderLevel,
      'Min Order Qty':   p.minOrderQty,
      'Warehouse':       p.warehouseLocation ?? '',
      'Barcode':         p.barcode ?? '',
      'Created At':      p.createdAt.toISOString().slice(0, 10),
    })))
    filename = 'inventory.csv'
  } else if (type === 'sales-orders') {
    const orders = await prisma.salesOrder.findMany({
      include: { customer: true, createdBy: true },
      orderBy: { createdAt: 'desc' },
    })
    csv = toCSV(orders.map((o) => ({
      'Order ID':    o.id.slice(-10).toUpperCase(),
      Customer:      o.customer.name,
      Status:        o.status,
      Priority:      o.priority,
      Currency:      o.currency,
      'Total Amount': o.totalAmount.toString(),
      'Due Date':    o.dueDate ? o.dueDate.toISOString().slice(0, 10) : '',
      'Created By':  o.createdBy.name,
      'Created At':  o.createdAt.toISOString().slice(0, 10),
    })))
    filename = 'sales-orders.csv'
  } else if (type === 'invoices') {
    const invoices = await prisma.invoice.findMany({
      include: { salesOrder: { include: { customer: true } } },
      orderBy: { createdAt: 'desc' },
    })
    csv = toCSV(invoices.map((inv) => ({
      'Invoice #':    inv.invoiceNumber,
      Company:        inv.companyName ?? '',
      Customer:       inv.salesOrder.customer.name,
      Currency:       inv.currency,
      Subtotal:       inv.subtotal?.toString() ?? '',
      'Tax Rate':     inv.taxRate?.toString() ?? '',
      'Tax Amount':   inv.taxAmount?.toString() ?? '',
      Amount:         inv.amount.toString(),
      'Vendor Cost':  inv.vendorCost?.toString() ?? '',
      'Paid Status':  inv.paidStatus,
      'Due Date':     inv.dueDate ? inv.dueDate.toISOString().slice(0, 10) : '',
      'Payment Date': inv.paymentDate ? inv.paymentDate.toISOString().slice(0, 10) : '',
      'Payment Method': inv.paymentMethod ?? '',
      'Created At':   inv.createdAt.toISOString().slice(0, 10),
    })))
    filename = 'invoices.csv'
  } else if (type === 'customers') {
    const customers = await prisma.customer.findMany({ orderBy: { name: 'asc' } })
    csv = toCSV(customers.map((c) => ({
      Name:           c.name,
      Email:          c.email,
      Phone:          c.phone ?? '',
      'Company Type': c.companyType ?? '',
      'Tax ID':       c.taxId ?? '',
      'Credit Limit': c.creditLimit?.toString() ?? '',
      City:           c.city ?? '',
      Country:        c.country ?? '',
      Website:        c.website ?? '',
      'Contact Person': c.contactPerson ?? '',
      'Created At':   c.createdAt.toISOString().slice(0, 10),
    })))
    filename = 'customers.csv'
  } else if (type === 'suppliers') {
    const suppliers = await prisma.supplier.findMany({ orderBy: { name: 'asc' } })
    csv = toCSV(suppliers.map((s) => ({
      Name:           s.name,
      Email:          s.email,
      Phone:          s.phone ?? '',
      Country:        s.country ?? '',
      City:           s.city ?? '',
      Website:        s.website ?? '',
      'Contact Person': s.contactPerson ?? '',
      'Payment Terms':  s.paymentTerms ?? '',
      Rating:         s.rating.toString(),
      'Lead Time Days': s.leadTimeDays,
    })))
    filename = 'suppliers.csv'
  } else if (type === 'shipments') {
    const shipments = await prisma.shipment.findMany({
      include: { carrier: true, salesOrder: { include: { customer: true } } },
      orderBy: { createdAt: 'desc' },
    })
    csv = toCSV(shipments.map((s) => ({
      ID:              s.id.slice(-10).toUpperCase(),
      Customer:        s.salesOrder.customer.name,
      Carrier:         s.carrier.name,
      'Tracking #':    s.trackingNumber ?? '',
      Status:          s.status,
      Origin:          s.origin ?? '',
      Destination:     s.destination ?? '',
      'Weight (kg)':   s.weight?.toString() ?? '',
      'Est. Delivery': s.estimatedDelivery ? s.estimatedDelivery.toISOString().slice(0, 10) : '',
      'Actual Delivery': s.actualDelivery ? s.actualDelivery.toISOString().slice(0, 10) : '',
      'Created At':    s.createdAt.toISOString().slice(0, 10),
    })))
    filename = 'shipments.csv'
  }

  return new NextResponse(csv, {
    headers: {
      'Content-Type':        'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
