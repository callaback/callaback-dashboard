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
