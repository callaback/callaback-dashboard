"use server";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const formData = await req.formData();

  const messageSid = formData.get("MessageSid") as string;
  const status = formData.get("SmsStatus") as string;
  const to = formData.get("To") as string;
  const from = formData.get("From") as string;

  await supabase.from("interactions").update({ status }).eq("twilio_sid", messageSid);

  return new NextResponse("OK");
}
