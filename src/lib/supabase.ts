import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types for our database
export type UserRole = 'patient' | 'therapist' | 'relationship_expert' | 'financial_expert' | 'dating_coach' | 'health_wellness_coach' | 'company'

export interface User {
  id: string
  auth_id: string
  email: string
  full_name: string
  user_role: UserRole
  phone_number: string
  profile_picture_url?: string
  short_bio?: string
  created_at: string
  updated_at: string
}

export interface PatientProfile {
  id: string
  user_id: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  languages: string[]
  created_at: string
  updated_at: string
}

export interface ProfessionalProfile {
  id: string
  user_id: string
  professional_title: string
  years_of_experience: number
  areas_of_expertise: string[]
  education: string[]
  certifications: string[]
  languages: string[]
  appointment_fee: number
  session_duration: number
  practice_company_name?: string
  website?: string
  is_verified: boolean
  created_at: string
  updated_at: string
}

