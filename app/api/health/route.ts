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
