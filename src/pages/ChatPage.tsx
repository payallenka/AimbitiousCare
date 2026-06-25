import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Send, ArrowLeft } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import Sidebar from '@/components/Sidebar'
import { InfoDialogButton } from '@/components/InfoDialog'

const DEFAULT_AVATAR = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"%3E%3Crect width="64" height="64" fill="%23f5f5dc"/%3E%3Ccircle cx="32" cy="24" r="12" fill="%23000"/%3E%3Cpath fill="%23000" d="M16 54c0-8.8 7.2-16 16-16s16 7.2 16 16z"/%3E%3C/svg%3E'

interface Message {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  is_read: boolean
  created_at: string
}

interface UserDetails {
  id: string
  full_name: string
  profile_picture_url: string | null
  user_role: string
}

export default function ChatPage() {
  const { conversationId } = useParams()
  const navigate = useNavigate()
  const { userProfile } = useAuth()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [otherUser, setOtherUser] = useState<UserDetails | null>(null)

  useEffect(() => {
    if (!conversationId || !userProfile) return

    fetchConversation()
    fetchMessages()
    const channel = subscribeToMessages()

    return () => {
      channel?.unsubscribe()
    }
  }, [conversationId, userProfile])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const fetchConversation = async () => {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .single()

      if (error) throw error

      // Get other user details
      const otherUserId =
        data.participant1_id === userProfile?.id
          ? data.participant2_id
          : data.participant1_id

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, full_name, profile_picture_url, user_role')
        .eq('id', otherUserId)
        .single()

      if (userError) throw userError
      setOtherUser(userData)
    } catch (error: any) {
      console.error('Error fetching conversation:', error)
      toast.error('Failed to load conversation')
    }
  }

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })

      if (error) throw error
      setMessages(data || [])
    } catch (error: any) {
      console.error('Error fetching messages:', error)
      toast.error('Failed to load messages')
    } finally {
      setLoading(false)
    }
  }

  const subscribeToMessages = () => {
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          setMessages((prev) => {
            const incoming = payload.new as Message
            if (prev.some((msg) => msg.id === incoming.id)) {
              return prev
            }
            return [...prev, incoming]
          })
        }
      )
      .subscribe()

    return channel
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !userProfile || !conversationId) return

    const trimmed = newMessage.trim()
    const tempId = `temp-${Date.now()}`
    const optimisticMessage: Message = {
      id: tempId,
      conversation_id: conversationId,
      sender_id: userProfile.id,
      content: trimmed,
      is_read: true,
      created_at: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, optimisticMessage])
    setNewMessage('')
    setSending(true)

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: userProfile.id,
          content: trimmed,
        })
        .select()
        .single()

      if (error) throw error

      if (data) {
        setMessages((prev) => prev.map((msg) => (msg.id === tempId ? (data as Message) : msg)))
      }
    } catch (error: any) {
      console.error('Error sending message:', error)
      toast.error('Failed to send message')
      setMessages((prev) => prev.filter((msg) => msg.id !== tempId))
      setNewMessage(trimmed)
    } finally {
      setSending(false)
    }
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      })
    } else if (diffInHours < 48) {
      return 'Yesterday'
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen mesh-bg flex flex-col lg:flex-row">
        <Sidebar />
        <div className="flex-1 w-full flex items-center justify-center px-4 py-12 sm:px-6 lg:px-12 lg:ml-64">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border border-black/20 border-t-black mb-4"></div>
            <p className="text-muted-foreground">Loading chat...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen mesh-bg flex flex-col lg:flex-row">
      <Sidebar />
      <div className="flex-1 w-full flex flex-col lg:ml-64">
        {/* Chat Sub-Header */}
        <div className="border-b border-black/10 bg-white/60 backdrop-blur-xl">
          <div className="max-w-4xl mx-auto flex items-center gap-4 p-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/chat')}
              className="border border-black/10 bg-white/80 hover:bg-black hover:text-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>

            {otherUser && (
              <>
                <div className="h-10 w-10 rounded-xl overflow-hidden border border-black/10 bg-white/70">
                  <img
                    src={otherUser.profile_picture_url || DEFAULT_AVATAR}
                    alt={otherUser.full_name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <h2 className="font-semibold text-black">{otherUser.full_name}</h2>
                  <p className="text-xs uppercase tracking-[0.32em] text-black/40">
                    {otherUser.user_role.replace('_', ' ')}
                  </p>
                </div>
              </>
            )}
            <InfoDialogButton
              title="Conversation Tips"
              description="Stay connected with users or experts in real time."
              points={[
                'Messages appear instantly with optimistic updates.',
                'Use the input below to send text—press Enter to submit quickly.',
                'Read-only history is preserved so you can revisit past guidance.',
              ]}
              triggerClassName="hidden md:inline-flex h-10"
            />
          </div>
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
          <div className="mx-auto flex w-full max-w-4xl flex-col space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-12 rounded-3xl border border-black/10 bg-white/60 backdrop-blur-xl">
                <p className="text-black/70">
                  No messages yet. Start the conversation!
                </p>
              </div>
            ) : (
              messages.map((message) => {
                const isOwnMessage = message.sender_id === userProfile?.id
                return (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-3xl px-5 py-3 border ${
                        isOwnMessage
                          ? 'bg-black text-white border-black'
                          : 'bg-white/70 text-black border-black/10 backdrop-blur'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                        {message.content}
                      </p>
                      <p
                        className={`text-xs mt-1 ${
                          isOwnMessage
                            ? 'text-white/70'
                            : 'text-black/50'
                        }`}
                      >
                        {formatTime(message.created_at)}
                      </p>
                    </div>
                  </motion.div>
                )
              })
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Message Input */}
        <div className="border-t border-black/10 bg-white/60 backdrop-blur-xl">
          <form
            onSubmit={handleSendMessage}
            className="max-w-4xl mx-auto flex gap-3 p-4"
          >
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              disabled={sending}
              className="flex-1 border-black/15"
            />
            <Button type="submit" disabled={sending || !newMessage.trim()} className="px-6">
              {sending ? (
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}

