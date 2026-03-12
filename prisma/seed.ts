import { PrismaClient, Role, PurchaseOrderStatus, SalesOrderStatus, ShipmentStatus, StockMovementType, InvoicePaidStatus } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import bcrypt from 'bcryptjs'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pool = new Pool({ connectionString: process.env.DATABASE_URL }) as any
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('🌱 Seeding database...')

  // ─── Clean up ─────────────────────────────────────────────────────────────
  await prisma.auditLog.deleteMany()
  await prisma.watcher.deleteMany()
  await prisma.emailLog.deleteMany()
  await prisma.stockMovement.deleteMany()
  await prisma.shipment.deleteMany()
  await prisma.invoice.deleteMany()
  await prisma.sOLineItem.deleteMany()
  await prisma.salesOrder.deleteMany()
  await prisma.gRN.deleteMany()
  await prisma.pOLineItem.deleteMany()
  await prisma.purchaseOrder.deleteMany()
  await prisma.product.deleteMany()
  await prisma.category.deleteMany()
  await prisma.supplier.deleteMany()
  await prisma.customer.deleteMany()
  await prisma.carrier.deleteMany()
  await prisma.user.deleteMany()

  // ─── Users ────────────────────────────────────────────────────────────────
  const hashedPassword = await bcrypt.hash('Password123!', 10)

  const admin = await prisma.user.create({
    data: { name: 'Alice Admin', email: 'alice@lsm.com', password: hashedPassword, role: Role.ADMIN },
  })
  const warehouseMgr = await prisma.user.create({
    data: { name: 'Bob Warehouse', email: 'bob@lsm.com', password: hashedPassword, role: Role.WAREHOUSE_MANAGER },
  })
  const salesMgr = await prisma.user.create({
    data: { name: 'Carol Sales', email: 'carol@lsm.com', password: hashedPassword, role: Role.SALES_MANAGER },
  })
  const logisticsOfficer = await prisma.user.create({
    data: { name: 'Dave Logistics', email: 'dave@lsm.com', password: hashedPassword, role: Role.LOGISTICS_OFFICER },
  })
  const viewer = await prisma.user.create({
    data: { name: 'Eve Viewer', email: 'eve@lsm.com', password: hashedPassword, role: Role.VIEWER },
  })

  console.log('✅ Users created')

  // ─── Categories ───────────────────────────────────────────────────────────
  const [electronics, furniture, stationery, packaging, safety] = await Promise.all([
    prisma.category.create({ data: { name: 'Electronics', description: 'Electronic components and devices' } }),
    prisma.category.create({ data: { name: 'Furniture', description: 'Office and warehouse furniture' } }),
    prisma.category.create({ data: { name: 'Stationery', description: 'Paper, pens, and office supplies' } }),
    prisma.category.create({ data: { name: 'Packaging', description: 'Boxes, tape, and packing materials' } }),
    prisma.category.create({ data: { name: 'Safety', description: 'PPE and safety equipment' } }),
  ])

  console.log('✅ Categories created')

  // ─── Products ─────────────────────────────────────────────────────────────
  const products = await Promise.all([
    // Electronics
    prisma.product.create({ data: { name: 'Barcode Scanner', sku: 'ELEC-001', categoryId: electronics.id, unit: 'pcs', price: 149.99, reorderLevel: 5, currentStock: 20, warehouseLocation: 'A1-01' } }),
    prisma.product.create({ data: { name: 'Label Printer', sku: 'ELEC-002', categoryId: electronics.id, unit: 'pcs', price: 299.00, reorderLevel: 3, currentStock: 12, warehouseLocation: 'A1-02' } }),
    prisma.product.create({ data: { name: 'Handheld Terminal', sku: 'ELEC-003', categoryId: electronics.id, unit: 'pcs', price: 499.50, reorderLevel: 4, currentStock: 8, warehouseLocation: 'A1-03' } }),
    // Furniture
    prisma.product.create({ data: { name: 'Pallet Rack Unit', sku: 'FURN-001', categoryId: furniture.id, unit: 'pcs', price: 599.00, reorderLevel: 2, currentStock: 15, warehouseLocation: 'B2-01' } }),
    prisma.product.create({ data: { name: 'Office Desk', sku: 'FURN-002', categoryId: furniture.id, unit: 'pcs', price: 349.99, reorderLevel: 3, currentStock: 10, warehouseLocation: 'B2-02' } }),
    prisma.product.create({ data: { name: 'Filing Cabinet', sku: 'FURN-003', categoryId: furniture.id, unit: 'pcs', price: 189.00, reorderLevel: 5, currentStock: 18, warehouseLocation: 'B2-03' } }),
    // Stationery
    prisma.product.create({ data: { name: 'A4 Paper Ream', sku: 'STAT-001', categoryId: stationery.id, unit: 'ream', price: 6.50, reorderLevel: 50, currentStock: 200, warehouseLocation: 'C3-01' } }),
    prisma.product.create({ data: { name: 'Ballpoint Pens (Box)', sku: 'STAT-002', categoryId: stationery.id, unit: 'box', price: 4.20, reorderLevel: 30, currentStock: 120, warehouseLocation: 'C3-02' } }),
    prisma.product.create({ data: { name: 'Sticky Notes Pack', sku: 'STAT-003', categoryId: stationery.id, unit: 'pack', price: 3.99, reorderLevel: 40, currentStock: 160, warehouseLocation: 'C3-03' } }),
    // Packaging
    prisma.product.create({ data: { name: 'Corrugated Box (S)', sku: 'PACK-001', categoryId: packaging.id, unit: 'pcs', price: 1.20, reorderLevel: 200, currentStock: 1500, warehouseLocation: 'D4-01' } }),
    prisma.product.create({ data: { name: 'Corrugated Box (L)', sku: 'PACK-002', categoryId: packaging.id, unit: 'pcs', price: 2.50, reorderLevel: 150, currentStock: 900, warehouseLocation: 'D4-02' } }),
    prisma.product.create({ data: { name: 'Bubble Wrap Roll', sku: 'PACK-003', categoryId: packaging.id, unit: 'roll', price: 18.00, reorderLevel: 20, currentStock: 75, warehouseLocation: 'D4-03' } }),
    // Safety
    prisma.product.create({ data: { name: 'Safety Helmet', sku: 'SAFE-001', categoryId: safety.id, unit: 'pcs', price: 22.50, reorderLevel: 10, currentStock: 50, warehouseLocation: 'E5-01' } }),
    prisma.product.create({ data: { name: 'Hi-Vis Vest', sku: 'SAFE-002', categoryId: safety.id, unit: 'pcs', price: 14.00, reorderLevel: 15, currentStock: 80, warehouseLocation: 'E5-02' } }),
    prisma.product.create({ data: { name: 'Safety Gloves (Pair)', sku: 'SAFE-003', categoryId: safety.id, unit: 'pair', price: 8.75, reorderLevel: 25, currentStock: 100, warehouseLocation: 'E5-03' } }),
  ])

  console.log('✅ Products created')

  // ─── Suppliers ────────────────────────────────────────────────────────────
  const [supTech, supOffice, supPack, supSafety, supFurni] = await Promise.all([
    prisma.supplier.create({ data: { name: 'TechSource Pte Ltd', email: 'orders@techsource.com', phone: '+65-6100-1234', address: '10 Tech Park Ave, Singapore', rating: 4.5, leadTimeDays: 5 } }),
    prisma.supplier.create({ data: { name: 'OfficeWorld Supplies', email: 'sales@officeworld.com', phone: '+60-3-1234-5678', address: '25 Jalan Stationery, KL, Malaysia', rating: 4.2, leadTimeDays: 3 } }),
    prisma.supplier.create({ data: { name: 'PackPro Industries', email: 'hello@packpro.com', phone: '+62-21-9876-5432', address: 'Jl. Industri No.7, Jakarta, Indonesia', rating: 4.7, leadTimeDays: 7 } }),
    prisma.supplier.create({ data: { name: 'SafeGuard Solutions', email: 'info@safeguard.com', phone: '+66-2-5551-9999', address: '88 Safety Road, Bangkok, Thailand', rating: 4.0, leadTimeDays: 10 } }),
    prisma.supplier.create({ data: { name: 'FurniCo Manufacturing', email: 'enquiry@furnico.com', phone: '+84-28-3825-0000', address: '14 Furniture District, Ho Chi Minh City, Vietnam', rating: 3.8, leadTimeDays: 14 } }),
  ])

  console.log('✅ Suppliers created')

  // ─── Customers ────────────────────────────────────────────────────────────
  const [custA, custB, custC, custD, custE] = await Promise.all([
    prisma.customer.create({ data: { name: 'Acme Corp', email: 'purchase@acme.com', phone: '+1-555-100-2000', address: '100 Main St, New York, USA' } }),
    prisma.customer.create({ data: { name: 'Blue Ocean Trading', email: 'buy@blueocean.sg', phone: '+65-6200-3344', address: '5 Marina Way, Singapore' } }),
    prisma.customer.create({ data: { name: 'Crescent Retail', email: 'orders@crescent.my', phone: '+60-3-8888-7777', address: '77 Crescent Mall, Kuala Lumpur' } }),
    prisma.customer.create({ data: { name: 'Delta Logistics', email: 'ops@deltalog.com', phone: '+61-2-9000-4567', address: '200 Port Road, Sydney, Australia' } }),
    prisma.customer.create({ data: { name: 'Echo Enterprises', email: 'procurement@echo.co.uk', phone: '+44-20-7946-0000', address: '12 Baker Street, London, UK' } }),
  ])

  console.log('✅ Customers created')

  // ─── Carriers ─────────────────────────────────────────────────────────────
  const [carrierDHL, carrierFedEx, carrierNinja] = await Promise.all([
    prisma.carrier.create({ data: { name: 'DHL Express', contactPerson: 'Tom Delivery', phone: '+65-1800-345-000', email: 'api@dhl.com' } }),
    prisma.carrier.create({ data: { name: 'FedEx International', contactPerson: 'Sara Fedex', phone: '+65-1800-463-339', email: 'api@fedex.com' } }),
    prisma.carrier.create({ data: { name: 'Ninja Van', contactPerson: 'Ninja Support', phone: '+65-6970-8282', email: 'api@ninjavan.co' } }),
  ])

  console.log('✅ Carriers created')

  // ─── Purchase Orders ──────────────────────────────────────────────────────
  const poData = [
    { supplier: supTech,   products: [{ p: products[0], qty: 10, price: 140.00 }, { p: products[1], qty: 5, price: 280.00 }], status: PurchaseOrderStatus.RECEIVED },
    { supplier: supTech,   products: [{ p: products[2], qty: 8,  price: 470.00 }], status: PurchaseOrderStatus.APPROVED },
    { supplier: supOffice, products: [{ p: products[6], qty: 100, price: 6.00 }, { p: products[7], qty: 50, price: 4.00 }], status: PurchaseOrderStatus.RECEIVED },
    { supplier: supOffice, products: [{ p: products[8], qty: 80, price: 3.80 }], status: PurchaseOrderStatus.PENDING },
    { supplier: supPack,   products: [{ p: products[9], qty: 500, price: 1.10 }, { p: products[10], qty: 300, price: 2.30 }], status: PurchaseOrderStatus.RECEIVED },
    { supplier: supPack,   products: [{ p: products[11], qty: 50, price: 16.50 }], status: PurchaseOrderStatus.APPROVED },
    { supplier: supSafety, products: [{ p: products[12], qty: 30, price: 20.00 }, { p: products[13], qty: 40, price: 12.50 }], status: PurchaseOrderStatus.RECEIVED },
    { supplier: supSafety, products: [{ p: products[14], qty: 60, price: 8.00 }], status: PurchaseOrderStatus.PENDING },
    { supplier: supFurni,  products: [{ p: products[3], qty: 5, price: 550.00 }, { p: products[4], qty: 3, price: 320.00 }], status: PurchaseOrderStatus.APPROVED },
    { supplier: supFurni,  products: [{ p: products[5], qty: 10, price: 170.00 }], status: PurchaseOrderStatus.CANCELLED },
  ]

  const purchaseOrders = []
  for (const po of poData) {
    const totalAmount = po.products.reduce((sum, item) => sum + item.qty * item.price, 0)
    const created = await prisma.purchaseOrder.create({
      data: {
        supplierId: po.supplier.id,
        status: po.status,
        totalAmount,
        createdById: admin.id,
        lineItems: {
          create: po.products.map(item => ({
            productId: item.p.id,
            quantity: item.qty,
            unitPrice: item.price,
          })),
        },
      },
    })
    purchaseOrders.push(created)
  }

  console.log('✅ Purchase orders created')

  // ─── GRNs (for RECEIVED POs) ──────────────────────────────────────────────
  const receivedPOs = purchaseOrders.filter((_, i) => poData[i].status === PurchaseOrderStatus.RECEIVED)
  for (const po of receivedPOs) {
    await prisma.gRN.create({
      data: {
        purchaseOrderId: po.id,
        receivedById: warehouseMgr.id,
        notes: 'All items received in good condition.',
      },
    })
  }

  console.log('✅ GRNs created')

  // ─── Sales Orders ─────────────────────────────────────────────────────────
  const soData = [
    { customer: custA, lines: [{ p: products[0], qty: 2, price: 159.99 }, { p: products[12], qty: 5, price: 24.00 }], status: SalesOrderStatus.DELIVERED },
    { customer: custA, lines: [{ p: products[6], qty: 20, price: 7.00 }], status: SalesOrderStatus.SHIPPED },
    { customer: custB, lines: [{ p: products[1], qty: 3, price: 310.00 }, { p: products[9], qty: 100, price: 1.30 }], status: SalesOrderStatus.DELIVERED },
    { customer: custB, lines: [{ p: products[13], qty: 10, price: 15.00 }], status: SalesOrderStatus.CONFIRMED },
    { customer: custC, lines: [{ p: products[2], qty: 2, price: 520.00 }], status: SalesOrderStatus.PACKED },
    { customer: custC, lines: [{ p: products[7], qty: 30, price: 4.50 }, { p: products[8], qty: 20, price: 4.20 }], status: SalesOrderStatus.SHIPPED },
    { customer: custC, lines: [{ p: products[10], qty: 50, price: 2.70 }], status: SalesOrderStatus.DELIVERED },
    { customer: custD, lines: [{ p: products[3], qty: 4, price: 620.00 }, { p: products[11], qty: 10, price: 19.00 }], status: SalesOrderStatus.DELIVERED },
    { customer: custD, lines: [{ p: products[4], qty: 2, price: 360.00 }], status: SalesOrderStatus.DRAFT },
    { customer: custD, lines: [{ p: products[14], qty: 20, price: 9.50 }], status: SalesOrderStatus.CONFIRMED },
    { customer: custE, lines: [{ p: products[5], qty: 6, price: 195.00 }], status: SalesOrderStatus.SHIPPED },
    { customer: custE, lines: [{ p: products[0], qty: 5, price: 155.00 }, { p: products[1], qty: 2, price: 305.00 }], status: SalesOrderStatus.DELIVERED },
    { customer: custE, lines: [{ p: products[9], qty: 200, price: 1.25 }], status: SalesOrderStatus.PACKED },
    { customer: custA, lines: [{ p: products[12], qty: 8, price: 23.00 }, { p: products[13], qty: 8, price: 14.50 }], status: SalesOrderStatus.CONFIRMED },
    { customer: custB, lines: [{ p: products[2], qty: 1, price: 515.00 }], status: SalesOrderStatus.DRAFT },
    { customer: custC, lines: [{ p: products[6], qty: 50, price: 6.80 }], status: SalesOrderStatus.DELIVERED },
    { customer: custD, lines: [{ p: products[3], qty: 2, price: 610.00 }, { p: products[4], qty: 1, price: 355.00 }], status: SalesOrderStatus.SHIPPED },
    { customer: custE, lines: [{ p: products[11], qty: 15, price: 18.50 }], status: SalesOrderStatus.CONFIRMED },
    { customer: custA, lines: [{ p: products[14], qty: 30, price: 9.00 }], status: SalesOrderStatus.CANCELLED },
    { customer: custB, lines: [{ p: products[7], qty: 25, price: 4.40 }, { p: products[8], qty: 15, price: 4.15 }], status: SalesOrderStatus.DELIVERED },
  ]

  const salesOrders = []
  for (const so of soData) {
    const totalAmount = so.lines.reduce((sum, item) => sum + item.qty * item.price, 0)
    const created = await prisma.salesOrder.create({
      data: {
        customerId: so.customer.id,
        status: so.status,
        totalAmount,
        createdById: salesMgr.id,
        lineItems: {
          create: so.lines.map(item => ({
            productId: item.p.id,
            quantity: item.qty,
            unitPrice: item.price,
          })),
        },
      },
    })
    salesOrders.push(created)
  }

  console.log('✅ Sales orders created')

  // ─── Invoices ─────────────────────────────────────────────────────────────
  const invoicePaidMap: Record<SalesOrderStatus, InvoicePaidStatus> = {
    [SalesOrderStatus.DELIVERED]: InvoicePaidStatus.PAID,
    [SalesOrderStatus.SHIPPED]:   InvoicePaidStatus.PARTIAL,
    [SalesOrderStatus.PACKED]:    InvoicePaidStatus.UNPAID,
    [SalesOrderStatus.CONFIRMED]: InvoicePaidStatus.UNPAID,
    [SalesOrderStatus.DRAFT]:     InvoicePaidStatus.UNPAID,
    [SalesOrderStatus.CANCELLED]: InvoicePaidStatus.UNPAID,
  }

  let invoiceCounter = 1
  for (const [i, so] of salesOrders.entries()) {
    const status = soData[i].status
    if (status !== SalesOrderStatus.DRAFT && status !== SalesOrderStatus.CANCELLED) {
      await prisma.invoice.create({
        data: {
          salesOrderId: so.id,
          invoiceNumber: `INV-${String(invoiceCounter++).padStart(5, '0')}`,
          amount: soData[i].lines.reduce((sum, item) => sum + item.qty * item.price, 0),
          paidStatus: invoicePaidMap[status],
        },
      })
    }
  }

  console.log('✅ Invoices created')

  // ─── Shipments (10) ───────────────────────────────────────────────────────
  const shippableStatuses: SalesOrderStatus[] = [SalesOrderStatus.SHIPPED, SalesOrderStatus.DELIVERED, SalesOrderStatus.PACKED]
  const shippableSOs = salesOrders.filter((_, i) => shippableStatuses.includes(soData[i].status))
  const carriers = [carrierDHL, carrierFedEx, carrierNinja]
  const shipmentStatusMap: Record<SalesOrderStatus, ShipmentStatus> = {
    [SalesOrderStatus.DELIVERED]: ShipmentStatus.DELIVERED,
    [SalesOrderStatus.SHIPPED]:   ShipmentStatus.IN_TRANSIT,
    [SalesOrderStatus.PACKED]:    ShipmentStatus.PENDING,
    [SalesOrderStatus.CONFIRMED]: ShipmentStatus.PENDING,
    [SalesOrderStatus.DRAFT]:     ShipmentStatus.PENDING,
    [SalesOrderStatus.CANCELLED]: ShipmentStatus.PENDING,
  }

  for (let i = 0; i < Math.min(10, shippableSOs.length); i++) {
    const so = shippableSOs[i]
    const soStatus = soData[salesOrders.indexOf(so)].status
    const carrier = carriers[i % carriers.length]
    const estDelivery = new Date()
    estDelivery.setDate(estDelivery.getDate() + 5 + i)

    await prisma.shipment.create({
      data: {
        salesOrderId: so.id,
        carrierId: carrier.id,
        trackingNumber: `TRACK-${String(1000 + i)}`,
        status: shipmentStatusMap[soStatus],
        estimatedDelivery: estDelivery,
      },
    })
  }

  console.log('✅ Shipments created')

  // ─── Stock Movements ──────────────────────────────────────────────────────
  for (const p of products) {
    await prisma.stockMovement.create({
      data: { productId: p.id, type: StockMovementType.IN, quantity: p.currentStock + 20, reference: 'Initial stock load' },
    })
    await prisma.stockMovement.create({
      data: { productId: p.id, type: StockMovementType.OUT, quantity: 20, reference: 'Initial sales fulfilment' },
    })
  }

  console.log('✅ Stock movements created')

  // ─── Watchers ─────────────────────────────────────────────────────────────
  await prisma.watcher.createMany({
    data: [
      { userId: admin.id,         entityType: 'Product',       eventType: 'LOW_STOCK',      emailTo: 'alice@lsm.com',  threshold: 10, isActive: true },
      { userId: warehouseMgr.id,  entityType: 'PurchaseOrder', eventType: 'STATUS_CHANGED',  emailTo: 'bob@lsm.com',   isActive: true },
      { userId: salesMgr.id,      entityType: 'SalesOrder',    eventType: 'STATUS_CHANGED',  emailTo: 'carol@lsm.com', isActive: true },
      { userId: logisticsOfficer.id, entityType: 'Shipment',   eventType: 'DELAYED',         emailTo: 'dave@lsm.com',  isActive: true },
    ],
  })

  console.log('✅ Watchers created')

  // ─── Email Logs ───────────────────────────────────────────────────────────
  await prisma.emailLog.createMany({
    data: [
      { to: 'alice@lsm.com',  subject: 'Low Stock Alert: Barcode Scanner',   status: 'SENT' },
      { to: 'bob@lsm.com',    subject: 'PO Approved: #PO-001',                status: 'SENT' },
      { to: 'carol@lsm.com',  subject: 'Sales Order Delivered: #SO-003',      status: 'SENT' },
      { to: 'dave@lsm.com',   subject: 'Shipment In Transit: TRACK-1000',     status: 'SENT' },
      { to: 'alice@lsm.com',  subject: 'New User Registered',                 status: 'FAILED' },
    ],
  })

  console.log('✅ Email logs created')

  // ─── Audit Logs ───────────────────────────────────────────────────────────
  await prisma.auditLog.createMany({
    data: [
      { userId: admin.id,        action: 'CREATE', entity: 'User',          entityId: warehouseMgr.id },
      { userId: admin.id,        action: 'CREATE', entity: 'Product',       entityId: products[0].id },
      { userId: salesMgr.id,     action: 'CREATE', entity: 'SalesOrder',    entityId: salesOrders[0].id },
      { userId: warehouseMgr.id, action: 'UPDATE', entity: 'PurchaseOrder', entityId: purchaseOrders[0].id },
      { userId: admin.id,        action: 'DELETE', entity: 'Customer',      entityId: 'old-customer-id' },
    ],
  })

  console.log('✅ Audit logs created')
  console.log('\n🎉 Seeding complete!')
  console.log('\nDefault credentials:')
  console.log('  Email:    alice@lsm.com  (ADMIN)')
  console.log('  Password: Password123!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
