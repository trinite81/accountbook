import { ICON_MAP } from '@/lib/iconMap'

interface AccountIconProps {
  icon: string
  color: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZE_CLASSES = {
  sm: 'h-6 w-6',
  md: 'h-8 w-8',
  lg: 'h-10 w-10',
}

const ICON_SIZE_CLASSES = {
  sm: 'h-3 w-3',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
}

export function AccountIcon({ icon, color, size = 'md', className = '' }: AccountIconProps) {
  const Icon = ICON_MAP[icon] ?? ICON_MAP['more']
  return (
    <div
      className={`flex items-center justify-center rounded-lg ${SIZE_CLASSES[size]} ${className}`}
      style={{ backgroundColor: color + '20', color }}
    >
      <Icon className={ICON_SIZE_CLASSES[size]} />
    </div>
  )
}
