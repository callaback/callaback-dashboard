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
