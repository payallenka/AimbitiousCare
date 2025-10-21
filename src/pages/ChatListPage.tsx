import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { MessageCircle, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import Navbar from '@/components/Navbar'

interface ConversationWithUser {
  id: string
  other_user_id: string
  other_user_name: string
  other_user_picture: string | null
  other_user_role: string
  last_message_at: string
  last_message?: string
}

export default function ChatListPage() {
  const navigate = useNavigate()
  const { userProfile } = useAuth()
  const [conversations, setConversations] = useState<ConversationWithUser[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (userProfile) {
      fetchConversations()
      subscribeToConversations()
    }

    return () => {
      supabase.channel('conversations').unsubscribe()
    }
  }, [userProfile])

  const fetchConversations = async () => {
    if (!userProfile) return

    try {
      // Get all conversations where user is a participant
      const { data: convData, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .or(
          `participant1_id.eq.${userProfile.id},participant2_id.eq.${userProfile.id}`
        )
        .order('last_message_at', { ascending: false })

      if (convError) throw convError

      if (!convData || convData.length === 0) {
        setConversations([])
        setLoading(false)
        return
      }

      // Get other users' details
      const otherUserIds = convData.map((conv) =>
        conv.participant1_id === userProfile.id
          ? conv.participant2_id
          : conv.participant1_id
      )

      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, full_name, profile_picture_url, user_role')
        .in('id', otherUserIds)

      if (usersError) throw usersError

      // Get last message for each conversation
      const conversationsWithDetails = await Promise.all(
        convData.map(async (conv) => {
          const otherUserId =
            conv.participant1_id === userProfile.id
              ? conv.participant2_id
              : conv.participant1_id

          const otherUser = usersData?.find((u) => u.id === otherUserId)

          // Get last message
          const { data: lastMsg } = await supabase
            .from('messages')
            .select('content')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

          return {
            id: conv.id,
            other_user_id: otherUserId,
            other_user_name: otherUser?.full_name || 'Unknown',
            other_user_picture: otherUser?.profile_picture_url || null,
            other_user_role: otherUser?.user_role || '',
            last_message_at: conv.last_message_at,
            last_message: lastMsg?.content || 'No messages yet',
          }
        })
      )

      setConversations(conversationsWithDetails)
    } catch (error: any) {
      console.error('Error fetching conversations:', error)
      toast.error('Failed to load conversations')
    } finally {
      setLoading(false)
    }
  }

  const subscribeToConversations = () => {
    const channel = supabase
      .channel('conversations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
        },
        () => {
          fetchConversations()
        }
      )
      .subscribe()

    return channel
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 1) {
      return 'Just now'
    } else if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      })
    } else if (diffInHours < 48) {
      return 'Yesterday'
    } else if (diffInHours < 168) {
      return date.toLocaleDateString('en-US', { weekday: 'short' })
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
    }
  }

  const filteredConversations = conversations.filter((conv) =>
    conv.other_user_name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="min-h-screen cosmic-bg flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
          <p className="text-muted-foreground">Loading conversations...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen cosmic-bg">
      <Navbar />
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-heading font-bold gradient-text mb-2">
            Messages
          </h1>
          <p className="text-muted-foreground">
            Your conversations with experts
          </p>
        </div>

        {/* Search */}
        <div className="glass-card rounded-xl p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Conversations List */}
        {filteredConversations.length === 0 ? (
          <div className="glass-card rounded-xl p-12 text-center">
            <MessageCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No conversations yet</h3>
            <p className="text-muted-foreground mb-4">
              Start chatting with experts to see your conversations here
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredConversations.map((conv) => (
              <motion.div
                key={conv.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => navigate(`/chat/${conv.id}`)}
                className="glass-card rounded-xl p-4 hover:bg-primary/5 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-4">
                  <img
                    src={
                      conv.other_user_picture ||
                      'https://via.placeholder.com/50'
                    }
                    alt={conv.other_user_name}
                    className="w-12 h-12 rounded-full border-2 border-primary object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold truncate">
                        {conv.other_user_name}
                      </h3>
                      <span className="text-xs text-muted-foreground">
                        {formatTime(conv.last_message_at)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {conv.last_message}
                    </p>
                    <p className="text-xs text-primary capitalize mt-1">
                      {conv.other_user_role.replace('_', ' ')}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

