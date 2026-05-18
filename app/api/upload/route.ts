import { NextResponse, NextRequest } from 'next/server'
import { supabase } from '@/backend/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    
    const file = formData.get('file') as File | null
    const mediaUrlParam = formData.get('mediaUrl') as string | null
    const uploaderId = formData.get('uploaderId') as string | null
    const contextType = formData.get('contextType') as string | null
    const contextId = formData.get('contextId') as string | null

    let finalMediaUrl = mediaUrlParam

    if (file) {
      const bytes = await file.arrayBuffer()
      
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'bin'
      const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`
      
      const { data: storageData, error: storageErr } = await supabase.storage
        .from('uploads')
        .upload(uniqueName, bytes, {
          contentType: file.type || 'application/octet-stream',
          cacheControl: '3600',
          upsert: false
        })

      if (storageErr) {
        throw new Error('Supabase Storage upload failed: ' + storageErr.message)
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('uploads')
        .getPublicUrl(uniqueName)

      finalMediaUrl = publicUrl
    }

    if (!finalMediaUrl) {
      return NextResponse.json({ error: 'No file or mediaUrl provided' }, { status: 400 })
    }

    // Try to log to DB — non-fatal if it fails (table may not exist yet)
    try {
      const { queryOne } = await import('@/backend/lib/db')
      await queryOne(
        `INSERT INTO uploads (uploader_id, url, filename, mime_type, size_bytes, context_type, context_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7::uuid) RETURNING id`,
        [
          uploaderId || null,
          finalMediaUrl,
          file ? file.name : 'unknown',
          file ? file.type : 'application/octet-stream',
          file ? file.size : 0,
          contextType || 'other',
          contextId || null,
        ]
      )
    } catch (dbErr: any) {
      // Non-fatal: just log, still return the URL
      console.warn('[Upload API] DB insert skipped:', dbErr.message)
    }

    return NextResponse.json({ url: finalMediaUrl })
  } catch (err: any) {
    console.error('[Upload API] Error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const uploaderId  = req.nextUrl.searchParams.get('uploaderId')
    const contextType = req.nextUrl.searchParams.get('contextType')

    if (!uploaderId) {
      return NextResponse.json({ error: 'uploaderId is required' }, { status: 400 })
    }

    const { query } = await import('@/backend/lib/db')

    let sql = 'SELECT * FROM uploads WHERE uploader_id = $1'
    const params: any[] = [uploaderId]

    if (contextType) {
      sql += ' AND context_type = $2'
      params.push(contextType)
    }

    sql += ' ORDER BY created_at DESC'

    const rows = await query(sql, params)
    return NextResponse.json(rows)
  } catch (err: any) {
    console.error('[Upload API] GET error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
