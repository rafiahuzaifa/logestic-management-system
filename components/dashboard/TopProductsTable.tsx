'use client'

import { Badge } from '@/components/ui/badge'

interface TopProduct {
  id: string
  name: string
  sku: string
  currentStock: number
  totalSold: number
}

interface TopProductsTableProps {
  products: TopProduct[]
}

export function TopProductsTable({ products }: TopProductsTableProps) {
  const max = products[0]?.totalSold ?? 1

  return (
    <div className="space-y-3">
      {products.map((p, i) => (
        <div key={p.id} className="flex items-center gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-500 dark:bg-gray-800">
            {i + 1}
          </span>
          <div className="flex-1 overflow-hidden">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-medium text-gray-800 dark:text-gray-200">{p.name}</p>
              <span className="shrink-0 text-sm font-bold text-gray-900 dark:text-gray-100">{p.totalSold}</span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                <div
                  className="h-full rounded-full bg-indigo-500"
                  style={{ width: `${(p.totalSold / max) * 100}%` }}
                />
              </div>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">
                {p.sku}
              </Badge>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
