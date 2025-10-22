import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Gift, MapPin, Clock, Tag, Calendar, Copy, Check, Sparkles } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import Navbar from '@/components/Navbar'

interface Deal {
  id: string
  business_name: string
  description: string
  address: string
  timings: string
  coupon_code: string
  discount_percentage: number | null
  discount_details: string | null
  category: string | null
  valid_until: string | null
  terms_conditions: string | null
  image_url: string | null
}

interface ScratchCardProps {
  onReveal: () => void
  isRevealed: boolean
}

function ScratchCard({ onReveal, isRevealed }: ScratchCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isScratching, setIsScratching] = useState(false)

  useEffect(() => {
    if (!canvasRef.current || isRevealed) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * 2
    canvas.height = rect.height * 2
    ctx.scale(2, 2)

    // Create gradient scratch-off layer
    const gradient = ctx.createLinearGradient(0, 0, rect.width, rect.height)
    gradient.addColorStop(0, '#f59e0b')
    gradient.addColorStop(0.5, '#fbbf24')
    gradient.addColorStop(1, '#f59e0b')
    
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, rect.width, rect.height)

    // Add shine effect
    ctx.globalCompositeOperation = 'source-atop'
    const shineGradient = ctx.createLinearGradient(0, 0, rect.width, 0)
    shineGradient.addColorStop(0, 'rgba(255, 255, 255, 0)')
    shineGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.3)')
    shineGradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
    ctx.fillStyle = shineGradient
    ctx.fillRect(0, 0, rect.width, rect.height)

    // Add text
    ctx.globalCompositeOperation = 'source-over'
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
    ctx.font = 'bold 16px Inter, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('SCRATCH TO REVEAL', rect.width / 2, rect.height / 2 - 10)
    ctx.font = '14px Inter, sans-serif'
    ctx.fillText('👆 Tap or drag to scratch', rect.width / 2, rect.height / 2 + 15)
  }, [isRevealed])

  const scratch = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || isRevealed) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    let x, y

    if ('touches' in e) {
      const touch = e.touches[0]
      x = (touch.clientX - rect.left) * 2
      y = (touch.clientY - rect.top) * 2
    } else {
      x = (e.clientX - rect.left) * 2
      y = (e.clientY - rect.top) * 2
    }

    ctx.globalCompositeOperation = 'destination-out'
    ctx.beginPath()
    ctx.arc(x, y, 40, 0, Math.PI * 2)
    ctx.fill()

    // Check scratch percentage
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const pixels = imageData.data
    let transparent = 0

    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i + 3] < 128) {
        transparent++
      }
    }

    const percentage = (transparent / (pixels.length / 4)) * 100

    if (percentage > 60) {
      onReveal()
    }
  }

  const handleMouseDown = () => setIsScratching(true)
  const handleMouseUp = () => setIsScratching(false)
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isScratching) scratch(e)
  }

  if (isRevealed) {
    return null
  }

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full cursor-pointer touch-none"
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseUp}
      onTouchStart={(e) => {
        setIsScratching(true)
        scratch(e)
      }}
      onTouchMove={scratch}
      onTouchEnd={handleMouseUp}
    />
  )
}

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [scratchedDeals, setScratchedDeals] = useState<Set<string>>(new Set())
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [filterCategory, setFilterCategory] = useState<string>('all')

  useEffect(() => {
    fetchDeals()
  }, [])

  const fetchDeals = async () => {
    try {
      const { data, error } = await supabase
        .from('deals_offers')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) throw error
      setDeals(data || [])
    } catch (error: any) {
      console.error('Error fetching deals:', error)
      toast.error('Failed to load deals')
    } finally {
      setLoading(false)
    }
  }

  const handleReveal = (dealId: string) => {
    setScratchedDeals(prev => new Set([...prev, dealId]))
    toast.success('🎉 Coupon revealed!', {
      description: 'Tap copy to save your code',
    })
  }

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    toast.success('Copied to clipboard! 📋')
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const getCategoryColor = (category: string | null) => {
    const colors: Record<string, string> = {
      spa: 'from-purple-500/20 to-purple-600/20 border-purple-500/50 text-purple-400',
      gym: 'from-red-500/20 to-red-600/20 border-red-500/50 text-red-400',
      restaurant: 'from-orange-500/20 to-orange-600/20 border-orange-500/50 text-orange-400',
      cafe: 'from-amber-500/20 to-amber-600/20 border-amber-500/50 text-amber-400',
      wellness: 'from-green-500/20 to-green-600/20 border-green-500/50 text-green-400',
      retail: 'from-blue-500/20 to-blue-600/20 border-blue-500/50 text-blue-400',
    }
    return colors[category || ''] || 'from-gray-500/20 to-gray-600/20 border-gray-500/50 text-gray-400'
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null
    const date = new Date(dateString)
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const categories = ['all', ...Array.from(new Set(deals.map(d => d.category).filter(Boolean)))] as string[]

  const filteredDeals = filterCategory === 'all' 
    ? deals 
    : deals.filter(d => d.category === filterCategory)

  if (loading) {
    return (
      <div className="min-h-screen cosmic-bg">
        <Navbar />
        <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading exclusive deals...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen cosmic-bg">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-3 mb-4 glass-card px-6 py-3 rounded-full">
            <Gift className="w-8 h-8 text-primary animate-pulse" />
            <h1 className="text-3xl md:text-5xl font-heading font-bold bg-gradient-to-r from-primary via-purple-400 to-primary bg-clip-text text-transparent">
              Exclusive Deals & Offers
            </h1>
            <Sparkles className="w-8 h-8 text-primary animate-pulse" />
          </div>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Unlock amazing savings on wellness, fitness, dining and more! Scratch to reveal your exclusive coupon codes.
          </p>
        </motion.div>

        {/* Category Filter */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex flex-wrap justify-center gap-2"
        >
          {categories.map((cat) => (
            <Button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              variant={filterCategory === cat ? 'default' : 'outline'}
              size="sm"
              className="capitalize"
            >
              {cat}
            </Button>
          ))}
        </motion.div>

        {/* Deals Grid */}
        {filteredDeals.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card rounded-3xl p-16 text-center max-w-md mx-auto"
          >
            <Gift className="w-20 h-20 text-muted-foreground mx-auto mb-6 opacity-50" />
            <h3 className="text-2xl font-heading font-semibold mb-3">No deals available</h3>
            <p className="text-muted-foreground">Check back soon for exclusive offers!</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
            {filteredDeals.map((deal, index) => {
              const isScratched = scratchedDeals.has(deal.id)
              const isCopied = copiedCode === deal.coupon_code

              return (
                <motion.div
                  key={deal.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="glass-card rounded-3xl overflow-hidden hover:shadow-2xl transition-all duration-300 border border-border/50"
                >
                  {/* Card Header with Gradient */}
                  <div className="bg-gradient-to-br from-primary/20 via-purple-500/20 to-primary/20 p-6 pb-8 relative overflow-hidden">
                    <div className="absolute inset-0 bg-grid-white/5"></div>
                    <div className="relative z-10">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="text-2xl md:text-3xl font-heading font-bold mb-3">
                            {deal.business_name}
                          </h3>
                          {deal.category && (
                            <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-xs font-semibold uppercase border bg-gradient-to-r ${getCategoryColor(deal.category)}`}>
                              {deal.category}
                            </span>
                          )}
                        </div>
                        {deal.discount_percentage && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: index * 0.1 + 0.2, type: 'spring' }}
                            className="bg-gradient-to-br from-primary to-purple-600 text-white rounded-2xl w-20 h-20 flex items-center justify-center flex-shrink-0 ml-4 shadow-lg"
                          >
                            <div className="text-center">
                              <div className="text-3xl font-bold">{deal.discount_percentage}%</div>
                              <div className="text-xs">OFF</div>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-6 space-y-4">
                    {/* Description */}
                    <p className="text-muted-foreground leading-relaxed">{deal.description}</p>

                    {/* Details Grid */}
                    <div className="space-y-3 pt-2">
                      {/* Address */}
                      <div className="flex items-start gap-3 group">
                        <MapPin className="w-5 h-5 text-primary flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                        <span className="text-sm">{deal.address}</span>
                      </div>

                      {/* Timings */}
                      <div className="flex items-start gap-3 group">
                        <Clock className="w-5 h-5 text-primary flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                        <span className="text-sm">{deal.timings}</span>
                      </div>

                      {/* Valid Until */}
                      {deal.valid_until && (
                        <div className="flex items-center gap-3 group">
                          <Calendar className="w-5 h-5 text-primary flex-shrink-0 group-hover:scale-110 transition-transform" />
                          <span className="text-sm">Valid until <span className="font-semibold">{formatDate(deal.valid_until)}</span></span>
                        </div>
                      )}

                      {/* Discount Details */}
                      {deal.discount_details && (
                        <div className="flex items-start gap-3 bg-primary/5 rounded-xl p-3 border border-primary/20">
                          <Tag className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                          <span className="text-sm font-semibold text-primary">
                            {deal.discount_details}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Scratch-off Coupon */}
                    <div className="pt-4">
                      <div className="relative h-32 rounded-2xl overflow-hidden border-2 border-dashed border-primary/30">
                        {/* Background - Revealed Code */}
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-purple-500/10 to-primary/10 flex items-center justify-between px-6">
                          <div>
                            <div className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">Your Coupon Code</div>
                            <div className="text-3xl md:text-4xl font-bold font-mono tracking-wider text-primary">
                              {deal.coupon_code}
                            </div>
                          </div>
                          <AnimatePresence>
                            {isScratched && (
                              <motion.div
                                initial={{ scale: 0, rotate: -180 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{ type: 'spring', duration: 0.6 }}
                              >
                                <Button
                                  onClick={() => handleCopy(deal.coupon_code)}
                                  size="lg"
                                  variant={isCopied ? 'default' : 'outline'}
                                  className="flex items-center gap-2 font-semibold"
                                >
                                  {isCopied ? (
                                    <>
                                      <Check className="w-5 h-5" />
                                      Copied!
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-5 h-5" />
                                      Copy
                                    </>
                                  )}
                                </Button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        {/* Scratch Layer */}
                        <ScratchCard
                          onReveal={() => handleReveal(deal.id)}
                          isRevealed={isScratched}
                        />
                      </div>
                      
                      {scratchedDeals.has(deal.id) && (
                        <motion.p
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-center text-xs text-primary mt-2 font-semibold"
                        >
                          ✨ Code revealed! Tap copy to save it
                        </motion.p>
                      )}
                    </div>

                    {/* Terms & Conditions */}
                    {deal.terms_conditions && (
                      <div className="pt-4 border-t border-border/50">
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          <span className="font-semibold text-foreground">Terms:</span> {deal.terms_conditions}
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
