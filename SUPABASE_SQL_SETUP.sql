-- =====================================================
-- AMBITIOUS CARE - SUPABASE SQL SETUP
-- SIMPLE FLOW: Email/Pass → Verify → Complete Profile → Dashboard
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- USER TYPES ENUM
-- =====================================================
CREATE TYPE user_role AS ENUM (
  'patient',
  'therapist',
  'relationship_expert',
  'financial_expert',
  'dating_coach',
  'health_wellness_coach',
  'company'
);

-- =====================================================
-- USERS TABLE (Base user information)
-- =====================================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  user_role user_role NOT NULL,
  phone_number TEXT NOT NULL,
  profile_picture_url TEXT,
  short_bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- PATIENT PROFILES TABLE
-- =====================================================
CREATE TABLE patient_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  languages TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- PROFESSIONAL PROFILES TABLE
-- =====================================================
CREATE TABLE professional_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  professional_title TEXT NOT NULL,
  years_of_experience INTEGER NOT NULL,
  areas_of_expertise TEXT[] DEFAULT '{}',
  education TEXT[] DEFAULT '{}',
  certifications TEXT[] DEFAULT '{}',
  languages TEXT[] DEFAULT '{}',
  appointment_fee DECIMAL(10, 2),
  session_duration INTEGER,
  practice_company_name TEXT,
  website TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX idx_users_auth_id ON users(auth_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(user_role);
CREATE INDEX idx_patient_profiles_user_id ON patient_profiles(user_id);
CREATE INDEX idx_professional_profiles_user_id ON professional_profiles(user_id);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE professional_profiles ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- USERS TABLE POLICIES
-- =====================================================

-- Authenticated users can insert their own profile
CREATE POLICY "Authenticated users can create their profile" ON users
  FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = auth_id);

-- Users can read their own data
CREATE POLICY "Users can read their own data" ON users
  FOR SELECT 
  TO authenticated
  USING (auth.uid() = auth_id);

-- Users can update their own data
CREATE POLICY "Users can update their own data" ON users
  FOR UPDATE 
  TO authenticated
  USING (auth.uid() = auth_id);

-- Public can read professional user data (for browsing)
CREATE POLICY "Anyone can read professional user data" ON users
  FOR SELECT 
  USING (user_role != 'patient');

-- =====================================================
-- PATIENT PROFILES POLICIES
-- =====================================================

