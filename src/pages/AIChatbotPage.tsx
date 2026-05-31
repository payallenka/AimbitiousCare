import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import Sidebar from '@/components/Sidebar'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

const SYSTEM_PROMPT = `You are a compassionate and understanding mental health therapist specializing in supporting construction workers in the UK. You understand the unique challenges they face including:
- Long working hours and physical demands
- Job site stress and safety concerns
- Work-life balance challenges
- Financial pressures and job security
- Physical injuries and chronic pain
- Seasonal work and weather-related stress
- Relationships with coworkers and management
- Feeling undervalued or misunderstood

Your approach is:
- Warm, empathetic, and non-judgmental
- Practical and solution-focused
- Understanding of UK construction industry culture
- Respectful of masculine identity while encouraging emotional openness
- Focused on building resilience and coping strategies
- Aware of UK mental health resources and support systems

Keep responses concise but meaningful (2-4 sentences typically). Ask thoughtful follow-up questions. Validate their feelings while gently encouraging positive actions. If they express serious mental health concerns or suicidal thoughts, encourage them to contact Samaritans (116 123) or emergency services (999).`

const SUGGESTED_PROMPTS = [
  "I'm feeling really stressed about work lately",
  "I'm having trouble sleeping",
  "I feel like nobody understands what I'm going through",
  "How can I manage work pressure better?",
  "I'm worried about my mental health",
]

