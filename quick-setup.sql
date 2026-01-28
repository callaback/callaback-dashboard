-- Quick setup: Create tables and insert sample data

-- Create contacts table
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  company TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create interactions table
CREATE TABLE IF NOT EXISTS interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  direction TEXT NOT NULL,
  status TEXT NOT NULL,
  from_number TEXT,
  to_number TEXT,
  duration INTEGER DEFAULT 0,
  body TEXT,
  contact_id UUID REFERENCES contacts(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create leads table
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES contacts(id),
  title TEXT NOT NULL,
  status TEXT DEFAULT 'new',
  priority TEXT DEFAULT 'medium',
  type TEXT DEFAULT 'lead',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS and create policies
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all" ON contacts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON interactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON leads FOR ALL USING (true) WITH CHECK (true);

-- Insert sample data
INSERT INTO contacts (name, phone, email, company) VALUES
('John Smith', '+15551234567', 'john@email.com', 'Tech Solutions'),
('Sarah Johnson', '+15559876543', 'sarah@company.com', 'Marketing Pro'),
('Mike Davis', '+15555551234', 'mike@startup.io', 'StartupXYZ');

INSERT INTO interactions (type, direction, status, from_number, to_number, duration, body, contact_id) VALUES
('call', 'inbound', 'completed', '+15551234567', '+18444073511', 180, NULL, (SELECT id FROM contacts WHERE phone = '+15551234567')),
('sms', 'inbound', 'received', '+15551234567', '+18444073511', NULL, 'Hi, interested in your services!', (SELECT id FROM contacts WHERE phone = '+15551234567')),
('call', 'outbound', 'completed', '+18444073511', '+15559876543', 240, NULL, (SELECT id FROM contacts WHERE phone = '+15559876543'));

INSERT INTO leads (contact_id, title, status, priority, type) VALUES
((SELECT id FROM contacts WHERE phone = '+15551234567'), 'Tech Solutions Package', 'contacted', 'high', 'lead'),
((SELECT id FROM contacts WHERE phone = '+15559876543'), 'Marketing Follow-up', 'new', 'medium', 'task'),
((SELECT id FROM contacts WHERE phone = '+15555551234'), 'StartupXYZ Contract', 'qualified', 'urgent', 'appointment');
