'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const schema = z.object({
  name:          z.string().min(1, 'Name is required'),
  email:         z.string().email('Valid email required'),
  phone:         z.string().optional(),
  address:       z.string().optional(),
  city:          z.string().optional(),
  country:       z.string().optional(),
  website:       z.string().optional(),
  contactPerson: z.string().optional(),
  companyType:   z.string().optional(),
  taxId:         z.string().optional(),
  creditLimit:   z.number().min(0).optional(),
  notes:         z.string().optional(),
})
type FormData = z.infer<typeof schema>

const sel = 'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-[#387dff]'

export function CustomerForm() {
  const router = useRouter()
  const [error, setError] = useState('')
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
  })

  const onSubmit = async (data: FormData) => {
    setError('')
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Failed')
      router.push('/customers')
      router.refresh()
    } catch (e) { setError(String(e)) }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
      {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}

      <Card>
        <CardHeader><CardTitle className="text-base">Company Information</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Company / Customer Name <span className="text-red-500">*</span></Label>
            <Input placeholder="e.g. Acme Corporation" {...register('name')} />
            {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Company Type</Label>
            <select className={sel} {...register('companyType')}>
              <option value="">Select type…</option>
              <option value="Corporate">Corporate</option>
              <option value="SME">SME</option>
              <option value="Retail">Retail</option>
              <option value="Government">Government</option>
              <option value="Telecom">Telecom</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Contact Person</Label>
            <Input placeholder="Primary contact name" {...register('contactPerson')} />
          </div>
          <div className="space-y-1.5">
            <Label>Email <span className="text-red-500">*</span></Label>
            <Input type="email" placeholder="contact@company.com" {...register('email')} />
            {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Phone</Label>
            <Input placeholder="+92-300-1234567" {...register('phone')} />
          </div>
          <div className="space-y-1.5">
            <Label>Website</Label>
            <Input placeholder="https://company.com" {...register('website')} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Address</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2 space-y-1.5">
            <Label>Street Address</Label>
            <Input placeholder="Street address" {...register('address')} />
          </div>
          <div className="space-y-1.5">
            <Label>City</Label>
            <Input placeholder="Karachi, Lahore…" {...register('city')} />
          </div>
          <div className="space-y-1.5">
            <Label>Country</Label>
            <Input placeholder="Pakistan" {...register('country')} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Financial</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Tax ID / NTN</Label>
            <Input placeholder="Tax identification number" {...register('taxId')} />
          </div>
          <div className="space-y-1.5">
            <Label>Credit Limit ($)</Label>
            <Input type="number" step="0.01" min="0" placeholder="0.00"
              {...register('creditLimit', { valueAsNumber: true })} />
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <Label>Notes</Label>
            <textarea
              className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-[#387dff]"
              placeholder="Internal notes about this customer…"
              {...register('notes')}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting} className="bg-[#387dff] hover:bg-[#2563eb]">
          {isSubmitting ? 'Saving…' : 'Create Customer'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
      </div>
    </form>
  )
}
