'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface SupplierSearchProps {
  initialSearch: string
}

export function SupplierSearch({ initialSearch }: SupplierSearchProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const updateSearch = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set('search', value)
      } else {
        params.delete('search')
      }
      router.push(`/suppliers?${params.toString()}`)
    },
    [router, searchParams]
  )

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Search suppliers…"
          className="pl-9"
          defaultValue={initialSearch}
          onChange={(e) => updateSearch(e.target.value)}
        />
      </div>

      {initialSearch && (
        <Button variant="ghost" size="sm" onClick={() => router.push('/suppliers')}>
          Clear
        </Button>
      )}
    </div>
  )
}
