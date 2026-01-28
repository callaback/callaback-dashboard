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
