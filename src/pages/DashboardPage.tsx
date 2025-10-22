import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { motion } from 'framer-motion'
import { Users, MessageCircle, Calendar, Clock, Inbox, User, Sparkles, FileText, Gift } from 'lucide-react'
import Navbar from '@/components/Navbar'

export default function DashboardPage() {
  const navigate = useNavigate()
  const { userProfile } = useAuth()

  return (
    <div className="min-h-screen cosmic-bg">
      <Navbar />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-4xl font-heading font-bold mb-2">
            Welcome back, {userProfile?.full_name}!
          </h1>
          <p className="text-muted-foreground mb-8">
            Account type: <span className="text-primary capitalize">{userProfile?.user_role.replace('_', ' ')}</span>
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="glass-card rounded-2xl p-8 cursor-pointer bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20"
              onClick={() => navigate('/ai-chatbot')}
            >
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-primary via-accent to-primary/60 mb-4 animate-pulse">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-heading font-semibold mb-2 gradient-text">
                AI Chatbot
              </h2>
              <p className="text-muted-foreground">
                Chat with an AI therapist 24/7. Confidential, understanding support anytime you need it.
              </p>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              className="glass-card rounded-2xl p-8 cursor-pointer"
              onClick={() => navigate('/experts')}
            >
              <Users className="w-12 h-12 text-primary mb-4" />
              <h2 className="text-2xl font-heading font-semibold mb-2">
                Find Experts
              </h2>
              <p className="text-muted-foreground">
                Browse and connect with mental health professionals who can help you.
              </p>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              className="glass-card rounded-2xl p-8 cursor-pointer"
              onClick={() => navigate('/chat')}
            >
              <MessageCircle className="w-12 h-12 text-primary mb-4" />
              <h2 className="text-2xl font-heading font-semibold mb-2">
                Messages
              </h2>
              <p className="text-muted-foreground">
                View and manage your conversations with experts.
              </p>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              className="glass-card rounded-2xl p-8 cursor-pointer"
              onClick={() => navigate('/profile')}
            >
              <User className="w-12 h-12 text-primary mb-4" />
              <h2 className="text-2xl font-heading font-semibold mb-2">
                My Profile
              </h2>
              <p className="text-muted-foreground">
                View and edit your personal information and account details.
              </p>
            </motion.div>

            {userProfile?.user_role === 'patient' ? (
              <>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="glass-card rounded-2xl p-8 cursor-pointer"
                  onClick={() => navigate('/book-appointment')}
                >
                  <Calendar className="w-12 h-12 text-primary mb-4" />
                  <h2 className="text-2xl font-heading font-semibold mb-2">
                    Book Appointment
                  </h2>
                  <p className="text-muted-foreground">
                    Schedule a session with a mental health professional.
                  </p>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="glass-card rounded-2xl p-8 cursor-pointer"
                  onClick={() => navigate('/my-appointments')}
                >
                  <Clock className="w-12 h-12 text-primary mb-4" />
                  <h2 className="text-2xl font-heading font-semibold mb-2">
                    My Appointments
                  </h2>
                  <p className="text-muted-foreground">
                    View and manage your scheduled appointments.
                  </p>
                </motion.div>
              </>
            ) : (
              <>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="glass-card rounded-2xl p-8 cursor-pointer"
                  onClick={() => navigate('/availability')}
                >
                  <Clock className="w-12 h-12 text-primary mb-4" />
                  <h2 className="text-2xl font-heading font-semibold mb-2">
                    Set Availability
                  </h2>
                  <p className="text-muted-foreground">
                    Define when you're available for appointments.
                  </p>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="glass-card rounded-2xl p-8 cursor-pointer"
                  onClick={() => navigate('/appointment-inbox')}
                >
                  <Inbox className="w-12 h-12 text-primary mb-4" />
                  <h2 className="text-2xl font-heading font-semibold mb-2">
                    Appointment Inbox
                  </h2>
                  <p className="text-muted-foreground">
                    Review and respond to appointment requests.
                  </p>
                </motion.div>
              </>
            )}

            <motion.div
              whileHover={{ scale: 1.02 }}
              className="glass-card rounded-2xl p-8 cursor-pointer"
              onClick={() => navigate('/posts')}
            >
              <FileText className="w-12 h-12 text-primary mb-4" />
              <h2 className="text-2xl font-heading font-semibold mb-2">
                Community Posts
              </h2>
              <p className="text-muted-foreground">
                {userProfile?.user_role === 'patient' 
                  ? 'Read helpful articles and insights from professionals.'
                  : 'Share knowledge and connect with the community.'}
              </p>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              className="glass-card rounded-2xl p-8 cursor-pointer"
              onClick={() => navigate('/deals')}
            >
              <Gift className="w-12 h-12 text-primary mb-4" />
              <h2 className="text-2xl font-heading font-semibold mb-2">
                Exclusive Deals
              </h2>
              <p className="text-muted-foreground">
                Save on wellness services, fitness, dining, and more with exclusive offers!
              </p>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

