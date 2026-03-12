import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface KpiCardProps {
  label: string
  value: string
  delta?: string
  deltaType?: 'up' | 'down' | 'neutral'
  icon: LucideIcon
  iconColor: string
  iconBg: string
}

export function KpiCard({ label, value, delta, deltaType = 'neutral', icon: Icon, iconColor, iconBg }: KpiCardProps) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
          <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg', iconBg)}>
            <Icon className={cn('h-5 w-5', iconColor)} />
          </div>
        </div>
        <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-50">{value}</p>
        {delta && (
          <p className={cn('mt-1 text-xs', {
            'text-emerald-600 dark:text-emerald-400': deltaType === 'up',
            'text-red-600 dark:text-red-400': deltaType === 'down',
            'text-gray-500 dark:text-gray-400': deltaType === 'neutral',
          })}>
            {delta}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
