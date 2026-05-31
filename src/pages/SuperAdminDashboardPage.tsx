import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { format, startOfMonth, subMonths } from 'date-fns'
import SuperAdminSidebar from '@/components/SuperAdminSidebar'
import { InfoDialogButton } from '@/components/InfoDialog'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { Edit2, Trash2, Eye, EyeOff, Users, FileText, AlertCircle, Building, Briefcase, DollarSign } from 'lucide-react'

interface StatsSummary {
  totalUsers: number
  totalPatients: number
  totalProfessionals: number
  totalCompanies: number
  totalAppointments: number
  pendingAppointments: number
  totalRapidAlerts: number
  activeDeals: number
  totalInvitations: number
  acceptedInvitations: number
  pendingInvitations: number
  totalPosts: number
  totalResources: number
  totalEmployees: number
}

interface User {
  id: string
  email: string
  full_name: string
  user_role: string
  phone_number: string
  created_at: string
}

interface Post {
  id: string
  content: string
  image_url: string | null
  created_at: string
  author_id: string
  author?: {
    full_name: string
    email: string
  }
}

interface RapidAlert {
  id: string
  message: string
  urgency_level: string
  status: string
  created_at: string
  patient_id: string
  patient?: {
    full_name: string
    email: string
  }
}

interface Resource {
  id: string
  title: string
  description: string
  url: string
  category: string | null
  resource_type: string | null
  is_active: boolean
  is_featured: boolean
  display_order: number
  created_at: string
}

interface Company {
  id: string
  email: string
  full_name: string
  created_at: string
  company_profile?: {
    company_name: string
    company_email: string
    company_phone: string
  }
}

interface Employee {
  id: string
  company_id: string
  employee_id: string
  joined_at: string
  employee?: {
    full_name: string
    email: string
    user_role: string
  }
  company?: {
    full_name: string
  }
}

interface Subscription {
  id: string
  company_id: string
  subscription_tier: string
  max_workers: number
  price_per_month: number
  is_active: boolean
  started_at: string
  company?: {
    full_name: string
  }
}

interface DealRecord {
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
  is_active: boolean
  created_at: string
}

type DealFormState = {
  business_name: string
  description: string
  address: string
  timings: string
  coupon_code: string
  discount_percentage: string
  discount_details: string
  category: string
  valid_until: string
  terms_conditions: string
  is_active: boolean
}

type ResourceFormState = {
  title: string
  description: string
  url: string
  category: string
  resource_type: string
  is_active: boolean
  is_featured: boolean
  display_order: string
}

interface StatusDatum {
  status: string
  value: number
}

interface TrendDatum {
  period: string
  value: number
}

const defaultDealForm: DealFormState = {
  business_name: '',
  description: '',
  address: '',
  timings: '',
  coupon_code: '',
  discount_percentage: '',
  discount_details: '',
  category: '',
  valid_until: '',
  terms_conditions: '',
  is_active: true,
}

