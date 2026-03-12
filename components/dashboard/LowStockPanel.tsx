'use client'

import { AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface LowStockItem {
  id: string
  name: string
  sku: string
  currentStock: number
  reorderLevel: number
  warehouseLocation: string | null
}

interface LowStockPanelProps {
  products: LowStockItem[]
}

export function LowStockPanel({ products }: LowStockPanelProps) {
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/30">
          <AlertTriangle className="h-5 w-5 text-emerald-500" />
        </div>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">All stock levels OK</p>
        <p className="text-xs text-gray-400">No products below reorder level</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {products.map((p) => {
        const pct = Math.round((p.currentStock / p.reorderLevel) * 100)
        const isCritical = p.currentStock === 0
        const isLow = p.currentStock <= Math.ceil(p.reorderLevel * 0.5)

        return (
          <div key={p.id} className="flex items-center gap-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-800/40">
            <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', {
              'bg-red-100 dark:bg-red-950/40': isCritical,
              'bg-amber-100 dark:bg-amber-950/40': !isCritical && isLow,
              'bg-yellow-100 dark:bg-yellow-950/40': !isCritical && !isLow,
            })}>
              <AlertTriangle className={cn('h-4 w-4', {
                'text-red-600': isCritical,
                'text-amber-600': !isCritical && isLow,
                'text-yellow-600': !isCritical && !isLow,
              })} />
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-medium text-gray-800 dark:text-gray-200">{p.name}</p>
                {isCritical && <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Out of stock</Badge>}
              </div>
              <div className="mt-1 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                  <div
                    className={cn('h-full rounded-full transition-all', {
                      'bg-red-500': isCritical,
                      'bg-amber-500': !isCritical && isLow,
                      'bg-yellow-500': !isCritical && !isLow,
                    })}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
                  {p.currentStock} / {p.reorderLevel}
                </span>
              </div>
            </div>
            {p.warehouseLocation && (
              <span className="shrink-0 text-[10px] text-gray-400">{p.warehouseLocation}</span>
            )}
          </div>
        )
      })}
    </div>
  )
}
