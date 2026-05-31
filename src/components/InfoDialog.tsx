import { ReactNode } from 'react'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

interface InfoDialogProps {
  title: string
  description?: string
  points?: string[]
  triggerLabel?: string
  triggerClassName?: string
  footer?: ReactNode
}

export function InfoDialogButton({
  title,
  description,
  points,
  triggerLabel = 'INFO',
  triggerClassName,
  footer,
}: InfoDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex items-center gap-3 px-5 py-2 rounded-xl border border-black/10 bg-white/70 text-xs font-semibold tracking-[0.3em] uppercase text-black hover:bg-black hover:text-white transition',
            triggerClassName,
          )}
        >
          {triggerLabel}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md border border-black/10 bg-white/95 text-black">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-black">{title}</DialogTitle>
          {description && (
            <DialogDescription className="text-sm text-black/70">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>
        {points && points.length > 0 && (
          <ul className="space-y-2 text-sm text-black/70">
            {points.map((point) => (
              <li key={point} className="leading-relaxed">
                • {point}
              </li>
            ))}
          </ul>
        )}
        {footer && <div className="mt-4 text-sm text-black/60">{footer}</div>}
      </DialogContent>
    </Dialog>
  )
}


