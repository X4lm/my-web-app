import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  actionLabel,
  className,
  size = 'default',
}) {
  const iconSize = size === 'compact' ? 'w-10 h-10' : 'w-16 h-16'
  const iconInner = size === 'compact' ? 'w-5 h-5' : 'w-8 h-8'
  const padding = size === 'compact' ? 'py-6' : 'py-12'

  return (
    <div className={cn('flex flex-col items-center text-center', padding, className)}>
      {Icon && (
        <div className={cn('rounded-full bg-muted flex items-center justify-center mb-4', iconSize)}>
          <Icon className={cn('text-muted-foreground', iconInner)} />
        </div>
      )}
      {title && (
        <h3 className="text-sm font-medium text-foreground mb-1">{title}</h3>
      )}
      {description && (
        <p className="text-xs text-muted-foreground max-w-sm mb-4">{description}</p>
      )}
      {action && actionLabel && (
        <Button size="sm" onClick={action}>
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
