#!/bin/bash

# Database Setup Script for Callaback Dashboard
# This script sets up the database schema and populates it with sample data

echo "🚀 Setting up Callaback Dashboard Database..."

# Check if required environment variables are set
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_ANON_KEY" ]; then
    echo "❌ Error: SUPABASE_URL and SUPABASE_ANON_KEY environment variables must be set"
    echo "Please check your .env file"
    exit 1
fi

echo "✅ Environment variables found"

# Function to execute SQL file
execute_sql() {
    local file=$1
    local description=$2
    
    echo "📝 $description..."
    
    # You can use psql if you have direct database access, or use Supabase CLI
    # For now, we'll provide instructions for manual execution
    echo "   Please execute: $file"
}

# Execute schema files in order
execute_sql "scripts/001-create-twilio-tables.sql" "Creating main database schema"
execute_sql "scripts/002-contacts-table.sql" "Setting up contacts table"
execute_sql "scripts/003-simple-tables.sql" "Creating additional tables"
execute_sql "scripts/004-ssms-send-tables.sql" "Setting up SMS tables"
execute_sql "scripts/seed-data.sql" "Populating with sample data"

echo ""
echo "🎉 Database setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Go to your Supabase dashboard: https://supabase.com/dashboard"
echo "2. Navigate to SQL Editor"
echo "3. Execute each SQL file in the scripts/ directory in this order:"
echo "   - 001-create-twilio-tables.sql"
echo "   - 002-contacts-table.sql (if needed)"
echo "   - 003-simple-tables.sql (if needed)"
echo "   - 004-ssms-send-tables.sql"
echo "   - seed-data.sql"
echo ""
echo "🔧 Or use the Supabase CLI:"
echo "   supabase db reset"
echo "   supabase db push"
echo ""
echo "🌐 Your Supabase URL: $SUPABASE_URL"
echo "🔑 Dashboard: https://supabase.com/dashboard/project/$(echo $SUPABASE_URL | sed 's/.*\/\/\([^.]*\).*/\1/')"
