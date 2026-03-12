'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const schema = z.object({
  name:              z.string().min(2, 'Name must be at least 2 chars'),
  sku:               z.string().min(1, 'SKU is required'),
  categoryId:        z.string().min(1, 'Category is required'),
  unit:              z.string().min(1, 'Unit is required'),
  price:             z.number().positive('Price must be positive'),
  reorderLevel:      z.number().int().min(0),
  currentStock:      z.number().int().min(0),
  warehouseLocation: z.string().optional(),
})
type FormData = z.infer<typeof schema>

interface ProductFormProps {
  categories: Array<{ id: string; name: string }>
  defaultValues?: Partial<FormData>
  productId?: string
  mode: 'create' | 'edit'
}

export function ProductForm({ categories, defaultValues, productId, mode }: ProductFormProps) {
  const router = useRouter()
  const [serverError, setServerError] = useState('')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: { currentStock: 0, ...defaultValues },
  })

  const onSubmit = async (data: FormData) => {
    setServerError('')
    const url = mode === 'create' ? '/api/inventory' : `/api/inventory/${productId}`
    const method = mode === 'create' ? 'POST' : 'PATCH'

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const body = await res.json()
        setServerError(body.error ?? 'Save failed')
        return
      }
      router.push('/inventory')
      router.refresh()
    } catch {
      setServerError('Something went wrong')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {serverError && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700 dark:bg-red-950/30 dark:border-red-900 dark:text-red-400">
                {serverError}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="name">Product Name *</Label>
              <Input id="name" placeholder="e.g. Barcode Scanner" {...register('name')} />
              {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="sku">SKU *</Label>
                <Input id="sku" placeholder="e.g. ELEC-004" {...register('sku')} disabled={mode === 'edit'} />
                {errors.sku && <p className="text-xs text-red-600">{errors.sku.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="unit">Unit *</Label>
                <Input id="unit" placeholder="e.g. pcs, box, kg" {...register('unit')} />
                {errors.unit && <p className="text-xs text-red-600">{errors.unit.message}</p>}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="categoryId">Category *</Label>
              <select
                id="categoryId"
                {...register('categoryId')}
                className="flex h-9 w-full rounded-lg border border-gray-300 bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              >
                <option value="">Select category…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {errors.categoryId && <p className="text-xs text-red-600">{errors.categoryId.message}</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Stock & Pricing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="price">Unit Price (USD) *</Label>
                <Input id="price" type="number" step="0.01" min="0" placeholder="0.00" {...register('price', { valueAsNumber: true })} />
                {errors.price && <p className="text-xs text-red-600">{errors.price.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reorderLevel">Reorder Level *</Label>
                <Input id="reorderLevel" type="number" min="0" placeholder="10" {...register('reorderLevel', { valueAsNumber: true })} />
                {errors.reorderLevel && <p className="text-xs text-red-600">{errors.reorderLevel.message}</p>}
              </div>
            </div>

            {mode === 'create' && (
              <div className="space-y-1.5">
                <Label htmlFor="currentStock">Opening Stock</Label>
                <Input id="currentStock" type="number" min="0" placeholder="0" {...register('currentStock', { valueAsNumber: true })} />
                {errors.currentStock && <p className="text-xs text-red-600">{errors.currentStock.message}</p>}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="warehouseLocation">Warehouse Location</Label>
              <Input id="warehouseLocation" placeholder="e.g. A1-01, Shelf B" {...register('warehouseLocation')} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 flex items-center justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : mode === 'create' ? 'Create Product' : 'Save Changes'}
        </Button>
      </div>
    </form>
  )
}
