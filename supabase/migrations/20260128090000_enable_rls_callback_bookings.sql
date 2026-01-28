-- Enable RLS on callback_bookings
ALTER TABLE callback_bookings ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read bookings
CREATE POLICY "Allow public read" ON callback_bookings
  FOR SELECT USING (true);

-- Allow anyone to insert bookings
CREATE POLICY "Allow public insert" ON callback_bookings
  FOR INSERT WITH CHECK (true);

-- Allow anyone to delete bookings
CREATE POLICY "Allow public delete" ON callback_bookings
  FOR DELETE USING (true);
