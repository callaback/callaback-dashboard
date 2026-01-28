-- Seed data for Callaback Dashboard
-- This script populates the database with realistic sample data

-- Clear existing data (optional - comment out if you want to keep existing data)
-- DELETE FROM chat_messages;
-- DELETE FROM follow_ups;
-- DELETE FROM leads;
-- DELETE FROM interactions;
-- DELETE FROM contacts;

-- Insert sample contacts
INSERT INTO contacts (id, name, phone, email, company, notes, tags, created_at) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'John Smith', '+15551234567', 'john.smith@email.com', 'Tech Solutions Inc', 'Interested in our premium package', ARRAY['lead', 'tech'], NOW() - INTERVAL '5 days'),
  ('550e8400-e29b-41d4-a716-446655440002', 'Sarah Johnson', '+15559876543', 'sarah.j@company.com', 'Marketing Pro LLC', 'Needs follow-up on proposal', ARRAY['client', 'marketing'], NOW() - INTERVAL '3 days'),
  ('550e8400-e29b-41d4-a716-446655440003', 'Mike Davis', '+15555551234', 'mike.davis@startup.io', 'StartupXYZ', 'Hot lead - ready to sign', ARRAY['hot-lead', 'startup'], NOW() - INTERVAL '2 days'),
  ('550e8400-e29b-41d4-a716-446655440004', 'Emily Chen', '+15554567890', 'emily.chen@corp.com', 'Global Corp', 'Existing client - renewal due', ARRAY['client', 'renewal'], NOW() - INTERVAL '7 days'),
  ('550e8400-e29b-41d4-a716-446655440005', 'Robert Wilson', '+15553334444', 'r.wilson@business.net', 'Wilson & Associates', 'Referred by John Smith', ARRAY['referral', 'legal'], NOW() - INTERVAL '1 day'),
  ('550e8400-e29b-41d4-a716-446655440006', 'Lisa Anderson', '+15552223333', 'lisa@healthtech.com', 'HealthTech Solutions', 'Demo scheduled for next week', ARRAY['demo', 'healthcare'], NOW() - INTERVAL '4 days'),
  ('550e8400-e29b-41d4-a716-446655440007', 'David Brown', '+15551112222', 'david.brown@retail.com', 'Retail Giants', 'Price negotiation in progress', ARRAY['negotiation', 'retail'], NOW() - INTERVAL '6 days'),
  ('550e8400-e29b-41d4-a716-446655440008', 'Jennifer Taylor', '+15556667777', 'jen.taylor@finance.org', 'Finance First', 'Compliance questions resolved', ARRAY['client', 'finance'], NOW() - INTERVAL '8 days'),
  ('550e8400-e29b-41d4-a716-446655440009', 'Mark Thompson', '+15558889999', 'mark.t@education.edu', 'Education Plus', 'Pilot program approved', ARRAY['pilot', 'education'], NOW() - INTERVAL '10 days'),
  ('550e8400-e29b-41d4-a716-446655440010', 'Amanda White', '+15550001111', 'amanda@nonprofit.org', 'Community Help', 'Special pricing discussed', ARRAY['nonprofit', 'special-pricing'], NOW() - INTERVAL '12 days');

