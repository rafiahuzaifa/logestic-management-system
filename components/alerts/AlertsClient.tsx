'use client'

import { useState } from 'react'
import { Bell, Mail, Zap, Inbox, Package, Truck, FileText, ShoppingCart, AlertTriangle, Check, Clock, CheckCircle, XCircle, MessageSquare } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { WatcherManager } from './WatcherManager'
import { cn } from '@/lib/utils'

// ── Types ──────────────────────────────────────────────────────────────────────
type Watcher = { id: string; entityType: string; eventType: string; emailTo: string; threshold: number | null; isActive: boolean }
type EmailLog = { id: string; to: string; subject: string; status: string; sentAt: string }
type Notification = { id: string; title: string; message: string; type: string; entityType: string | null; entityId: string | null; isRead: boolean; createdAt: string }
type Inquiry = { id: string; inquiry_type: string; customer_name: string | null; phone: string | null; location: string | null; service_details: string | null; status: string; urgency: string | null; is_query: boolean; raw_subject: string | null; raw_from: string | null; created_at: string }

type Props = {
  initialWatchers: Watcher[]
  emailLogs:        EmailLog[]
  notifications:    Notification[]
  inquiries:        Inquiry[]
  stats: { totalWatchers: number; activeWatchers: number; sentEmails: number; unreadNotifs: number; totalInquiries: number }
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

const notifIcon: Record<string, React.ElementType> = {
  LOW_STOCK: Package, SHIPMENT_DELAYED: Truck, SHIPMENT_DELIVERED: Truck,
  NEW_ORDER: ShoppingCart, ORDER_APPROVED: ShoppingCart,
  INVOICE_OVERDUE: FileText, INVOICE_PAID: FileText,
  PO_APPROVED: ShoppingCart, PO_RECEIVED: Package, SYSTEM: Bell,
}
const notifColor: Record<string, string> = {
  LOW_STOCK: 'text-amber-500', SHIPMENT_DELAYED: 'text-red-500',
  SHIPMENT_DELIVERED: 'text-green-500', NEW_ORDER: 'text-blue-500',
  INVOICE_OVERDUE: 'text-red-500', INVOICE_PAID: 'text-green-500',
  SYSTEM: 'text-gray-500',
}
const urgencyBadge: Record<string, string> = {
  high:   'bg-red-100 text-red-700 border-red-200',
  normal: 'bg-blue-100 text-blue-700 border-blue-200',
  low:    'bg-gray-100 text-gray-600 border-gray-200',
}
const inquiryTypeLabel: Record<string, string> = {
  internet_connectivity: 'Internet',
  wifi_solution:         'WiFi',
  cyber_security:        'Cyber Security',
  managed_it:            'Managed IT',
  voip:                  'VoIP',
  cctv:                  'CCTV',
  networking:            'Networking',
  other:                 'Other',
}
const statusBadge: Record<string, string> = {
  new:         'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  resolved:    'bg-green-100 text-green-700',
  spam:        'bg-gray-100 text-gray-500',
}

// ── Tab button ─────────────────────────────────────────────────────────────────
function Tab({ active, onClick, children, badge }: { active: boolean; onClick: () => void; children: React.ReactNode; badge?: number }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
        active
          ? 'border-[#387dff] text-[#387dff]'
          : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
      )}
    >
      {children}
      {badge != null && badge > 0 && (
        <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none', active ? 'bg-[#387dff] text-white' : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300')}>
          {badge}
        </span>
      )}
    </button>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────────
export function AlertsClient({ initialWatchers, emailLogs, notifications, inquiries, stats }: Props) {
  const [tab, setTab] = useState<'watchers' | 'notifications' | 'inquiries' | 'email-logs'>('watchers')
  const [inquiryList, setInquiryList] = useState<Inquiry[]>(inquiries)

  const updateInquiryStatus = async (id: string, status: string) => {
    // Call FastAPI backend if available, otherwise just update local state
    setInquiryList(prev => prev.map(i => i.id === id ? { ...i, status } : i))
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/v1/inquiries/${id}/status?status=${status}`, { method: 'PATCH' })
    } catch {}
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Alerts & Watchers</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Monitor events, manage email alerts, and view parsed email inquiries</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Total Watchers',  value: stats.totalWatchers,  icon: Bell,         color: 'text-[#387dff]',   bg: 'bg-blue-50 dark:bg-blue-950/40'     },
          { label: 'Active Watchers', value: stats.activeWatchers, icon: Zap,          color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/40' },
          { label: 'Emails Sent',     value: stats.sentEmails,     icon: Mail,         color: 'text-amber-600',   bg: 'bg-amber-50 dark:bg-amber-950/40'   },
          { label: 'Unread Alerts',   value: stats.unreadNotifs,   icon: AlertTriangle,color: 'text-red-600',     bg: 'bg-red-50 dark:bg-red-950/40'       },
          { label: 'Email Inquiries', value: stats.totalInquiries, icon: Inbox,        color: 'text-violet-600',  bg: 'bg-violet-50 dark:bg-violet-950/40' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className="overflow-hidden">
            <CardContent className="flex items-center gap-3 p-4">
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${bg}`}>
                <Icon className={`h-4 w-4 ${color}`} />
              </div>
              <div>
                <p className={`text-xl font-bold ${color}`}>{value}</p>
                <p className="text-xs text-gray-500 leading-tight">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-800 -mb-px flex gap-0 overflow-x-auto">
        <Tab active={tab === 'watchers'}      onClick={() => setTab('watchers')}      badge={stats.totalWatchers}>Email Watchers</Tab>
        <Tab active={tab === 'notifications'} onClick={() => setTab('notifications')} badge={stats.unreadNotifs}>In-App Notifications</Tab>
        <Tab active={tab === 'inquiries'}     onClick={() => setTab('inquiries')}     badge={stats.totalInquiries}>Email Inquiries</Tab>
        <Tab active={tab === 'email-logs'}    onClick={() => setTab('email-logs')}    badge={stats.sentEmails}>Email Logs</Tab>
      </div>

      {/* ── Tab: Watchers ─────────────────────────────────────────────────── */}
      {tab === 'watchers' && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Email Watchers</CardTitle>
                <p className="text-xs text-gray-500 mt-1">
                  Watchers send email alerts when events happen in your LSM.
                  Configure SMTP in <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded text-[11px]">.env</code> to activate email sending.
                </p>
              </CardHeader>
              <CardContent>
                <WatcherManager initialWatchers={initialWatchers} />
              </CardContent>
            </Card>
          </div>
          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-sm">How Watchers Work</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-xs text-gray-600 dark:text-gray-400">
                {[
                  { icon: '1️⃣', text: 'Add a watcher: choose entity (product, shipment…) + event (low_stock, delayed…) + your email' },
                  { icon: '2️⃣', text: 'LSM monitors events automatically (stock adjustments, shipment updates, new orders)' },
                  { icon: '3️⃣', text: 'When the event fires, an email is sent to your configured address instantly' },
                  { icon: '4️⃣', text: 'All sent emails are logged in the Email Logs tab' },
                ].map(({ icon, text }) => (
                  <div key={icon} className="flex gap-2">
                    <span>{icon}</span>
                    <p>{text}</p>
                  </div>
                ))}
                <div className="mt-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3">
                  <p className="font-medium text-amber-800 dark:text-amber-400 text-xs">Setup Required</p>
                  <p className="text-amber-700 dark:text-amber-500 text-[11px] mt-1">
                    Add <code>SMTP_HOST</code>, <code>SMTP_USER</code>, <code>SMTP_PASS</code> to your Vercel env vars to enable actual email sending.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ── Tab: In-App Notifications ──────────────────────────────────────── */}
      {tab === 'notifications' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notification History</CardTitle>
            <p className="text-xs text-gray-500 mt-1">All system events that triggered in-app alerts for your account</p>
          </CardHeader>
          <CardContent>
            {notifications.length === 0 ? (
              <div className="py-12 text-center text-gray-400">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No notifications yet. They appear when stock is low, shipments are delayed, etc.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {notifications.map(n => {
                  const Icon  = notifIcon[n.type]  ?? AlertTriangle
                  const color = notifColor[n.type] ?? 'text-gray-500'
                  return (
                    <div key={n.id} className={cn('flex gap-3 py-3', !n.isRead && 'bg-blue-50/30 dark:bg-blue-900/10 -mx-2 px-2 rounded-lg')}>
                      <div className={cn('mt-0.5 h-7 w-7 shrink-0 flex items-center justify-center rounded-full', !n.isRead ? 'bg-blue-100 dark:bg-blue-900/40' : 'bg-gray-100 dark:bg-gray-800')}>
                        <Icon className={cn('h-3.5 w-3.5', color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{n.title}</p>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {!n.isRead && <span className="h-1.5 w-1.5 rounded-full bg-[#387dff]" />}
                            <span className="text-[10px] text-gray-400">{timeAgo(n.createdAt)}</span>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Tab: Email Inquiries ───────────────────────────────────────────── */}
      {tab === 'inquiries' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Email Inquiries</CardTitle>
            <p className="text-xs text-gray-500 mt-1">
              Service inquiries parsed from <strong>info@sharptel.pk</strong> by the AI email poller (FastAPI backend).
              {inquiryList.length === 0 && ' Start the email poller to see inquiries here.'}
            </p>
          </CardHeader>
          <CardContent>
            {inquiryList.length === 0 ? (
              <div className="py-12 text-center text-gray-400">
                <Inbox className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm font-medium">No email inquiries yet</p>
                <p className="text-xs mt-1 max-w-sm mx-auto">
                  Deploy the FastAPI backend, configure cPanel IMAP credentials, and set up a cron job at cron-job.org to start polling emails.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {inquiryList.map(inq => (
                  <div key={inq.id} className="rounded-xl border border-gray-200 dark:border-gray-800 p-4 hover:border-[#387dff]/40 transition-colors">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="rounded-full bg-[#387dff]/10 text-[#387dff] px-2 py-0.5 text-xs font-medium">
                          {inquiryTypeLabel[inq.inquiry_type] ?? inq.inquiry_type}
                        </span>
                        {inq.urgency && (
                          <span className={cn('rounded-full border px-2 py-0.5 text-xs font-medium', urgencyBadge[inq.urgency] ?? urgencyBadge.normal)}>
                            {inq.urgency.toUpperCase()}
                          </span>
                        )}
                        {inq.is_query && (
                          <span className="rounded-full bg-purple-100 text-purple-700 border border-purple-200 px-2 py-0.5 text-xs font-medium flex items-center gap-1">
                            <MessageSquare className="h-2.5 w-2.5" /> Query
                          </span>
                        )}
                        <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', statusBadge[inq.status] ?? statusBadge.new)}>
                          {inq.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        {(['new','in_progress','resolved'] as const).map(s => (
                          <button
                            key={s}
                            onClick={() => updateInquiryStatus(inq.id, s)}
                            className={cn(
                              'text-[10px] px-2 py-0.5 rounded border transition-colors',
                              inq.status === s
                                ? 'bg-[#387dff] text-white border-[#387dff]'
                                : 'border-gray-200 text-gray-500 hover:border-[#387dff] hover:text-[#387dff]'
                            )}
                          >
                            {s.replace('_', ' ')}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-1 text-xs">
                      {inq.customer_name && <span><span className="text-gray-400">Name: </span>{inq.customer_name}</span>}
                      {inq.phone         && <span><span className="text-gray-400">Phone: </span>{inq.phone}</span>}
                      {inq.location      && <span><span className="text-gray-400">Location: </span>{inq.location}</span>}
                    </div>

                    {inq.service_details && (
                      <p className="mt-2 text-xs text-gray-600 dark:text-gray-400 line-clamp-2">{inq.service_details}</p>
                    )}

                    <div className="mt-2 flex items-center justify-between text-[10px] text-gray-400">
                      <span>From: {inq.raw_from ?? '—'}</span>
                      <span>{timeAgo(inq.created_at)}</span>
                    </div>
                    {inq.raw_subject && (
                      <p className="text-[10px] text-gray-400 truncate">Subject: {inq.raw_subject}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Tab: Email Logs ────────────────────────────────────────────────── */}
      {tab === 'email-logs' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Email Delivery Logs</CardTitle>
            <p className="text-xs text-gray-500 mt-1">Every email sent by the watcher system is logged here</p>
          </CardHeader>
          <CardContent>
            {emailLogs.length === 0 ? (
              <div className="py-12 text-center text-gray-400">
                <Mail className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No emails sent yet. Configure watchers and SMTP to start sending alerts.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {emailLogs.map(log => (
                  <div key={log.id} className="flex items-start gap-3 py-3">
                    <div className="mt-0.5">
                      {log.status === 'sent'
                        ? <CheckCircle className="h-4 w-4 text-emerald-500" />
                        : <XCircle    className="h-4 w-4 text-red-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{log.subject}</p>
                      <p className="text-xs text-gray-500">To: {log.to}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium', log.status === 'sent' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700')}>
                        {log.status}
                      </span>
                      <span className="text-[10px] text-gray-400 flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5" />{timeAgo(log.sentAt)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
