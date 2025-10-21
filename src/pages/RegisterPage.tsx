import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Brain,
  Heart,
  Users,
  DollarSign,
  MessageCircle,
  Activity,
} from 'lucide-react'

interface RoleCard {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  services: string[]
  route: string
}

export default function RegisterPage({ isSetup = false }: { isSetup?: boolean }) {
  const navigate = useNavigate()

  const roles: RoleCard[] = [
    {
      id: 'patient',
      title: 'Patient',
      description: 'Create an account to access mental health resources and expert help.',
      icon: <Brain className="w-8 h-8" />,
      services: [
        'Access to mental health professionals',
        'Personalized wellness resources',
        'Confidential therapy sessions',
        'Progress tracking tools',
        'Community support forums',
      ],
      route: isSetup ? '/setup/patient' : '/register/patient',
    },
  {
    id: 'therapist',
    title: 'Therapist',
    description: 'Create an account as a therapist to provide mental health support.',
    icon: <Heart className="w-8 h-8" />,
    services: [
      'Help clients with anxiety & depression',
      'Provide trauma & PTSD support',
      'Offer cognitive behavioral therapy',
      'Assist with stress management',
      'Guide through life transitions',
    ],
    route: isSetup ? '/setup/professional/therapist' : '/register/professional/therapist',
  },
  {
    id: 'relationship_expert',
    title: 'Relationship Expert',
    description: 'Create an account to help with relationship issues and family dynamics.',
    icon: <Users className="w-8 h-8" />,
    services: [
      'Conflict resolution with partners',
      'Strengthening bonds with children/family',
      'Healthy communication strategies',
      'Managing emotional stress from home life',
      'Navigating separation or infidelity',
    ],
    route: isSetup ? '/setup/professional/relationship_expert' : '/register/professional/relationship_expert',
  },
  {
    id: 'financial_expert',
    title: 'Financial Expert',
    description: 'Create an account to provide financial guidance and planning support.',
    icon: <DollarSign className="w-8 h-8" />,
    services: [
      'Budget planning & financial literacy',
      'Debt management strategies',
      'Saving plans for long/short-term goals',
      'Credit score improvement',
      'Retirement & pension planning',
    ],
    route: isSetup ? '/setup/professional/financial_expert' : '/register/professional/financial_expert',
  },
  {
    id: 'dating_coach',
    title: 'Dating Coach',
    description: 'Create an account to help with dating, confidence building and healthy relationships.',
    icon: <MessageCircle className="w-8 h-8" />,
    services: [
      'Confidence building & self-worth',
      'Online dating guidance',
      'Healthy dating habits & red flags',
      'Post-divorce/separation support',
      'Effective communication in dating',
    ],
    route: isSetup ? '/setup/professional/dating_coach' : '/register/professional/dating_coach',
  },
  {
    id: 'health_wellness_coach',
    title: 'Health & Wellness Coach',
    description: 'Create an account to provide fitness, nutrition, and wellness guidance.',
    icon: <Activity className="w-8 h-8" />,
    services: [
      'Customized fitness plans',
      'Nutritional guidance for energy',
      'Stress management techniques',
      'Sleep hygiene and recovery',
      'Substance use reduction support',
    ],
    route: isSetup ? '/setup/professional/health_wellness_coach' : '/register/professional/health_wellness_coach',
    },
  ]

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  }

  return (
    <div className="min-h-screen cosmic-bg py-12 px-4 overflow-y-auto">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-full glass-card mb-4"
          >
            <Brain className="w-8 h-8 text-primary" />
          </motion.div>
          <h1 className="text-4xl font-heading font-bold gradient-text mb-2">
            Ambitious Care
          </h1>
          <p className="text-muted-foreground mb-8">
            Mental health for construction workers
          </p>

          <h2 className="text-3xl font-heading font-semibold text-foreground mb-3">
            Create an account
          </h2>
          <p className="text-muted-foreground">
            Choose your account type to get started
          </p>
        </motion.div>

        {/* Role Cards Grid */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8"
        >
          {roles.map((role) => (
            <motion.div
              key={role.id}
              variants={item}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="glass-card rounded-2xl p-6 cursor-pointer hover:bg-card/60 transition-all group"
              onClick={() => navigate(role.route)}
            >
              <div className="flex flex-col h-full">
                {/* Icon */}
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 text-primary mb-4 group-hover:bg-primary/20 transition-colors">
                  {role.icon}
                </div>

                {/* Title */}
                <h3 className="text-xl font-heading font-semibold mb-2 group-hover:text-primary transition-colors">
                  {role.title}
                </h3>

                {/* Description */}
                <p className="text-sm text-muted-foreground mb-4">
                  {role.description}
                </p>

                {/* Services */}
                {role.id === 'patient' ? (
                  <div className="mt-auto">
                    <p className="text-sm font-medium mb-2">As a patient, you can:</p>
                    <ul className="space-y-1">
                      {role.services.map((service, idx) => (
                        <li key={idx} className="text-xs text-muted-foreground flex items-start gap-2">
                          <span className="text-primary mt-1">•</span>
                          <span>{service}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="mt-auto">
                    <p className="text-sm font-medium mb-2">Services provided:</p>
                    <ul className="space-y-1">
                      {role.services.map((service, idx) => (
                        <li key={idx} className="text-xs text-muted-foreground flex items-start gap-2">
                          <span className="text-primary mt-1">•</span>
                          <span>{service}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Register Button */}
                <button className="mt-4 w-full py-2 px-4 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-colors text-sm font-medium">
                  Register as {role.title}
                </button>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Login Link */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-center"
        >
          <p className="text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-primary hover:text-accent transition-colors font-medium"
            >
              Log in
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  )
}

