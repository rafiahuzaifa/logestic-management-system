'use client'

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

interface ShipmentStatusChartProps {
  data: Array<{ status: string; count: number }>
}

const STATUS_COLORS: Record<string, string> = {
  DELIVERED:  '#10b981',
  IN_TRANSIT: '#6366f1',
  PENDING:    '#f59e0b',
  DELAYED:    '#ef4444',
}

const STATUS_LABELS: Record<string, string> = {
  DELIVERED:  'Delivered',
  IN_TRANSIT: 'In Transit',
  PENDING:    'Pending',
  DELAYED:    'Delayed',
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-lg dark:border-gray-700 dark:bg-gray-900">
        <p className="text-xs text-gray-500">{STATUS_LABELS[label] ?? label}</p>
        <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{payload[0].value} shipments</p>
      </div>
    )
  }
  return null
}

export function ShipmentStatusChart({ data }: ShipmentStatusChartProps) {
  const enriched = data.map((d) => ({
    ...d,
    label: STATUS_LABELS[d.status] ?? d.status,
    fill: STATUS_COLORS[d.status] ?? '#94a3b8',
  }))

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={enriched} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" className="dark:stroke-gray-800" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          axisLine={false}
          tickLine={false}
          width={28}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(99,102,241,0.05)' }} />
        <Bar dataKey="count" radius={[6, 6, 0, 0]}>
          {enriched.map((entry, i) => (
            <Cell key={i} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
