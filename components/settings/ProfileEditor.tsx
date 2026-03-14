'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, CheckCircle } from 'lucide-react'

type User = { id: string; name: string; email: string; role: string }

export function ProfileEditor({ user }: { user: User }) {
  const [name,            setName]            = useState(user.name)
  const [email,           setEmail]           = useState(user.email)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword,     setNewPassword]     = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving,          setSaving]          = useState(false)
  const [msg,             setMsg]             = useState('')
  const [error,           setError]           = useState('')

  const handleSave = async () => {
    setMsg(''); setError('')
    if (newPassword && newPassword !== confirmPassword) {
      setError('New passwords do not match'); return
    }
    if (newPassword && newPassword.length < 6) {
      setError('Password must be at least 6 characters'); return
    }
    setSaving(true)
    try {
      const body: Record<string, string> = { name, email }
      if (newPassword) { body.currentPassword = currentPassword; body.newPassword = newPassword }

      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setMsg('Profile updated successfully')
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('')
    } catch (e) { setError(String(e)) }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-6 max-w-xl">
      {msg   && (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
          <CheckCircle className="h-4 w-4" />{msg}
        </div>
      )}
      {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}

      <Card>
        <CardHeader><CardTitle className="text-base">Profile Information</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Full Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Email Address</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <div className="flex h-9 items-center rounded-md border bg-gray-50 px-3 text-sm text-gray-500 dark:bg-gray-800">
              {user.role}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Change Password</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Current Password</Label>
            <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password" />
          </div>
          <div className="space-y-1.5">
            <Label>New Password</Label>
            <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min. 6 characters" />
          </div>
          <div className="space-y-1.5">
            <Label>Confirm New Password</Label>
            <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat new password" />
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="bg-[#387dff] hover:bg-[#2563eb]">
        {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : 'Save Changes'}
      </Button>
    </div>
  )
}
