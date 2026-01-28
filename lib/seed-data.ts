import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

export async function seedDatabase() {
  // Insert contacts
  const { error: contactsError } = await supabase.from('contacts').upsert([
    { id: '550e8400-e29b-41d4-a716-446655440001', name: 'John Smith', phone: '+15551234567', email: 'john@email.com', company: 'Tech Solutions' },
    { id: '550e8400-e29b-41d4-a716-446655440002', name: 'Sarah Johnson', phone: '+15559876543', email: 'sarah@company.com', company: 'Marketing Pro' },
    { id: '550e8400-e29b-41d4-a716-446655440003', name: 'Mike Davis', phone: '+15555551234', email: 'mike@startup.io', company: 'StartupXYZ' }
  ])

  // Insert interactions
  const { error: interactionsError } = await supabase.from('interactions').upsert([
    { type: 'call', direction: 'inbound', status: 'completed', from_number: '+15551234567', to_number: '+18444073511', duration: 180, contact_id: '550e8400-e29b-41d4-a716-446655440001' },
    { type: 'sms', direction: 'inbound', status: 'received', from_number: '+15551234567', to_number: '+18444073511', body: 'Hi, interested in your services!', contact_id: '550e8400-e29b-41d4-a716-446655440001' },
    { type: 'call', direction: 'outbound', status: 'completed', from_number: '+18444073511', to_number: '+15559876543', duration: 240, contact_id: '550e8400-e29b-41d4-a716-446655440002' }
  ])

  // Insert leads
  const { error: leadsError } = await supabase.from('leads').upsert([
    { contact_id: '550e8400-e29b-41d4-a716-446655440001', title: 'Tech Solutions Premium Package', status: 'contacted', priority: 'high', type: 'lead' },
    { contact_id: '550e8400-e29b-41d4-a716-446655440002', title: 'Marketing Pro Follow-up', status: 'new', priority: 'medium', type: 'task' },
    { contact_id: '550e8400-e29b-41d4-a716-446655440003', title: 'StartupXYZ Contract', status: 'qualified', priority: 'urgent', type: 'appointment' }
  ])

  return { contactsError, interactionsError, leadsError }
}
