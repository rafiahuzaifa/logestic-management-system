'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import { Search, SlidersHorizontal } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface Category { id: string; name: string }

interface InventoryFiltersProps {
  categories: Category[]
}

export function InventoryFilters({ categories }: InventoryFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const updateParam = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    params.delete('page')
    router.push(`/inventory?${params.toString()}`)
  }, [router, searchParams])

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Search by name or SKU…"
          className="pl-9"
          defaultValue={searchParams.get('search') ?? ''}
          onChange={(e) => updateParam('search', e.target.value)}
        />
      </div>

      <select
        className="h-9 rounded-lg border border-gray-300 bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        value={searchParams.get('category') ?? ''}
        onChange={(e) => updateParam('category', e.target.value)}
      >
        <option value="">All categories</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>

      <Button
        variant={searchParams.get('lowStock') === 'true' ? 'default' : 'outline'}
        size="sm"
        onClick={() => updateParam('lowStock', searchParams.get('lowStock') === 'true' ? '' : 'true')}
        className="gap-1.5"
      >
        <SlidersHorizontal className="h-3.5 w-3.5" />
        Low Stock Only
      </Button>

      {(searchParams.get('search') || searchParams.get('category') || searchParams.get('lowStock')) && (
        <Button variant="ghost" size="sm" onClick={() => router.push('/inventory')}>
          Clear filters
        </Button>
      )}
    </div>
  )
}