-- Insert sample interactions (calls and SMS)
INSERT INTO interactions (id, type, direction, status, from_number, to_number, twilio_sid, duration, body, contact_id, created_at) VALUES
  -- Recent calls
  ('660e8400-e29b-41d4-a716-446655440001', 'call', 'inbound', 'completed', '+15551234567', '+18444073511', 'CA123456789', 180, NULL, '550e8400-e29b-41d4-a716-446655440001', NOW() - INTERVAL '2 hours'),
  ('660e8400-e29b-41d4-a716-446655440002', 'call', 'outbound', 'completed', '+18444073511', '+15559876543', 'CA123456790', 240, NULL, '550e8400-e29b-41d4-a716-446655440002', NOW() - INTERVAL '4 hours'),
  ('660e8400-e29b-41d4-a716-446655440003', 'call', 'inbound', 'no-answer', '+15555551234', '+18444073511', 'CA123456791', 0, NULL, '550e8400-e29b-41d4-a716-446655440003', NOW() - INTERVAL '6 hours'),
  ('660e8400-e29b-41d4-a716-446655440004', 'call', 'outbound', 'busy', '+18444073511', '+15554567890', 'CA123456792', 0, NULL, '550e8400-e29b-41d4-a716-446655440004', NOW() - INTERVAL '1 day'),
  
  -- Recent SMS messages
  ('660e8400-e29b-41d4-a716-446655440005', 'sms', 'inbound', 'received', '+15551234567', '+18444073511', 'SM123456789', NULL, 'Hi, I''m interested in your services. Can we schedule a call?', '550e8400-e29b-41d4-a716-446655440001', NOW() - INTERVAL '30 minutes'),
  ('660e8400-e29b-41d4-a716-446655440006', 'sms', 'outbound', 'delivered', '+18444073511', '+15551234567', 'SM123456790', NULL, 'Thanks for your interest! I''ll call you in 10 minutes to discuss our solutions.', '550e8400-e29b-41d4-a716-446655440001', NOW() - INTERVAL '25 minutes'),
  ('660e8400-e29b-41d4-a716-446655440007', 'sms', 'inbound', 'received', '+15559876543', '+18444073511', 'SM123456791', NULL, 'Can you send me the proposal we discussed?', '550e8400-e29b-41d4-a716-446655440002', NOW() - INTERVAL '2 hours'),
  ('660e8400-e29b-41d4-a716-446655440008', 'sms', 'outbound', 'delivered', '+18444073511', '+15559876543', 'SM123456792', NULL, 'Absolutely! I''ll email the proposal within the hour. Let me know if you have any questions.', '550e8400-e29b-41d4-a716-446655440002', NOW() - INTERVAL '1 hour 45 minutes'),
  ('660e8400-e29b-41d4-a716-446655440009', 'sms', 'inbound', 'received', '+15555551234', '+18444073511', 'SM123456793', NULL, 'Sorry I missed your call. When would be a good time to connect?', '550e8400-e29b-41d4-a716-446655440003', NOW() - INTERVAL '5 hours'),
  ('660e8400-e29b-41d4-a716-446655440010', 'sms', 'outbound', 'delivered', '+18444073511', '+15555551234', 'SM123456794', NULL, 'No problem! How about tomorrow at 2 PM? I''ll call you then.', '550e8400-e29b-41d4-a716-446655440003', NOW() - INTERVAL '4 hours 30 minutes'),
  
  -- Older interactions for history
  ('660e8400-e29b-41d4-a716-446655440011', 'call', 'outbound', 'completed', '+18444073511', '+15553334444', 'CA123456793', 300, NULL, '550e8400-e29b-41d4-a716-446655440005', NOW() - INTERVAL '2 days'),
  ('660e8400-e29b-41d4-a716-446655440012', 'sms', 'inbound', 'received', '+15552223333', '+18444073511', 'SM123456795', NULL, 'Looking forward to the demo next week!', '550e8400-e29b-41d4-a716-446655440006', NOW() - INTERVAL '3 days'),
  ('660e8400-e29b-41d4-a716-446655440013', 'call', 'inbound', 'completed', '+15551112222', '+18444073511', 'CA123456794', 420, NULL, '550e8400-e29b-41d4-a716-446655440007', NOW() - INTERVAL '5 days'),
  ('660e8400-e29b-41d4-a716-446655440014', 'sms', 'outbound', 'delivered', '+18444073511', '+15556667777', 'SM123456796', NULL, 'Great news! Your compliance questions have been resolved. Ready to move forward?', '550e8400-e29b-41d4-a716-446655440008', NOW() - INTERVAL '7 days');

