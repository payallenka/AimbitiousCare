import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Building2,
  Check,
  CreditCard,
  Lock,
  Star,
  Zap,
  Crown,
  ArrowRight,
  X,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

interface PlanTier {
  id: 'essential' | 'professional' | 'enterprise'
  name: string
  price: number
  maxWorkers: number
  popular?: boolean
  icon: any
  color: string
  features: string[]
}

const plans: PlanTier[] = [
  {
    id: 'essential',
    name: 'Essential Plan',
    price: 2000,
    maxWorkers: 100,
    icon: Building2,
    color: 'from-blue-500 to-cyan-500',
    features: [
      'Max Workers: 100',
      'On board maximum of 100 workers',
      'First 1 hour free consultation paid for by AmbitiousCare',
      'Free AI powered voice and text chatbot',
      '50% one week Starbucks discount for 10 workers',
      'Access to professionals from various sectors',
    ],
  },
  {
    id: 'professional',
    name: 'Professional Plan',
    price: 4000,
    maxWorkers: -1, // Unlimited
    popular: true,
    icon: Zap,
    color: 'from-black to-gray-800',
    features: [
      'Max Workers: Unlimited',
      'Everything in Essential Plan',
      'Access to all platform features',
      'Free financial webinar session with investment analyst',
      'Lifestyle wellness coach for up to 5 workers',
      'Free family cinema day out for 5 workers',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise Plan',
    price: 6000,
    maxWorkers: -1, // Unlimited
    icon: Crown,
    color: 'from-amber-500 to-orange-500',
    features: [
      'Max Workers: Unlimited',
      'Everything in Essential & Professional Plans',
      'Ticket to sporting event for 5 workers',
      'Free deep tissue hot massage vouchers for 2 workers',
      'Fine dining experience for 2 workers',
      'Priority support and account management',
    ],
  },
]

export default function CompanySubscriptionPage() {
  const navigate = useNavigate()
  const { userProfile, refreshProfile } = useAuth()
  const [selectedPlan, setSelectedPlan] = useState<PlanTier | null>(null)
  const [showPayment, setShowPayment] = useState(false)
  const [loading, setLoading] = useState(false)
  
  const [cardDetails, setCardDetails] = useState({
    cardNumber: '',
    cardName: '',
    expiryDate: '',
    cvv: '',
  })

  const handleSelectPlan = (plan: PlanTier) => {
    setSelectedPlan(plan)
    setShowPayment(true)
  }

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\s/g, '')
    const groups = cleaned.match(/.{1,4}/g) || []
    return groups.join(' ').substr(0, 19) // Max 16 digits + 3 spaces
  }

  const formatExpiryDate = (value: string) => {
    const cleaned = value.replace(/\D/g, '')
    if (cleaned.length >= 2) {
      return cleaned.substr(0, 2) + '/' + cleaned.substr(2, 2)
    }
    return cleaned
  }

  const handleCardInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    
    if (name === 'cardNumber') {
      setCardDetails({ ...cardDetails, cardNumber: formatCardNumber(value) })
    } else if (name === 'expiryDate') {
      setCardDetails({ ...cardDetails, expiryDate: formatExpiryDate(value) })
    } else if (name === 'cvv') {
      setCardDetails({ ...cardDetails, cvv: value.replace(/\D/g, '').substr(0, 3) })
    } else {
      setCardDetails({ ...cardDetails, [name]: value })
    }
  }

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedPlan || !userProfile) return

    // Validation
    if (!cardDetails.cardNumber || !cardDetails.cardName || !cardDetails.expiryDate || !cardDetails.cvv) {
      toast.error('Please fill in all card details')
      return
    }

    if (cardDetails.cardNumber.replace(/\s/g, '').length !== 16) {
      toast.error('Invalid card number')
      return
    }

    try {
      setLoading(true)

      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Create subscription
      const { error } = await supabase
        .from('company_subscriptions')
        .insert({
          company_id: userProfile.id,
          subscription_tier: selectedPlan.id,
          max_workers: selectedPlan.maxWorkers,
          price_per_month: selectedPlan.price,
          stripe_subscription_id: `fake_sub_${Date.now()}`, // Fake Stripe ID
          is_active: true,
        })

      if (error) throw error

      toast.success('Payment successful! Welcome to AmbitiousCare!', {
        description: `Your ${selectedPlan.name} subscription is now active.`,
      })

      // Refresh profile to ensure subscription is loaded
      await refreshProfile()

      // Navigate to company dashboard
      navigate('/company/dashboard')
    } catch (error: any) {
      console.error('Error processing payment:', error)
      toast.error('Payment failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen cosmic-bg py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-5xl font-heading font-bold mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-muted-foreground">
            Select the perfect plan for your team's mental health and wellness
          </p>
        </motion.div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {plans.map((plan, index) => {
            const Icon = plan.icon
            const isSelected = selectedPlan?.id === plan.id

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`relative glass-card rounded-3xl p-8 transition-all ${
                  isSelected ? 'ring-4 ring-primary scale-105' : 'hover:scale-102'
                } ${plan.popular ? 'border-2 border-primary' : ''}`}
              >
                {/* Popular Badge */}
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <div className="bg-black text-white px-6 py-2 rounded-full text-sm font-bold flex items-center gap-2">
                      <Star className="w-4 h-4" />
                      MOST POPULAR
                    </div>
                  </div>
                )}

                {/* Plan Icon */}
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${plan.color} mb-6`}>
                  <Icon className="w-8 h-8 text-white" />
                </div>

                {/* Plan Name */}
                <h3 className="text-2xl font-heading font-bold mb-2">{plan.name}</h3>
                <p className="text-muted-foreground text-sm mb-6">
                  {plan.id === 'essential' && 'Perfect for growing teams'}
                  {plan.id === 'professional' && 'Enhanced features for established companies'}
                  {plan.id === 'enterprise' && 'Complete solution with premium benefits'}
                </p>

                {/* Price */}
                <div className="mb-6">
                  <span className="text-5xl font-bold">£{plan.price.toLocaleString()}</span>
                  <span className="text-muted-foreground">/month</span>
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, i) => (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 + i * 0.05 }}
                      className="flex items-start gap-3"
                    >
                      <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </motion.li>
                  ))}
                </ul>

                {/* Select Button */}
                <Button
                  onClick={() => handleSelectPlan(plan)}
                  className="w-full"
                  variant={plan.popular ? 'default' : 'outline'}
                  size="lg"
                >
                  {isSelected ? 'Selected' : 'Select Plan'}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </motion.div>
            )
          })}
        </div>

        {/* Payment Modal */}
        <AnimatePresence>
          {showPayment && selectedPlan && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => !loading && setShowPayment(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="glass-card rounded-3xl p-8 max-w-md w-full"
              >
                {/* Close Button */}
                <button
                  onClick={() => setShowPayment(false)}
                  className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition-colors"
                  disabled={loading}
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Header */}
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-black mb-4">
                    <CreditCard className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-3xl font-heading font-bold mb-2">
                    Complete Payment
                  </h2>
                  <p className="text-muted-foreground">
                    {selectedPlan.name} - £{selectedPlan.price.toLocaleString()}/month
                  </p>
                </div>

                {/* Payment Form */}
                <form onSubmit={handlePayment} className="space-y-4">
                  {/* Card Number */}
                  <div>
                    <label className="block text-sm font-semibold mb-2">
                      Card Number
                    </label>
                    <Input
                      type="text"
                      name="cardNumber"
                      value={cardDetails.cardNumber}
                      onChange={handleCardInput}
                      placeholder="1234 5678 9012 3456"
                      required
                    />
                  </div>

                  {/* Cardholder Name */}
                  <div>
                    <label className="block text-sm font-semibold mb-2">
                      Cardholder Name
                    </label>
                    <Input
                      type="text"
                      name="cardName"
                      value={cardDetails.cardName}
                      onChange={handleCardInput}
                      placeholder="John Doe"
                      required
                    />
                  </div>

                  {/* Expiry & CVV */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold mb-2">
                        Expiry Date
                      </label>
                      <Input
                        type="text"
                        name="expiryDate"
                        value={cardDetails.expiryDate}
                        onChange={handleCardInput}
                        placeholder="MM/YY"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2">
                        CVV
                      </label>
                      <Input
                        type="text"
                        name="cvv"
                        value={cardDetails.cvv}
                        onChange={handleCardInput}
                        placeholder="123"
                        required
                      />
                    </div>
                  </div>

                  {/* Security Notice */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground bg-primary/5 rounded-lg p-3">
                    <Lock className="w-4 h-4" />
                    <span>Your payment information is secure and encrypted</span>
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2" />
                        Processing Payment...
                      </>
                    ) : (
                      <>
                        <Lock className="w-5 h-5 mr-2" />
                        Pay £{selectedPlan.price.toLocaleString()}
                      </>
                    )}
                  </Button>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

