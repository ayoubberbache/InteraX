'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import dynamic from 'next/dynamic'
import { useTheme } from 'next-themes'
import { ArrowLeft } from 'lucide-react'
import { InteraXLogo } from '@/frontend/components/ui/logo'

const FilerobotImageEditor = dynamic(
  () => import('react-filerobot-image-editor'),
  { ssr: false }
)

const HEADER_H = 56

interface ImageEditorPageProps {
  isOpen: boolean
  source: File | string | null
  onSave: (file: File) => void
  onClose: () => void
  cropShape?: 'rect' | 'round'
  context?: string
}

export function ImageEditorModal({
  isOpen,
  source,
  onSave,
  onClose,
  cropShape = 'rect',
  context = 'Photo',
}: ImageEditorPageProps) {
  const { resolvedTheme } = useTheme()
  const [srcUrl, setSrcUrl] = useState<string>('')
  const [mounted, setMounted] = useState(false)

  // Mount guard — needed before createPortal
  useEffect(() => { setMounted(true) }, [])

  // Build a stable object-URL when a File is passed in
  useEffect(() => {
    if (!source) { setSrcUrl(''); return }
    if (source instanceof File) {
      const url = URL.createObjectURL(source)
      setSrcUrl(url)
      return () => URL.revokeObjectURL(url)
    }
    setSrcUrl(source)
  }, [source])

  // Lock body scroll while editor is open
  useEffect(() => {
    if (!isOpen) return
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  // Suppress known upstream library warnings — only while editor is visible
  useEffect(() => {
    if (!isOpen) return
    const orig = console.error
    console.error = (...args: any[]) => {
      const msg = typeof args[0] === 'string' ? args[0] : ''
      if (
        msg.includes('non-boolean attribute') ||
        msg.includes('does not recognize the') ||
        msg.includes('React does not recognize') ||
        msg.includes('Encountered two children with the same key')
      ) return
      orig.apply(console, args)
    }
    return () => { console.error = orig }
  }, [isOpen])

  // ── Save handler ────────────────────────────────────────────────────────
  // Library calls: onSave(imageData, designState)
  // imageData = { imageBase64: "data:…;base64,…", imageCanvas, mimeType, fullName, … }
  const handleEditorSave = useCallback((imageData: any) => {
    try {
      let base64: string | null = null
      let mime = imageData?.mimeType || 'image/png'

      if (typeof imageData?.imageBase64 === 'string' && imageData.imageBase64.length > 0) {
        const str = imageData.imageBase64
        if (str.includes(',')) {
          base64 = str.split(',')[1]
          const match = str.split(',')[0].match(/data:(.*?);base64/)
          if (match) {
            mime = match[1]
          }
        } else {
          base64 = str
        }
      } else if (imageData?.imageCanvas && typeof imageData.imageCanvas.toDataURL === 'function') {
        const url = imageData.imageCanvas.toDataURL(mime)
        if (url.includes(',')) {
          base64 = url.split(',')[1]
        }
      }

      if (base64) {
        const ext = imageData?.extension || 'png'
        const name = imageData?.fullName || `interax-edit.${ext}`
        const byteStr = atob(base64)
        const arr = new Uint8Array(byteStr.length)
        for (let i = 0; i < byteStr.length; i++) {
          arr[i] = byteStr.charCodeAt(i)
        }
        const file = new File([arr], name, { type: mime })
        onSave(file)
      } else {
        console.warn('[ImageEditor] No base64 image data could be extracted.')
      }
    } catch (err) {
      console.error('[ImageEditor] save error:', err)
    } finally {
      onClose()
    }
  }, [onSave, onClose])

  // Don't render anything until mounted and actually open with a source
  if (!mounted || !isOpen || !srcUrl) return null

  const isDark = resolvedTheme === 'dark'

  const editorTheme = {
    mode: isDark ? 'dark' : 'light',
    colors: isDark ? {
      background:           '#0d0018',
      primaryBg:            '#130026',
      secondaryBg:          '#1e0a38',
      text:                 '#f0ebff',
      textMuted:            '#a78bca',
      accent:               '#9370DB',
      accentHover:          '#c084fc',
      border:               '#2d1b4e',
      buttonPrimaryBg:      '#9370DB',
      buttonPrimaryColor:   '#ffffff',
      buttonSecondaryBg:    '#2d1b4e',
      buttonSecondaryColor: '#E6E6FA',
    } : {
      background:           '#F8F5FF',
      primaryBg:            '#ffffff',
      secondaryBg:          '#ede9f7',
      text:                 '#1a0030',
      textMuted:            '#7c5fa0',
      accent:               '#4B0082',
      accentHover:          '#9370DB',
      border:               '#d8cff0',
      buttonPrimaryBg:      '#4B0082',
      buttonPrimaryColor:   '#ffffff',
      buttonSecondaryBg:    '#E6E6FA',
      buttonSecondaryColor: '#4B0082',
    },
    typography: { fontFamily: 'Inter, -apple-system, sans-serif' },
  }

  const headerBg     = isDark ? '#0d0018' : '#F8F5FF'
  const headerBorder = isDark ? '#2d1b4e' : '#d8cff0'
  const mutedFg      = isDark ? '#a78bca' : '#7c5fa0'
  const primaryColor = isDark ? '#9370DB' : '#4B0082'

  return createPortal(
    <div
      style={{
        position:      'fixed',
        inset:         0,
        zIndex:        9999,
        display:       'flex',
        flexDirection: 'column',
        background:    isDark ? '#0d0018' : '#F8F5FF',
        fontFamily:    'Inter, -apple-system, sans-serif',
      }}
    >
      {/* 
        Inject global styles directly to lift Scaleflex portal menus (dropdowns, 
        select panels, color pickers) above our full-screen container (zIndex 9999).
      */}
      <style dangerouslySetInnerHTML={{ __html: `
        .SfxModal-Wrapper, 
        .SfxPopper-wrapper, 
        .SfxSelect-menu,
        [class*="SfxModal"],
        [class*="SfxPopper"] {
          z-index: 1000000 !important;
        }
      `}} />

      {/* ── Top Bar ──────────────────────────────────────────────────── */}
      <div
        style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          padding:        '0 16px',
          height:         HEADER_H,
          flexShrink:     0,
          background:     headerBg,
          borderBottom:   `1px solid ${headerBorder}`,
        }}
      >
        <button
          onClick={onClose}
          style={{
            display:      'flex',
            alignItems:   'center',
            gap:          6,
            background:   'none',
            border:       'none',
            color:        mutedFg,
            cursor:       'pointer',
            padding:      '6px 10px 6px 4px',
            borderRadius: 999,
            fontSize:     14,
            fontWeight:   500,
            fontFamily:   'Inter, sans-serif',
            transition:   'color .15s, background .15s',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.color      = primaryColor
            ;(e.currentTarget as HTMLButtonElement).style.background = isDark ? '#1e0a38' : '#ede9f7'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.color      = mutedFg
            ;(e.currentTarget as HTMLButtonElement).style.background = 'none'
          }}
        >
          <ArrowLeft size={18} />
          Cancel
        </button>

        <div
          style={{
            display:    'flex',
            alignItems: 'center',
            gap:        8,
            position:   'absolute',
            left:       '50%',
            transform:  'translateX(-50%)',
          }}
        >
          <InteraXLogo className="h-6 w-auto" />
          <div style={{ lineHeight: 1 }}>
            <div
              style={{
                fontWeight:    800,
                fontSize:      15,
                letterSpacing: '-0.02em',
                background:    isDark
                  ? 'linear-gradient(to right, #E6E6FA, #C084FC, #9370DB)'
                  : 'linear-gradient(to right, #4B0082, #9370DB, #C084FC)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor:  'transparent',
                backgroundClip:       'text',
              }}
            >
              InteraX
            </div>
            <div
              style={{
                fontSize:      10,
                color:         mutedFg,
                fontWeight:    500,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              Edit {context}
            </div>
          </div>
        </div>

        <div style={{ width: 80 }} />
      </div>

      {/* ── Editor Canvas ─────────────────────────────────────────────── */}
      <div
        style={{
          width:    '100%',
          height:   `calc(100vh - ${HEADER_H}px)`,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <FilerobotImageEditor
          source={srcUrl}
          onSave={handleEditorSave}
          onClose={onClose}
          theme={editorTheme}
          annotationsCommon={{
            fill:   isDark ? '#9370DB' : '#4B0082',
            stroke: isDark ? '#c084fc' : '#9370DB',
          }}
          tabsIds={['Adjust', 'Finetune', 'Filters', 'Annotate']}
          defaultTabId="Adjust"
          defaultToolId="Crop"
          savingPixelRatio={2}
          previewPixelRatio={1}
          Text={{
            fonts: [
              { label: 'Inter', value: 'Inter, sans-serif' },
              { label: 'Arial', value: 'Arial, sans-serif' },
              { label: 'Georgia', value: 'Georgia, serif' },
              { label: 'Courier New', value: 'Courier New, monospace' },
            ],
          }}
          Crop={{
            ratio: cropShape === 'round' ? 'ellipse' : 'original',
            presetsItems: cropShape === 'round' ? [
              { titleKey: 'square', ratio: 1 },
            ] : [
              { titleKey: 'original',       ratio: 'original' },
              { titleKey: 'square',         ratio: 1          },
              { titleKey: 'portrait_4_5',   ratio: 4 / 5      },
              { titleKey: 'landscape_16_9', ratio: 16 / 9     },
            ],
          }}
        />
      </div>
    </div>,
    document.body
  )
}
