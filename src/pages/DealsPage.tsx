import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Gift, MapPin, Clock, Tag, Calendar, Copy, Check, Sparkles } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import Sidebar from '@/components/Sidebar'
import { InfoDialogButton } from '@/components/InfoDialog'

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
    const gradient = ctx.createLinearGradient(0, 0, rect.width, rect.height);
    gradient.addColorStop(0, '#111827');  // near-black (Tailwind gray-900)
    gradient.addColorStop(0.5, '#6b7280'); // medium gray (gray-500)
    gradient.addColorStop(1, '#f9fafb');   // off-white (gray-50)
    
    
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
    ctx.fillText('Swipe gently to uncover', rect.width / 2, rect.height / 2 + 15)
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
    toast.success('Coupon revealed!', {
      description: 'Tap copy to save your code',
    })
  }

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    toast.success('Copied to clipboard!')
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const getCategoryColor = (category: string | null) => {
    const colors: Record<string, string> = {
      spa: 'from-white/70 to-white/40 border-black/10 text-black/70',
      gym: 'from-white/55 to-white/25 border-black/15 text-black/70',
      restaurant: 'from-black/10 to-white/40 border-black/20 text-black/70',
      cafe: 'from-white/65 to-white/35 border-black/10 text-black/70',
      wellness: 'from-black/8 to-white/40 border-black/15 text-black/70',
      retail: 'from-white/70 to-white/40 border-black/15 text-black/70',
    }
    return colors[category || ''] || 'from-white/70 to-white/40 border-black/10 text-black/60'
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
      <div className="min-h-screen mesh-bg flex flex-col lg:flex-row">
        <Sidebar />
        <div className="flex-1 w-full flex items-center justify-center px-4 py-12 sm:px-6 lg:px-12 lg:ml-64">
          <div className="w-full max-w-lg text-center rounded-3xl border border-black/10 bg-white/60 backdrop-blur-xl px-10 py-12">
            <div className="animate-spin rounded-full h-16 w-16 border border-black/20 border-t-black mx-auto mb-6"></div>
            <p className="text-black/70 font-medium tracking-wide">Loading exclusive deals...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen mesh-bg flex flex-col lg:flex-row">
      <Sidebar />
      <div className="flex-1 w-full px-4 py-12 sm:px-6 lg:px-12 lg:ml-64">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6"
        >
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-3 mb-4 px-6 py-3 rounded-full border border-black/10 bg-white/70">
              <Gift className="w-8 h-8 text-black" />
              <h1 className="text-3xl md:text-5xl font-heading font-bold text-black">
                Exclusive Deals & Offers
              </h1>
              <Sparkles className="w-8 h-8 text-black" />
            </div>
            <p className="text-black/70 text-lg max-w-3xl">
              Unlock curated savings on wellness, fitness, dining, and lifestyle experiences. Scratch each card to reveal tailored rewards.
            </p>
          </div>
          <InfoDialogButton
            title="Exclusive Deals"
            description="Browse curated benefits available to your account."
            points={[
              'Filter by category to narrow the offers shown.',
              'Scratch each card to reveal its unique coupon code.',
              'Copy the code and follow the listed details before the expiry date.',
            ]}
          />
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
                  className="relative overflow-hidden rounded-3xl border border-black/10 bg-white/60 backdrop-blur-xl hover:-translate-y-1 hover:shadow-2xl transition-all duration-300"
                >
                  {/* Card Header with Gradient */}
                  <div className="bg-gradient-to-br from-black/10 via-gray-500/10 to-black/10 p-6 pb-8 relative overflow-hidden">
                    <div className="absolute inset-0 bg-grid-white/10"></div>
                    <div className="relative z-10">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="text-2xl md:text-3xl font-heading font-bold mb-3">
                            {deal.business_name}
                          </h3>
                          {deal.category && (
                            <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-[0.3em] bg-gradient-to-r ${getCategoryColor(deal.category)}`}>
                              {deal.category}
                            </span>
                          )}
                        </div>
                        {deal.discount_percentage && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: index * 0.1 + 0.2, type: 'spring' }}
                            className="bg-black text-white rounded-2xl w-20 h-20 flex items-center justify-center flex-shrink-0 ml-4 shadow-lg"
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
                        <MapPin className="w-5 h-5 text-black flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                        <span className="text-sm text-black/70">{deal.address}</span>
                      </div>

                      {/* Timings */}
                      <div className="flex items-start gap-3 group">
                        <Clock className="w-5 h-5 text-black flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                        <span className="text-sm text-black/70">{deal.timings}</span>
                      </div>

                      {/* Valid Until */}
                      {deal.valid_until && (
                        <div className="flex items-center gap-3 group">
                          <Calendar className="w-5 h-5 text-black flex-shrink-0 group-hover:scale-110 transition-transform" />
                          <span className="text-sm text-black/70">Valid until <span className="font-semibold text-black">{formatDate(deal.valid_until)}</span></span>
                        </div>
                      )}

                      {/* Discount Details */}
                      {deal.discount_details && (
                        <div className="flex items-start gap-3 bg-white/70 rounded-xl p-3 border border-black/10">
                          <Tag className="w-5 h-5 text-black flex-shrink-0 mt-0.5" />
                          <span className="text-sm font-semibold text-black">
                            {deal.discount_details}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Scratch-off Coupon */}
                    <div className="pt-4">
                      <div className="relative h-32 rounded-2xl overflow-hidden border-2 border-dashed border-black/15">
                        {/* Background - Revealed Code */}
                        <div className="absolute inset-0 bg-gradient-to-br from-black/10 via-gray-500/10 to-black/10 flex items-center justify-between px-6">
                          <div>
                            <div className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">Your Coupon Code</div>
                            <div className="text-3xl md:text-4xl font-bold font-mono tracking-wider text-black">
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
                          className="text-center text-xs text-black mt-2 font-semibold"
                        >
                          Code revealed! Tap copy to save it
                        </motion.p>
                      )}
                    </div>

                    {/* Terms & Conditions */}
                    {deal.terms_conditions && (
                      <div className="pt-4 border-t border-black/10">
                        <p className="text-xs text-black/60 leading-relaxed">
                          <span className="font-semibold text-black">Terms:</span> {deal.terms_conditions}
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