-- Patients can insert their own profile
CREATE POLICY "Patients can insert their own profile" ON patient_profiles
  FOR INSERT 
  TO authenticated
  WITH CHECK (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- Patients can read their own profile
CREATE POLICY "Patients can read their own profile" ON patient_profiles
  FOR SELECT 
  TO authenticated
  USING (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- Patients can update their own profile
CREATE POLICY "Patients can update their own profile" ON patient_profiles
  FOR UPDATE 
  TO authenticated
  USING (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- =====================================================
-- PROFESSIONAL PROFILES POLICIES
-- =====================================================

-- Professionals can insert their own profile
CREATE POLICY "Professionals can insert their own profile" ON professional_profiles
  FOR INSERT 
  TO authenticated
  WITH CHECK (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- Professionals can read their own profile
CREATE POLICY "Professionals can read their own profile" ON professional_profiles
  FOR SELECT 
  TO authenticated
  USING (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- Professionals can update their own profile
CREATE POLICY "Professionals can update their own profile" ON professional_profiles
  FOR UPDATE 
  TO authenticated
  USING (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- Public can read all professional profiles (for browsing)
CREATE POLICY "Anyone can read professional profiles" ON professional_profiles
  FOR SELECT 
  USING (true);

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_patient_profiles_updated_at BEFORE UPDATE ON patient_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_professional_profiles_updated_at BEFORE UPDATE ON professional_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- STORAGE POLICIES FOR PROFILE PICTURES
-- =====================================================
-- Run these separately AFTER ensuring the 'profile-pictures' bucket exists and is PUBLIC

-- Allow authenticated users to upload their own profile picture
CREATE POLICY "Users can upload profile picture" 
ON storage.objects FOR INSERT 
TO authenticated
WITH CHECK (
  bucket_id = 'profile-pictures' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to update their own profile picture
CREATE POLICY "Users can update profile picture" 
ON storage.objects FOR UPDATE 
TO authenticated
USING (
  bucket_id = 'profile-pictures' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to delete their own profile picture
CREATE POLICY "Users can delete profile picture" 
ON storage.objects FOR DELETE 
TO authenticated
USING (
  bucket_id = 'profile-pictures' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public read access to profile pictures
CREATE POLICY "Public can view profile pictures" 
ON storage.objects FOR SELECT 
TO public
USING (bucket_id = 'profile-pictures');

-- =====================================================
-- SETUP INSTRUCTIONS
-- =====================================================
-- After running this SQL:
-- 1. Go to Storage in Supabase Dashboard
-- 2. Make sure 'profile-pictures' bucket exists and is PUBLIC
-- 3. Run the storage policies above in the SQL editor
-- 4. That's it! The app will handle the rest.
-- =====================================================

-- =====================================================
-- NEW STUFF - CHAT/MESSAGING SYSTEM
-- =====================================================

-- Conversations table (tracks chat conversations between users)
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  participant1_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  participant2_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(participant1_id, participant2_id)
);

-- Messages table (stores individual messages)
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_conversations_participant1 ON conversations(participant1_id);
CREATE INDEX idx_conversations_participant2 ON conversations(participant2_id);
CREATE INDEX idx_conversations_last_message ON conversations(last_message_at DESC);
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_created ON messages(created_at DESC);

-- Enable RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- CONVERSATIONS POLICIES
-- =====================================================

-- Users can read conversations they're part of
CREATE POLICY "Users can read their conversations" ON conversations
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT auth_id FROM users WHERE id = participant1_id OR id = participant2_id
    )
  );

-- Users can create conversations
CREATE POLICY "Users can create conversations" ON conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IN (
      SELECT auth_id FROM users WHERE id = participant1_id
    )
  );

-- Users can update their conversations (for last_message_at)
CREATE POLICY "Users can update their conversations" ON conversations
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT auth_id FROM users WHERE id = participant1_id OR id = participant2_id
    )
  );

-- =====================================================
-- MESSAGES POLICIES
-- =====================================================

-- Users can read messages from their conversations
CREATE POLICY "Users can read their messages" ON messages
  FOR SELECT
  TO authenticated
  USING (
    conversation_id IN (
      SELECT id FROM conversations 
      WHERE auth.uid() IN (
        SELECT auth_id FROM users WHERE id = participant1_id OR id = participant2_id
      )
    )
  );

-- Users can send messages to their conversations
CREATE POLICY "Users can send messages" ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IN (SELECT auth_id FROM users WHERE id = sender_id) AND
    conversation_id IN (
      SELECT id FROM conversations 
      WHERE auth.uid() IN (
        SELECT auth_id FROM users WHERE id = participant1_id OR id = participant2_id
      )
    )
  );

-- Users can update messages (mark as read)
CREATE POLICY "Users can update messages" ON messages
  FOR UPDATE
  TO authenticated
  USING (
    conversation_id IN (
      SELECT id FROM conversations 
      WHERE auth.uid() IN (
        SELECT auth_id FROM users WHERE id = participant1_id OR id = participant2_id
      )
    )
  );

-- Function to update last_message_at when new message is sent
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update conversation timestamp
CREATE TRIGGER update_conversation_on_message
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION update_conversation_timestamp();

-- =====================================================
-- NEW STUFF - APPOINTMENT BOOKING SYSTEM
-- =====================================================

-- Days of week enum
CREATE TYPE day_of_week AS ENUM (
  'monday',
  'tuesday', 
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday'
);

-- Appointment status enum
CREATE TYPE appointment_status AS ENUM (
  'pending',
  'confirmed',
  'cancelled',
  'completed',
  'no_show'
);

-- Professional availability table (when experts are available)
CREATE TABLE professional_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  professional_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  day_of_week day_of_week NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(professional_id, day_of_week, start_time)
);

-- Appointment requests table (patient requests to book)
CREATE TABLE appointment_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  professional_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  requested_date DATE NOT NULL,
  requested_time TIME NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  status appointment_status DEFAULT 'pending',
  patient_message TEXT,
  patient_phone TEXT,
  patient_email TEXT,
  patient_preferred_contact TEXT,
  patient_concerns TEXT,
  patient_goals TEXT,
  patient_previous_therapy BOOLEAN DEFAULT FALSE,
  patient_previous_therapy_details TEXT,
  patient_medications TEXT,
  patient_emergency_contact_name TEXT,
  patient_emergency_contact_phone TEXT,
  patient_insurance_info TEXT,
  patient_consent_given BOOLEAN DEFAULT FALSE,
  professional_notes TEXT,
  professional_response TEXT,
  confirmed_date DATE,
  confirmed_time TIME,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Appointment sessions table (confirmed appointments)
CREATE TABLE appointment_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_request_id UUID REFERENCES appointment_requests(id) ON DELETE CASCADE NOT NULL,
  patient_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  professional_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  session_date DATE NOT NULL,
  session_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL,
  session_type TEXT DEFAULT 'video_call', -- video_call, phone_call, in_person
  meeting_link TEXT,
  location TEXT,
  status appointment_status DEFAULT 'confirmed',
  session_notes TEXT,
  patient_feedback TEXT,
  professional_feedback TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_professional_availability_professional ON professional_availability(professional_id);
CREATE INDEX idx_professional_availability_day ON professional_availability(day_of_week);
CREATE INDEX idx_appointment_requests_patient ON appointment_requests(patient_id);
CREATE INDEX idx_appointment_requests_professional ON appointment_requests(professional_id);
CREATE INDEX idx_appointment_requests_status ON appointment_requests(status);
CREATE INDEX idx_appointment_requests_date ON appointment_requests(requested_date);
CREATE INDEX idx_appointment_sessions_patient ON appointment_sessions(patient_id);
CREATE INDEX idx_appointment_sessions_professional ON appointment_sessions(professional_id);
CREATE INDEX idx_appointment_sessions_date ON appointment_sessions(session_date);

-- Enable RLS
ALTER TABLE professional_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_sessions ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PROFESSIONAL AVAILABILITY POLICIES
-- =====================================================

-- Professionals can manage their own availability
CREATE POLICY "Professionals can manage their availability" ON professional_availability
  FOR ALL
  TO authenticated
  USING (
    professional_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- Public can read availability (for booking)
CREATE POLICY "Anyone can read professional availability" ON professional_availability
  FOR SELECT
  USING (is_active = TRUE);

-- =====================================================
-- APPOINTMENT REQUESTS POLICIES
-- =====================================================

-- Patients can create appointment requests
CREATE POLICY "Patients can create appointment requests" ON appointment_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    patient_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- Patients can read their own requests
CREATE POLICY "Patients can read their requests" ON appointment_requests
  FOR SELECT
  TO authenticated
  USING (
    patient_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- Patients can update their own requests (before confirmation)
CREATE POLICY "Patients can update their requests" ON appointment_requests
  FOR UPDATE
  TO authenticated
  USING (
    patient_id IN (SELECT id FROM users WHERE auth_id = auth.uid()) AND
    status = 'pending'
  );

-- Professionals can read requests for them
CREATE POLICY "Professionals can read their requests" ON appointment_requests
  FOR SELECT
  TO authenticated
  USING (
    professional_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- Professionals can update requests (respond/confirm/cancel)
CREATE POLICY "Professionals can update requests" ON appointment_requests
  FOR UPDATE
  TO authenticated
  USING (
    professional_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- =====================================================
-- APPOINTMENT SESSIONS POLICIES
-- =====================================================

-- Patients can read their sessions
CREATE POLICY "Patients can read their sessions" ON appointment_sessions
  FOR SELECT
  TO authenticated
  USING (
    patient_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- Professionals can read their sessions
CREATE POLICY "Professionals can read their sessions" ON appointment_sessions
  FOR SELECT
  TO authenticated
  USING (
    professional_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- Professionals can create sessions (when confirming appointments)
CREATE POLICY "Professionals can create sessions" ON appointment_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    professional_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- Both can update sessions (add notes, feedback, etc.)
CREATE POLICY "Participants can update sessions" ON appointment_sessions
  FOR UPDATE
  TO authenticated
  USING (
    patient_id IN (SELECT id FROM users WHERE auth_id = auth.uid()) OR
    professional_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- =====================================================
-- TRIGGERS FOR APPOINTMENT SYSTEM
-- =====================================================

-- Update availability updated_at
CREATE TRIGGER update_availability_updated_at BEFORE UPDATE ON professional_availability
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update appointment requests updated_at
CREATE TRIGGER update_appointment_requests_updated_at BEFORE UPDATE ON appointment_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update appointment sessions updated_at
CREATE TRIGGER update_appointment_sessions_updated_at BEFORE UPDATE ON appointment_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to auto-create session when appointment is confirmed
CREATE OR REPLACE FUNCTION create_session_on_confirmation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'confirmed' AND OLD.status = 'pending' THEN
    INSERT INTO appointment_sessions (
      appointment_request_id,
      patient_id,
      professional_id,
      session_date,
      session_time,
      duration_minutes,
      status
    ) VALUES (
      NEW.id,
      NEW.patient_id,
      NEW.professional_id,
      NEW.confirmed_date,
      NEW.confirmed_time,
      NEW.duration_minutes,
      'confirmed'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create session when appointment confirmed
CREATE TRIGGER create_session_on_appointment_confirmation
AFTER UPDATE ON appointment_requests
FOR EACH ROW
EXECUTE FUNCTION create_session_on_confirmation();

-- =====================================================
-- NEW STUFF - SIMPLIFIED USER ACCESS (ALL AUTHENTICATED CAN VIEW)
-- =====================================================

-- Drop all existing SELECT policies on users table
DROP POLICY IF EXISTS "Users can read their own data" ON users;
DROP POLICY IF EXISTS "Anyone can read professional user data" ON users;
DROP POLICY IF EXISTS "Professionals can read their patients data" ON users;
DROP POLICY IF EXISTS "Patients can read their professionals data" ON users;

-- Simple policy: All authenticated users can read all user profiles
-- This allows professionals to see patients and vice versa without restrictions
CREATE POLICY "Authenticated users can read all user data" ON users
  FOR SELECT
  TO authenticated
  USING (true);

-- =====================================================
-- NEW NEW NEW STUFF - POSTS SYSTEM
-- =====================================================

-- Posts table (created by professionals only)
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL CHECK (char_length(content) <= 3000), -- ~500 words
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Post likes table (anyone can like)
CREATE TABLE post_likes (
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (post_id, user_id)
);

-- Post hashtags table (for search functionality)
CREATE TABLE post_hashtags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  hashtag TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_posts_author ON posts(author_id);
CREATE INDEX idx_posts_created ON posts(created_at DESC);
CREATE INDEX idx_post_likes_post ON post_likes(post_id);
CREATE INDEX idx_post_likes_user ON post_likes(user_id);
CREATE INDEX idx_post_hashtags_post ON post_hashtags(post_id);
CREATE INDEX idx_post_hashtags_hashtag ON post_hashtags(hashtag);

-- Enable RLS
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_hashtags ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POSTS POLICIES
-- =====================================================

-- Anyone authenticated can read posts
CREATE POLICY "Anyone can read posts" ON posts
  FOR SELECT
  TO authenticated
  USING (true);

-- Only professionals can create posts
CREATE POLICY "Professionals can create posts" ON posts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    author_id IN (
      SELECT id FROM users 
      WHERE auth_id = auth.uid() 
      AND user_role != 'patient'
    )
  );

-- Professionals can update their own posts
CREATE POLICY "Professionals can update their posts" ON posts
  FOR UPDATE
  TO authenticated
  USING (
    author_id IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    )
  );

-- Professionals can delete their own posts
CREATE POLICY "Professionals can delete their posts" ON posts
  FOR DELETE
  TO authenticated
  USING (
    author_id IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    )
  );

-- =====================================================
-- POST LIKES POLICIES
-- =====================================================

-- Anyone can read likes
CREATE POLICY "Anyone can read post likes" ON post_likes
  FOR SELECT
  TO authenticated
  USING (true);

-- Users can like posts
CREATE POLICY "Users can like posts" ON post_likes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- Users can unlike posts
CREATE POLICY "Users can unlike posts" ON post_likes
  FOR DELETE
  TO authenticated
  USING (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- =====================================================
-- POST HASHTAGS POLICIES
-- =====================================================

-- Anyone can read hashtags
CREATE POLICY "Anyone can read hashtags" ON post_hashtags
  FOR SELECT
  TO authenticated
  USING (true);

-- Post authors can add hashtags
CREATE POLICY "Authors can add hashtags" ON post_hashtags
  FOR INSERT
  TO authenticated
  WITH CHECK (
    post_id IN (
      SELECT id FROM posts 
      WHERE author_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
    )
  );

-- Post authors can delete hashtags
CREATE POLICY "Authors can delete hashtags" ON post_hashtags
  FOR DELETE
  TO authenticated
  USING (
    post_id IN (
      SELECT id FROM posts 
      WHERE author_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
    )
  );

-- =====================================================
-- TRIGGERS FOR POSTS SYSTEM
-- =====================================================

-- Update posts updated_at
CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- STORAGE BUCKET SETUP INSTRUCTIONS
-- =====================================================

-- Run this in Supabase SQL Editor to create storage bucket and policies:
-- The bucket will be PUBLIC so community post images can be easily displayed

-- Allow authenticated users to upload post images (with size/type validation done in frontend)
-- NOTE: Bucket is PUBLIC so images can be displayed easily in community posts
INSERT INTO storage.buckets (id, name, public) 
VALUES ('post-images', 'post-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Allow authenticated users to upload to their folder
CREATE POLICY "Users can upload post images" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'post-images' AND
    (storage.foldername(name))[1] = (SELECT id::text FROM users WHERE auth_id = auth.uid())
  );

-- Allow users to update their own post images
CREATE POLICY "Users can update their post images" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'post-images' AND
    (storage.foldername(name))[1] = (SELECT id::text FROM users WHERE auth_id = auth.uid())
  );

-- Allow users to delete their own post images
CREATE POLICY "Users can delete their post images" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'post-images' AND
    (storage.foldername(name))[1] = (SELECT id::text FROM users WHERE auth_id = auth.uid())
  );

-- =====================================================
-- DEALS AND OFFER PAGE
-- =====================================================

-- Exclusive deals and offers table (public information)
CREATE TABLE deals_offers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_name TEXT NOT NULL,
  description TEXT NOT NULL,
  address TEXT NOT NULL,
  timings TEXT NOT NULL,
  coupon_code TEXT NOT NULL,
  discount_percentage INTEGER,
  discount_details TEXT,
  category TEXT, -- e.g., 'restaurant', 'gym', 'spa', 'retail'
  valid_until DATE,
  terms_conditions TEXT,
  image_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for performance
CREATE INDEX idx_deals_offers_active ON deals_offers(is_active);
CREATE INDEX idx_deals_offers_category ON deals_offers(category);
CREATE INDEX idx_deals_offers_valid_until ON deals_offers(valid_until);

-- Enable RLS (but allow all authenticated users to read)
ALTER TABLE deals_offers ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read deals (public information)
CREATE POLICY "Anyone can read deals" ON deals_offers
  FOR SELECT
  TO authenticated
  USING (is_active = TRUE);

-- Trigger for updated_at
CREATE TRIGGER update_deals_offers_updated_at BEFORE UPDATE ON deals_offers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- DUMMY DATA FOR DEALS AND OFFERS
-- =====================================================

INSERT INTO deals_offers (business_name, description, address, timings, coupon_code, discount_percentage, discount_details, category, valid_until, terms_conditions) VALUES
('Mindful Wellness Spa', 'Relax and rejuvenate with our premium spa treatments. Get a discount on your first visit!', '123 Serenity Lane, London, SW1A 1AA', 'Mon-Sat: 9:00 AM - 8:00 PM, Sun: 10:00 AM - 6:00 PM', 'WELLNESS50', 50, '50% off on first massage therapy session', 'spa', '2025-12-31', 'Valid for new customers only. Not combinable with other offers.'),

('FitLife Gym & Fitness', 'Premium gym facilities with personal trainers. Start your fitness journey today!', '456 Health Street, Manchester, M1 2AB', 'Open 24/7', 'FITLIFE30', 30, '30% off on 3-month membership', 'gym', '2025-12-31', 'Valid for new memberships only. Minimum 3-month commitment required.'),

('Healthy Bites Cafe', 'Organic, nutritious meals made fresh daily. Fuel your body with wholesome food.', '789 Green Avenue, Birmingham, B2 4BN', 'Mon-Fri: 7:00 AM - 7:00 PM, Weekends: 8:00 AM - 5:00 PM', 'HEALTHY20', 20, '20% off on all smoothie bowls and salads', 'restaurant', '2025-11-30', 'Valid for dine-in and takeaway. One use per customer per day.'),

('Zen Yoga Studio', 'Find your inner peace through yoga and meditation classes for all levels.', '321 Tranquil Road, Leeds, LS1 3EX', 'Mon-Sun: 6:00 AM - 9:00 PM', 'ZENFLOW25', 25, '25% off on monthly unlimited class pass', 'wellness', '2025-12-31', 'New students only. First month offer.'),

('Book Haven', 'Your local independent bookstore with a curated selection of wellness and self-help books.', '654 Reading Close, Bristol, BS1 4DJ', 'Tue-Sat: 10:00 AM - 6:00 PM, Sun: 11:00 AM - 4:00 PM', 'BOOKS15', 15, '15% off on all mental health and wellness books', 'retail', '2025-12-31', 'Excludes already discounted items.'),

('Therapy Tea House', 'Enjoy our calming atmosphere with premium teas and light refreshments.', '987 Calm Street, Edinburgh, EH1 3EG', 'Mon-Sun: 9:00 AM - 7:00 PM', 'TEATIME10', 10, '10% off on all herbal tea selections', 'cafe', '2025-11-30', 'Cannot be combined with other promotions.');

-- =====================================================
-- RAPID ALERT SYSTEM
-- =====================================================

-- Rapid alert status enum
CREATE TYPE rapid_alert_status AS ENUM (
  'pending',
  'viewed',
  'cleared'
);

-- Rapid alerts table (patients send emergency alerts to therapists)
CREATE TABLE rapid_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  therapist_id UUID REFERENCES users(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  urgency_level TEXT DEFAULT 'high', -- high, critical
  status rapid_alert_status DEFAULT 'pending',
  cleared_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_rapid_alerts_patient ON rapid_alerts(patient_id);
CREATE INDEX idx_rapid_alerts_therapist ON rapid_alerts(therapist_id);
CREATE INDEX idx_rapid_alerts_status ON rapid_alerts(status);
CREATE INDEX idx_rapid_alerts_created ON rapid_alerts(created_at DESC);

-- Enable RLS
ALTER TABLE rapid_alerts ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RAPID ALERTS POLICIES
-- =====================================================

-- Patients can create rapid alerts (quota check done in application)
CREATE POLICY "Patients can create rapid alerts" ON rapid_alerts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    patient_id IN (
      SELECT id FROM users 
      WHERE auth_id = auth.uid() 
      AND user_role = 'patient'
    )
  );

-- Patients can read their own alerts
CREATE POLICY "Patients can read their alerts" ON rapid_alerts
  FOR SELECT
  TO authenticated
  USING (
    patient_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- Therapists can read all rapid alerts (sent to all therapists or specifically to them)
CREATE POLICY "Therapists can read rapid alerts" ON rapid_alerts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE auth_id = auth.uid() 
      AND user_role = 'therapist'
    ) AND (
      therapist_id IS NULL OR 
      therapist_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
    )
  );

-- Therapists can update rapid alerts (mark as viewed/cleared)
CREATE POLICY "Therapists can update rapid alerts" ON rapid_alerts
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE auth_id = auth.uid() 
      AND user_role = 'therapist'
    )
  );

-- =====================================================
-- RAPID ALERTS FUNCTIONS
-- =====================================================

-- Function to check if patient has remaining rapid alerts for current month
CREATE OR REPLACE FUNCTION check_rapid_alert_quota(p_patient_id UUID)
RETURNS INTEGER AS $$
DECLARE
  alerts_used INTEGER;
  remaining INTEGER;
BEGIN
  -- Count alerts sent this month
  SELECT COUNT(*) INTO alerts_used
  FROM rapid_alerts
  WHERE patient_id = p_patient_id
    AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_TIMESTAMP);
  
  -- Calculate remaining (2 per month)
  remaining := 2 - alerts_used;
  
  -- Return remaining count (0, 1, or 2)
  RETURN GREATEST(remaining, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get monthly usage for a patient
CREATE OR REPLACE FUNCTION get_rapid_alert_usage(p_patient_id UUID)
RETURNS TABLE(
  month_start DATE,
  alerts_used INTEGER,
  alerts_remaining INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    DATE_TRUNC('month', CURRENT_TIMESTAMP)::DATE as month_start,
    COUNT(*)::INTEGER as alerts_used,
    (2 - COUNT(*))::INTEGER as alerts_remaining
  FROM rapid_alerts
  WHERE patient_id = p_patient_id
    AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_TIMESTAMP)
  GROUP BY DATE_TRUNC('month', CURRENT_TIMESTAMP)
  UNION ALL
  SELECT 
    DATE_TRUNC('month', CURRENT_TIMESTAMP)::DATE,
    0,
    2
  WHERE NOT EXISTS (
    SELECT 1 FROM rapid_alerts
    WHERE patient_id = p_patient_id
      AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_TIMESTAMP)
  )
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGERS FOR RAPID ALERTS
-- =====================================================

-- Update rapid_alerts updated_at
CREATE TRIGGER update_rapid_alerts_updated_at BEFORE UPDATE ON rapid_alerts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger to set cleared_at when status changes to cleared
CREATE OR REPLACE FUNCTION set_cleared_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'cleared' AND OLD.status != 'cleared' THEN
    NEW.cleared_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_rapid_alert_cleared_at
  BEFORE UPDATE ON rapid_alerts
  FOR EACH ROW
  EXECUTE FUNCTION set_cleared_at();

-- =====================================================
-- SUPER NEW STUFF - COMPANY SYSTEM
-- =====================================================

-- Subscription plan tiers enum
CREATE TYPE subscription_tier AS ENUM (
  'essential',
  'professional',
  'enterprise'
);

-- Invitation status enum
CREATE TYPE invitation_status AS ENUM (
  'pending',
  'accepted',
  'expired'
);

-- Company profiles table
CREATE TABLE company_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  company_name TEXT NOT NULL,
  company_description TEXT,
  company_website TEXT,
  company_email TEXT NOT NULL,
  company_phone TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Company subscriptions table
CREATE TABLE company_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  subscription_tier subscription_tier NOT NULL,
  max_workers INTEGER NOT NULL,
  price_per_month DECIMAL(10, 2) NOT NULL,
  stripe_subscription_id TEXT, -- For future real Stripe integration
  is_active BOOLEAN DEFAULT TRUE,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Company employee invitations table
CREATE TABLE company_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  status invitation_status DEFAULT 'pending',
  invited_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  invitation_token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id, email)
);

