import type { LucideIcon } from 'lucide-react'

// A page with nothing to show: the message sits in the middle of the free space, not under the title
export default function EmptyState({ icon: Icon, title, body, children }: {
  icon?: LucideIcon
  title: string
  body?: string
  children?: React.ReactNode
}) {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center text-center px-6 py-12">
      {Icon && (
        <div className="w-16 h-16 rounded-2xl bg-inv-soft flex items-center justify-center mb-5">
          <Icon className="w-8 h-8 text-inv-muted" />
        </div>
      )}
      <p className="text-lg font-semibold text-inv-text">{title}</p>
      {body && <p className="text-inv-muted mt-1.5 max-w-sm">{body}</p>}
      {children && <div className="mt-6">{children}</div>}
    </div>
  )
}
