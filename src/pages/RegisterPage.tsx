import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'

interface RoleCard {
  id: string
  title: string
  description: string
  services: string[]
  route: string
  gradient: string
}

export default function RegisterPage({ isSetup = false }: { isSetup?: boolean }) {
  const navigate = useNavigate()

  const roles: RoleCard[] = [
    {
      id: 'patient',
      title: 'Users',
      description: 'Access mental health resources and expert help',
      services: [
        'Licensed mental health professionals',
        'Personalized wellness resources',
        'Confidential therapy sessions',
        'Progress tracking tools',
        'Community support',
      ],
      route: isSetup ? '/setup/patient' : '/register/patient',
      gradient: 'from-black via-gray-800 to-black',
    },
  {
    id: 'therapist',
    title: 'Therapist',
    description: 'Provide mental health support to those who need it',
    services: [
      'Help with anxiety & depression',
      'Trauma & PTSD support',
      'Cognitive behavioral therapy',
      'Stress management',
      'Life transition guidance',
    ],
    route: isSetup ? '/setup/professional/therapist' : '/register/professional/therapist',
    gradient: 'from-pink-500 via-rose-600 to-pink-700',
  },
  {
    id: 'relationship_expert',
    title: 'Relationship Expert',
    description: 'Help with relationship issues and family dynamics',
    services: [
      'Conflict resolution',
      'Family bond strengthening',
      'Communication strategies',
      'Emotional stress management',
      'Separation support',
    ],
    route: isSetup ? '/setup/professional/relationship_expert' : '/register/professional/relationship_expert',
    gradient: 'from-orange-500 via-amber-600 to-orange-700',
  },
  {
    id: 'financial_expert',
    title: 'Financial Expert',
    description: 'Provide financial guidance and planning support',
    services: [
      'Budget planning & literacy',
      'Debt management',
      'Saving strategies',
      'Credit score improvement',
      'Retirement planning',
    ],
    route: isSetup ? '/setup/professional/financial_expert' : '/register/professional/financial_expert',
    gradient: 'from-green-500 via-emerald-600 to-green-700',
  },
  {
    id: 'dating_coach',
    title: 'Dating Coach',
    description: 'Help with dating, confidence and healthy relationships',
    services: [
      'Confidence building',
      'Online dating guidance',
      'Healthy dating habits',
      'Post-divorce support',
      'Effective communication',
    ],
    route: isSetup ? '/setup/professional/dating_coach' : '/register/professional/dating_coach',
    gradient: 'from-cyan-500 via-blue-600 to-cyan-700',
  },
  {
    id: 'health_wellness_coach',
    title: 'Health & Wellness Coach',
    description: 'Provide fitness, nutrition, and wellness guidance',
    services: [
      'Customized fitness plans',
      'Nutritional guidance',
      'Stress management',
      'Sleep hygiene',
      'Substance use support',
    ],
    route: isSetup ? '/setup/professional/health_wellness_coach' : '/register/professional/health_wellness_coach',
    gradient: 'from-lime-500 via-green-600 to-lime-700',
  },
  {
    id: 'executive_coach',
    title: 'Executive Coach',
    description: 'Structured leadership coaching to sharpen decision-making and performance',
    services: [
      'Leadership performance coaching',
      'Goal-setting & accountability',
      'Strategic decision-making support',
      'Executive communication & presence',
      'Change & resilience leadership',
    ],
    route: isSetup ? '/setup/professional/executive_coach' : '/register/professional/executive_coach',
    gradient: 'from-indigo-500 via-violet-600 to-indigo-700',
  },
  {
    id: 'executive_mentor',
    title: 'Executive Mentor',
    description: 'Experienced senior leaders sharing real-world guidance and career perspective',
    services: [
      'Career guidance & progression planning',
      'Industry experience-sharing',
      'Network-building & introductions',
      'Succession & promotion readiness',
      'Confidence & professional growth support',
    ],
    route: isSetup ? '/setup/professional/executive_mentor' : '/register/professional/executive_mentor',
    gradient: 'from-purple-600 via-fuchsia-700 to-purple-800',
  },
  {
    id: 'company',
    title: 'Company',
    description: 'Provide wellness benefits for your employees',
    services: [
      'Invite 100+ employees',
      'Premium wellness plans',
      'Team mental health support',
      'Bulk invitation management',
      'Employee wellness tracking',
    ],
    route: isSetup ? '/setup/company' : '/register/company',
    gradient: 'from-gray-800 via-black to-gray-800',
  },
  ]

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.06,
      },
    },
  }

  const item = {
    hidden: { opacity: 0, y: 30, scale: 0.95 },
    show: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 15
      }
    },
  }

  return (
    <div className="min-h-screen mesh-gradient animated-bg py-16 px-4 overflow-y-auto">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <motion.h1
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="text-7xl font-bold text-black font-bold mb-6"
          >
            Ambitious Care
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-2xl text-gray-700 font-medium mb-4"
          >
            Mental health for construction workers
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-8"
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-3">
              Choose Your Account Type
            </h2>
            <p className="text-xl text-gray-600 font-medium">
              Select the option that best describes you
            </p>
          </motion.div>
        </motion.div>

        {/* Role Cards Grid */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12"
        >
          {roles.map((role) => (
            <motion.div
              key={role.id}
              variants={item}
              whileHover={{ 
                scale: 1.03, 
                y: -8,
                transition: { type: "spring", stiffness: 300, damping: 20 }
              }}
              whileTap={{ scale: 0.98 }}
              className="cursor-pointer group"
              onClick={() => navigate(role.route)}
            >
              <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${role.gradient} p-8 h-full min-h-[420px] flex flex-col shadow-2xl`}>
                {/* Glassmorphic overlay on hover */}
                <div className="absolute inset-0 bg-white/10 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                {/* Content */}
                <div className="relative z-10 flex flex-col h-full">
                  <div className="mb-6">
                    <h3 className="text-4xl font-bold text-white mb-3 drop-shadow-lg">
                      {role.title}
                    </h3>
                    <p className="text-white/95 text-lg font-medium">
                      {role.description}
                    </p>
                  </div>

                  {/* Services */}
                  <div className="flex-1 mb-6">
                    <p className="text-sm font-bold text-white/90 mb-3 uppercase tracking-wider">
                      {role.id === 'patient' ? 'What You Get:' : 'Services:'}
                    </p>
                    <ul className="space-y-2">
                      {role.services.map((service, idx) => (
                        <li key={idx} className="text-white/90 text-sm font-medium flex items-start gap-2">
                          <span className="text-white text-lg mt-0.5">→</span>
                          <span>{service}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* CTA */}
                  <div className="relative z-10">
                    <div className="bg-white/20 backdrop-blur-lg rounded-2xl px-6 py-4 text-center border-2 border-white/30 group-hover:bg-white/30 transition-all">
                      <span className="text-white font-bold text-lg">
                        Register as {role.title}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Decorative element */}
                <motion.div
                  className="absolute -bottom-10 -right-10 w-40 h-40 rounded-full bg-white/10 blur-2xl"
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.3, 0.5, 0.3],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
                
                {/* Shine effect on hover */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  <div className="absolute inset-0 shimmer" />
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Login Link */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="text-center glass-card p-8 rounded-3xl shadow-xl max-w-2xl mx-auto"
        >
          <p className="text-gray-700 text-xl font-medium">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-black hover:text-gray-700 transition-colors font-bold hover:underline"
            >
              Sign in now
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  )
}
