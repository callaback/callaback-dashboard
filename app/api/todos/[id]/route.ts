import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables')
}

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!supabase) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 })
    }

    const { data, error } = await supabase
      .from('todos')
      .update({ completed: true })
      .eq('id', params.id)
      .select()

    if (error) throw error

    return NextResponse.json(data[0])
  } catch (error) {
    console.error('Error updating todo:', error)
    return NextResponse.json({ error: 'Failed to update todo' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!supabase) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 })
    }

    const { error } = await supabase
      .from('todos')
      .delete()
      .eq('id', params.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting todo:', error)
    return NextResponse.json({ error: 'Failed to delete todo' }, { status: 500 })
  }
}