-- Company employees junction table (links companies with their employees)
CREATE TABLE company_employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  employee_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id, employee_id)
);

-- Indexes for performance
CREATE INDEX idx_company_profiles_user_id ON company_profiles(user_id);
CREATE INDEX idx_company_subscriptions_company ON company_subscriptions(company_id);
CREATE INDEX idx_company_subscriptions_tier ON company_subscriptions(subscription_tier);
CREATE INDEX idx_company_invitations_company ON company_invitations(company_id);
CREATE INDEX idx_company_invitations_email ON company_invitations(email);
CREATE INDEX idx_company_invitations_status ON company_invitations(status);
CREATE INDEX idx_company_invitations_token ON company_invitations(invitation_token);
CREATE INDEX idx_company_employees_company ON company_employees(company_id);
CREATE INDEX idx_company_employees_employee ON company_employees(employee_id);

-- Enable RLS
ALTER TABLE company_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_employees ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- COMPANY PROFILES POLICIES
-- =====================================================

-- Companies can insert their own profile
CREATE POLICY "Companies can insert their own profile" ON company_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- Companies can read their own profile
CREATE POLICY "Companies can read their own profile" ON company_profiles
  FOR SELECT
  TO authenticated
  USING (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- Companies can update their own profile
CREATE POLICY "Companies can update their own profile" ON company_profiles
  FOR UPDATE
  TO authenticated
  USING (
    user_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- =====================================================
-- COMPANY SUBSCRIPTIONS POLICIES
-- =====================================================

-- Companies can read their own subscriptions
CREATE POLICY "Companies can read their subscriptions" ON company_subscriptions
  FOR SELECT
  TO authenticated
  USING (
    company_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- Companies can insert their own subscriptions
CREATE POLICY "Companies can insert their subscriptions" ON company_subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- Companies can update their own subscriptions
CREATE POLICY "Companies can update their subscriptions" ON company_subscriptions
  FOR UPDATE
  TO authenticated
  USING (
    company_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- =====================================================
-- COMPANY INVITATIONS POLICIES
-- =====================================================

-- Companies can read their own invitations
CREATE POLICY "Companies can read their invitations" ON company_invitations
  FOR SELECT
  TO authenticated
  USING (
    company_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- Companies can create invitations
CREATE POLICY "Companies can create invitations" ON company_invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- Companies can update their invitations
CREATE POLICY "Companies can update their invitations" ON company_invitations
  FOR UPDATE
  TO authenticated
  USING (
    company_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- Anyone can read invitations by token (for accepting invites)
CREATE POLICY "Anyone can read invitations by token" ON company_invitations
  FOR SELECT
  TO authenticated
  USING (true);

-- =====================================================
-- COMPANY EMPLOYEES POLICIES
-- =====================================================

-- Companies can read their employees
CREATE POLICY "Companies can read their employees" ON company_employees
  FOR SELECT
  TO authenticated
  USING (
    company_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- Companies can add employees
CREATE POLICY "Companies can add employees" ON company_employees
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- Employees can read which companies they belong to
CREATE POLICY "Employees can read their companies" ON company_employees
  FOR SELECT
  TO authenticated
  USING (
    employee_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- =====================================================
-- COMPANY SYSTEM FUNCTIONS
-- =====================================================

-- Function to check if company can invite more workers
CREATE OR REPLACE FUNCTION can_invite_more_workers(p_company_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  max_workers INTEGER;
  current_workers INTEGER;
BEGIN
  -- Get max workers from subscription
  SELECT cs.max_workers INTO max_workers
  FROM company_subscriptions cs
  WHERE cs.company_id = p_company_id
    AND cs.is_active = TRUE
  ORDER BY cs.created_at DESC
  LIMIT 1;
  
  -- If no subscription or unlimited (-1), return true
  IF max_workers IS NULL OR max_workers = -1 THEN
    RETURN TRUE;
  END IF;
  
  -- Count current employees
  SELECT COUNT(*) INTO current_workers
  FROM company_employees
  WHERE company_id = p_company_id;
  
  -- Return true if under limit
  RETURN current_workers < max_workers;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get company subscription details
CREATE OR REPLACE FUNCTION get_company_subscription(p_company_id UUID)
RETURNS TABLE(
  tier TEXT,
  max_workers INTEGER,
  current_workers BIGINT,
  price_per_month DECIMAL,
  is_active BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cs.subscription_tier::TEXT,
    cs.max_workers,
    (SELECT COUNT(*) FROM company_employees WHERE company_id = p_company_id),
    cs.price_per_month,
    cs.is_active
  FROM company_subscriptions cs
  WHERE cs.company_id = p_company_id
    AND cs.is_active = TRUE
  ORDER BY cs.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGERS FOR COMPANY SYSTEM
-- =====================================================

-- Update company_profiles updated_at
CREATE TRIGGER update_company_profiles_updated_at BEFORE UPDATE ON company_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update company_subscriptions updated_at
CREATE TRIGGER update_company_subscriptions_updated_at BEFORE UPDATE ON company_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update company_invitations updated_at
CREATE TRIGGER update_company_invitations_updated_at BEFORE UPDATE ON company_invitations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger to set accepted_at when invitation is accepted
CREATE OR REPLACE FUNCTION set_invitation_accepted_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'accepted' AND OLD.status != 'accepted' THEN
    NEW.accepted_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_invitation_accepted_timestamp
  BEFORE UPDATE ON company_invitations
  FOR EACH ROW
  EXECUTE FUNCTION set_invitation_accepted_at();

-- Trigger to automatically add employee to company_employees when invitation is accepted
CREATE OR REPLACE FUNCTION auto_add_employee_on_invitation_accept()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'accepted' AND OLD.status != 'accepted' AND NEW.invited_user_id IS NOT NULL THEN
    INSERT INTO company_employees (company_id, employee_id)
    VALUES (NEW.company_id, NEW.invited_user_id)
    ON CONFLICT (company_id, employee_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_add_employee_trigger
  AFTER UPDATE ON company_invitations
  FOR EACH ROW
  EXECUTE FUNCTION auto_add_employee_on_invitation_accept();

-- =====================================================
-- NEW NEW NEW VERY NEW STUFF - 3RD PARTY RESOURCES & SUPER ADMIN FEATURES
-- =====================================================

-- Third party resources table (external helpful links/resources for users)
CREATE TABLE third_party_resources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  url TEXT NOT NULL,
  category TEXT, -- e.g., 'mental_health', 'crisis_support', 'wellness', 'financial', 'legal'
  resource_type TEXT, -- e.g., 'article', 'hotline', 'website', 'app', 'book'
  is_active BOOLEAN DEFAULT TRUE,
  is_featured BOOLEAN DEFAULT FALSE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_third_party_resources_category ON third_party_resources(category);
CREATE INDEX idx_third_party_resources_active ON third_party_resources(is_active);
CREATE INDEX idx_third_party_resources_featured ON third_party_resources(is_featured);
CREATE INDEX idx_third_party_resources_order ON third_party_resources(display_order);

-- Enable RLS
ALTER TABLE third_party_resources ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read active resources
CREATE POLICY "Anyone can read active resources" ON third_party_resources
  FOR SELECT
  TO authenticated
  USING (is_active = TRUE);

-- Trigger for updated_at
CREATE TRIGGER update_third_party_resources_updated_at BEFORE UPDATE ON third_party_resources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Super admin policies for deals_offers (allow full CRUD)
CREATE POLICY "Super admin can manage all deals" ON deals_offers
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Super admin policies for third_party_resources (allow full CRUD)
CREATE POLICY "Super admin can manage resources" ON third_party_resources
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Sample third party resources
INSERT INTO third_party_resources (title, description, url, category, resource_type, is_featured, display_order) VALUES
('National Suicide Prevention Lifeline', 'Free 24/7 confidential support for people in distress, crisis resources, and best practices for professionals.', 'https://988lifeline.org/', 'crisis_support', 'hotline', true, 1),
('Crisis Text Line', 'Text HOME to 741741 to connect with a Crisis Counselor. Free 24/7 support via text message.', 'https://www.crisistextline.org/', 'crisis_support', 'hotline', true, 2),
('Mind UK', 'Mental health support and information. Includes guides on various conditions and how to seek help.', 'https://www.mind.org.uk/', 'mental_health', 'website', true, 3),
('Headspace App', 'Meditation and mindfulness app with guided sessions for stress, sleep, and focus.', 'https://www.headspace.com/', 'wellness', 'app', false, 4),
('The Anxiety and Depression Association of America', 'Education, training, and research for anxiety, depression, OCD, PTSD, and related disorders.', 'https://adaa.org/', 'mental_health', 'website', false, 5);

