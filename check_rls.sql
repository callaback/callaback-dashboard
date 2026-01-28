-- Check if RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'callback_bookings';

-- Check policies
SELECT * FROM pg_policies WHERE tablename = 'callback_bookings';
