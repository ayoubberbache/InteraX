import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * Uploads a file (photo, video, audio) directly to Supabase Storage,
 * then saves the metadata tracking to the PostgreSQL database via API.
 */
export async function uploadMedia(file: File, uploaderId?: string, contextType?: string): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)
  if (uploaderId) formData.append('uploaderId', uploaderId)
  if (contextType) formData.append('contextType', contextType)

  const res = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    throw new Error('Failed to upload media')
  }

  const data = await res.json()
  return data.url
}

/**
 * Deletes a file from storage.
 * Note: This should be handled via an API route for security.
 */
export async function deleteMedia(publicUrl: string): Promise<void> {
  console.warn('deleteMedia not yet implemented on client side. Use API route.')
}
