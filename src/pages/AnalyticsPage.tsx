import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import { InfoDialogButton } from '@/components/InfoDialog'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts'

interface AnalyticsData {
  totalAppointments: number
  confirmedAppointments: number
  pendingAppointments: number
  totalPosts: number
  totalLikes: number
  totalPatients: number
  appointmentsByMonth: Array<{ month: string; count: number }>
  postsByMonth: Array<{ month: string; count: number }>
  appointmentStatus: Array<{ name: string; value: number }>
}

const COLORS = ['#000000', '#2f2f2f', '#555555', '#7a7a7a', '#a7a394', '#d6d2c3']

export default function AnalyticsPage() {
  const { userProfile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalAppointments: 0,
    confirmedAppointments: 0,
    pendingAppointments: 0,
    totalPosts: 0,
    totalLikes: 0,
    totalPatients: 0,
    appointmentsByMonth: [],
    postsByMonth: [],
    appointmentStatus: [],
  })

  useEffect(() => {
    if (userProfile) {
      fetchAnalytics()
    }
  }, [userProfile])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)

      // Fetch appointment statistics
      if (userProfile?.user_role === 'company') {
        await fetchCompanyAnalytics()
      } else {
        await fetchProfessionalAnalytics()
      }
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCompanyAnalytics = async () => {
    const { data: companyProfile } = await supabase
      .from('company_profiles')
      .select('*')
      .eq('user_id', userProfile?.id)
      .single()

    if (!companyProfile) return

    // Get employee count
    const { count: employeeCount } = await supabase
      .from('company_employees')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyProfile.id)

    // Get employees
    const { data: employees } = await supabase
      .from('company_employees')
      .select('employee_id')
      .eq('company_id', companyProfile.id)

    const employeeIds = employees?.map((e) => e.employee_id) || []

    // Get appointments for employees
    const { data: appointments } = await supabase
      .from('appointment_requests')
      .select('status, created_at')
      .in('patient_id', employeeIds)

    const confirmedCount = appointments?.filter((a) => a.status === 'confirmed').length || 0
    const pendingCount = appointments?.filter((a) => a.status === 'pending').length || 0

    // Get posts by employees
    const { count: postCount } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .in('author_id', employeeIds)

    // Appointments by month (last 6 months)
    const appointmentsByMonth = calculateMonthlyData(appointments || [], 'created_at')

    setAnalytics({
      totalAppointments: appointments?.length || 0,
      confirmedAppointments: confirmedCount,
      pendingAppointments: pendingCount,
      totalPosts: postCount || 0,
      totalLikes: 0,
      totalPatients: employeeCount || 0,
      appointmentsByMonth,
      postsByMonth: [],
      appointmentStatus: [
        { name: 'Confirmed', value: confirmedCount },
        { name: 'Pending', value: pendingCount },
        { name: 'Declined', value: (appointments?.filter((a) => a.status === 'declined').length || 0) },
      ],
    })
  }

  const fetchProfessionalAnalytics = async () => {
    // Get appointments
    const { data: appointments } = await supabase
      .from('appointment_requests')
      .select('status, created_at')
      .eq('professional_id', userProfile?.id)

    const confirmedCount = appointments?.filter((a) => a.status === 'confirmed').length || 0
    const pendingCount = appointments?.filter((a) => a.status === 'pending').length || 0

    // Get unique patients
    const { data: uniquePatients } = await supabase
      .from('appointment_requests')
      .select('patient_id')
      .eq('professional_id', userProfile?.id)

    const patientIds = [...new Set(uniquePatients?.map((p) => p.patient_id) || [])]

    // Get posts
    const { data: posts } = await supabase
      .from('posts')
      .select('id, created_at')
      .eq('author_id', userProfile?.id)

    // Get total likes on posts
    const { count: likesCount } = await supabase
      .from('post_likes')
      .select('*', { count: 'exact', head: true })
      .in('post_id', posts?.map((p) => p.id) || [])

    // Calculate monthly data
    const appointmentsByMonth = calculateMonthlyData(appointments || [], 'created_at')
    const postsByMonth = calculateMonthlyData(posts || [], 'created_at')

    setAnalytics({
      totalAppointments: appointments?.length || 0,
      confirmedAppointments: confirmedCount,
      pendingAppointments: pendingCount,
      totalPosts: posts?.length || 0,
      totalLikes: likesCount || 0,
      totalPatients: patientIds.length,
      appointmentsByMonth,
      postsByMonth,
      appointmentStatus: [
        { name: 'Confirmed', value: confirmedCount },
        { name: 'Pending', value: pendingCount },
        { name: 'Declined', value: (appointments?.filter((a) => a.status === 'declined').length || 0) },
      ],
    })
  }

  const calculateMonthlyData = (data: any[], dateField: string) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
    const currentMonth = new Date().getMonth()
    const monthlyData = months.slice(Math.max(0, currentMonth - 5), currentMonth + 1).map((month, idx) => {
      const monthIndex = currentMonth - (5 - idx)
      const count = data.filter((item) => {
        const itemDate = new Date(item[dateField])
        return itemDate.getMonth() === monthIndex && itemDate.getFullYear() === new Date().getFullYear()
      }).length
      return { month, count }
    })
    return monthlyData
  }

  if (loading) {
    return (
      <div className="min-h-screen mesh-bg flex flex-col lg:flex-row">
        <Sidebar />
        <div className="flex-1 w-full flex items-center justify-center px-4 py-12 sm:px-6 lg:px-12 lg:ml-64">
          <div className="w-full max-w-lg text-center rounded-3xl border border-black/10 bg-white/60 backdrop-blur-xl px-10 py-12">
            <div className="w-16 h-16 border border-black/20 border-t-black rounded-full animate-spin mx-auto mb-6"></div>
            <p className="text-black/70 font-medium tracking-wide">Loading analytics...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen mesh-bg flex flex-col lg:flex-row">
      <Sidebar />

      <div className="flex-1 w-full px-4 py-10 sm:px-6 lg:px-12 lg:ml-64">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
          <div className="page-header">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="page-title"
            >
              Analytics & Reports
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="page-description"
            >
              Visualize your performance and insights
            </motion.p>
          </div>
          <InfoDialogButton
            title="Analytics Overview"
            description="Interactive dashboards that summarise your recent activity."
            points={[
              'Review headline metrics in the stat cards along the top.',
              'Use charts to spot booking, post, and engagement trends by month.',
              'Company users see employee-focused analytics; professionals see user metrics.',
            ]}
          />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="stat-card"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="metric-label">Total Appointments</span>
            </div>
            <p className="metric text-black">{analytics.totalAppointments}</p>
            <p className="text-sm text-muted-foreground mt-1">All time bookings</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="stat-card"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="metric-label">Confirmed</span>
            </div>
            <p className="metric text-black">{analytics.confirmedAppointments}</p>
            <p className="text-sm text-muted-foreground mt-1">Successful bookings</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="stat-card"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="metric-label">{userProfile?.user_role === 'company' ? 'Employees' : 'Users'}</span>
            </div>
            <p className="metric text-black">{analytics.totalPatients}</p>
            <p className="text-sm text-muted-foreground mt-1">Unique {userProfile?.user_role === 'company' ? 'team members' : 'clients'}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="stat-card"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="metric-label">Total Posts</span>
            </div>
            <p className="metric text-black">{analytics.totalPosts}</p>
            <p className="text-sm text-muted-foreground mt-1">Community contributions</p>
          </motion.div>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Appointments Over Time */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            className="elevated-card p-6"
          >
            <h3 className="text-xl font-bold text-foreground mb-6">Appointments Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={analytics.appointmentsByMonth}>
                <defs>
                  <linearGradient id="colorAppointments" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#000000" stopOpacity={0.55} />
                    <stop offset="95%" stopColor="#000000" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" stroke="#6b7280" style={{ fontWeight: 600 }} />
                <YAxis stroke="#6b7280" style={{ fontWeight: 600 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid rgba(0, 0, 0, 0.2)',
                    borderRadius: '12px',
                    fontWeight: 600,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#000000"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorAppointments)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Appointment Status Distribution */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7 }}
            className="elevated-card p-6"
          >
            <h3 className="text-xl font-bold text-foreground mb-6">Appointment Status</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics.appointmentStatus}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#000000"
                  dataKey="value"
                >
                  {analytics.appointmentStatus.map((_item, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid rgba(0, 0, 0, 0.2)',
                    borderRadius: '12px',
                    fontWeight: 600,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </motion.div>
        </div>

        {/* Charts Row 2 */}
        {userProfile?.user_role !== 'company' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Posts Over Time */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="elevated-card p-6"
            >
              <h3 className="text-xl font-bold text-foreground mb-6">Posts Activity</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analytics.postsByMonth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" stroke="#6b7280" style={{ fontWeight: 600 }} />
                  <YAxis stroke="#6b7280" style={{ fontWeight: 600 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: '1px solid rgba(0, 0, 0, 0.2)',
                      borderRadius: '12px',
                      fontWeight: 600,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#000000"
                    strokeWidth={3}
                    dot={{ fill: '#000000', r: 6 }}
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </motion.div>

            {/* Engagement Metrics */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
              className="elevated-card p-6"
            >
              <h3 className="text-xl font-bold text-foreground mb-6">Engagement Metrics</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={[
                    { name: 'Posts', value: analytics.totalPosts },
                    { name: 'Likes', value: analytics.totalLikes },
                    { name: 'Users', value: analytics.totalPatients },
                  ]}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" stroke="#6b7280" style={{ fontWeight: 600 }} />
                  <YAxis stroke="#6b7280" style={{ fontWeight: 600 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: '1px solid rgba(0, 0, 0, 0.2)',
                      borderRadius: '12px',
                      fontWeight: 600,
                    }}
                  />
                  <Bar dataKey="value" fill="#000000" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          </div>
        )}

        {/* Summary Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0 }}
          className="rounded-3xl border border-black/10 bg-white/60 backdrop-blur-xl p-8 text-center"
        >
          <div className="max-w-2xl mx-auto">
            <h3 className="text-xl font-bold text-black mb-2">Keep up the great work</h3>
            <p className="text-sm text-black/60 leading-relaxed">
              Your activity is creating measurable impact. Continue engaging with your community, tracking performance, and refining your services.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

