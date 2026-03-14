'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

type Customer = {
  id: string; name: string; email: string; phone: string | null
  address: string | null; companyType: string | null; taxId: string | null; creditLimit: string | null
}

const sel = 'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-[#387dff]'

export function CustomerEditInline({ customer }: { customer: Customer }) {
  const router = useRouter()
  const [name,        setName]        = useState(customer.name)
  const [email,       setEmail]       = useState(customer.email)
  const [phone,       setPhone]       = useState(customer.phone       ?? '')
  const [address,     setAddress]     = useState(customer.address     ?? '')
  const [companyType, setCompanyType] = useState(customer.companyType ?? '')
  const [taxId,       setTaxId]       = useState(customer.taxId       ?? '')
  const [creditLimit, setCreditLimit] = useState(customer.creditLimit ?? '')
  const [saving, setSaving] = useState(false)
  const [msg,    setMsg]    = useState('')
  const [error,  setError]  = useState('')

  const handleSave = async () => {
    setSaving(true); setMsg(''); setError('')
    try {
      const res = await fetch(`/api/customers/${customer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, address, companyType, taxId,
          creditLimit: creditLimit ? Number(creditLimit) : null }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Failed')
      setMsg('Saved successfully')
      router.refresh()
    } catch (e) { setError(String(e)) }
    finally { setSaving(false) }
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Edit Customer</CardTitle></CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        {msg   && <div className="sm:col-span-2 rounded bg-green-50 px-3 py-2 text-xs text-green-700">{msg}</div>}
        {error && <div className="sm:col-span-2 rounded bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}

        <div className="space-y-1.5">
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Email</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Phone</Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Company Type</Label>
          <select className={sel} value={companyType} onChange={(e) => setCompanyType(e.target.value)}>
            <option value="">Select…</option>
            <option value="Corporate">Corporate</option>
            <option value="SME">SME</option>
            <option value="Retail">Retail</option>
            <option value="Government">Government</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div className="sm:col-span-2 space-y-1.5">
          <Label>Address</Label>
          <Input value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Tax ID / NTN</Label>
          <Input value={taxId} onChange={(e) => setTaxId(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Credit Limit ($)</Label>
          <Input type="number" step="0.01" value={creditLimit} onChange={(e) => setCreditLimit(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <Button onClick={handleSave} disabled={saving} className="bg-[#387dff] hover:bg-[#2563eb]">
            {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : 'Save Changes'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
