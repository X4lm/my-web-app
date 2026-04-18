import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useLocale } from '@/contexts/LocaleContext'

const ConfirmContext = createContext(null)

export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm must be used within <ConfirmProvider>')
  return ctx
}

export function ConfirmProvider({ children }) {
  const { t } = useLocale()
  const [state, setState] = useState({ open: false })
  const resolverRef = useRef(null)

  const confirm = useCallback((opts = {}) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve
      setState({
        open: true,
        title: opts.title || t('common.confirm'),
        description: opts.description || '',
        confirmLabel: opts.confirmLabel || t('common.confirm'),
        cancelLabel: opts.cancelLabel || t('common.cancel'),
        destructive: !!opts.destructive,
      })
    })
  }, [t])

  const handle = (value) => {
    setState(s => ({ ...s, open: false }))
    if (resolverRef.current) {
      resolverRef.current(value)
      resolverRef.current = null
    }
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog open={state.open} onOpenChange={(o) => { if (!o) handle(false) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-start gap-3">
              {state.destructive && (
                <div className="shrink-0 mt-1 w-9 h-9 rounded-full bg-destructive/10 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <DialogTitle>{state.title}</DialogTitle>
                {state.description && (
                  <DialogDescription className="mt-1.5">{state.description}</DialogDescription>
                )}
              </div>
            </div>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" onClick={() => handle(false)}>
              {state.cancelLabel}
            </Button>
            <Button
              type="button"
              variant={state.destructive ? 'destructive' : 'default'}
              onClick={() => handle(true)}
              autoFocus
            >
              {state.confirmLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ConfirmContext.Provider>
  )
}
