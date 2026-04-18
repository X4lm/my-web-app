import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { useLocale } from '@/contexts/LocaleContext'

export default function KeyboardShortcutsDialog() {
  const { t } = useLocale()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    function onKey(e) {
      // "?" opens the shortcuts dialog — but skip when user is typing in an input.
      const tag = (e.target?.tagName || '').toLowerCase()
      const isEditable = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target?.isContentEditable
      if (isEditable) return
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault()
        setOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const shortcuts = [
    { keys: ['⌘', 'K'], label: t('shortcuts.commandPalette') },
    { keys: ['N'], label: t('shortcuts.newProperty') },
    { keys: ['?'], label: t('shortcuts.help') },
  ]

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('shortcuts.title')}</DialogTitle>
          <DialogDescription>{t('shortcuts.subtitle')}</DialogDescription>
        </DialogHeader>
        <ul className="space-y-2 pt-2">
          {shortcuts.map(s => (
            <li key={s.label} className="flex items-center justify-between">
              <span className="text-sm">{s.label}</span>
              <span className="flex items-center gap-1">
                {s.keys.map((k, i) => (
                  <kbd key={i} className="px-2 py-0.5 text-[11px] font-mono rounded border bg-muted">
                    {k}
                  </kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  )
}
