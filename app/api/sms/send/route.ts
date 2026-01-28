import { NextRequest, NextResponse } from "next/server"
import Twilio from "twilio"

export async function POST(request: NextRequest) {
  try {
    const { to, message, from } = await request.json()
    
    if (!to || !message) {
      return NextResponse.json({ error: "To and message are required" }, { status: 400 })
    }

    const accountSid = process.env.ACCOUNT_SID
    const authToken = process.env.AUTH_TOKEN

    if (!accountSid || !authToken) {
      return NextResponse.json({ error: "Missing Twilio configuration" }, { status: 500 })
    }

    const client = Twilio(accountSid, authToken)

    const sms = await client.messages.create({
      body: message,
      from: from || process.env.TWILIO_PHONE_NUMBER,
      to: to
    })

    return NextResponse.json({
      success: true,
      sid: sms.sid,
      status: sms.status
    })

  } catch (error: any) {
    console.error("SMS send error:", error)
    return NextResponse.json({ 
      error: "Failed to send SMS",
      details: error.message 
    }, { status: 500 })
  }
}
