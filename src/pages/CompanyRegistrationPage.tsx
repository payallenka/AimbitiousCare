import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Building2, Globe, Mail, Phone, FileText, ArrowRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

export default function CompanyRegistrationPage() {
  const navigate = useNavigate()
  const { user, refreshProfile } = useAuth()
  const [loading, setLoading] = useState(false)
  
  const [formData, setFormData] = useState({
    company_name: '',
    company_description: '',
    company_website: '',
    company_email: '',
    company_phone: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      toast.error('You must be logged in')
      return
    }

    // Validation
    if (!formData.company_name || !formData.company_email || !formData.company_phone) {
      toast.error('Please fill in all required fields')
      return
    }

    try {
      setLoading(true)

      // Create user record
      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert({
          auth_id: user.id,
          email: user.email!,
          full_name: formData.company_name,
          user_role: 'company',
          phone_number: formData.company_phone,
        })
        .select()
        .single()

      if (userError) throw userError

      // Create company profile
      const { error: companyError } = await supabase
        .from('company_profiles')
        .insert({
          user_id: userData.id,
          ...formData,
        })

      if (companyError) throw companyError

      toast.success('Company profile created successfully!')
      
      // Refresh the auth context to load the new profile
      await refreshProfile()
      
      // Navigate to subscription selection
      navigate('/company/select-plan')
    } catch (error: any) {
      console.error('Error creating company profile:', error)
      toast.error(error.message || 'Failed to create company profile')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen cosmic-bg flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl"
      >
        <div className="glass-card rounded-3xl p-8 md:p-12">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-center mb-8"
          >
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-black mb-4">
              <Building2 className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-heading font-bold mb-2">
              Company Registration
            </h1>
            <p className="text-muted-foreground">
              Tell us about your company to get started
            </p>
          </motion.div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Company Name */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <label className="block text-sm font-semibold mb-2">
                Company Name *
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="text"
                  name="company_name"
                  value={formData.company_name}
                  onChange={handleChange}
                  placeholder="Acme Construction Ltd."
                  className="pl-11"
                  required
                />
              </div>
            </motion.div>

            {/* Company Description */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <label className="block text-sm font-semibold mb-2">
                Company Description
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                <Textarea
                  name="company_description"
                  value={formData.company_description}
                  onChange={handleChange}
                  placeholder="Brief description of your company and services..."
                  className="pl-11 min-h-[100px]"
                />
              </div>
            </motion.div>

            {/* Company Website */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <label className="block text-sm font-semibold mb-2">
                Company Website
              </label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="url"
                  name="company_website"
                  value={formData.company_website}
                  onChange={handleChange}
                  placeholder="https://acme-construction.com"
                  className="pl-11"
                />
              </div>
            </motion.div>

            {/* Company Email */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
            >
              <label className="block text-sm font-semibold mb-2">
                Company Email *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="email"
                  name="company_email"
                  value={formData.company_email}
                  onChange={handleChange}
                  placeholder="contact@acme-construction.com"
                  className="pl-11"
                  required
                />
              </div>
            </motion.div>

            {/* Company Phone */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
            >
              <label className="block text-sm font-semibold mb-2">
                Company Phone *
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="tel"
                  name="company_phone"
                  value={formData.company_phone}
                  onChange={handleChange}
                  placeholder="+44 20 1234 5678"
                  className="pl-11"
                  required
                />
              </div>
            </motion.div>

            {/* Submit Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2" />
                    Creating Profile...
                  </>
                ) : (
                  <>
                    Continue to Plan Selection
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>
            </motion.div>
          </form>
        </div>
      </motion.div>
    </div>
  )
}

