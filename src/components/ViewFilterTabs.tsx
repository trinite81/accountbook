import type { ViewFilter } from '@/lib/viewFilter'

const LABELS: Record<ViewFilter, string> = {
  mine: '내 것만',
  all: '전체',
  compare: '사람별 비교',
}

export function ViewFilterTabs({
  value,
  onChange,
}: {
  value: ViewFilter
  onChange: (v: ViewFilter) => void
}) {
  return (
    <div className="flex gap-1 flex-wrap">
      {(['mine', 'all', 'compare'] as ViewFilter[]).map((v) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
            value === v
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground'
          }`}
        >
          {LABELS[v]}
        </button>
      ))}
    </div>
  )
}
