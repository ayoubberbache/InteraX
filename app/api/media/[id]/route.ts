import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/backend/lib/db'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    if (!id) return new NextResponse('Not found', { status: 404 })

    const rows = await query('SELECT url, mime_type FROM uploads WHERE id = $1', [id])
    if (!rows || rows.length === 0) {
      return new NextResponse('Not found', { status: 404 })
    }

    const { url, mime_type } = rows[0]
    if (!url) return new NextResponse('No media data', { status: 404 })

    // Decode base64 stored in url column
    const base64Data = url.split(';base64,').pop() || url
    const buffer = Buffer.from(base64Data, 'base64')

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': mime_type || 'application/octet-stream',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (err: any) {
    console.error('[Media API] Error:', err.message)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
