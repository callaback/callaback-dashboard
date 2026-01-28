#!/bin/bash
# create-callaback-endpoints.sh
# Creates ALL API endpoints for Callaback business

set -e  # Exit on error

echo "📱 Creating Callaback API Endpoints..."
echo "======================================="

# Create API directory structure
mkdir -p app/api/{twilio,debug,health}

# ============ 1. HEALTH CHECK ============
echo -e "\n1. Creating /api/health endpoint..."
cat > app/api/health/route.ts << 'EOF'
import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'Callaback API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    endpoints: [
      '/api/twilio/incoming-call',
      '/api/twilio/call-completed',
      '/api/twilio/incoming-sms',
      '/api/twilio/sms-status',
      '/api/twilio/voicemail-completed'
    ]
  })
}
EOF

# ============ 2. TEST ENDPOINT ============
echo -e "\n2. Creating /api/test endpoint..."
cat > app/api/test/route.ts << 'EOF'
import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    envVars: {
      twilioSid: !!process.env.TWILIO_ACCOUNT_SID,
      twilioToken: !!process.env.TWILIO_AUTH_TOKEN,
      supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    },
    message: 'Callaback API is ready',
    endpoints: [
      '/api/twilio/incoming-call',
      '/api/twilio/call-completed',
      '/api/twilio/incoming-sms',
      '/api/twilio/sms-status',
      '/api/twilio/voicemail-completed'
    ]
  })
}
EOF

# ============ 3. TWILIO ENDPOINTS ============

# ----- incoming-call -----
echo -e "\n3. Creating /api/twilio/incoming-call..."
mkdir -p app/api/twilio/incoming-call
cat > app/api/twilio/incoming-call/route.ts << 'EOF'
import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

function generateTwiML(twiml: string) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  ${twiml}
</Response>`
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  
  console.log("📞 Incoming call received")
  
  try {
    const formData = await request.formData()
    const callSid = formData.get("CallSid") as string
    const from = formData.get("From") as string
    const to = formData.get("To") as string

    console.log("Call details:", { callSid, from, to })

    if (!callSid || !from || !to) {
      return new NextResponse(generateTwiML(`<Say>Thank you for calling. Please hold.</Say>`), {
        status: 400,
        headers: { "Content-Type": "application/xml" },
      })
    }

    // Normalize phone number
    const normalizePhoneNumber = (phone: string) => {
      const digits = phone.replace(/\D/g, "")
      if (digits.length === 10) return `+1${digits}`
      if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`
      return phone.startsWith("+") ? phone : `+${digits}`
    }

    const calledNumber = normalizePhoneNumber(to)

    // Find client for this number
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id, name, business_phone, after_hours_message")
      .eq("twilio_number", calledNumber)
      .single()

    console.log("Client lookup:", { client: !!client, error: clientError?.message })

    if (!client || !client.business_phone) {
      console.log("No client configured for:", calledNumber)
      return new NextResponse(generateTwiML(`
        <Say>Thank you for calling. This number is not currently available.</Say>
        <Hangup/>
      `), {
        headers: { "Content-Type": "application/xml" },
      })
    }

    const businessName = client.name

    // Log the call attempt
    const { data: interaction } = await supabase
      .from("interactions")
      .insert({
        type: "call",
        direction: "inbound",
        from_number: from,
        to_number: to,
        status: "ringing",
        twilio_sid: callSid,
        client_id: client.id,
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    console.log("Interaction logged:", interaction?.id)

    // Forward call to business phone
    const twiml = `
<Say>Thank you for calling ${businessName}. Connecting you now.</Say>
<Dial timeout="20" action="/api/twilio/call-completed?interaction_id=${interaction?.id}">
  <Number>${client.business_phone}</Number>
</Dial>
`

    return new NextResponse(generateTwiML(twiml), {
      headers: { "Content-Type": "application/xml" },
    })

  } catch (error: any) {
    console.error("❌ Error in incoming call:", error)
    return new NextResponse(generateTwiML(`
      <Say>We're having technical difficulties. Please try again later.</Say>
      <Hangup/>
    `), {
      status: 500,
      headers: { "Content-Type": "application/xml" },
    })
  }
}
EOF

