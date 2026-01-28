-- 1. Interactions table (for SMS logging)
CREATE TABLE interactions (
  id BIGSERIAL PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('sms', 'call', 'email')),
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  from_number TEXT,
  to_number TEXT,
  status TEXT,
  body TEXT,
  twilio_sid TEXT UNIQUE,
  contact_id UUID REFERENCES contacts(id),
  num_media INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 2. Chat messages table
CREATE TABLE chat_messages (
  id BIGSERIAL PRIMARY KEY,
  session_id TEXT NOT NULL,
  sender_identity TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 3. Contacts table
CREATE TABLE contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phone TEXT UNIQUE,
  name TEXT,
  email TEXT,
  sms_opt_out BOOLEAN DEFAULT false,
  source TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 4. Follow-ups table
CREATE TABLE follow_ups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID REFERENCES contacts(id),
  type TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  priority TEXT DEFAULT 'medium',
  message TEXT,
  assigned_to UUID,
  due_date TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create indexes for better performance
CREATE INDEX idx_interactions_phone ON interactions(from_number, to_number);
CREATE INDEX idx_interactions_created ON interactions(created_at DESC);
CREATE INDEX idx_chat_messages_session ON chat_messages(session_id, created_at);
CREATE INDEX idx_contacts_phone ON contacts(phone);

-- Create a view for combined messages
CREATE VIEW unified_messages AS
SELECT 
  id::text as id,
  session_id,
  sender_identity,
  message,
  created_at,
  'chat' as source,
  metadata
FROM chat_messages

UNION ALL

SELECT 
  'sms-' || id::text as id,
  'sms-' || REPLACE(from_number, '+', '') as session_id,
  from_number as sender_identity,
  body as message,
  created_at,
  'sms' as source,
  jsonb_build_object(
    'type', 'sms',
    'direction', direction,
    'twilio_sid', twilio_sid,
    'to_number', to_number
  ) as metadata
FROM interactions
WHERE type = 'sms';