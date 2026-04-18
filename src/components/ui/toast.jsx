import { createContext, useCallback, useContext, useRef, useState, useEffect } from 'react'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const ToastContext = createContext(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>')
  return ctx
}

let idCounter = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef({})

  const dismiss = useCallback((id) => {
    setToasts(t => t.filter(x => x.id !== id))
    if (timers.current[id]) {
      clearTimeout(timers.current[id])
      delete timers.current[id]
    }
  }, [])

  const show = useCallback((opts) => {
    const id = ++idCounter
    const toast = {
      id,
      message: opts.message || '',
      description: opts.description || '',
      variant: opts.variant || 'default',
      duration: opts.duration ?? 4000,
      action: opts.action || null,
    }
    setToasts(t => [...t, toast])
    if (toast.duration > 0) {
      timers.current[id] = setTimeout(() => dismiss(id), toast.duration)
    }
    return id
  }, [dismiss])

  const api = {
    show,
    dismiss,
    success: (message, opts = {}) => show({ ...opts, message, variant: 'success' }),
    error: (message, opts = {}) => show({ ...opts, message, variant: 'error' }),
    info: (message, opts = {}) => show({ ...opts, message, variant: 'info' }),
    // Undo toast: shows a message + an Undo button for `duration` ms.
    // If the user clicks Undo, `onUndo` fires and the toast dismisses.
    undo: (message, onUndo, opts = {}) => show({
      ...opts,
      message,
      variant: opts.variant || 'info',
      duration: opts.duration ?? 6000,
      action: { label: opts.actionLabel || 'Undo', onClick: onUndo },
    }),
  }

  useEffect(() => () => {
    Object.values(timers.current).forEach(clearTimeout)
  }, [])

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed top-4 end-4 z-[100] flex flex-col gap-2 w-[calc(100vw-2rem)] max-w-sm pointer-events-none">
        {toasts.map(t => <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />)}
      </div>
    </ToastContext.Provider>
  )
}

function ToastItem({ toast, onDismiss }) {
  const Icon = toast.variant === 'success' ? CheckCircle2
    : toast.variant === 'error' ? AlertCircle
    : Info
  const borderColor = toast.variant === 'success' ? 'border-emerald-500/40 bg-emerald-500/10'
    : toast.variant === 'error' ? 'border-destructive/40 bg-destructive/10'
    : toast.variant === 'info' ? 'border-blue-500/40 bg-blue-500/10'
    : 'border-border bg-card'
  const iconColor = toast.variant === 'success' ? 'text-emerald-500'
    : toast.variant === 'error' ? 'text-destructive'
    : toast.variant === 'info' ? 'text-blue-500'
    : 'text-muted-foreground'

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'pointer-events-auto relative flex items-start gap-3 rounded-lg border px-4 py-3 shadow-lg backdrop-blur',
        'animate-in fade-in-0 slide-in-from-top-2 duration-200',
        borderColor,
      )}
    >
      <Icon className={cn('w-4 h-4 shrink-0 mt-0.5', iconColor)} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{toast.message}</p>
        {toast.description && (
          <p className="text-xs text-muted-foreground mt-0.5">{toast.description}</p>
        )}
      </div>
      {toast.action && (
        <button
          type="button"
          onClick={() => { toast.action.onClick?.(); onDismiss() }}
          className="shrink-0 px-2 py-1 text-xs font-semibold rounded border bg-background hover:bg-muted transition-colors"
        >
          {toast.action.label}
        </button>
      )}
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 rounded-sm opacity-70 hover:opacity-100 transition-opacity"
        aria-label="Dismiss notification"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
