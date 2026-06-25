import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { motion } from 'framer-motion'
import { useEffect } from 'react'
import Sidebar from '@/components/Sidebar'

export default function DashboardPage() {
  const navigate = useNavigate()
  const { userProfile } = useAuth()

  useEffect(() => {
    if (userProfile?.user_role === 'company') {
      navigate('/company/dashboard')
    }
  }, [userProfile, navigate])

  const patientCards = [
    { title: 'AI Chatbot', subtitle: '24/7 Support', desc: 'Talk to our instant assistant for guidance any time.', path: '/ai-chatbot' },
    { title: 'Find Experts', subtitle: 'Connect Quickly', desc: 'Browse vetted professionals ready to help.', path: '/experts' },
    { title: 'Messages', subtitle: 'Conversations', desc: 'Continue your ongoing private discussions.', path: '/chat' },
    { title: 'My Profile', subtitle: 'Account Hub', desc: 'Control your personal information and preferences.', path: '/profile' },
    { title: 'Book Appointment', subtitle: 'Schedule', desc: 'Choose a time that fits you best in minutes.', path: '/book-appointment' },
    { title: 'My Appointments', subtitle: 'Upcoming', desc: 'Track upcoming and past sessions effortlessly.', path: '/my-appointments' },
    { title: 'Rapid Alert', subtitle: 'Urgent Help', desc: 'Reach experts instantly with rapid alerts.', path: '/rapid-alert' },
    { title: 'Community Posts', subtitle: 'Insights', desc: 'Learn from professional knowledge and updates.', path: '/posts' },
    { title: 'Exclusive Deals', subtitle: 'Benefits', desc: 'Unlock curated perks tailored for wellness.', path: '/deals' },
  ]

  const professionalCards = [
    { title: 'AI Chatbot', subtitle: 'Assistant', desc: 'Let AI streamline your repetitive responses.', path: '/ai-chatbot' },
    { title: 'Find Experts', subtitle: 'Network', desc: 'Collaborate with peers across specialisations.', path: '/experts' },
    { title: 'Messages', subtitle: 'Clients', desc: 'Stay in sync with every conversation thread.', path: '/chat' },
    { title: 'My Profile', subtitle: 'Presence', desc: 'Showcase qualifications and experience elegantly.', path: '/profile' },
    { title: 'Set Availability', subtitle: 'Schedule', desc: 'Craft a calendar that adapts to your routine.', path: '/availability' },
    { title: 'Appointment Inbox', subtitle: 'Requests', desc: 'Review, confirm, or reschedule in one view.', path: '/appointment-inbox' },
    ...(userProfile?.user_role === 'therapist'
      ? [{ title: 'Rapid Alert Inbox', subtitle: 'Urgent', desc: 'Respond quickly to user critical moments.', path: '/rapid-alert-inbox' }]
      : []),
    { title: 'Community Posts', subtitle: 'Share', desc: 'Publish articles that amplify your voice.', path: '/posts' },
    { title: 'Exclusive Deals', subtitle: 'Perks', desc: 'Access premium offers curated for professionals.', path: '/deals' },
    { title: 'Analytics', subtitle: 'Insights', desc: 'Visualise performance and identify trends.', path: '/analytics' },
  ]

  const cards = userProfile?.user_role === 'patient' ? patientCards : professionalCards

  const currentDate = new Date().toLocaleDateString('en-GB', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })

  return (
    <div className="min-h-screen mesh-bg flex flex-col lg:flex-row">
      <Sidebar />

      <div className="flex-1 w-full min-h-screen lg:ml-64">
        <div className="px-4 py-10 sm:px-6 lg:px-12">
          {/* Welcome Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="mb-6">
              <h1 className="text-5xl font-bold text-black mb-3">
                Welcome, {userProfile?.full_name?.split(' ')[0] || 'User'}
              </h1>
              <div className="flex items-center gap-6 text-muted-foreground">
                <div className="flex items-center gap-3 bg-white/60 px-4 py-2 rounded-full border border-black/10">
                  <div className="h-8 w-8 rounded-full border border-black/20 bg-white/80 backdrop-blur" />
                  <span className="font-semibold text-black tracking-wide">{currentDate}</span>
                </div>
                <div className="h-6 w-px bg-border"></div>
                <div className="px-4 py-1 bg-black text-white rounded-full text-sm font-bold uppercase tracking-wider">
                  {userProfile?.user_role}
                </div>
              </div>
            </div>

            {/* Feature Banner */}
            <div className="relative elevated-card p-8 bg-white/30 border border-black/10 text-black overflow-hidden backdrop-blur-xl">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(0,0,0,0.12),transparent_60%),radial-gradient(circle_at_bottom_right,rgba(0,0,0,0.08),transparent_55%)]"></div>
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex-1">
                  <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full text-xs font-bold mb-4 bg-white/70 border border-black/10 tracking-[0.32em] uppercase">
                    Featured
                  </div>
                  <h3 className="text-2xl font-bold mb-2">
                    {userProfile?.user_role === 'patient' 
                      ? 'Your Mental Wellness Journey'
                      : 'Professional Excellence Dashboard'}
                  </h3>
                  <p className="text-black/70 font-medium max-w-xl">
                    {userProfile?.user_role === 'patient' 
                      ? 'Access comprehensive mental health resources and professional support'
                      : 'Manage your practice, appointments, and client relationships efficiently'}
                  </p>
                </div>
                <button
                  onClick={() => navigate('/ai-chatbot')}
                  className="group px-8 py-5 rounded-2xl bg-black text-white font-semibold tracking-wide border border-black transition-all hover:shadow-2xl hover:-translate-y-1"
                >
                  <div className="flex items-center justify-between gap-6">
                    <div className="text-left">
                      <div className="text-xs uppercase text-white/70 tracking-[0.4em] mb-2">Launch</div>
                      <div className="text-lg font-bold">AI Chatbot Workspace</div>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-white/10 border border-white/30 group-hover:rotate-45 transition" />
                  </div>
                </button>
              </div>
            </div>
          </motion.div>

          {/* Quick Stats Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-3 gap-4 mb-8"
          >
            <div className="stat-card text-center">
              <div className="text-3xl font-bold text-black">{cards.length}</div>
              <div className="text-sm text-muted-foreground font-bold uppercase tracking-wide">Available Features</div>
            </div>
            <div className="stat-card text-center">
              <div className="text-3xl font-bold text-black">24/7</div>
              <div className="text-sm text-muted-foreground font-bold uppercase tracking-wide">AI Support</div>
            </div>
            <div className="stat-card text-center">
              <div className="text-3xl font-bold text-black">100%</div>
              <div className="text-sm text-muted-foreground font-bold uppercase tracking-wide">Confidential</div>
            </div>
          </motion.div>

          {/* Section Title */}
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-black mb-2">Your Dashboard</h2>
            <p className="text-muted-foreground font-semibold">Quick access to all your essential tools and features</p>
          </div>

          {/* Cards Grid */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: { staggerChildren: 0.05 }
              }
            }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {cards.map((card, index) => (
              <motion.div
                key={card.path}
                variants={{
                  hidden: { opacity: 0, y: 30 },
                  visible: { 
                    opacity: 1, 
                    y: 0,
                    transition: { type: "spring", stiffness: 100, damping: 15 }
                  }
                }}
                className="group relative overflow-hidden rounded-3xl border border-black/10 bg-white/40 backdrop-blur-xl p-6 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
                onClick={() => navigate(card.path)}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-black/5 opacity-0 group-hover:opacity-100 transition" />

                <div className="relative z-10 flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-black/15 bg-white/80 backdrop-blur font-bold text-lg">
                      {card.title.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-black/50">{card.subtitle}</p>
                      <h3 className="text-xl font-bold text-black">{card.title}</h3>
                    </div>
                  </div>
                  {index < 3 && (
                    <span className="px-3 py-1 rounded-full border border-black/10 bg-white/70 text-[11px] font-semibold tracking-[0.32em] uppercase">
                      Focus
                    </span>
                  )}
                </div>

                <p className="relative z-10 text-sm text-black/70 leading-relaxed mb-6 min-h-[56px]">
                  {card.desc}
                </p>

                <div className="relative z-10 flex items-center justify-between pt-4 border-t border-black/10 text-xs uppercase tracking-[0.32em] text-black/60">
                  <span>Open Workspace</span>
                  <span className="flex h-5 w-5 items-center justify-center rounded-full border border-black/20 group-hover:bg-black group-hover:text-white transition">→</span>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Bottom CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-8 text-center p-8 bg-white/50 backdrop-blur-sm rounded-2xl border-2 border-border"
          >
            <h3 className="text-2xl font-bold text-black mb-2">Need Immediate Support?</h3>
            <p className="text-muted-foreground font-medium mb-4">
              Our AI chatbot is available 24/7 for instant mental health assistance
            </p>
            <button
              onClick={() => navigate('/ai-chatbot')}
              className="px-8 py-3 bg-black text-white rounded-xl font-bold hover:bg-white hover:text-black border-2 border-black transition-all transform hover:scale-105"
            >
              Talk to AI Now →
            </button>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
