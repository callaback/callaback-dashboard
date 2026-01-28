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
