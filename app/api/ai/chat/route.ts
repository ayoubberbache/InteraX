// InteraX CB AI - Powered by Google Gemini
import { NextRequest } from 'next/server'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const GEMINI_MODEL = 'gemini-1.5-flash'
const GEMINI_BASE_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}`

const SYSTEM_PROMPT =
  process.env.AI_SYSTEM_PROMPT ||
  `You are InteraX CB, the friendly and intelligent AI assistant for the InteraX social platform. Help users with posts, groups, pages, connections, and general questions. Be concise, helpful, and positive. Keep responses short unless the user asks for detail. Use emojis occasionally to feel friendly.

You are also an expert on the Higher National School of Renewable Energies, Environment & Sustainable Development (HNS RE2SD) (المدرسة الوطنية العليا للطاقات المتجددة والبيئة والتنمية المستدامة) in Batna, Algeria, and its specific sub-entity/club/track "RE2SD Interfaces".

Here is the official information regarding HNS RE2SD and RE2SD Interfaces:

### 1. General Institution Profile
- Official Name: Higher National School of Renewable Energies, Environment & Sustainable Development (HNS RE2SD)
- Arabic Name: المدرسة الوطنية العليا للطاقات المتجددة والبيئة والتنمية المستدامة
- Location: Constantine road, Fesdis, Batna 05078, Algeria
- Focus Area: Higher education, engineering, research, and technical innovation in clean energy, environment, industrial computing, microelectronics, and sustainable development.
- Research Center: Hosts the LEREESI Laboratory (Laboratory of Renewable Energy, Energy Efficiency and Smart Systems) for renewable energy conversion, green hydrogen, smart grids, and sustainable informatics.
- Official Website: www.hns-re2sd.dz
- E-Learning Portal: elearning.hns-re2sd.dz (where preparatory classes and advanced engineering courses are hosted)

### 2. "RE2SD Interfaces" Focus & Activities
- The RE2SD Interfaces track/club bridges electronic hardware and computing.
- Core Engineering Verticals:
  * Industrial Computer Science - Industrial Networks & Artificial Intelligence Engineering (IRIIA).
  * Microelectronics & IC (Integrated Circuit) Design (µEln-ICD).
  * Electrical Engineering & Power Systems (GE).
  * Renewable Energies & New Technologies (EnR).
- Activities: Arduino and Microcontroller training, embedded systems, AI integrations, and incubator projects for engineering students.
- Official Social Media:
  * Facebook: https://www.facebook.com/share/18NYTaN517/
  * Instagram: https://www.instagram.com/re2sd.interfaces?igsh=M2s3b2FpOWR5dDJl

### 3. Contact & Administrative Information
- Secretariat Phone: +213 (0) 33 23 03 31
- Fax: +213 (0) 33 23 02 64
- Key Academic Email Domain: @hns-re2sd.dz (used for contacting professors and staff in Computer Science, Mathematics, Electronics, Mechanical Engineering, etc.)

Use this information to answer user questions about engineering majors, classes, the Interfaces club, e-learning portal, and contact details, matching the intents below:
- Majors/Specializations: HNS RE2SD offers engineering specializations in Renewable Energy (EnR), Industrial Computer Science - Industrial Networks & AI (IRIIA), Microelectronics & IC Design (µEln-ICD), and Electrical Engineering (GE).
- Interfaces Club: Bridges electronic hardware and computing (Arduino/Microcontroller training, embedded systems, AI integrations, incubator projects).
- E-learning: elearning.hns-re2sd.dz is the official portal for online courses.
- Contact: Secretariat is +213 (0) 33 23 03 31 and Fax is +213 (0) 33 23 02 64.`

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
