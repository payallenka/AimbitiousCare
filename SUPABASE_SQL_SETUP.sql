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
  'health_wellness_coach'
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
