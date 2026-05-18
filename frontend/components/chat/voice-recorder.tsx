'use client'

import { useState, useRef, useEffect } from 'react'
import { Mic, Square, X, Check, Play, Pause, Trash2 } from 'lucide-react'
import { Button } from '@/frontend/components/ui/button'
import { cn } from '@/backend/lib/utils'

interface VoiceRecorderProps {
  onRecord: (blob: Blob) => void
  onCancel: () => void
}

export function VoiceRecorder({ onRecord, onCancel }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (audioUrl) URL.revokeObjectURL(audioUrl)
    }
  }, [audioUrl])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      
      const chunks: BlobPart[] = []
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data)
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' })
        const url = URL.createObjectURL(blob)
        setAudioBlob(blob)
        setAudioUrl(url)
      }

      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)
      
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
    } catch (err) {
      console.error('Failed to start recording', err)
      onCancel()
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop())
      setIsRecording(false)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleTogglePlay = () => {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }

  if (!isRecording && !audioBlob) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="shrink-0 text-muted-foreground hover:text-red-500 hover:bg-red-50"
        onClick={startRecording}
      >
        <Mic className="h-5 w-5" />
      </Button>
    )
  }

  return (
    <div className="flex items-center gap-2 bg-secondary/20 rounded-full px-3 py-1 animate-in fade-in slide-in-from-right-4 duration-300">
      {isRecording ? (
        <>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs font-mono w-10">{formatTime(recordingTime)}</span>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={stopRecording}>
            <Square className="h-4 w-4 fill-current" />
          </Button>
        </>
      ) : (
        <>
          <audio 
            ref={audioRef} 
            src={audioUrl || ''} 
            onEnded={() => setIsPlaying(false)}
            className="hidden" 
          />
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleTogglePlay}>
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <span className="text-xs font-mono">{formatTime(recordingTime)}</span>
          <div className="flex items-center gap-1 border-l border-border pl-1 ml-1">
            <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-destructive hover:bg-destructive/10" 
                onClick={() => {
                    setAudioBlob(null)
                    setAudioUrl(null)
                    onCancel()
                }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-emerald-500 hover:bg-emerald-50"
                onClick={() => audioBlob && onRecord(audioBlob)}
            >
              <Check className="h-4 w-4" />
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
