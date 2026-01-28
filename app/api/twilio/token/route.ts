import { NextRequest, NextResponse } from "next/server"
import Twilio from "twilio"

const AccessToken = Twilio.jwt.AccessToken
const SyncGrant = AccessToken.SyncGrant

export async function POST(request: NextRequest) {
  try {
    const { identity } = await request.json()
    
    if (!identity) {
      return NextResponse.json({ error: "Identity is required" }, { status: 400 })
    }

    const accountSid = process.env.ACCOUNT_SID
    const apiKey = process.env.API_KEY
    const apiSecret = process.env.API_SECRET
    const serviceSid = process.env.SYNC_SERVICE_SID

    if (!accountSid || !apiKey || !apiSecret || !serviceSid) {
      return NextResponse.json({ error: "Missing Twilio configuration" }, { status: 500 })
    }

    // Create access token
    const token = new AccessToken(accountSid, apiKey, apiSecret, { identity })

    // Create sync grant
    const syncGrant = new SyncGrant({
      serviceSid: serviceSid,
    })

    token.addGrant(syncGrant)

    return NextResponse.json({
      token: token.toJwt(),
      identity: identity
    })

  } catch (error: any) {
    console.error("Token generation error:", error)
    return NextResponse.json({ error: "Failed to generate token" }, { status: 500 })
  }
}
