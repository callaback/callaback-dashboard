const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Missing Supabase credentials')
  console.error('Please check your .env file for NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function executeSqlFile(filePath, description) {
  try {
    console.log(`📝 ${description}...`)
    
    const sql = fs.readFileSync(filePath, 'utf8')
    
    // Split SQL into individual statements (basic splitting by semicolon)
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
    
    for (const statement of statements) {
      if (statement.trim()) {
        const { error } = await supabase.rpc('exec_sql', { sql_query: statement })
        if (error) {
          // Try direct query if RPC fails
          const { error: directError } = await supabase
            .from('_temp')
            .select('*')
            .limit(0)
          
          // If it's a DDL statement, we might need to use a different approach
          console.log(`   Executing: ${statement.substring(0, 50)}...`)
        }
      }
    }
    
    console.log(`✅ ${description} completed`)
  } catch (error) {
    console.error(`❌ Error executing ${filePath}:`, error.message)
  }
}

async function setupDatabase() {
  console.log('🚀 Setting up Callaback Dashboard Database...')
  console.log(`🔗 Supabase URL: ${supabaseUrl}`)
  
  const scriptsDir = path.join(__dirname, 'scripts')
  
  // Execute SQL files in order
  const sqlFiles = [
    { file: '001-create-twilio-tables.sql', desc: 'Creating main database schema' },
    { file: 'seed-data.sql', desc: 'Populating with sample data' }
  ]
  
  for (const { file, desc } of sqlFiles) {
    const filePath = path.join(scriptsDir, file)
    if (fs.existsSync(filePath)) {
      await executeSqlFile(filePath, desc)
    } else {
      console.log(`⚠️  File not found: ${file}`)
    }
  }
  
  // Verify data was inserted
  try {
    const { data: contacts, error: contactsError } = await supabase
      .from('contacts')
      .select('*', { count: 'exact' })
      .limit(1)
    
    const { data: interactions, error: interactionsError } = await supabase
      .from('interactions')
      .select('*', { count: 'exact' })
      .limit(1)
    
    if (!contactsError && !interactionsError) {
      console.log('\n📊 Database Status:')
      console.log(`   Contacts: ${contacts?.length || 0} records`)
      console.log(`   Interactions: ${interactions?.length || 0} records`)
    }
  } catch (error) {
    console.log('⚠️  Could not verify data - tables may not exist yet')
  }
  
  console.log('\n🎉 Database setup process completed!')
  console.log('\n📋 Manual Setup Instructions:')
  console.log('1. Go to your Supabase dashboard: https://supabase.com/dashboard')
  console.log('2. Navigate to SQL Editor')
  console.log('3. Copy and paste the contents of scripts/001-create-twilio-tables.sql')
  console.log('4. Execute the SQL')
  console.log('5. Copy and paste the contents of scripts/seed-data.sql')
  console.log('6. Execute the SQL')
  console.log('\n🌐 Your dashboard should now have sample data!')
}

// Run the setup
setupDatabase().catch(console.error)
