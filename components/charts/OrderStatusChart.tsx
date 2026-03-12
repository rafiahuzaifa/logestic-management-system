'use client'

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Legend } from 'recharts'

interface OrderStatusChartProps {
  data: Array<{ status: string; count: number }>
}

const STATUS_COLORS: Record<string, string> = {
  DELIVERED: '#10b981',
  SHIPPED:   '#6366f1',
  PACKED:    '#f59e0b',
  CONFIRMED: '#3b82f6',
  DRAFT:     '#94a3b8',
  CANCELLED: '#ef4444',
}

const STATUS_LABELS: Record<string, string> = {
  DELIVERED: 'Delivered',
  SHIPPED:   'Shipped',
  PACKED:    'Packed',
  CONFIRMED: 'Confirmed',
  DRAFT:     'Draft',
  CANCELLED: 'Cancelled',
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload?.length) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-lg dark:border-gray-700 dark:bg-gray-900">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{STATUS_LABELS[payload[0].name] ?? payload[0].name}</p>
        <p className="text-sm font-bold" style={{ color: payload[0].payload.fill }}>{payload[0].value} orders</p>
      </div>
    )
  }
  return null
}

export function OrderStatusChart({ data }: OrderStatusChartProps) {
  const enriched = data.map((d) => ({
    ...d,
    label: STATUS_LABELS[d.status] ?? d.status,
    fill: STATUS_COLORS[d.status] ?? '#94a3b8',
  }))

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={enriched}
          cx="50%"
          cy="45%"
          innerRadius={55}
          outerRadius={80}
          paddingAngle={3}
          dataKey="count"
          nameKey="status"
        >
          {enriched.map((entry, i) => (
            <Cell key={i} fill={entry.fill} strokeWidth={0} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          formatter={(value) => STATUS_LABELS[value] ?? value}
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: '11px' }}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
