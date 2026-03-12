'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import * as Dialog from '@radix-ui/react-dialog'
import { X, Loader2, ArrowUpCircle, ArrowDownCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

const schema = z.object({
  type:      z.enum(['IN', 'OUT', 'ADJUSTMENT']),
  quantity:  z.number().int().positive('Must be a positive integer'),
  reference: z.string().optional(),
})
type FormData = z.infer<typeof schema>

const TYPES = [
  { value: 'IN',         label: 'Stock In',    icon: ArrowUpCircle,   color: 'text-emerald-600 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30' },
  { value: 'OUT',        label: 'Stock Out',   icon: ArrowDownCircle, color: 'text-red-600 border-red-300 bg-red-50 dark:bg-red-950/30' },
  { value: 'ADJUSTMENT', label: 'Adjustment',  icon: RefreshCw,       color: 'text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/30' },
] as const

interface StockAdjustModalProps {
  productId: string
  productName: string
  currentStock: number
  onSuccess: () => void
  children: React.ReactNode
}

export function StockAdjustModal({ productId, productName, currentStock, onSuccess, children }: StockAdjustModalProps) {
  const [open, setOpen] = useState(false)
  const [serverError, setServerError] = useState('')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { register, handleSubmit, watch, setValue, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: { type: 'IN' },
  })

  const selectedType = watch('type')

  const onSubmit = async (data: FormData) => {
    setServerError('')
    try {
      const res = await fetch(`/api/inventory/${productId}/adjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const body = await res.json()
        setServerError(body.error ?? 'Adjustment failed')
        return
      }
      setOpen(false)
      reset()
      onSuccess()
    } catch {
      setServerError('Something went wrong')
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>{children}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-gray-950">
          <div className="flex items-center justify-between mb-5">
            <div>
              <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-gray-50">
                Stock Adjustment
              </Dialog.Title>
              <p className="text-sm text-gray-500 dark:text-gray-400">{productName} · Current: <strong>{currentStock}</strong></p>
            </div>
            <Dialog.Close className="rounded p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {serverError && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700 dark:bg-red-950/30 dark:border-red-900 dark:text-red-400">
                {serverError}
              </div>
            )}

            {/* Type selector */}
            <div className="space-y-1.5">
              <Label>Movement Type</Label>
              <div className="grid grid-cols-3 gap-2">
                {TYPES.map(({ value, label, icon: Icon, color }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setValue('type', value)}
                    className={cn(
                      'flex flex-col items-center gap-1.5 rounded-lg border-2 p-3 text-xs font-semibold transition-all',
                      selectedType === value ? color : 'border-gray-200 bg-gray-50 text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                placeholder="e.g. 50"
                {...register('quantity', { valueAsNumber: true })}
              />
              {errors.quantity && <p className="text-xs text-red-600">{errors.quantity.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="reference">Reference / Note <span className="text-gray-400">(optional)</span></Label>
              <Input id="reference" placeholder="e.g. PO-00012, manual count" {...register('reference')} />
            </div>

            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" className="flex-1" onClick={() => { setOpen(false); reset() }}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={isSubmitting}>
                {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : 'Save Adjustment'}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
