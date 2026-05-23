import type { Metadata } from 'next'

import { ThemeProvider } from '@/frontend/components/theme-provider'
import { ColorThemeProvider } from '@/frontend/components/color-theme-provider'
import { AuthProvider } from '@/backend/lib/auth-context'
import { LanguageProvider } from '@/backend/lib/i18n/context'
import './globals.css'



export const metadata: Metadata = {
  title: 'InteraX — Campus Social Platform',
  description: 'Connect, share, and grow with your campus community on InteraX',
  generator: 'InteraX',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
          themes={['light', 'dark', 'system']}
        >
          <ColorThemeProvider>
            <AuthProvider>
              <LanguageProvider>
                {children}
              </LanguageProvider>
            </AuthProvider>
          </ColorThemeProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
