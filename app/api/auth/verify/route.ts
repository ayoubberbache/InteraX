import { NextResponse, NextRequest } from 'next/server'
import crypto from 'crypto'

export async function GET(req: NextRequest) {
  const userParam = req.nextUrl.searchParams.get('user')
  const sigParam = req.nextUrl.searchParams.get('sig')

  if (!userParam || !sigParam) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
  }

  const secretKey = process.env.APP_SECRET || process.env.FIREBASE_SERVICE_ACCOUNT?.slice(0, 32) || 'interax-secret'
  const expectedSig = crypto.createHmac('sha256', secretKey).update(encodeURIComponent(userParam)).digest('hex')

  if (sigParam !== expectedSig) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
  }

  try {
    const user = JSON.parse(decodeURIComponent(userParam))
    return NextResponse.json(user)
  } catch {
    return NextResponse.json({ error: 'Malformed user data' }, { status: 400 })
  }
}
