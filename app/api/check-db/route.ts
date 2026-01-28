import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  
  try {
    const body = await request.json()
    
    const { data: client } = await supabase
      .from('clients')
      .select('id')
      .eq('twilio_number', body.to_number)
      .single()

    if (!client) {
      return NextResponse.json({
        success: false,
        message: 'No client found'
      }, { status: 400 })
    }

    const { data: interaction, error } = await supabase
      .from('interactions')
      .insert({
        type: 'call',
        direction: 'inbound',
        from_number: body.from_number,
        to_number: body.to_number,
        status: 'ringing',
        twilio_sid: body.call_sid,
        client_id: client.id,
        created_at: new Date().toISOString()
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
      interaction,
      message: 'Interaction created for testing'
    })

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
