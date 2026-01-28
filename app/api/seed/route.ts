import { NextRequest, NextResponse } from 'next/server'
import { seedDatabase } from '@/lib/seed-data'

export async function POST() {
  try {
    const result = await seedDatabase()
    
    if (result.contactsError || result.interactionsError || result.leadsError) {
      return NextResponse.json({ 
        error: 'Failed to seed database', 
        details: result 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Database seeded successfully' 
    })
  } catch (error) {
    return NextResponse.json({ 
      error: 'Database seeding failed', 
      details: error 
    }, { status: 500 })
  }
}
