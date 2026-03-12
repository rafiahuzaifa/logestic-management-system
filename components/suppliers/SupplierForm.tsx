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
  name:         z.string().min(2, 'Name must be at least 2 characters'),
  email:        z.string().email('Invalid email address'),
  phone:        z.string().optional(),
  address:      z.string().optional(),
  rating:       z.number().min(0, 'Rating must be 0–5').max(5, 'Rating must be 0–5'),
  leadTimeDays: z.number().int().positive('Lead time must be a positive integer'),
})

type FormData = z.infer<typeof schema>

interface SupplierFormProps {
  mode: 'create' | 'edit'
  supplierId?: string
  defaultValues?: Partial<FormData>
}

export function SupplierForm({ mode, supplierId, defaultValues }: SupplierFormProps) {
  const router = useRouter()
  const [serverError, setServerError] = useState('')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      rating:       0,
      leadTimeDays: 7,
      ...defaultValues,
    },
  })

  const onSubmit = async (data: FormData) => {
    setServerError('')
    const url    = mode === 'create' ? '/api/suppliers' : `/api/suppliers/${supplierId}`
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
      router.push('/suppliers')
      router.refresh()
    } catch {
      setServerError('Something went wrong')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {serverError && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700 dark:bg-red-950/30 dark:border-red-900 dark:text-red-400">
                {serverError}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="name">Supplier Name *</Label>
              <Input id="name" placeholder="e.g. Acme Corp" {...register('name')} />
              {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email Address *</Label>
              <Input id="email" type="email" placeholder="contact@supplier.com" {...register('email')} />
              {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" type="tel" placeholder="+1 555 000 0000" {...register('phone')} />
              {errors.phone && <p className="text-xs text-red-600">{errors.phone.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="address">Address</Label>
              <Input id="address" placeholder="123 Warehouse St, City, Country" {...register('address')} />
              {errors.address && <p className="text-xs text-red-600">{errors.address.message}</p>}
            </div>
          </CardContent>
        </Card>

        {/* Performance Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Performance Metrics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="rating">Rating (0 – 5)</Label>
              <Input
                id="rating"
                type="number"
                step="0.1"
                min="0"
                max="5"
                placeholder="0.0"
                {...register('rating', { valueAsNumber: true })}
              />
              {errors.rating && <p className="text-xs text-red-600">{errors.rating.message}</p>}
              <p className="text-xs text-gray-400">Overall supplier quality score</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="leadTimeDays">Lead Time (days) *</Label>
              <Input
                id="leadTimeDays"
                type="number"
                min="1"
                placeholder="7"
                {...register('leadTimeDays', { valueAsNumber: true })}
              />
              {errors.leadTimeDays && <p className="text-xs text-red-600">{errors.leadTimeDays.message}</p>}
              <p className="text-xs text-gray-400">Average days from order to delivery</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 flex items-center justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? <><Loader2 className="h-4 w-4 animate-spin mr-1.5" /> Saving…</>
            : mode === 'create'
            ? 'Create Supplier'
            : 'Save Changes'}
        </Button>
      </div>
    </form>
  )
}
