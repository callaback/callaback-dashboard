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