const defaultResourceForm: ResourceFormState = {
  title: '',
  description: '',
  url: '',
  category: '',
  resource_type: '',
  is_active: true,
  is_featured: false,
  display_order: '0',
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const CHART_COLORS = ['#111111', '#4a4a4a', '#787878', '#a8a8a8', '#d4d4d4']

export default function SuperAdminDashboardPage() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<StatsSummary | null>(null)
  const [deals, setDeals] = useState<DealRecord[]>([])
  const [dealForm, setDealForm] = useState<DealFormState>(defaultDealForm)
  const [editingDealId, setEditingDealId] = useState<string | null>(null)
  const [savingDeal, setSavingDeal] = useState(false)
  const [deletingDealId, setDeletingDealId] = useState<string | null>(null)
  const [refreshToggle, setRefreshToggle] = useState(false)
  const [invitationEmail, setInvitationEmail] = useState('')
  const [sendingInvitation, setSendingInvitation] = useState(false)
  const [userTrend, setUserTrend] = useState<TrendDatum[]>([])
  
  // New state for additional features
  const [users, setUsers] = useState<User[]>([])
  const [experts, setExperts] = useState<User[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [rapidAlerts, setRapidAlerts] = useState<RapidAlert[]>([])
  const [resources, setResources] = useState<Resource[]>([])
  const [resourceForm, setResourceForm] = useState<ResourceFormState>(defaultResourceForm)
  const [editingResourceId, setEditingResourceId] = useState<string | null>(null)
  const [savingResource, setSavingResource] = useState(false)
  const [deletingResourceId, setDeletingResourceId] = useState<string | null>(null)
  const [companies, setCompanies] = useState<Company[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [roleDistribution, setRoleDistribution] = useState<StatusDatum[]>([])

  const appUrl = useMemo(
    () => import.meta.env.VITE_APP_URL || (typeof window !== 'undefined' ? window.location.origin : ''),
    [],
  )

  useEffect(() => {
    const fetchDashboard = async () => {
      setLoading(true)
      try {
        const [
          usersRes,
          dealsRes,
          appointmentsRes,
          alertsRes,
          invitationsRes,
          postsRes,
          resourcesRes,
          employeesRes,
          subscriptionsRes,
        ] = await Promise.all([
          supabase.from('users').select('id, email, full_name, user_role, phone_number, created_at').order('created_at', { ascending: false }),
          supabase.from('deals_offers').select('*').order('created_at', { ascending: false }),
          supabase.from('appointment_requests').select('id, status, created_at'),
          supabase.from('rapid_alerts').select(`
            id, message, urgency_level, status, created_at, patient_id,
            patient:users!rapid_alerts_patient_id_fkey(full_name, email)
          `).order('created_at', { ascending: false }).limit(50),
          supabase.from('company_invitations').select('id, status, created_at'),
          supabase.from('posts').select(`
            id, content, image_url, created_at, author_id,
            author:users!posts_author_id_fkey(full_name, email)
          `).order('created_at', { ascending: false }).limit(50),
          supabase.from('third_party_resources').select('*').order('display_order', { ascending: true }),
          supabase.from('company_employees').select(`
            id, company_id, employee_id, joined_at,
            employee:users!company_employees_employee_id_fkey(full_name, email, user_role),
            company:users!company_employees_company_id_fkey(full_name)
          `).order('joined_at', { ascending: false }),
          supabase.from('company_subscriptions').select(`
            id, company_id, subscription_tier, max_workers, price_per_month, is_active, started_at,
            company:users!company_subscriptions_company_id_fkey(full_name)
          `).order('started_at', { ascending: false }),
        ])

        if (usersRes.error) throw usersRes.error
        if (dealsRes.error) throw dealsRes.error
        if (appointmentsRes.error) throw appointmentsRes.error
        if (alertsRes.error) throw alertsRes.error
        if (invitationsRes.error) throw invitationsRes.error

        const roleCounts = (usersRes.data || []).reduce<Record<string, number>>((acc, user: any) => {
          const role = user.user_role || 'unknown'
          acc[role] = (acc[role] || 0) + 1
          return acc
        }, {})

        const totalUsers = usersRes.data?.length || 0
        const totalPatients = roleCounts['patient'] || 0
        const totalCompanies = roleCounts['company'] || 0
        const totalProfessionals = Object.entries(roleCounts).reduce((acc, [role, count]) => {
          if (role !== 'patient' && role !== 'company') {
            return acc + count
          }
          return acc
        }, 0)

        const totalAppointments = appointmentsRes.data?.length || 0
        const appointmentStatusCounts = (appointmentsRes.data || []).reduce<Record<string, number>>((acc, appointment: any) => {
          const status = appointment.status || 'pending'
          acc[status] = (acc[status] || 0) + 1
          return acc
        }, {})

        const totalRapidAlerts = alertsRes.data?.length || 0
        const userMonthlyCounts = createMonthlyTrend(usersRes.data || [])

        const totalInvitations = invitationsRes.data?.length || 0
        const invitationCounts = (invitationsRes.data || []).reduce<Record<string, number>>((acc, invite: any) => {
          const status = invite.status || 'pending'
          acc[status] = (acc[status] || 0) + 1
          return acc
        }, {})

        setStats({
          totalUsers,
          totalPatients,
          totalProfessionals,
          totalCompanies,
          totalAppointments,
          pendingAppointments: appointmentStatusCounts['pending'] || 0,
          totalRapidAlerts,
          activeDeals: (dealsRes.data || []).filter((deal: any) => deal.is_active).length,
          totalInvitations,
          acceptedInvitations: invitationCounts['accepted'] || 0,
          pendingInvitations: invitationCounts['pending'] || 0,
          totalPosts: postsRes.data?.length || 0,
          totalResources: resourcesRes.data?.length || 0,
          totalEmployees: employeesRes.data?.length || 0,
        })

        setDeals((dealsRes.data || []) as DealRecord[])
        setUserTrend(userMonthlyCounts)
        setUsers((usersRes.data || []) as User[])
        setExperts((usersRes.data || []).filter((u: any) => u.user_role !== 'patient' && u.user_role !== 'company') as User[])
        
        // Fix type issues with joined data from Supabase
        const postsData = (postsRes.data || []).map((p: any) => ({
          ...p,
          author: Array.isArray(p.author) ? p.author[0] : p.author,
        }))
        setPosts(postsData as Post[])
        
        const alertsData = (alertsRes.data || []).map((a: any) => ({
          ...a,
          patient: Array.isArray(a.patient) ? a.patient[0] : a.patient,
        }))
        setRapidAlerts(alertsData as RapidAlert[])
        
        const employeesData = (employeesRes.data || []).map((e: any) => ({
          ...e,
          employee: Array.isArray(e.employee) ? e.employee[0] : e.employee,
          company: Array.isArray(e.company) ? e.company[0] : e.company,
        }))
        setEmployees(employeesData as Employee[])
        
        const subscriptionsData = (subscriptionsRes.data || []).map((s: any) => ({
          ...s,
          company: Array.isArray(s.company) ? s.company[0] : s.company,
        }))
        setSubscriptions(subscriptionsData as Subscription[])
        
        setResources((resourcesRes.data || []) as Resource[])
        setCompanies((usersRes.data || []).filter((u: any) => u.user_role === 'company') as Company[])
        setRoleDistribution(formatStatusData(roleCounts))
      } catch (error: any) {
        console.error('Failed to load super admin dashboard:', error)
        toast.error('Failed to load admin dashboard', {
          description: error.message || 'Please try again in a moment.',
        })
      } finally {
        setLoading(false)
      }
    }

    fetchDashboard()
  }, [refreshToggle])

  const handleDealChange = (field: keyof DealFormState, value: string | boolean) => {
    setDealForm((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const resetDealForm = () => {
    setDealForm(defaultDealForm)
    setEditingDealId(null)
  }

  const handleEditDeal = (deal: DealRecord) => {
    setEditingDealId(deal.id)
    setDealForm({
      business_name: deal.business_name || '',
      description: deal.description || '',
      address: deal.address || '',
      timings: deal.timings || '',
      coupon_code: deal.coupon_code || '',
      discount_percentage: deal.discount_percentage !== null && deal.discount_percentage !== undefined ? String(deal.discount_percentage) : '',
      discount_details: deal.discount_details || '',
      category: deal.category || '',
      valid_until: deal.valid_until ? deal.valid_until.slice(0, 10) : '',
      terms_conditions: deal.terms_conditions || '',
      is_active: deal.is_active,
    })
  }

  const handleDeleteDeal = async (dealId: string) => {
    const confirmation = window.confirm('Delete this deal permanently?')
    if (!confirmation) return

    setDeletingDealId(dealId)
    try {
      const { error } = await supabase.from('deals_offers').delete().eq('id', dealId)
      if (error) throw error

      toast.success('Deal removed successfully')
      setRefreshToggle((prev) => !prev)
      if (editingDealId === dealId) {
        resetDealForm()
      }
    } catch (error: any) {
      console.error('Failed to delete deal:', error)
      toast.error('Unable to delete deal', {
        description: error.message || 'Please try again later.',
      })
    } finally {
      setDeletingDealId(null)
    }
  }

  const handleToggleDealVisibility = async (deal: DealRecord) => {
    try {
      const { error } = await supabase
        .from('deals_offers')
        .update({ is_active: !deal.is_active })
        .eq('id', deal.id)

      if (error) throw error

      toast.success(deal.is_active ? 'Deal hidden from catalogue' : 'Deal published to catalogue')
      setRefreshToggle((prev) => !prev)

      if (editingDealId === deal.id) {
        setDealForm((prev) => ({
          ...prev,
          is_active: !deal.is_active,
        }))
      }
    } catch (error: any) {
      console.error('Failed to toggle deal visibility:', error)
      toast.error('Unable to update visibility', {
        description: error.message || 'Please try again later.',
      })
    }
  }

  const handleDealSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!dealForm.business_name || !dealForm.description || !dealForm.address) {
      toast.error('Please fill in all required deal fields')
      return
    }

    const payload = {
      business_name: dealForm.business_name.trim(),
      description: dealForm.description.trim(),
      address: dealForm.address.trim(),
      timings: dealForm.timings.trim(),
      coupon_code: dealForm.coupon_code.trim(),
      discount_percentage: dealForm.discount_percentage ? Number(dealForm.discount_percentage) : null,
      discount_details: dealForm.discount_details.trim() || null,
      category: dealForm.category.trim() || null,
      valid_until: dealForm.valid_until || null,
      terms_conditions: dealForm.terms_conditions.trim() || null,
      is_active: dealForm.is_active,
    }

    setSavingDeal(true)
    try {
      if (editingDealId) {
        const { error } = await supabase.from('deals_offers').update(payload).eq('id', editingDealId)
        if (error) throw error
        toast.success('Deal updated successfully')
      } else {
        const { error } = await supabase.from('deals_offers').insert(payload)
        if (error) throw error
        toast.success('Deal created successfully')
      }

      resetDealForm()
      setRefreshToggle((prev) => !prev)
    } catch (error: any) {
      console.error('Failed to save deal:', error)
      toast.error('Unable to save deal', {
        description: error.message || 'Please verify the details and retry.',
      })
    } finally {
      setSavingDeal(false)
    }
  }

  const handleResourceChange = (field: keyof ResourceFormState, value: string | boolean) => {
    setResourceForm((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const resetResourceForm = () => {
    setResourceForm(defaultResourceForm)
    setEditingResourceId(null)
  }

  const handleEditResource = (resource: Resource) => {
    setEditingResourceId(resource.id)
    setResourceForm({
      title: resource.title || '',
      description: resource.description || '',
      url: resource.url || '',
      category: resource.category || '',
      resource_type: resource.resource_type || '',
      is_active: resource.is_active,
      is_featured: resource.is_featured,
      display_order: String(resource.display_order || 0),
    })
  }

  const handleDeleteResource = async (resourceId: string) => {
    const confirmation = window.confirm('Delete this resource permanently?')
    if (!confirmation) return

    setDeletingResourceId(resourceId)
    try {
      const { error } = await supabase.from('third_party_resources').delete().eq('id', resourceId)
      if (error) throw error

      toast.success('Resource removed successfully')
      setRefreshToggle((prev) => !prev)
      if (editingResourceId === resourceId) {
        resetResourceForm()
      }
    } catch (error: any) {
      console.error('Failed to delete resource:', error)
      toast.error('Unable to delete resource', {
        description: error.message || 'Please try again later.',
      })
    } finally {
      setDeletingResourceId(null)
    }
  }

  const handleToggleResourceVisibility = async (resource: Resource) => {
    try {
      const { error } = await supabase
        .from('third_party_resources')
        .update({ is_active: !resource.is_active })
        .eq('id', resource.id)

      if (error) throw error

      toast.success(resource.is_active ? 'Resource hidden' : 'Resource published')
      setRefreshToggle((prev) => !prev)
    } catch (error: any) {
      console.error('Failed to toggle resource visibility:', error)
      toast.error('Unable to update visibility')
    }
  }

  const handleResourceSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!resourceForm.title || !resourceForm.description || !resourceForm.url) {
      toast.error('Please fill in all required resource fields')
      return
    }

    const payload = {
      title: resourceForm.title.trim(),
      description: resourceForm.description.trim(),
      url: resourceForm.url.trim(),
      category: resourceForm.category.trim() || null,
      resource_type: resourceForm.resource_type.trim() || null,
      is_active: resourceForm.is_active,
      is_featured: resourceForm.is_featured,
      display_order: Number(resourceForm.display_order) || 0,
    }

    setSavingResource(true)
    try {
      if (editingResourceId) {
        const { error } = await supabase.from('third_party_resources').update(payload).eq('id', editingResourceId)
        if (error) throw error
        toast.success('Resource updated successfully')
      } else {
        const { error } = await supabase.from('third_party_resources').insert(payload)
        if (error) throw error
        toast.success('Resource created successfully')
      }

      resetResourceForm()
      setRefreshToggle((prev) => !prev)
    } catch (error: any) {
      console.error('Failed to save resource:', error)
      toast.error('Unable to save resource', {
        description: error.message || 'Please verify the details and retry.',
      })
    } finally {
      setSavingResource(false)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    const confirmation = window.confirm('Delete this user permanently? This action cannot be undone.')
    if (!confirmation) return

    try {
      const { error } = await supabase.from('users').delete().eq('id', userId)
      if (error) throw error

      toast.success('User removed successfully')
      setRefreshToggle((prev) => !prev)
    } catch (error: any) {
      console.error('Failed to delete user:', error)
      toast.error('Unable to delete user', {
        description: error.message || 'Please try again later.',
      })
    }
  }

  const handleDeletePost = async (postId: string) => {
    const confirmation = window.confirm('Delete this post permanently?')
    if (!confirmation) return

    try {
      const { error } = await supabase.from('posts').delete().eq('id', postId)
      if (error) throw error

      toast.success('Post removed successfully')
      setRefreshToggle((prev) => !prev)
    } catch (error: any) {
      console.error('Failed to delete post:', error)
      toast.error('Unable to delete post', {
        description: error.message || 'Please try again later.',
      })
    }
  }

  const handleClearRapidAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('rapid_alerts')
        .update({ status: 'cleared' })
        .eq('id', alertId)

      if (error) throw error

      toast.success('Alert marked as cleared')
      setRefreshToggle((prev) => !prev)
    } catch (error: any) {
      console.error('Failed to clear alert:', error)
      toast.error('Unable to clear alert')
    }
  }

  const handleSendInvitation = async () => {
    if (!invitationEmail.trim()) {
      toast.error('Enter an email address to send an invitation')
      return
    }

    if (!emailRegex.test(invitationEmail.trim())) {
      toast.error('Provide a valid email address')
      return
    }

    setSendingInvitation(true)
    try {
      const response = await fetch('/.netlify/functions/send-invitation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: invitationEmail.trim().toLowerCase(),
          companyName: 'AmbitiousCare',
          invitationToken: '',
          appUrl,
        }),
      })

      if (!response.ok) {
        const errorBody = await response.json()
        throw new Error(errorBody?.error || 'Invitation service failed')
      }

      toast.success('Invitation email sent')
      setInvitationEmail('')
    } catch (error: any) {
      console.error('Failed to send invitation email:', error)
      toast.error('Unable to send invitation', {
        description: error.message || 'Please try again later.',
      })
    } finally {
      setSendingInvitation(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen mesh-bg flex flex-col lg:flex-row">
        <SuperAdminSidebar />
        <div className="flex-1 w-full flex items-center justify-center px-4 py-12 sm:px-6 lg:px-12 lg:ml-64">
          <div className="w-full max-w-lg rounded-3xl border border-black/10 bg-white/70 backdrop-blur-xl px-10 py-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border border-black/20 border-t-black mx-auto mb-6" />
            <p className="text-black/70 font-medium tracking-wide">Loading super admin dashboard...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen mesh-bg flex flex-col lg:flex-row">
      <SuperAdminSidebar />

      <div className="flex-1 w-full px-4 py-12 sm:px-6 lg:px-12 lg:ml-64">
        <div className="max-w-7xl mx-auto space-y-12">
          {/* Overview Section */}
          <section id="overview" className="space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-black/40 mb-3">Administration</p>
                <h1 className="text-4xl font-heading font-bold text-black mb-2">Super Admin Command Center</h1>
                <p className="text-black/60 text-lg max-w-2xl">
                  Monitor platform health, manage partnerships, and keep every experience aligned with the AmbitiousCare standard.
                </p>
              </div>
              <InfoDialogButton
                title="Super Admin Dashboard"
                description="High-level control panel for monitoring and curating AmbitiousCare."
                points={[
                  'Review user growth, appointments, and alert trends in real time.',
                  'Curate exclusive deals and offers for the community.',
                  'Dispatch platform-wide invitations from a single hub.',
                ]}
              />
            </div>

            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                {[
                  { label: 'Total Users', value: stats.totalUsers, icon: Users },
                  { label: 'Posts', value: stats.totalPosts, icon: FileText },
                  { label: 'Rapid Alerts', value: stats.totalRapidAlerts, icon: AlertCircle },
                  { label: 'Companies', value: stats.totalCompanies, icon: Building },
                  { label: 'Employees', value: stats.totalEmployees, icon: Briefcase },
                  { label: 'Active Deals', value: stats.activeDeals, icon: DollarSign },
                  { label: 'Resources', value: stats.totalResources, icon: FileText },
                  { label: 'Professionals', value: stats.totalProfessionals, icon: Users },
                ].map((metric, index) => {
                  const Icon = metric.icon
                  return (
                    <motion.div
                      key={metric.label}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="glass-card rounded-2xl p-6 border border-black/15"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs uppercase tracking-[0.3em] text-black/45">{metric.label}</p>
                        <Icon className="w-5 h-5 text-black/40" />
                      </div>
                      <div className="text-4xl font-heading font-bold text-black">{metric.value}</div>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </section>

          {/* User Metrics Section */}
          <section id="user-metrics" className="space-y-8">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="glass-card rounded-3xl p-8 border border-black/15"
              >
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-heading font-semibold text-black">User Growth (6 Months)</h2>
                    <p className="text-sm text-black/60">Rolling monthly activations across the platform</p>
                  </div>
                </div>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={userTrend} margin={{ top: 10, right: 24, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="userGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#111111" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="#111111" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#11111120" />
                      <XAxis dataKey="period" tick={{ fill: '#0f0f0f', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#0f0f0f', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#fff8f0', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.1)', color: '#111' }} />
                      <Area type="monotone" dataKey="value" stroke="#111111" strokeWidth={2.5} fill="url(#userGradient)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="glass-card rounded-3xl p-8 border border-black/15"
              >
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-heading font-semibold text-black">User Role Distribution</h2>
                    <p className="text-sm text-black/60">Breakdown of user types on the platform</p>
                  </div>
                </div>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={roleDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(item) => `${item.status}: ${item.value}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {roleDistribution.map((_item, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#fff8f0', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.1)', color: '#111' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            </div>
          </section>

          {/* Users Management Section */}
          <section id="users-management" className="space-y-6">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-black/40 mb-2">User Database</p>
              <h2 className="text-3xl font-heading font-semibold text-black">Users Management</h2>
              <p className="text-black/60 max-w-2xl">
                View and manage all registered users on the platform.
              </p>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card rounded-3xl p-8 border border-black/15"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-heading font-semibold text-black">All Users ({users.length})</h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-black/10">
                      <th className="text-left py-3 px-4 text-xs uppercase tracking-[0.3em] text-black/45">Name</th>
                      <th className="text-left py-3 px-4 text-xs uppercase tracking-[0.3em] text-black/45">Email</th>
                      <th className="text-left py-3 px-4 text-xs uppercase tracking-[0.3em] text-black/45">Role</th>
                      <th className="text-left py-3 px-4 text-xs uppercase tracking-[0.3em] text-black/45">Joined</th>
                      <th className="text-right py-3 px-4 text-xs uppercase tracking-[0.3em] text-black/45">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.slice(0, 10).map((user) => (
                      <tr key={user.id} className="border-b border-black/5 hover:bg-black/5">
                        <td className="py-3 px-4 text-sm font-semibold text-black">{user.full_name}</td>
                        <td className="py-3 px-4 text-sm text-black/70">{user.email}</td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-[0.2em] bg-black/10 text-black/70">
                            {user.user_role}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-black/60">{format(new Date(user.created_at), 'dd MMM yyyy')}</td>
                        <td className="py-3 px-4 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteUser(user.id)}
                            className="text-black/60 hover:text-black"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {users.length > 10 && (
                <p className="text-sm text-black/50 mt-4 text-center">Showing 10 of {users.length} users</p>
              )}
            </motion.div>
          </section>

          {/* Experts Management Section */}
          <section id="experts-management" className="space-y-6">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-black/40 mb-2">Professional Network</p>
              <h2 className="text-3xl font-heading font-semibold text-black">Experts Management</h2>
              <p className="text-black/60 max-w-2xl">
                View and manage all professionals (therapists, coaches, experts) on the platform.
              </p>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card rounded-3xl p-8 border border-black/15"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-heading font-semibold text-black">All Experts ({experts.length})</h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-black/10">
                      <th className="text-left py-3 px-4 text-xs uppercase tracking-[0.3em] text-black/45">Name</th>
                      <th className="text-left py-3 px-4 text-xs uppercase tracking-[0.3em] text-black/45">Email</th>
                      <th className="text-left py-3 px-4 text-xs uppercase tracking-[0.3em] text-black/45">Specialty</th>
                      <th className="text-left py-3 px-4 text-xs uppercase tracking-[0.3em] text-black/45">Joined</th>
                      <th className="text-right py-3 px-4 text-xs uppercase tracking-[0.3em] text-black/45">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {experts.slice(0, 10).map((expert) => (
                      <tr key={expert.id} className="border-b border-black/5 hover:bg-black/5">
                        <td className="py-3 px-4 text-sm font-semibold text-black">{expert.full_name}</td>
                        <td className="py-3 px-4 text-sm text-black/70">{expert.email}</td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-[0.2em] bg-black text-white">
                            {expert.user_role.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-black/60">{format(new Date(expert.created_at), 'dd MMM yyyy')}</td>
                        <td className="py-3 px-4 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteUser(expert.id)}
                            className="text-black/60 hover:text-black"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {experts.length > 10 && (
                <p className="text-sm text-black/50 mt-4 text-center">Showing 10 of {experts.length} experts</p>
              )}
            </motion.div>
          </section>

          {/* Companies Management Section */}
          <section id="companies-management" className="space-y-6">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-black/40 mb-2">Corporate Partners</p>
              <h2 className="text-3xl font-heading font-semibold text-black">Companies Management</h2>
              <p className="text-black/60 max-w-2xl">
                View and manage all company accounts on the platform.
              </p>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card rounded-3xl p-8 border border-black/15"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-heading font-semibold text-black">All Companies ({companies.length})</h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-black/10">
                      <th className="text-left py-3 px-4 text-xs uppercase tracking-[0.3em] text-black/45">Company Name</th>
                      <th className="text-left py-3 px-4 text-xs uppercase tracking-[0.3em] text-black/45">Email</th>
                      <th className="text-left py-3 px-4 text-xs uppercase tracking-[0.3em] text-black/45">Joined</th>
                      <th className="text-right py-3 px-4 text-xs uppercase tracking-[0.3em] text-black/45">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {companies.map((company) => (
                      <tr key={company.id} className="border-b border-black/5 hover:bg-black/5">
                        <td className="py-3 px-4 text-sm font-semibold text-black">{company.full_name}</td>
                        <td className="py-3 px-4 text-sm text-black/70">{company.email}</td>
                        <td className="py-3 px-4 text-sm text-black/60">{format(new Date(company.created_at), 'dd MMM yyyy')}</td>
                        <td className="py-3 px-4 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteUser(company.id)}
                            className="text-black/60 hover:text-black"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </section>

          {/* Employees Management Section */}
          <section id="employees-management" className="space-y-6">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-black/40 mb-2">Corporate Workforce</p>
              <h2 className="text-3xl font-heading font-semibold text-black">Employees Management</h2>
              <p className="text-black/60 max-w-2xl">
                View all employees invited and managed by companies.
              </p>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card rounded-3xl p-8 border border-black/15"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-heading font-semibold text-black">All Employees ({employees.length})</h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-black/10">
                      <th className="text-left py-3 px-4 text-xs uppercase tracking-[0.3em] text-black/45">Employee Name</th>
                      <th className="text-left py-3 px-4 text-xs uppercase tracking-[0.3em] text-black/45">Email</th>
                      <th className="text-left py-3 px-4 text-xs uppercase tracking-[0.3em] text-black/45">Company</th>
                      <th className="text-left py-3 px-4 text-xs uppercase tracking-[0.3em] text-black/45">Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.slice(0, 20).map((employee) => (
                      <tr key={employee.id} className="border-b border-black/5 hover:bg-black/5">
                        <td className="py-3 px-4 text-sm font-semibold text-black">{employee.employee?.full_name || 'N/A'}</td>
                        <td className="py-3 px-4 text-sm text-black/70">{employee.employee?.email || 'N/A'}</td>
                        <td className="py-3 px-4 text-sm text-black/60">{employee.company?.full_name || 'N/A'}</td>
                        <td className="py-3 px-4 text-sm text-black/60">{format(new Date(employee.joined_at), 'dd MMM yyyy')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {employees.length > 20 && (
                <p className="text-sm text-black/50 mt-4 text-center">Showing 20 of {employees.length} employees</p>
              )}
            </motion.div>
          </section>

          {/* Posts Management Section */}
          <section id="posts-management" className="space-y-6">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-black/40 mb-2">Content Moderation</p>
              <h2 className="text-3xl font-heading font-semibold text-black">Posts Management</h2>
              <p className="text-black/60 max-w-2xl">
                View and moderate all posts created by professionals on the platform.
              </p>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card rounded-3xl p-8 border border-black/15"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-heading font-semibold text-black">All Posts ({posts.length})</h3>
              </div>

              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-3">
                {posts.map((post) => (
                  <div key={post.id} className="border border-black/10 rounded-2xl p-6 bg-white/80 backdrop-blur-xl shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <span className="text-sm font-semibold text-black">{post.author?.full_name || 'Unknown'}</span>
                          <span className="text-xs text-black/50">{format(new Date(post.created_at), 'dd MMM yyyy, h:mm a')}</span>
                        </div>
                        <p className="text-sm text-black/80 leading-relaxed mb-3">{post.content}</p>
                        {post.image_url && (
                          <img src={post.image_url} alt="Post" className="rounded-xl max-w-sm max-h-48 object-cover" />
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeletePost(post.id)}
                        className="text-black/60 hover:text-black"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </section>

          {/* Rapid Alerts Management Section */}
          <section id="rapid-alerts-management" className="space-y-6">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-black/40 mb-2">Crisis Support</p>
              <h2 className="text-3xl font-heading font-semibold text-black">Rapid Alerts Management</h2>
              <p className="text-black/60 max-w-2xl">
                Monitor and manage all rapid alerts sent by patients requiring urgent support.
              </p>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card rounded-3xl p-8 border border-black/15"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-heading font-semibold text-black">All Rapid Alerts ({rapidAlerts.length})</h3>
              </div>

              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-3">
                {rapidAlerts.map((alert) => (
                  <div key={alert.id} className="border border-black/10 rounded-2xl p-6 bg-white/80 backdrop-blur-xl shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3 flex-wrap">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-[0.2em] ${
                            alert.urgency_level === 'critical' ? 'bg-black text-white' : 'bg-black/10 text-black/70'
                          }`}>
                            {alert.urgency_level}
                          </span>
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-[0.2em] ${
                            alert.status === 'cleared' ? 'bg-black text-white' : 'bg-white/70 text-black/60 border border-black/15'
                          }`}>
                            {alert.status}
                          </span>
                          <span className="text-xs text-black/50">{format(new Date(alert.created_at), 'dd MMM yyyy, h:mm a')}</span>
                        </div>
                        <p className="text-sm font-semibold text-black mb-2">From: {alert.patient?.full_name || 'Unknown'}</p>
                        <p className="text-sm text-black/80 leading-relaxed">{alert.message}</p>
                      </div>
                      {alert.status !== 'cleared' && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleClearRapidAlert(alert.id)}
                        >
                          Mark Cleared
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </section>

          {/* Subscriptions Management Section */}
          <section id="subscriptions-management" className="space-y-6">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-black/40 mb-2">Revenue Stream</p>
              <h2 className="text-3xl font-heading font-semibold text-black">Subscriptions Management</h2>
              <p className="text-black/60 max-w-2xl">
                View and manage all company subscriptions (dummy data for now).
              </p>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card rounded-3xl p-8 border border-black/15"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-heading font-semibold text-black">All Subscriptions ({subscriptions.length})</h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-black/10">
                      <th className="text-left py-3 px-4 text-xs uppercase tracking-[0.3em] text-black/45">Company</th>
                      <th className="text-left py-3 px-4 text-xs uppercase tracking-[0.3em] text-black/45">Tier</th>
                      <th className="text-left py-3 px-4 text-xs uppercase tracking-[0.3em] text-black/45">Max Workers</th>
                      <th className="text-left py-3 px-4 text-xs uppercase tracking-[0.3em] text-black/45">Price/Month</th>
                      <th className="text-left py-3 px-4 text-xs uppercase tracking-[0.3em] text-black/45">Status</th>
                      <th className="text-left py-3 px-4 text-xs uppercase tracking-[0.3em] text-black/45">Started</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscriptions.map((sub) => (
                      <tr key={sub.id} className="border-b border-black/5 hover:bg-black/5">
                        <td className="py-3 px-4 text-sm font-semibold text-black">{sub.company?.full_name || 'N/A'}</td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-[0.2em] bg-black text-white">
                            {sub.subscription_tier}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-black/70">{sub.max_workers === -1 ? 'Unlimited' : sub.max_workers}</td>
                        <td className="py-3 px-4 text-sm text-black/70">${sub.price_per_month}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-[0.2em] ${
                            sub.is_active ? 'bg-black text-white' : 'bg-white/70 text-black/60 border border-black/15'
                          }`}>
                            {sub.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-black/60">{format(new Date(sub.started_at), 'dd MMM yyyy')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </section>

          {/* Deals Management Section */}
          <section id="deals-management" className="space-y-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-black/40 mb-2">Curated Partnerships</p>
                <h2 className="text-3xl font-heading font-semibold text-black">Deals & Offers Control</h2>
                <p className="text-black/60 max-w-2xl">
                  Add, refine, and publish exclusive rewards for the community.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              <motion.div
                className="glass-card rounded-3xl p-8 border border-black/15 xl:col-span-2"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-heading font-semibold text-black">Active Portfolio</h3>
                  <span className="text-sm text-black/60">{deals.length} total entries</span>
                </div>

                {deals.length === 0 ? (
                  <div className="border border-dashed border-black/15 rounded-2xl p-12 text-center">
                    <p className="text-black/50 font-medium tracking-wide">No deals yet. Curate your first partnership.</p>
                  </div>
                ) : (
                  <div className="space-y-5 max-h-[520px] overflow-y-auto pr-3">
                    {deals.map((deal) => (
                      <div key={deal.id} className="border border-black/10 rounded-2xl p-6 bg-white/80 backdrop-blur-xl shadow-sm">
                        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-3">
                              <span className="text-xs uppercase tracking-[0.3em] text-black/45">{deal.category || 'General'}</span>
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${deal.is_active ? 'bg-black text-white border-black' : 'bg-white/70 text-black/60 border-black/15'}`}>
                                {deal.is_active ? 'Active' : 'Hidden'}
                              </span>
                            </div>
                            <h4 className="text-xl font-heading font-semibold text-black">{deal.business_name}</h4>
                            <p className="text-sm text-black/70 leading-relaxed">{deal.description}</p>
                          </div>
                          <div className="flex flex-col gap-2 min-w-[120px]">
                            <Button variant="secondary" size="sm" onClick={() => handleEditDeal(deal)}>
                              <Edit2 className="w-3 h-3 mr-2" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleToggleDealVisibility(deal)}
                            >
                              {deal.is_active ? <EyeOff className="w-3 h-3 mr-2" /> : <Eye className="w-3 h-3 mr-2" />}
                              {deal.is_active ? 'Hide' : 'Show'}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="border border-black/20"
                              onClick={() => handleDeleteDeal(deal.id)}
                              disabled={deletingDealId === deal.id}
                            >
                              <Trash2 className="w-3 h-3 mr-2" />
                              {deletingDealId === deal.id ? 'Deleting...' : 'Delete'}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>

              <motion.div
                className="glass-card rounded-3xl p-8 border border-black/15"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <h3 className="text-2xl font-heading font-semibold text-black mb-4">
                  {editingDealId ? 'Update Deal' : 'Create New Deal'}
                </h3>
                <p className="text-sm text-black/60 mb-6">
                  Fill in the details below to add a new partnership.
                </p>

                <form onSubmit={handleDealSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="business_name">Business Name *</Label>
                    <Input
                      id="business_name"
                      value={dealForm.business_name}
                      onChange={(e) => handleDealChange('business_name', e.target.value)}
                      placeholder="Mindful Wellness Spa"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description *</Label>
                    <Textarea
                      id="description"
                      value={dealForm.description}
                      onChange={(e) => handleDealChange('description', e.target.value)}
                      placeholder="Brief overview of the benefit"
                      required
                      className="min-h-[100px]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Address *</Label>
                    <Input
                      id="address"
                      value={dealForm.address}
                      onChange={(e) => handleDealChange('address', e.target.value)}
                      placeholder="123 Serenity Lane, London"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="timings">Timings</Label>
                    <Input
                      id="timings"
                      value={dealForm.timings}
                      onChange={(e) => handleDealChange('timings', e.target.value)}
                      placeholder="Mon-Fri: 9am - 6pm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="coupon_code">Coupon Code</Label>
                      <Input
                        id="coupon_code"
                        value={dealForm.coupon_code}
                        onChange={(e) => handleDealChange('coupon_code', e.target.value.toUpperCase())}
                        placeholder="WELLNESS50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="discount_percentage">Discount %</Label>
                      <Input
                        id="discount_percentage"
                        type="number"
                        min="0"
                        max="100"
                        value={dealForm.discount_percentage}
                        onChange={(e) => handleDealChange('discount_percentage', e.target.value)}
                        placeholder="50"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Input
                      id="category"
                      value={dealForm.category}
                      onChange={(e) => handleDealChange('category', e.target.value)}
                      placeholder="Spa, Wellness, Gym"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="valid_until">Valid Until</Label>
                    <Input
                      id="valid_until"
                      type="date"
                      value={dealForm.valid_until}
                      onChange={(e) => handleDealChange('valid_until', e.target.value)}
                    />
                  </div>

                  <div className="flex items-center justify-between rounded-2xl border border-black/10 bg-white/70 px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-black">Visibility</p>
                      <p className="text-xs text-black/60">Show on platform</p>
                    </div>
                    <Button
                      type="button"
                      variant={dealForm.is_active ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleDealChange('is_active', !dealForm.is_active)}
                    >
                      {dealForm.is_active ? 'Visible' : 'Hidden'}
                    </Button>
                  </div>

                  <div className="flex items-center gap-3">
                    <Button type="submit" disabled={savingDeal} className="flex-1">
                      {savingDeal ? 'Saving...' : editingDealId ? 'Update Deal' : 'Create Deal'}
                    </Button>
                    {editingDealId && (
                      <Button type="button" variant="ghost" className="border border-black/15" onClick={resetDealForm}>
                        Cancel
                      </Button>
                    )}
                  </div>
                </form>
              </motion.div>
            </div>
          </section>

          {/* Resources Management Section */}
          <section id="resources-management" className="space-y-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-black/40 mb-2">External Support</p>
                <h2 className="text-3xl font-heading font-semibold text-black">Third-Party Resources</h2>
                <p className="text-black/60 max-w-2xl">
                  Manage external resources and helpful links for the community.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              <motion.div
                className="glass-card rounded-3xl p-8 border border-black/15 xl:col-span-2"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-heading font-semibold text-black">All Resources</h3>
                  <span className="text-sm text-black/60">{resources.length} total</span>
                </div>

                {resources.length === 0 ? (
                  <div className="border border-dashed border-black/15 rounded-2xl p-12 text-center">
                    <p className="text-black/50 font-medium tracking-wide">No resources yet.</p>
                  </div>
                ) : (
                  <div className="space-y-5 max-h-[520px] overflow-y-auto pr-3">
                    {resources.map((resource) => (
                      <div key={resource.id} className="border border-black/10 rounded-2xl p-6 bg-white/80 backdrop-blur-xl shadow-sm">
                        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-3">
                              {resource.is_featured && (
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-black text-white">
                                  Featured
                                </span>
                              )}
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${resource.is_active ? 'bg-white text-black border-black/15' : 'bg-black/10 text-black/60 border-black/10'}`}>
                                {resource.is_active ? 'Active' : 'Hidden'}
                              </span>
                              <span className="text-xs uppercase tracking-[0.3em] text-black/45">{resource.resource_type || 'General'}</span>
                            </div>
                            <h4 className="text-xl font-heading font-semibold text-black">{resource.title}</h4>
                            <p className="text-sm text-black/70 leading-relaxed">{resource.description}</p>
                            <a href={resource.url} target="_blank" rel="noopener noreferrer" className="text-xs text-black/60 hover:text-black underline">
                              {resource.url}
                            </a>
                          </div>
                          <div className="flex flex-col gap-2 min-w-[120px]">
                            <Button variant="secondary" size="sm" onClick={() => handleEditResource(resource)}>
                              <Edit2 className="w-3 h-3 mr-2" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleToggleResourceVisibility(resource)}
                            >
                              {resource.is_active ? <EyeOff className="w-3 h-3 mr-2" /> : <Eye className="w-3 h-3 mr-2" />}
                              {resource.is_active ? 'Hide' : 'Show'}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="border border-black/20"
                              onClick={() => handleDeleteResource(resource.id)}
                              disabled={deletingResourceId === resource.id}
                            >
                              <Trash2 className="w-3 h-3 mr-2" />
                              {deletingResourceId === resource.id ? 'Deleting...' : 'Delete'}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>

              <motion.div
                className="glass-card rounded-3xl p-8 border border-black/15"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <h3 className="text-2xl font-heading font-semibold text-black mb-4">
                  {editingResourceId ? 'Update Resource' : 'Create New Resource'}
                </h3>
                <p className="text-sm text-black/60 mb-6">
                  Add helpful external resources for users.
                </p>

                <form onSubmit={handleResourceSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="resource_title">Title *</Label>
                    <Input
                      id="resource_title"
                      value={resourceForm.title}
                      onChange={(e) => handleResourceChange('title', e.target.value)}
                      placeholder="Crisis Text Line"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="resource_description">Description *</Label>
                    <Textarea
                      id="resource_description"
                      value={resourceForm.description}
                      onChange={(e) => handleResourceChange('description', e.target.value)}
                      placeholder="Brief overview of the resource"
                      required
                      className="min-h-[100px]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="resource_url">URL *</Label>
                    <Input
                      id="resource_url"
                      type="url"
                      value={resourceForm.url}
                      onChange={(e) => handleResourceChange('url', e.target.value)}
                      placeholder="https://example.com"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="resource_category">Category</Label>
                      <Input
                        id="resource_category"
                        value={resourceForm.category}
                        onChange={(e) => handleResourceChange('category', e.target.value)}
                        placeholder="crisis_support"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="resource_type">Type</Label>
                      <Input
                        id="resource_type"
                        value={resourceForm.resource_type}
                        onChange={(e) => handleResourceChange('resource_type', e.target.value)}
                        placeholder="hotline, website"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="display_order">Display Order</Label>
                    <Input
                      id="display_order"
                      type="number"
                      min="0"
                      value={resourceForm.display_order}
                      onChange={(e) => handleResourceChange('display_order', e.target.value)}
                      placeholder="0"
                    />
                  </div>

                  <div className="flex items-center justify-between rounded-2xl border border-black/10 bg-white/70 px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-black">Featured</p>
                      <p className="text-xs text-black/60">Highlight this resource</p>
                    </div>
                    <Button
                      type="button"
                      variant={resourceForm.is_featured ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleResourceChange('is_featured', !resourceForm.is_featured)}
                    >
                      {resourceForm.is_featured ? 'Yes' : 'No'}
                    </Button>
                  </div>

                  <div className="flex items-center justify-between rounded-2xl border border-black/10 bg-white/70 px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-black">Visibility</p>
                      <p className="text-xs text-black/60">Show on platform</p>
                    </div>
                    <Button
                      type="button"
                      variant={resourceForm.is_active ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleResourceChange('is_active', !resourceForm.is_active)}
                    >
                      {resourceForm.is_active ? 'Visible' : 'Hidden'}
                    </Button>
                  </div>

                  <div className="flex items-center gap-3">
                    <Button type="submit" disabled={savingResource} className="flex-1">
                      {savingResource ? 'Saving...' : editingResourceId ? 'Update Resource' : 'Create Resource'}
                    </Button>
                    {editingResourceId && (
                      <Button type="button" variant="ghost" className="border border-black/15" onClick={resetResourceForm}>
                        Cancel
                      </Button>
                    )}
                  </div>
                </form>
              </motion.div>
            </div>
          </section>

          {/* Invitations Section */}
          <section id="admin-invitations" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card rounded-3xl p-8 border border-black/15"
            >
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-6">
                <div>
                  <p className="text-xs uppercase tracking-[0.4em] text-black/40 mb-2">Platform Outreach</p>
                  <h2 className="text-3xl font-heading font-semibold text-black">Send Invitations</h2>
                  <p className="text-black/60 max-w-2xl">
                    Share polished invitations to prospective partners or teams.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-black/10 bg-white/80 backdrop-blur-xl p-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-2 space-y-2">
                    <Label htmlFor="invitation-email">Email Address</Label>
                    <Input
                      id="invitation-email"
                      type="email"
                      placeholder="partner@example.com"
                      value={invitationEmail}
                      onChange={(e) => setInvitationEmail(e.target.value)}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button className="w-full" onClick={handleSendInvitation} disabled={sendingInvitation}>
                      {sendingInvitation ? 'Sending...' : 'Send Invitation'}
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-black/50 mt-4">
                  Invitations are dispatched via SendGrid using the AmbitiousCare template.
                </p>
              </div>
            </motion.div>
          </section>
        </div>
      </div>
    </div>
  )
}

function createMonthlyTrend(records: any[]): TrendDatum[] {
  const months: { key: string; label: string; value: number }[] = []
  const anchor = startOfMonth(new Date())

  for (let i = 5; i >= 0; i--) {
    const monthDate = subMonths(anchor, i)
    const key = format(monthDate, 'yyyy-MM')
    months.push({ key, label: format(monthDate, 'MMM'), value: 0 })
  }

  records.forEach((record) => {
    if (!record?.created_at) return
    const key = format(new Date(record.created_at), 'yyyy-MM')
    const bucket = months.find((month) => month.key === key)
    if (bucket) {
      bucket.value += 1
    }
  })

  return months.map((month) => ({ period: month.label, value: month.value }))
}

function formatStatusData(counts: Record<string, number>): StatusDatum[] {
  return Object.entries(counts)
    .map(([status, value]) => ({ status: status.replace(/_/g, ' '), value }))
    .filter((item) => item.value > 0)
}
