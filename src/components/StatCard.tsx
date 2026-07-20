import type { LucideIcon } from 'lucide-react'
import { motion } from 'framer-motion'

/** Glassy KPI card used across the dashboard rows. */
export function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent = 'text-primary',
  delay = 0,
}: {
  icon: LucideIcon
  label: string
  value: string
  sub?: string
  accent?: string
  delay?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay }}
      className="glass group relative overflow-hidden rounded-2xl p-4 transition-colors hover:border-primary/40"
    >
      <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-primary/10 blur-2xl transition-opacity group-hover:opacity-100" />
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        <Icon className={`h-3.5 w-3.5 ${accent}`} />
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{value}</div>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </motion.div>
  )
}
