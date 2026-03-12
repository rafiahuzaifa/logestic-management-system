import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export interface WarehouseLocation {
  location:     string
  productCount: number
  totalStock:   number
  totalValue:   number
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const products = await prisma.product.findMany({
    select: {
      id:               true,
      name:             true,
      sku:              true,
      warehouseLocation: true,
      currentStock:     true,
      price:            true,
    },
    orderBy: { name: 'asc' },
  })

  // Group by warehouseLocation in JS (null/empty => "Unassigned")
  const locationMap = new Map<string, WarehouseLocation>()

  for (const p of products) {
    const loc   = p.warehouseLocation?.trim() || 'Unassigned'
    const value = Number(p.price) * p.currentStock

    if (!locationMap.has(loc)) {
      locationMap.set(loc, { location: loc, productCount: 0, totalStock: 0, totalValue: 0 })
    }

    const entry = locationMap.get(loc)!
    entry.productCount += 1
    entry.totalStock   += p.currentStock
    entry.totalValue   += value
  }

  const locations = Array.from(locationMap.values()).sort((a, b) => {
    // "Unassigned" always last
    if (a.location === 'Unassigned') return 1
    if (b.location === 'Unassigned') return -1
    return a.location.localeCompare(b.location)
  })

  return NextResponse.json({ locations, productCount: products.length })
}
