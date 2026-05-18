// InteraX CB AI - Powered by Google Gemini
import { NextRequest } from 'next/server'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const GEMINI_MODEL = 'gemini-1.5-flash'
const GEMINI_BASE_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}`

const SYSTEM_PROMPT =
  process.env.AI_SYSTEM_PROMPT ||
  `You are InteraX CB, the friendly and intelligent AI assistant for the InteraX social platform. Help users with posts, groups, pages, connections, and general questions. Be concise, helpful, and positive. Keep responses short unless the user asks for detail. Use emojis occasionally to feel friendly. You are also an expert on the Higher National School of Renewable Energies, Environment & Sustainable Development (HNS RE2SD) in Batna, Algeria. You know its structure, its mission to develop renewable energy education, its engineering degrees, and latest news like the 2025 international cooperation and Sustainable Development Competition. You should also direct users to the school's official social media accounts when relevant: Facebook (https://www.facebook.com/share/18NYTaN517/) and Instagram (https://www.instagram.com/re2sd.interfaces?igsh=M2s3b2FpOWR5dDJl).`

interface ChatMessage {
  role: string
  content: string
}

function toGeminiContents(messages: ChatMessage[]) {
  const filtered = messages.filter((m) => m.role !== 'system')
  const merged: { role: string; parts: { text: string }[] }[] = []

  for (const m of filtered) {
    const role = m.role === 'assistant' ? 'model' : 'user'
    if (merged.length > 0 && merged[merged.length - 1].role === role) {
      merged[merged.length - 1].parts[0].text += '\n\n' + m.content
    } else {
      merged.push({ role, parts: [{ text: m.content }] })
    }
  }
  return merged
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { messages, stream = true } = body as {
      messages: ChatMessage[]
      stream?: boolean
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return Response.json({ error: 'messages array is required' }, { status: 400 })
    }

    if (!GEMINI_API_KEY) {
      return Response.json({
        content:
          "⚠️ The Gemini API key isn't configured. Please add `GEMINI_API_KEY` to `.env.local` and restart the server.",
        model: 'error',
      })
    }

    const contents = toGeminiContents(messages)

    const geminiBody = {
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents,
      generationConfig: {
        maxOutputTokens: 1024,
        temperature: 0.7,
        topP: 0.95,
      },
    }

    // ── Streaming path ─────────────────────────────────────────────────────
    if (stream) {
      try {
        const geminiRes = await fetch(
          `${GEMINI_BASE_URL}:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(geminiBody),
          }
        )

        if (!geminiRes.ok) {
          const errText = await geminiRes.text()
          throw new Error(`Gemini API error: ${geminiRes.status} - ${errText}`)
        }

        const reader = geminiRes.body!.getReader()
        const decoder = new TextDecoder()

        const readableStream = new ReadableStream({
          async start(controller) {
            const encoder = new TextEncoder()
            let buffer = ''
            let doneSent = false

            try {
              while (true) {
                const { done, value } = await reader.read()
                if (done) break

                buffer += decoder.decode(value, { stream: true })
                const lines = buffer.split('\n')
                buffer = lines.pop() || ''

                for (const line of lines) {
                  if (!line.startsWith('data: ')) continue
                  const data = line.slice(6)
                  if (!data.trim() || data.trim() === '[DONE]') {
                    if (data.trim() === '[DONE]') {
                      controller.enqueue(encoder.encode('data: [DONE]\n\n'))
                      doneSent = true
                    }
                    continue
                  }

                  try {
                    const parsed = JSON.parse(data)
                    const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text
                    if (text) {
                      controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify({ content: text })}\n\n`)
                      )
                    }
                    const finishReason = parsed?.candidates?.[0]?.finishReason
                    if (finishReason === 'STOP') {
                      controller.enqueue(encoder.encode('data: [DONE]\n\n'))
                      doneSent = true
                      break
                    }
                  } catch {
                    /* skip malformed/partial chunks */
                  }
                }

                if (doneSent) break
              }

              if (!doneSent) {
                controller.enqueue(encoder.encode('data: [DONE]\n\n'))
              }
              controller.close()
            } catch (err) {
              controller.error(err)
            }
          },
        })

        return new Response(readableStream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
          },
        })
      } catch (err: any) {
        // Fallback to NVIDIA Qwen API if Gemini fails or is rate-limited
        const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY
        if (NVIDIA_API_KEY) {
          try {
            const nvidiaRes = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${NVIDIA_API_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model: 'meta/llama-3.1-8b-instruct',
                messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages.map(m => ({
                  role: m.role === 'assistant' ? 'assistant' : 'user',
                  content: m.content
                }))],
                temperature: 0.7,
                top_p: 0.95,
                max_tokens: 1024,
                stream: true
              }),
            })

            if (nvidiaRes.ok) {
              const reader = nvidiaRes.body!.getReader()
              const decoder = new TextDecoder()
              const readableStream = new ReadableStream({
                async start(controller) {
                  const encoder = new TextEncoder()
                  let buffer = ''
                  let doneSent = false
                  try {
                    while (true) {
                      const { done, value } = await reader.read()
                      if (done) break
                      buffer += decoder.decode(value, { stream: true })
                      const lines = buffer.split('\n')
                      buffer = lines.pop() || ''
                      for (const line of lines) {
                        if (!line.startsWith('data: ')) continue
                        const data = line.slice(6).trim()
                        if (data === '[DONE]') {
                          if (!doneSent) {
                            controller.enqueue(encoder.encode('data: [DONE]\n\n'))
                            doneSent = true
                          }
                          continue
                        }
                        try {
                          const parsed = JSON.parse(data)
                          const text = parsed.choices?.[0]?.delta?.content
                          if (text) {
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: text })}\n\n`))
                          }
                          const finishReason = parsed.choices?.[0]?.finish_reason
                          if (finishReason === 'stop' && !doneSent) {
                            controller.enqueue(encoder.encode('data: [DONE]\n\n'))
                            doneSent = true
                            break
                          }
                        } catch {}
                      }
                      if (doneSent) break
                    }
                    if (!doneSent) {
                      controller.enqueue(encoder.encode('data: [DONE]\n\n'))
                    }
                    controller.close()
                  } catch (e) {
                    controller.error(e)
                  }
                }
              })
              return new Response(readableStream, {
                headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
              })
            }
          } catch (nvidiaErr) {
             // Fall through to error message
          }
        }

        let errorMsg = `AI service unavailable: Invalid API keys or quota exceeded.`
        if (err.message.includes('429')) {
          errorMsg = 'Sorry, the AI service is rate-limited right now. Please wait a moment and try again. 🛑'
        }
        
        return Response.json({ error: errorMsg, details: err.message }, { status: 500 })
      }
    }

    // ── Non-streaming path ─────────────────────────────────────────────────
    try {
      const geminiRes = await fetch(
        `${GEMINI_BASE_URL}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(geminiBody),
        }
      )

      if (!geminiRes.ok) {
        throw new Error(`Gemini API error: ${geminiRes.status}`)
      }

      const data = await geminiRes.json()
      const content = data?.candidates?.[0]?.content?.parts?.[0]?.text || ''
      return Response.json({ content, model: GEMINI_MODEL })
    } catch (err: any) {
      return Response.json({
        content: `I couldn't reach the AI service right now. Error: ${err.message}. Please try again! 🔄`,
        model: 'error',
      })
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}