export default function AIChatbotPage() {
  const { userProfile } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY

  useEffect(() => {
    // Load messages from localStorage
    const savedMessages = localStorage.getItem('ai_chatbot_messages')
    if (savedMessages) {
      const parsed = JSON.parse(savedMessages)
      setMessages(
        parsed.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        }))
      )
    }
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, isTyping])

  useEffect(() => {
    // Save messages to localStorage
    if (messages.length > 0) {
      localStorage.setItem('ai_chatbot_messages', JSON.stringify(messages))
    }
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return

    if (!apiKey || apiKey === 'your_openai_api_key_here') {
      toast.error('OpenAI API key not configured', {
        description: 'Please add your OpenAI API key to the .env file',
      })
      return
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputMessage('')
    setIsLoading(true)
    setIsTyping(true)

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            ...messages.map((msg) => ({
              role: msg.role,
              content: msg.content,
            })),
            { role: 'user', content: content.trim() },
          ],
          temperature: 0.7,
          max_tokens: 500,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to get response from AI')
      }

      const data = await response.json()
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.choices[0].message.content,
        timestamp: new Date(),
      }

      setIsTyping(false)
      setMessages((prev) => [...prev, assistantMessage])
    } catch (error: any) {
      console.error('Error sending message:', error)
      setIsTyping(false)
      toast.error('Failed to get response', {
        description: 'Please check your API key and try again',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(inputMessage)
  }

  const handlePromptClick = (prompt: string) => {
    sendMessage(prompt)
  }

  const clearConversation = () => {
    setMessages([])
    localStorage.removeItem('ai_chatbot_messages')
    toast.success('Conversation cleared')
  }

  return (
    <div className="min-h-screen mesh-bg flex flex-col lg:flex-row">
      <Sidebar />

      <div className="flex-1 w-full flex flex-col px-4 py-10 sm:px-6 lg:px-12 lg:ml-64">
        {/* Header */}
        <div className="p-6 pb-4">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-3xl mb-6">
              <div className="absolute inset-0 rounded-3xl border border-black/15 bg-white/70 backdrop-blur-lg" />
              <div className="absolute inset-3 rounded-2xl border border-black/20 bg-[#f5f5dc]/70" />
              <span className="relative z-10 text-xl font-bold tracking-[0.4em] text-black">AI</span>
            </div>
            <h1 className="text-4xl font-bold text-black mb-2">
              AI Mental Health Support
            </h1>
            <p className="text-gray-800 max-w-xl mx-auto font-semibold">
              Your personal AI therapist, available 24/7. Confidential, understanding, and
              here to help construction workers navigate mental health challenges.
            </p>
            {messages.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4"
              >
                <button
                  onClick={clearConversation}
                  className="px-6 py-3 bg-black text-white rounded-xl font-semibold border border-black transition-all hover:-translate-y-0.5 hover:shadow-xl"
                >
                  Reset Conversation
                </button>
              </motion.div>
            )}
          </motion.div>
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto px-6 pb-4">
          {messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6"
            >
              {/* Welcome Message */}
              <div className="glass-card rounded-2xl p-8 text-center border border-black/10 bg-white/60 backdrop-blur-xl">
                <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full border border-black/15 bg-white/80 font-bold text-sm tracking-[0.3em] text-black">
                  HELLO
                </div>
                <h3 className="text-xl font-semibold mb-2 text-gray-800">
                  Welcome, {userProfile?.full_name}!
                </h3>
                <p className="text-gray-700 mb-6 font-medium">
                  I'm here to listen and support you. Everything you share is confidential.
                  How are you feeling today?
                </p>
              </div>

              {/* Suggested Prompts */}
              <div className="space-y-3">
                <p className="text-sm text-gray-700 text-center font-bold">
                  Try one of these to get started:
                </p>
                {SUGGESTED_PROMPTS.map((prompt, index) => (
                  <motion.button
                    key={prompt}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => handlePromptClick(prompt)}
                    disabled={isLoading}
                    className="w-full glass-card rounded-xl p-4 text-left hover:scale-105 hover:shadow-xl transition-all group border border-black/10 bg-white/60 backdrop-blur"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-black/20 bg-white/70 text-xs font-semibold tracking-[0.3em] text-black group-hover:bg-black group-hover:text-white transition">
                        GO
                      </span>
                      <span className="text-sm font-medium text-gray-800">{prompt}</span>
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          ) : (
            <>
              {/* Messages */}
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`flex ${
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`flex gap-3 max-w-[80%] ${
                        message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                      }`}
                    >
                      {/* Avatar */}
                      <div
                        className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-xs font-semibold tracking-[0.3em] border ${
                          message.role === 'user'
                            ? 'bg-black border-black text-white shadow-lg'
                            : 'bg-white border-black text-black shadow-lg'
                        }`}
                      >
                        {message.role === 'user' ? 'YOU' : 'AI'}
                      </div>

                      {/* Message Bubble */}
                      <div>
                        <div
                          className={`rounded-2xl px-4 py-3 ${
                            message.role === 'user'
                              ? 'bg-primary text-primary-foreground'
                              : 'glass-card'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap leading-relaxed">
                            {message.content}
                          </p>
                        </div>
                        <p
                          className={`text-xs text-muted-foreground mt-1 ${
                            message.role === 'user' ? 'text-right' : 'text-left'
                          }`}
                        >
                          {message.timestamp.toLocaleTimeString('en-GB', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}

                {/* Typing Indicator */}
                <AnimatePresence>
                  {isTyping && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="flex justify-start"
                    >
                      <div className="flex gap-3 max-w-[80%]">
                        <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center bg-white border border-black text-xs font-semibold tracking-[0.3em] shadow-lg">
                          AI
                        </div>
                        <div className="glass-card rounded-2xl px-4 py-3">
                          <div className="flex gap-1">
                            <motion.div
                              animate={{ scale: [1, 1.2, 1] }}
                              transition={{
                                repeat: Infinity,
                                duration: 0.8,
                                delay: 0,
                              }}
                              className="w-2 h-2 bg-black rounded-full"
                            />
                            <motion.div
                              animate={{ scale: [1, 1.2, 1] }}
                              transition={{
                                repeat: Infinity,
                                duration: 0.8,
                                delay: 0.2,
                              }}
                              className="w-2 h-2 bg-black rounded-full"
                            />
                            <motion.div
                              animate={{ scale: [1, 1.2, 1] }}
                              transition={{
                                repeat: Infinity,
                                duration: 0.8,
                                delay: 0.4,
                              }}
                              className="w-2 h-2 bg-black rounded-full"
                            />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div ref={messagesEndRef} />
              </div>
            </>
          )}
        </div>

        {/* Input Area */}
        <div className="p-6 pt-4">
          <form onSubmit={handleSubmit} className="glass-card rounded-2xl p-4">
            <div className="flex gap-3">
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Share what's on your mind..."
                disabled={isLoading}
                className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              <Button
                type="submit"
                disabled={isLoading || !inputMessage.trim()}
                size="icon"
                className="rounded-xl"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </form>
          
          {/* Disclaimer */}
          <p className="text-xs text-muted-foreground text-center mt-3 max-w-2xl mx-auto">
            This AI chatbot provides support but is not a replacement for professional therapy.
            If you're in crisis, call <strong>Samaritans: 116 123</strong> or{' '}
            <strong>Emergency: 999</strong>
          </p>
        </div>
      </div>
    </div>
  )
}