# ----- call-completed -----
echo -e "\n4. Creating /api/twilio/call-completed..."
mkdir -p app/api/twilio/call-completed
cat > app/api/twilio/call-completed/route.ts << 'EOF'
import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import Twilio from "twilio"

const twilioClient = Twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
)

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  
  console.log("📞 Call completed webhook received")
  
  try {
    const formData = await request.formData()
    const callSid = formData.get("CallSid") as string
    const dialCallStatus = formData.get("DialCallStatus") as string
    const from = formData.get("From") as string
    const to = formData.get("To") as string
    const callDuration = formData.get("CallDuration") as string
    const interactionId = request.nextUrl.searchParams.get("interaction_id")

    console.log("Call completed details:", { 
      callSid: callSid?.slice(0, 20), 
      dialCallStatus,
      interactionId 
    })

    // Find interaction
    let interaction
    if (interactionId) {
      const { data } = await supabase
        .from("interactions")
        .select("*")
        .eq("id", interactionId)
        .single()
      interaction = data
    }

    if (!interaction) {
      console.error("No interaction found")
      return NextResponse.json({ 
        success: false, 
        error: "Interaction not found" 
      })
    }

    // Determine if call was answered
    const answered = dialCallStatus === "completed" || dialCallStatus === "answered"
    const callLength = parseInt(callDuration || "0")
    const isMissedCall = !answered || callLength < 10

    console.log("Call analysis:", { 
      answered, 
      callLength, 
      isMissedCall,
      dialCallStatus 
    })

    // Update interaction
    const finalStatus = answered ? "completed" : "no-answer"
    
    const { data: updatedInteraction } = await supabase
      .from("interactions")
      .update({
        status: finalStatus,
        duration_seconds: callLength,
        dial_call_status: dialCallStatus,
        answered: answered,
        is_missed_call: isMissedCall,
        updated_at: new Date().toISOString(),
      })
      .eq("id", interaction.id)
      .select()
      .single()

    console.log("Interaction updated:", updatedInteraction?.id)

    // Handle missed call
    if (isMissedCall) {
      console.log("🚨 Missed call detected - sending SMS")
      
      // Get client
      const { data: client } = await supabase
        .from("clients")
        .select("id, name, settings")
        .eq("id", interaction.client_id)
        .single()

      if (client) {
        const settings = client.settings || {}
        const smsTemplate = settings.sms_template || 
          `Hi, this is ${client.name}. We missed your call! Please reply with your issue.`
        
        // Send SMS
        try {
          const message = await twilioClient.messages.create({
            body: smsTemplate.replace(/{business_name}/g, client.name),
            from: to,
            to: from,
            statusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/sms-status`,
          })

          console.log("📱 SMS sent:", message.sid)

          // Log SMS interaction
          await supabase
            .from("interactions")
            .insert({
              type: "sms",
              direction: "outbound",
              from_number: to,
              to_number: from,
              status: "queued",
              twilio_sid: message.sid,
              client_id: client.id,
              content: smsTemplate,
              is_auto_response: true,
              parent_interaction_id: interaction.id,
              created_at: new Date().toISOString()
            })

        } catch (smsError: any) {
          console.error("Failed to send SMS:", smsError)
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      missed: isMissedCall,
      answered: answered 
    })

  } catch (error: any) {
    console.error("❌ Error in call-completed:", error)
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 })
  }
}
EOF

# ----- incoming-sms -----
echo -e "\n5. Creating /api/twilio/incoming-sms..."
mkdir -p app/api/twilio/incoming-sms
cat > app/api/twilio/incoming-sms/route.ts << 'EOF'
import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import Twilio from "twilio"

const twilioClient = Twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
)

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  
  console.log("📱 Incoming SMS received")
  
  try {
    const formData = await request.formData()
    const messageSid = formData.get("MessageSid") as string
    const from = formData.get("From") as string
    const to = formData.get("To") as string
    const body = formData.get("Body") as string

    console.log("SMS details:", { 
      from, 
      to, 
      body: body?.substring(0, 50),
      messageSid: messageSid?.slice(0, 20)
    })

    // Find client
    const { data: client } = await supabase
      .from("clients")
      .select("id, name, settings, business_phone")
      .eq("twilio_number", to)
      .single()

    if (!client) {
      console.error("No client found for number:", to)
      return new NextResponse('<Response/>', { status: 200 })
    }

    console.log("Client found:", client.name)

    // Handle REVIEW command
    if (body?.toUpperCase().startsWith('REVIEW')) {
      console.log("Processing REVIEW command")
      
      const parts = body.split(/\s+/)
      if (parts.length >= 2) {
        const customerPhone = parts[1].replace(/\D/g, '')
        const normalizedPhone = customerPhone.length === 10 ? `+1${customerPhone}` : `+${customerPhone}`
        
        const settings = client.settings || {}
        const reviewLink = settings.review_link
        
        if (reviewLink) {
          const reviewMessage = settings.review_template || 
            `Thanks for choosing ${client.name}! Please leave a review: ${reviewLink}`
          
          try {
            await twilioClient.messages.create({
              body: reviewMessage,
              from: to,
              to: normalizedPhone,
              statusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/sms-status`,
            })
            
            console.log("Review request sent to:", normalizedPhone)
          } catch (error) {
            console.error("Failed to send review:", error)
          }
        }
      }
    }

    // Handle customer SMS
    console.log("Processing customer SMS")
    
    // Log the SMS
    await supabase
      .from("interactions")
      .insert({
        type: "sms",
        direction: "inbound",
        from_number: from,
        to_number: to,
        status: "received",
        twilio_sid: messageSid,
        client_id: client.id,
        content: body,
        created_at: new Date().toISOString()
      })

    // Send auto-reply
    const autoReply = `Thanks for your message! Someone from ${client.name} will get back to you shortly.`
    
    const replyMessage = await twilioClient.messages.create({
      body: autoReply,
      from: to,
      to: from,
      statusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/sms-status`,
    })

    console.log("Auto-reply sent:", replyMessage.sid)

    // Log the reply
    await supabase
      .from("interactions")
      .insert({
        type: "sms",
        direction: "outbound",
        from_number: to,
        to_number: from,
        status: "queued",
        twilio_sid: replyMessage.sid,
        client_id: client.id,
        content: autoReply,
        is_auto_response: true,
        created_at: new Date().toISOString()
      })

    return new NextResponse('<Response/>', {
      status: 200,
      headers: { 'Content-Type': 'application/xml' },
    })

  } catch (error: any) {
    console.error("❌ Error in incoming-sms:", error)
    return new NextResponse('<Response/>', { status: 200 })
  }
}
EOF

# ----- sms-status -----
echo -e "\n6. Creating /api/twilio/sms-status..."
mkdir -p app/api/twilio/sms-status
cat > app/api/twilio/sms-status/route.ts << 'EOF'
import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  
  try {
    const formData = await request.formData()
    const messageSid = formData.get("MessageSid") as string
    const messageStatus = formData.get("MessageStatus") as string

    console.log("SMS status update:", { 
      messageSid: messageSid?.slice(0, 20), 
      messageStatus 
    })

    if (messageSid) {
      await supabase
        .from("interactions")
        .update({
          status: messageStatus,
          updated_at: new Date().toISOString()
        })
        .eq("twilio_sid", messageSid)
    }

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error("Error updating SMS status:", error)
    return NextResponse.json({ success: false })
  }
}
EOF

# ----- voicemail-completed -----
echo -e "\n7. Creating /api/twilio/voicemail-completed..."
mkdir -p app/api/twilio/voicemail-completed
cat > app/api/twilio/voicemail-completed/route.ts << 'EOF'
import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  
  console.log("🎙️ Voicemail completed")
  
  try {
    const formData = await request.formData()
    const recordingUrl = formData.get("RecordingUrl") as string
    const recordingDuration = formData.get("RecordingDuration") as string
    const callSid = formData.get("CallSid") as string
    const from = formData.get("From") as string
    const to = formData.get("To") as string
    const interactionId = request.nextUrl.searchParams.get("interaction_id")

    console.log("Voicemail details:", { 
      callSid: callSid?.slice(0, 20),
      from,
      duration: recordingDuration 
    })

    if (interactionId) {
      // Update interaction with voicemail info
      await supabase
        .from("interactions")
        .update({
          type: "voicemail",
          status: "completed",
          recording_url: recordingUrl,
          duration_seconds: parseInt(recordingDuration || "0"),
          is_missed_call: true,
          updated_at: new Date().toISOString()
        })
        .eq("id", interactionId)

      console.log("Voicemail logged for interaction:", interactionId)
    }

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error("❌ Error handling voicemail:", error)
    return NextResponse.json({ success: false })
  }
}
EOF

# ============ 4. DEBUG ENDPOINTS ============

# ----- debug/check-db -----
echo -e "\n8. Creating debug endpoints..."
mkdir -p app/api/debug
cat > app/api/debug/check-db/route.ts << 'EOF'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  
  try {
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('id, name, twilio_number, business_phone, created_at')
      .order('created_at', { ascending: false })
      .limit(10)

    const { data: interactions } = await supabase
      .from('interactions')
      .select('id, type, status, created_at')
      .order('created_at', { ascending: false })
      .limit(5)

    return NextResponse.json({
      success: true,
      database: {
        clients: clientsError ? `Error: ${clientsError.message}` : (clients || []),
        recentInteractions: interactions || [],
        clientCount: clients?.length || 0,
        interactionCount: interactions?.length || 0
      }
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    })
  }
}
EOF

# ----- debug/simple-check -----
cat > app/api/debug/simple-check/route.ts << 'EOF'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  
  try {
    const { count, error } = await supabase
      .from('clients')
      .select('*', { count: 'exact', head: true })

    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message,
        suggestion: 'Run the SQL schema in Supabase'
      })
    }

    const { data: testClient } = await supabase
      .from('clients')
      .select('id, name, twilio_number')
      .eq('twilio_number', '+18444073511')
      .single()

    return NextResponse.json({
      success: true,
      clientCount: count || 0,
      testClient: testClient || 'NOT FOUND',
      message: testClient ? '✅ Client found!' : '❌ Client not found'
    })

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    })
  }
}
EOF

# ----- debug/setup-client -----
cat > app/api/debug/setup-client/route.ts << 'EOF'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  
  try {
    const body = await request.json()
    
    const { data: client, error } = await supabase
      .from('clients')
      .upsert({
        name: body.name || 'Test HVAC Company',
        business_phone: body.business_phone || '+17195551234',
        twilio_number: body.twilio_number || '+18444073511',
        email: body.email || 'test@callaback.com',
        settings: {
          sms_template: "Hi, this is {business_name}. We saw you tried to call us about your HVAC needs. Our techs are currently on other jobs, but please reply with your issue and we'll get a technician scheduled ASAP!",
          follow_up_template: "Hi, this is {business_name} following up on your HVAC inquiry from yesterday. Did you still need assistance with your heating/cooling system?",
          follow_up_delay_minutes: 120,
          review_link: "https://g.page/r/CxYZabc123/review",
          industry: "HVAC"
        }
      }, {
        onConflict: 'twilio_number'
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message,
        hint: 'Make sure database tables exist'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      client,
      message: 'Client setup successfully'
    })

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
EOF

# ----- debug/create-interaction -----
cat > app/api/debug/create-interaction/route.ts << 'EOF'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  
  try {
    const body = await request.json()
    
    const { data: client } = await supabase
      .from('clients')
      .select('id')
      .eq('twilio_number', body.to_number)
      .single()

    if (!client) {
      return NextResponse.json({
        success: false,
        message: 'No client found'
      }, { status: 400 })
    }

    const { data: interaction, error } = await supabase
      .from('interactions')
      .insert({
        type: 'call',
        direction: 'inbound',
        from_number: body.from_number,
        to_number: body.to_number,
        status: 'ringing',
        twilio_sid: body.call_sid,
        client_id: client.id,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      interaction,
      message: 'Interaction created for testing'
    })

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
EOF

# ============ 5. CREATE TEST SCRIPT ============
echo -e "\n9. Creating test script..."
cat > test-callaback.sh << 'EOF'
#!/bin/bash
# test-callaback.sh

DOMAIN="${1:-https://callaback.com}"
echo "Testing Callaback API at: $DOMAIN"
echo "===================================="

# Generate random numbers
RAND1=$((1000 + RANDOM % 9000))
RAND2=$((1000 + RANDOM % 9000))
TIMESTAMP=$(date +%s)

# 1. Health check
echo -e "\n1. Health check:"
curl -s "$DOMAIN/api/health" | grep -o '"status":"[^"]*"'

# 2. Setup client if needed
echo -e "\n2. Setting up test client:"
SETUP=$(curl -s -X POST "$DOMAIN/api/debug/setup-client" \
  -H "Content-Type: application/json" \
  -d '{"twilio_number":"+18444073511","name":"Test HVAC"}')
echo "$SETUP" | grep -o '"message":"[^"]*"'

# 3. Test incoming call
echo -e "\n3. Testing incoming call:"
curl -s -X POST "$DOMAIN/api/twilio/incoming-call" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "CallSid=CA_test_$TIMESTAMP" \
  -d "From=+1719555$RAND1" \
  -d "To=+18444073511" \
  | grep -o '<Say>[^<]*' | head -2

# 4. Test SMS
echo -e "\n4. Testing incoming SMS:"
curl -s -X POST "$DOMAIN/api/twilio/incoming-sms" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "MessageSid=SM_test_$TIMESTAMP" \
  -d "From=+1719555$RAND2" \
  -d "To=+18444073511" \
  -d "Body=Test message"

echo -e "\n✅ Test completed!"

echo -e "\nTo manually test:"
echo "1. Call +18444073511 (should forward)"
echo "2. Text STATUS to +18444073511"
echo "3. Text REVIEW 7195551234 to +18444073511"
EOF

chmod +x test-callaback.sh

# ============ 6. CREATE ENV TEMPLATE ============
echo -e "\n10. Creating .env.local template..."
cat > .env.local.example << 'EOF'
# Twilio
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# App
NEXT_PUBLIC_APP_URL=https://callaback.com
NODE_ENV=production

# Optional: For local testing
# NEXT_PUBLIC_APP_URL=http://localhost:3000
# NODE_ENV=development
EOF

# ============ 7. CREATE PACKAGE.JSON DEPENDENCIES ============
echo -e "\n11. Checking dependencies..."
if [ ! -f package.json ]; then
  echo "⚠️  No package.json found. Make sure to install:"
  echo "   npm install twilio @supabase/supabase-js"
else
  echo "✅ package.json exists"
fi

# ============ 8. SUMMARY ============
echo -e "\n======================================="
echo "✅ CALLABACK API CREATION COMPLETE"
echo "======================================="
echo ""
echo "📁 Created endpoints:"
echo "  • /api/health"
echo "  • /api/test"
echo "  • /api/twilio/incoming-call"
echo "  • /api/twilio/call-completed"
echo "  • /api/twilio/incoming-sms"
echo "  • /api/twilio/sms-status"
echo "  • /api/twilio/voicemail-completed"
echo "  • /api/debug/check-db"
echo "  • /api/debug/simple-check"
echo "  • /api/debug/setup-client"
echo "  • /api/debug/create-interaction"
echo ""
echo "🛠️  Next steps:"
echo "  1. Copy .env.local.example to .env.local"
echo "  2. Fill in your Twilio & Supabase credentials"
echo "  3. Run the SQL schema in Supabase"
echo "  4. Run: chmod +x test-callaback.sh"
echo "  5. Test: ./test-callaback.sh"
echo ""
echo "📞 Test with:"
echo "  • Call: +18444073511"
echo "  • Text: STATUS to +18444073511"
echo "  • Text: REVIEW 7195551234 to +18444073511"
echo ""
echo "🚀 Your Callaback API is ready!"
