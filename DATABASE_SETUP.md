# Database Setup Guide

This guide will help you set up the Callaback Dashboard database with sample data.

## Quick Setup

### Option 1: Automated Setup (Recommended)
```bash
npm run setup-db
```

### Option 2: Manual Setup via Supabase Dashboard

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **SQL Editor**
4. Execute the following SQL files in order:

#### Step 1: Create Tables
Copy and paste the contents of `scripts/001-create-twilio-tables.sql` and execute it.

#### Step 2: Add Sample Data
Copy and paste the contents of `scripts/seed-data.sql` and execute it.

## What Gets Created

### Tables
- **contacts** - Customer contact information
- **interactions** - Call and SMS logs
- **leads** - Sales leads and opportunities
- **follow_ups** - Scheduled follow-up tasks
- **chat_messages** - Live chat messages

### Sample Data
- 10 sample contacts with realistic information
- 14 sample interactions (calls and SMS)
- 8 sample leads with different statuses
- 5 sample follow-ups
- 10 sample chat messages

## Verification

After setup, your dashboard should show:
- Recent calls and SMS messages
- Active leads and follow-ups
- Contact information
- Live chat functionality

## Environment Variables

Make sure your `.env` file contains:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SECRET_KEY=your_secret_key (optional, for automated setup)
```

## Troubleshooting

### Common Issues

1. **Permission Errors**: Make sure your Supabase project has RLS policies set up correctly
2. **Connection Issues**: Verify your environment variables are correct
3. **Data Not Showing**: Check that the tables were created successfully in the Supabase dashboard

### Manual Verification

You can verify the setup by running these queries in the Supabase SQL Editor:

```sql
-- Check if tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('contacts', 'interactions', 'leads', 'follow_ups', 'chat_messages');

-- Check data counts
SELECT 'contacts' as table_name, COUNT(*) as count FROM contacts
UNION ALL
SELECT 'interactions', COUNT(*) FROM interactions
UNION ALL
SELECT 'leads', COUNT(*) FROM leads
UNION ALL
SELECT 'follow_ups', COUNT(*) FROM follow_ups
UNION ALL
SELECT 'chat_messages', COUNT(*) FROM chat_messages;
```

## Next Steps

After database setup:
1. Run `npm run dev` to start the development server
2. Visit `http://localhost:3000` to see your dashboard
3. Explore the sample data and functionality
4. Customize the data as needed for your use case

## Support

If you encounter issues:
1. Check the Supabase dashboard for error messages
2. Verify your environment variables
3. Ensure your Supabase project is active and accessible
