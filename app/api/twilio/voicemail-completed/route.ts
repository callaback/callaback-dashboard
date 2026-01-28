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