-- Insert sample leads
INSERT INTO leads (id, contact_id, title, description, type, status, priority, scheduled_at, tags, created_at) VALUES
  ('770e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'Tech Solutions Premium Package', 'John is interested in our premium package with advanced features', 'lead', 'contacted', 'high', NOW() + INTERVAL '1 day', ARRAY['premium', 'tech'], NOW() - INTERVAL '2 days'),
  ('770e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440002', 'Marketing Pro Proposal Follow-up', 'Need to follow up on the marketing automation proposal', 'task', 'new', 'medium', NOW() + INTERVAL '2 days', ARRAY['proposal', 'follow-up'], NOW() - INTERVAL '1 day'),
  ('770e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440003', 'StartupXYZ Contract Signing', 'Hot lead ready to sign - schedule contract review', 'appointment', 'qualified', 'urgent', NOW() + INTERVAL '3 hours', ARRAY['contract', 'hot-lead'], NOW() - INTERVAL '6 hours'),
  ('770e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440004', 'Global Corp Renewal Discussion', 'Annual renewal coming up - schedule discussion', 'appointment', 'new', 'high', NOW() + INTERVAL '1 week', ARRAY['renewal', 'existing-client'], NOW() - INTERVAL '3 days'),
  ('770e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440005', 'Wilson & Associates Referral', 'New referral from John Smith - initial contact made', 'lead', 'contacted', 'medium', NULL, ARRAY['referral', 'legal'], NOW() - INTERVAL '1 day'),
  ('770e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440006', 'HealthTech Demo Preparation', 'Prepare demo materials for healthcare solution', 'task', 'new', 'medium', NOW() + INTERVAL '5 days', ARRAY['demo', 'healthcare'], NOW() - INTERVAL '2 days'),
  ('770e8400-e29b-41d4-a716-446655440007', '550e8400-e29b-41d4-a716-446655440007', 'Retail Giants Price Negotiation', 'Continue price negotiation for enterprise package', 'lead', 'qualified', 'high', NOW() + INTERVAL '2 days', ARRAY['negotiation', 'enterprise'], NOW() - INTERVAL '4 days'),
  ('770e8400-e29b-41d4-a716-446655440008', '550e8400-e29b-41d4-a716-446655440008', 'Finance First Implementation', 'Plan implementation timeline for Finance First', 'task', 'new', 'medium', NOW() + INTERVAL '1 week', ARRAY['implementation', 'finance'], NOW() - INTERVAL '5 days');

-- Insert sample follow-ups
INSERT INTO follow_ups (id, interaction_id, contact_id, type, status, scheduled_at, message, notes, created_at) VALUES
  ('880e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'manual_call', 'pending', NOW() + INTERVAL '1 day', NULL, 'Follow up on premium package interest', NOW() - INTERVAL '2 hours'),
  ('880e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440003', 'manual_call', 'pending', NOW() + INTERVAL '18 hours', NULL, 'Scheduled call for tomorrow at 2 PM', NOW() - INTERVAL '4 hours'),
  ('880e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440007', '550e8400-e29b-41d4-a716-446655440002', 'auto_sms', 'completed', NOW() - INTERVAL '1 hour', 'Proposal sent as requested. Let me know if you need any clarifications!', 'Auto-follow up after proposal request', NOW() - INTERVAL '2 hours'),
  ('880e8400-e29b-41d4-a716-446655440004', '660e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440005', 'reminder', 'pending', NOW() + INTERVAL '3 days', NULL, 'Remind about referral discussion', NOW() - INTERVAL '2 days'),
  ('880e8400-e29b-41d4-a716-446655440005', '660e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440006', 'appointment', 'pending', NOW() + INTERVAL '4 days', NULL, 'Demo appointment scheduled', NOW() - INTERVAL '3 days');

-- Insert sample chat messages for sync chat
INSERT INTO chat_messages (id, session_id, sender_identity, message, created_at) VALUES
  ('990e8400-e29b-41d4-a716-446655440001', 'demo-session-1', 'Agent Mike', 'Welcome to Callaback! How can I help you today?', NOW() - INTERVAL '10 minutes'),
  ('990e8400-e29b-41d4-a716-446655440002', 'demo-session-1', 'Visitor', 'Hi! I''m interested in learning more about your call management features.', NOW() - INTERVAL '9 minutes'),
  ('990e8400-e29b-41d4-a716-446655440003', 'demo-session-1', 'Agent Mike', 'Great! Our platform offers comprehensive call tracking, SMS integration, and lead management. Would you like me to show you a quick demo?', NOW() - INTERVAL '8 minutes'),
  ('990e8400-e29b-41d4-a716-446655440004', 'demo-session-1', 'Visitor', 'That sounds perfect! Yes, I''d love to see a demo.', NOW() - INTERVAL '7 minutes'),
  ('990e8400-e29b-41d4-a716-446655440005', 'demo-session-1', 'Agent Mike', 'Excellent! Let me walk you through our dashboard features...', NOW() - INTERVAL '6 minutes'),
  
  ('990e8400-e29b-41d4-a716-446655440006', 'support-session-2', 'Support Team', 'Hello! I see you''re having trouble with call forwarding. Let me help you with that.', NOW() - INTERVAL '15 minutes'),
  ('990e8400-e29b-41d4-a716-446655440007', 'support-session-2', 'User John', 'Yes, calls aren''t forwarding to my mobile number correctly.', NOW() - INTERVAL '14 minutes'),
  ('990e8400-e29b-41d4-a716-446655440008', 'support-session-2', 'Support Team', 'I can see the issue. Let me update your forwarding settings right now.', NOW() - INTERVAL '13 minutes'),
  ('990e8400-e29b-41d4-a716-446655440009', 'support-session-2', 'Support Team', 'All set! Your calls should now forward properly. Can you test it for me?', NOW() - INTERVAL '10 minutes'),
  ('990e8400-e29b-41d4-a716-446655440010', 'support-session-2', 'User John', 'Perfect! It''s working now. Thank you so much!', NOW() - INTERVAL '9 minutes');

-- Update sequences to avoid conflicts with inserted UUIDs
-- Note: PostgreSQL doesn't use sequences for UUIDs, so this is just for reference
-- If you were using serial IDs, you'd need to update sequences here

-- Verify the data was inserted
SELECT 'Contacts inserted: ' || COUNT(*) FROM contacts;
SELECT 'Interactions inserted: ' || COUNT(*) FROM interactions;
SELECT 'Leads inserted: ' || COUNT(*) FROM leads;
SELECT 'Follow-ups inserted: ' || COUNT(*) FROM follow_ups;
SELECT 'Chat messages inserted: ' || COUNT(*) FROM chat_messages;
