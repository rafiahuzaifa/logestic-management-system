'use client'

import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { truncate } from '@/lib/utils'

interface StockItem {
  name: string
  currentStock: number
  reorderLevel: number
}

interface StockLevelChartProps {
  data: StockItem[]
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    const current = payload.find((p: any) => p.dataKey === 'currentStock')
    const reorder = payload.find((p: any) => p.dataKey === 'reorderLevel')
    return (
      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-lg dark:border-gray-700 dark:bg-gray-900">
        <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
        <p className="text-sm font-bold text-indigo-600">Stock: {current?.value ?? 0}</p>
        <p className="text-xs text-amber-600">Reorder: {reorder?.value ?? 0}</p>
      </div>
    )
  }
  return null
}

export function StockLevelChart({ data }: StockLevelChartProps) {
  const chartData = data.slice(0, 8).map((d) => ({
    ...d,
    name: truncate(d.name, 12),
    isLow: d.currentStock <= d.reorderLevel,
  }))

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" className="dark:stroke-gray-800" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 10, fill: '#94a3b8' }}
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
        <Bar dataKey="currentStock" radius={[4, 4, 0, 0]}>
          {chartData.map((entry, i) => (
            <Cell key={i} fill={entry.isLow ? '#ef4444' : '#6366f1'} fillOpacity={0.85} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
