import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  Building2,
  Mail,
  Upload,
  Users,
  Send,
  CheckCircle,
  Clock,
  Download,
  Eye,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Sidebar from '@/components/Sidebar'
import { toast } from 'sonner'
import Papa from 'papaparse'

interface Invitation {
  id: string
  email: string
  status: string
  created_at: string
  accepted_at: string | null
  invited_user: {
    full_name: string
    email: string
    phone_number: string
  } | null
}

interface Employee {
  employee: {
    id: string
    full_name: string
    email: string
    phone_number: string
    user_role: string
  }
  joined_at: string
}

interface Subscription {
  tier: string
  max_workers: number
  current_workers: number
  price_per_month: number
}

export default function CompanyDashboardPage() {
  const navigate = useNavigate()
  const { userProfile } = useAuth()
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [sendingEmail, setSendingEmail] = useState(false)
  
  const [singleEmail, setSingleEmail] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (userProfile) {
      fetchData()
    }
  }, [userProfile])

  const fetchData = async () => {
    try {
      setLoading(true)

      if (!userProfile) {
        setLoading(false)
        return
      }
      
      // Fetch invitations
      const { data: invData } = await supabase
        .from('company_invitations')
        .select(`
          *,
          invited_user:users(full_name, email, phone_number)
        `)
        .eq('company_id', userProfile?.id)
        .order('created_at', { ascending: false })

      let invitationList = invData || []

      const pendingInvites = invitationList.filter((inv) => inv.status !== 'accepted')
      let invitationsUpdated = false

      if (pendingInvites.length > 0) {
        const pendingEmails = pendingInvites.map((inv) => inv.email.toLowerCase())

        const { data: matchedUsers } = await supabase
          .from('users')
          .select('id, email, full_name, phone_number')
          .in('email', pendingEmails)

        if (matchedUsers && matchedUsers.length > 0) {
          for (const user of matchedUsers) {
            const matchingInvitation = pendingInvites.find(
              (inv) => inv.email.toLowerCase() === user.email.toLowerCase()
            )

            if (!matchingInvitation) continue

            const acceptedAt = new Date().toISOString()

            const { error: updateError } = await supabase
              .from('company_invitations')
              .update({
                status: 'accepted',
                invited_user_id: user.id,
                accepted_at: acceptedAt,
              })
              .eq('id', matchingInvitation.id)
              .eq('company_id', userProfile.id)

            if (!updateError) {
              invitationsUpdated = true
            } else {
              console.error('Error updating invitation status:', updateError)
            }

            const { data: existingEmployee } = await supabase
              .from('company_employees')
              .select('id')
              .eq('company_id', userProfile.id)
              .eq('employee_id', user.id)
              .maybeSingle()

            if (!existingEmployee) {
              const { error: insertEmployeeError } = await supabase
                .from('company_employees')
                .insert({
                  company_id: userProfile.id,
                  employee_id: user.id,
                })

              if (insertEmployeeError && insertEmployeeError.code !== '23505') {
                console.error('Error linking existing user as employee:', insertEmployeeError)
              }
            }
          }
        }
      }

      if (invitationsUpdated) {
        const { data: refreshedInvites } = await supabase
          .from('company_invitations')
          .select(`
            *,
            invited_user:users(full_name, email, phone_number)
          `)
          .eq('company_id', userProfile?.id)
          .order('created_at', { ascending: false })

        invitationList = refreshedInvites || invitationList
      }

      setInvitations(invitationList)

      // Fetch employees
      const { data: empData } = await supabase
        .from('company_employees')
        .select(`
          *,
          employee:users!company_employees_employee_id_fkey(id, full_name, email, phone_number, user_role)
        `)
        .eq('company_id', userProfile?.id)
        .order('joined_at', { ascending: false })

      setEmployees(empData || [])

      // Fetch subscription
      const { data: subData, error: subError } = await supabase
        .from('company_subscriptions')
        .select('*')
        .eq('company_id', userProfile?.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle() // Use maybeSingle() instead of single() to handle no results

      if (subError) {
        console.error('Error fetching subscription:', subError)
      } else if (subData) {
        setSubscription({
          tier: subData.subscription_tier,
          max_workers: subData.max_workers,
          current_workers: empData?.length || 0,
          price_per_month: parseFloat(subData.price_per_month),
        })
      } else {
        console.log('No active subscription found')
      }
    } catch (error: any) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const sendInvitation = async (email: string) => {
    if (!userProfile) return false

    try {
      // Check if can invite more workers
      if (subscription && subscription.max_workers !== -1) {
        if (subscription.current_workers >= subscription.max_workers) {
          toast.error('Worker limit reached for your plan')
          return false
        }
      }

      const emailLower = email.toLowerCase().trim()

      // Check if user with this email already exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id, full_name, user_role')
        .eq('email', emailLower)
        .maybeSingle() // Use maybeSingle() to handle non-existent users

      // Generate invitation token
      const token = `${Date.now()}_${Math.random().toString(36).substring(2)}`

      if (existingUser) {
        // User already exists - add them directly without sending email
        
        // Create invitation record as 'accepted'
        const { error: invError } = await supabase
          .from('company_invitations')
          .insert({
            company_id: userProfile.id,
            email: emailLower,
            invitation_token: token,
            status: 'accepted',
            invited_user_id: existingUser.id,
            accepted_at: new Date().toISOString(),
          })

        if (invError) {
          if (invError.code === '23505') { // Unique constraint violation
            toast.error('This user has already been added to your company')
          } else {
            throw invError
          }
          return false
        }

        // Add to company_employees
        const { error: empError } = await supabase
          .from('company_employees')
          .insert({
            company_id: userProfile.id,
            employee_id: existingUser.id,
          })

        if (empError && empError.code !== '23505') {
          // Ignore duplicate errors, throw others
          throw empError
        }

        toast.success(`✅ ${existingUser.full_name} added to your company!`, {
          description: 'This user already had an account and has been linked automatically.',
        })

        return true
      }

      // User doesn't exist - create invitation and send email
      const { error: invError } = await supabase
        .from('company_invitations')
        .insert({
          company_id: userProfile.id,
          email: emailLower,
          invitation_token: token,
        })

      if (invError) {
        if (invError.code === '23505') { // Unique constraint violation
          toast.error('This email has already been invited')
        } else {
          throw invError
        }
        return false
      }

      // Get company name
      const { data: companyData } = await supabase
        .from('company_profiles')
        .select('company_name')
        .eq('user_id', userProfile.id)
        .single()

      const companyName = companyData?.company_name || userProfile.full_name

      // Send email via Netlify Function
      try {
        const response = await fetch('/.netlify/functions/send-invitation', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: emailLower,
            companyName,
            invitationToken: token,
            appUrl: import.meta.env.VITE_APP_URL || 'https://ambitiouscare.co',
          }),
        })

        if (response.ok) {
          toast.success('📧 Invitation email sent successfully!', {
            description: `Invitation sent to ${email}`,
          })
        } else {
          // Email failed but invitation created - fallback to link
          const signupLink = `${import.meta.env.VITE_APP_URL || 'https://ambitiouscare.co'}/register?invite=${token}`
          await navigator.clipboard.writeText(signupLink)
          toast.warning('Email service unavailable', {
            description: 'Invitation link copied to clipboard instead.',
          })
        }
      } catch (emailError) {
        // Email service failed - provide link as fallback
        const signupLink = `${import.meta.env.VITE_APP_URL || 'https://ambitiouscare.co'}/register?invite=${token}`
        await navigator.clipboard.writeText(signupLink)
        toast.warning('Email service unavailable', {
          description: 'Invitation link copied to clipboard. Share it manually.',
        })
      }

      return true
    } catch (error: any) {
      console.error('Error sending invitation:', error)
      toast.error('Failed to send invitation')
      return false
    }
  }

  const handleSingleInvite = async () => {
    if (!singleEmail.trim()) {
      toast.error('Please enter an email address')
      return
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(singleEmail)) {
      toast.error('Please enter a valid email address')
      return
    }

    setSendingEmail(true)
    const success = await sendInvitation(singleEmail)
    if (success) {
      setSingleEmail('')
      await fetchData()
    }
    setSendingEmail(false)
  }

  const handleBatchUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file')
      return
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results: Papa.ParseResult<Record<string, string>>) => {
        const emails: string[] = []
        
        // Extract emails from CSV
        results.data.forEach((row: Record<string, string>) => {
          const email = row.email || row.Email || row.EMAIL
          if (email && typeof email === 'string') {
            emails.push(email.toLowerCase().trim())
          }
        })

        if (emails.length === 0) {
          toast.error('No valid emails found in CSV')
          return
        }

        toast.info(`Processing ${emails.length} invitations...`)
        
        let successCount = 0
        let existingCount = 0
        let newInviteCount = 0
        setSendingEmail(true)

        for (const email of emails) {
          // Check if user exists before calling sendInvitation
          const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('email', email)
            .maybeSingle() // Use maybeSingle() to handle non-existent users

          const success = await sendInvitation(email)
          if (success) {
            successCount++
            if (existingUser) {
              existingCount++
            } else {
              newInviteCount++
            }
          }
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100))
        }

        setSendingEmail(false)
        
        toast.success(`✅ Processed ${successCount} of ${emails.length} emails!`, {
          description: `${existingCount} existing users added, ${newInviteCount} new invitations sent.`,
        })
        await fetchData()
      },
      error: (error: Error) => {
        console.error('CSV parse error:', error)
        toast.error('Failed to parse CSV file')
      },
    })

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const downloadSampleCSV = () => {
    const csv = 'email\nexample1@company.com\nexample2@company.com\nexample3@company.com'
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'sample_invitations.csv'
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'bg-black text-white border border-black'
      case 'expired':
        return 'bg-white/50 text-black/60 border border-black/15'
      case 'pending':
      default:
        return 'bg-white/70 text-black/70 border border-black/15'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen mesh-bg flex flex-col lg:flex-row">
        <Sidebar />
        <div className="flex-1 w-full flex items-center justify-center px-4 py-12 sm:px-6 lg:px-12 lg:ml-64">
          <div className="w-full max-w-lg rounded-3xl border border-black/10 bg-white/60 backdrop-blur-xl px-10 py-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border border-black/20 border-t-black mx-auto mb-6" />
            <p className="text-black/70 font-medium tracking-wide">Loading company dashboard...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen mesh-bg flex flex-col lg:flex-row">
      <Sidebar />

      <div className="flex-1 w-full px-4 py-12 sm:px-6 lg:px-12 lg:ml-64">
        <div className="mx-auto w-full max-w-6xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6"
        >
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-black/40 mb-3">Company</p>
            <div className="flex items-center gap-3 mb-2">
              <Building2 className="w-10 h-10 text-black" />
              <h1 className="text-4xl font-heading font-bold text-black">
                Company Dashboard
              </h1>
            </div>
            <p className="text-black/60 text-lg">
              Manage your team and invite employees to join AmbitiousCare.
            </p>
          </div>
        </motion.div>

        {/* Quick Action - View All Employees */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-2xl p-6 mb-8 cursor-pointer hover:scale-102 transition-all bg-gradient-to-br from-black/5 to-gray-500/5 border-2 border-black/20"
          onClick={() => navigate('/company/employees')}
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-heading font-bold mb-2">Employee Directory</h2>
              <p className="text-muted-foreground">
                View all invited employees with detailed profiles and information
              </p>
            </div>
            <Button size="lg" className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              View All Employees
            </Button>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card rounded-2xl p-6"
          >
            <Users className="w-10 h-10 text-black mb-3" />
            <div className="text-3xl font-bold text-black">{employees.length}</div>
            <div className="text-sm text-black/60">Active Employees</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="glass-card rounded-2xl p-6"
          >
            <Mail className="w-10 h-10 text-black mb-3" />
            <div className="text-3xl font-bold text-black">{invitations.length}</div>
            <div className="text-sm text-black/60">Total Invitations</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="glass-card rounded-2xl p-6"
          >
            <CheckCircle className="w-10 h-10 text-black mb-3" />
            <div className="text-3xl font-bold text-black">
              {invitations.filter(i => i.status === 'accepted').length}
            </div>
            <div className="text-sm text-black/60">Accepted</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="glass-card rounded-2xl p-6"
          >
            <Clock className="w-10 h-10 text-black mb-3" />
            <div className="text-3xl font-bold text-black">
              {invitations.filter(i => i.status === 'pending').length}
            </div>
            <div className="text-sm text-black/60">Pending</div>
          </motion.div>
        </div>

        {/* Subscription Info */}
        {subscription && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-2xl p-6 mb-8"
          >
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h3 className="text-xl font-heading font-semibold mb-1 capitalize">
                  {subscription.tier} Plan
                </h3>
                <p className="text-muted-foreground text-sm">
                  £{subscription.price_per_month.toLocaleString()}/month
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">
                  {subscription.current_workers}
                  {subscription.max_workers !== -1 && ` / ${subscription.max_workers}`}
                </div>
                <div className="text-sm text-muted-foreground">
                  {subscription.max_workers === -1 ? 'Unlimited Workers' : 'Workers'}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Invitation Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card rounded-2xl p-8 mb-8"
        >
          <h2 className="text-2xl font-heading font-semibold mb-6">
            Invite Employees
          </h2>

          {/* Single Email Invite */}
          <div className="mb-6">
            <label className="block text-sm font-semibold mb-2">
              Send Single Invitation
            </label>
            <div className="flex gap-3">
              <Input
                type="email"
                value={singleEmail}
                onChange={(e) => setSingleEmail(e.target.value)}
                placeholder="employee@example.com"
                className="flex-1"
                disabled={sendingEmail}
              />
              <Button
                onClick={handleSingleInvite}
                disabled={sendingEmail}
              >
                {sendingEmail ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Invite
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Batch Upload */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="block text-sm font-semibold">
                Batch Upload (CSV)
              </label>
              <Button
                onClick={downloadSampleCSV}
                variant="ghost"
                size="sm"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Sample CSV
              </Button>
            </div>
            
            <div className="border-2 border-dashed border-border rounded-xl p-8 text-center">
              <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">
                Upload a CSV file with email addresses to send batch invitations
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleBatchUpload}
                className="hidden"
                disabled={sendingEmail}
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={sendingEmail}
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload CSV
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Employees Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass-card rounded-2xl p-8 mb-8"
        >
          <h2 className="text-2xl font-heading font-semibold mb-6">
            Active Employees
          </h2>

          {employees.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">No employees yet. Start inviting!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-semibold">Name</th>
                    <th className="text-left py-3 px-4 font-semibold">Email</th>
                    <th className="text-left py-3 px-4 font-semibold">Phone</th>
                    <th className="text-left py-3 px-4 font-semibold">Role</th>
                    <th className="text-left py-3 px-4 font-semibold">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp, index) => (
                    <motion.tr
                      key={emp.employee.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="border-b border-border/50 hover:bg-white/5"
                    >
                      <td className="py-3 px-4">{emp.employee.full_name}</td>
                      <td className="py-3 px-4 text-muted-foreground">{emp.employee.email}</td>
                      <td className="py-3 px-4 text-muted-foreground">{emp.employee.phone_number}</td>
                      <td className="py-3 px-4 capitalize">{emp.employee.user_role}</td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {new Date(emp.joined_at).toLocaleDateString()}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>

        {/* Invitations Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="glass-card rounded-2xl p-8"
        >
          <h2 className="text-2xl font-heading font-semibold mb-6">
            Invitation History
          </h2>

          {invitations.length === 0 ? (
            <div className="text-center py-12">
              <Mail className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">No invitations sent yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-semibold">Email</th>
                    <th className="text-left py-3 px-4 font-semibold">Status</th>
                    <th className="text-left py-3 px-4 font-semibold">Sent</th>
                    <th className="text-left py-3 px-4 font-semibold">Accepted</th>
                  </tr>
                </thead>
                <tbody>
                  {invitations.map((inv, index) => (
                    <motion.tr
                      key={inv.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="border-b border-border/50 hover:bg-white/5"
                    >
                      <td className="py-3 px-4">{inv.email}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold uppercase border ${getStatusBadge(inv.status)}`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {new Date(inv.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {inv.accepted_at ? new Date(inv.accepted_at).toLocaleDateString() : '-'}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  </div>
  )
}

