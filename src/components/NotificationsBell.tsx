import { useEffect, useRef, useState } from 'react'
import { Bell } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

interface NotificationRow {
  id: string
  type: string
  title: string
  body?: string
  link?: string
  is_read: boolean
  created_at: string
}

// In-app notification bell. Reads the user's own notifications (RLS-scoped),
// polls periodically, and lets them mark items read.
export default function NotificationsBell() {
  const { userProfile } = useAuth()
  const navigate = useNavigate()
  const [items, setItems] = useState<NotificationRow[]>([])
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const unread = items.filter((n) => !n.is_read).length

  const load = async () => {
    if (!userProfile) return
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userProfile.id)
      .order('created_at', { ascending: false })
      .limit(20)
    setItems(data || [])
  }

  useEffect(() => {
    load()
    const t = setInterval(load, 30000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userProfile?.id])

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const markAllRead = async () => {
    if (!userProfile || unread === 0) return
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', userProfile.id).eq('is_read', false)
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })))
  }

  const openItem = async (n: NotificationRow) => {
    if (!n.is_read) {
      await supabase.from('notifications').update({ is_read: true }).eq('id', n.id)
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)))
    }
    if (n.link) {
      setOpen(false)
      navigate(n.link)
    }
  }

  if (!userProfile) return null

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-black/10 bg-white text-black hover:bg-black/5"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto rounded-2xl border border-black/10 bg-white shadow-xl z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-black/10">
            <span className="font-semibold text-sm">Notifications</span>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-xs text-primary hover:underline">
                Mark all read
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-black/50">No notifications yet</p>
          ) : (
            items.map((n) => (
              <button
                key={n.id}
                onClick={() => openItem(n)}
                className={`w-full text-left px-4 py-3 border-b border-black/5 hover:bg-black/5 ${
                  n.is_read ? '' : 'bg-primary/5'
                }`}
              >
                <div className="flex items-start gap-2">
                  {!n.is_read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                  <div className={n.is_read ? 'pl-4' : ''}>
                    <p className="text-sm font-medium text-black">{n.title}</p>
                    {n.body && <p className="text-xs text-black/60 mt-0.5">{n.body}</p>}
                    <p className="text-[10px] text-black/40 mt-1">{new Date(n.created_at).toLocaleString('en-GB')}</p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
