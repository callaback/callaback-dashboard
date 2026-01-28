// app/api/debug/setup-client/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  
  try {
    const body = await request.json()
    
    // Check if client already exists
    const { data: existing } = await supabase
      .from('clients')
      .select('id')
      .eq('twilio_number', body.twilio_number)
      .single()

    if (existing) {
      return NextResponse.json({
        success: false,
        message: 'Client already exists',
        client_id: existing.id
      })
    }

    // Create test client
    const { data: client, error } = await supabase
      .from('clients')
      .insert({
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
      client,
      message: 'Test client created successfully'
    })

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
