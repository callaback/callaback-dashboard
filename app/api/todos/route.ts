import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables')
}

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null

export async function GET() {
  try {
    if (!supabase) {
      return NextResponse.json([], { status: 500 })
    }

    const { data, error } = await supabase
      .from('todos')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Error fetching todos:', error)
    return NextResponse.json([], { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 })
    }

    const { text } = await request.json()

    if (!text?.trim()) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('todos')
      .insert([{ text: text.trim(), completed: false }])
      .select()

    if (error) throw error

    return NextResponse.json(data[0])
  } catch (error) {
    console.error('Error creating todo:', error)
    return NextResponse.json({ error: 'Failed to create todo' }, { status: 500 })
  }
}
