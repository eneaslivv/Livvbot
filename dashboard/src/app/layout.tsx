import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'LIVV Bots',
  description: 'Multi-tenant AI chatbot platform by LIVV Studio',
}

// Inline script that runs BEFORE React hydrates — avoids theme flash.
const themeInitScript = `(function(){try{var t=localStorage.getItem('livv-theme')||'system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);}catch(e){}})();`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const isPreview = process.env.NEXT_PUBLIC_PREVIEW_MODE === '1'
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="font-sans min-h-screen bg-bg text-ink">
        {isPreview && (
          <div className="bg-warn text-warn-fg text-[11px] text-center py-1 px-4 font-medium tracking-wide">
            PREVIEW MODE — in-memory demo data, writes don't persist, auth bypassed
          </div>
        )}
        {children}
      </body>
    </html>
  )
}
