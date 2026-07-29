import { useEffect } from 'react'
import { X } from 'lucide-react'

/**
 * Bottom-sheet modal shell used by every module's add/edit form. Handles the dim backdrop,
 * the sliding panel, a drag grip, the title row, and a close button — so screens only supply
 * their fields. Backdrop click and Escape both dismiss. Styling lives in .sheet-* (app.css).
 */
export function Sheet({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet-panel" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={title}>
        <div className="sheet-grip" />
        <div className="sheet-header">
          <p className="sheet-title">{title}</p>
          <button type="button" className="icon-btn" style={{ width: 36, height: 36 }} onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
