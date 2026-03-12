'use client'

import { useRouter } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState, useEffect } from 'react'
import { Loader2, Plus, Trash2, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'

const lineItemSchema = z.object({
  productId: z.string().min(1, 'Select a product'),
  quantity:  z.number().int().positive('Quantity must be positive'),
  unitPrice: z.number().positive('Unit price must be positive'),
})

const schema = z.object({
  supplierId: z.string().min(1, 'Select a supplier'),
  lineItems:  z.array(lineItemSchema).min(1, 'Add at least one item'),
})

type FormData = z.infer<typeof schema>

interface Supplier {
  id:   string
  name: string
}

interface Product {
  id:    string
  name:  string
  sku:   string
  price: number
  unit:  string
}

export default function NewPurchaseOrderPage() {
  const router = useRouter()
  const [serverError, setServerError] = useState('')
  const [suppliers, setSuppliers]     = useState<Supplier[]>([])
  const [products, setProducts]       = useState<Product[]>([])
  const [loadingData, setLoadingData] = useState(true)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { register, handleSubmit, control, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      supplierId: '',
      lineItems:  [{ productId: '', quantity: 1, unitPrice: 0 }],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'lineItems' })
  const lineItems = watch('lineItems')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [suppRes, prodRes] = await Promise.all([
          fetch('/api/suppliers'),
          fetch('/api/inventory?limit=100'),
        ])
        const suppData = await suppRes.json()
        const prodData = await prodRes.json()
        setSuppliers(suppData.suppliers ?? suppData ?? [])
        setProducts(
          (prodData.products ?? []).map((p: any) => ({
            id:    p.id,
            name:  p.name,
            sku:   p.sku,
            price: Number(p.price),
            unit:  p.unit,
          }))
        )
      } catch {
        // silently fail - user sees empty dropdowns
      } finally {
        setLoadingData(false)
      }
    }
    fetchData()
  }, [])

  const handleProductChange = (index: number, productId: string) => {
    const product = products.find((p) => p.id === productId)
    if (product) {
      setValue(`lineItems.${index}.unitPrice`, product.price)
    }
  }

  const runningTotal = (lineItems ?? []).reduce((sum, item) => {
    const qty   = Number(item?.quantity)  || 0
    const price = Number(item?.unitPrice) || 0
    return sum + qty * price
  }, 0)

  const onSubmit = async (data: FormData) => {
    setServerError('')
    try {
      const res = await fetch('/api/purchase-orders', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(data),
      })
      if (!res.ok) {
        const body = await res.json()
        setServerError(body.error ?? 'Failed to create purchase order')
        return
      }
      router.push('/purchase-orders')
      router.refresh()
    } catch {
      setServerError('Something went wrong')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">New Purchase Order</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Create a new purchase order with line items</p>
        </div>
      </div>

      {loadingData ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {serverError && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 dark:bg-red-950/30 dark:border-red-900 dark:text-red-400">
              {serverError}
            </div>
          )}

          {/* Supplier Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Supplier</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5">
                <Label htmlFor="supplierId">Select Supplier *</Label>
                <select
                  id="supplierId"
                  {...register('supplierId')}
                  className="flex h-9 w-full max-w-sm rounded-lg border border-gray-300 bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                >
                  <option value="">Choose a supplier…</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                {errors.supplierId && (
                  <p className="text-xs text-red-600">{errors.supplierId.message}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Line Items</CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ productId: '', quantity: 1, unitPrice: 0 })}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Item
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {errors.lineItems && !Array.isArray(errors.lineItems) && (
                <p className="mb-3 text-xs text-red-600">{(errors.lineItems as any).message}</p>
              )}

              <div className="space-y-4">
                {fields.map((field, index) => {
                  const qty      = Number(lineItems?.[index]?.quantity)  || 0
                  const price    = Number(lineItems?.[index]?.unitPrice) || 0
                  const subtotal = qty * price

                  return (
                    <div
                      key={field.id}
                      className="grid grid-cols-12 gap-3 items-end rounded-lg border border-gray-100 bg-gray-50/50 p-3 dark:border-gray-800 dark:bg-gray-800/20"
                    >
                      {/* Product */}
                      <div className="col-span-12 sm:col-span-5 space-y-1">
                        <Label className="text-xs">Product *</Label>
                        <select
                          {...register(`lineItems.${index}.productId`)}
                          onChange={(e) => {
                            register(`lineItems.${index}.productId`).onChange(e)
                            handleProductChange(index, e.target.value)
                          }}
                          className="flex h-9 w-full rounded-lg border border-gray-300 bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                        >
                          <option value="">Select product…</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.sku})
                            </option>
                          ))}
                        </select>
                        {errors.lineItems?.[index]?.productId && (
                          <p className="text-xs text-red-600">{errors.lineItems[index]?.productId?.message}</p>
                        )}
                      </div>

                      {/* Quantity */}
                      <div className="col-span-5 sm:col-span-2 space-y-1">
                        <Label className="text-xs">Quantity *</Label>
                        <Input
                          type="number"
                          min="1"
                          placeholder="1"
                          {...register(`lineItems.${index}.quantity`, { valueAsNumber: true })}
                        />
                        {errors.lineItems?.[index]?.quantity && (
                          <p className="text-xs text-red-600">{errors.lineItems[index]?.quantity?.message}</p>
                        )}
                      </div>

                      {/* Unit Price */}
                      <div className="col-span-5 sm:col-span-3 space-y-1">
                        <Label className="text-xs">Unit Price (USD) *</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          {...register(`lineItems.${index}.unitPrice`, { valueAsNumber: true })}
                        />
                        {errors.lineItems?.[index]?.unitPrice && (
                          <p className="text-xs text-red-600">{errors.lineItems[index]?.unitPrice?.message}</p>
                        )}
                      </div>

                      {/* Subtotal + Remove */}
                      <div className="col-span-2 sm:col-span-2 flex items-end justify-between">
                        <div className="space-y-1">
                          <p className="text-xs text-gray-400">Subtotal</p>
                          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                            {formatCurrency(subtotal)}
                          </p>
                        </div>
                        {fields.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                            onClick={() => remove(index)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Running Total */}
              <div className="mt-4 flex justify-end border-t border-gray-100 pt-4 dark:border-gray-800">
                <div className="text-right">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Order Total</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">
                    {formatCurrency(runningTotal)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1" /> Creating…
                </>
              ) : (
                'Create Purchase Order'
              )}
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
