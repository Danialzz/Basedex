import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { PricePoint } from '@/lib/demo'
import { formatNumber } from '@/lib/format'

/** Dark-styled area chart (recharts) for price and growth series. */
export function PriceChart({
  data,
  color = '#0052FF',
  height = 220,
  unit = '',
}: {
  data: PricePoint[] | { month: string; value: number }[]
  color?: string
  height?: number
  unit?: string
}) {
  const isPrice = data.length > 0 && 'price' in data[0]
  const chartData = isPrice
    ? (data as PricePoint[]).map((d) => ({ x: d.time, y: d.price }))
    : (data as { month: string; value: number }[]).map((d) => ({ x: d.month, y: d.value }))

  const gradientId = `grad-${color.replace('#', '')}`

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="x"
            tick={{ fill: 'hsl(215 20% 55%)', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            minTickGap={40}
          />
          <YAxis
            domain={['auto', 'auto']}
            tick={{ fill: 'hsl(215 20% 55%)', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            width={56}
            tickFormatter={(v: number) => `${unit}${formatNumber(v, v > 100 ? 0 : 2)}`}
          />
          <Tooltip
            contentStyle={{
              background: 'hsl(224 40% 8%)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 12,
              fontSize: 12,
            }}
            labelStyle={{ color: 'hsl(215 20% 65%)' }}
            itemStyle={{ color: '#fff' }}
            formatter={(value) => [`${unit}${formatNumber(Number(value), 2)}`, isPrice ? 'mUSDC / mETH' : 'Value']}
          />
          <Area
            type="monotone"
            dataKey="y"
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            animationDuration={800}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
