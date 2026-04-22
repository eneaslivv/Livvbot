'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

function highlight(code: string): string {
  // Order matters: escape first, then apply in a way that doesn't clobber earlier replacements.
  let s = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  // Comments
  s = s.replace(
    /(&lt;!--[\s\S]*?--&gt;|\/\/[^\n]*)/g,
    '<span class="text-ink-muted italic">$1</span>'
  )
  // Strings
  s = s.replace(
    /('[^'\n]*'|"[^"\n]*")/g,
    '<span class="text-amber-300">$1</span>'
  )
  // Tags
  s = s.replace(
    /(&lt;\/?[a-z][a-z0-9]*)/gi,
    '<span class="text-rose-400">$1</span>'
  )
  // Keywords (JS-ish)
  s = s.replace(
    /\b(window|function|var|let|const|return|if|else|true|false|null|undefined)\b/g,
    '<span class="text-sky-400">$1</span>'
  )

  return s
}

export function CopyBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // noop
    }
  }

  const lines = code.split('\n')

  return (
    <div className="relative bg-ink">
      {/* Traffic lights */}
      <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-white/5">
        <span className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
        <span className="w-2.5 h-2.5 rounded-full bg-amber-400/70" />
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/70" />
        <span className="ml-2 text-[11px] text-ink-muted font-mono">widget.html</span>
        <button
          onClick={handleCopy}
          className="ml-auto bg-surface/5 text-ink-soft hover:bg-surface/10 text-[11px] font-medium px-2 py-1 rounded-md flex items-center gap-1.5 transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3" /> Copied
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" /> Copy
            </>
          )}
        </button>
      </div>

      <div className="overflow-x-auto">
        <pre className="text-accent-fg text-[12px] leading-relaxed font-mono">
          {lines.map((line, i) => (
            <div key={i} className="flex hover:bg-surface/[0.02]">
              <span className="shrink-0 w-10 px-3 py-[1px] text-right text-ink-muted tabular-nums select-none border-r border-white/5 mr-3">
                {i + 1}
              </span>
              <code
                className="flex-1 py-[1px] pr-5 whitespace-pre"
                dangerouslySetInnerHTML={{ __html: highlight(line) || '&nbsp;' }}
              />
            </div>
          ))}
        </pre>
      </div>
    </div>
  )
}
