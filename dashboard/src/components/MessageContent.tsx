import { Fragment, type ReactNode } from 'react'

const URL_RE = /https?:\/\/[^\s)<>"']+/g
const MD_LINK_RE = /\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g
const IMG_EXT_RE = /\.(png|jpe?g|gif|webp|svg|avif)(\?[^#\s]*)?(#.*)?$/i

// Lightweight inline-markdown for the things models actually emit:
//   **bold**   →  <strong>
//   `code`     →  <code>
const INLINE_FMT_RE = /(\*\*[^*\n]+?\*\*|`[^`\n]+?`)/g

function stripTrailingPunct(url: string): string {
  return url.replace(/[.,;:!?)\]]+$/, '')
}

function isImageUrl(url: string): boolean {
  return IMG_EXT_RE.test(url)
}

type Match = { start: number; end: number; node: ReactNode }

function renderLinks(text: string, baseOffset: number): ReactNode[] {
  const matches: Match[] = []

  for (const m of text.matchAll(MD_LINK_RE)) {
    if (m.index === undefined) continue
    const [full, label, url] = m
    matches.push({
      start: m.index,
      end: m.index + full.length,
      node: (
        <a
          key={`md-${baseOffset + m.index}`}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:opacity-80"
        >
          {label}
        </a>
      ),
    })
  }

  for (const m of text.matchAll(URL_RE)) {
    if (m.index === undefined) continue
    const start = m.index
    if (matches.some((mm) => start >= mm.start && start < mm.end)) continue
    const url = stripTrailingPunct(m[0])
    matches.push({
      start,
      end: start + url.length,
      node: (
        <a
          key={`url-${baseOffset + start}`}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:opacity-80 break-all"
        >
          {url}
        </a>
      ),
    })
  }

  matches.sort((a, b) => a.start - b.start)

  const out: ReactNode[] = []
  let cursor = 0
  for (const m of matches) {
    if (m.start > cursor)
      out.push(
        <Fragment key={`t-${baseOffset + cursor}`}>{text.slice(cursor, m.start)}</Fragment>
      )
    out.push(m.node)
    cursor = m.end
  }
  if (cursor < text.length)
    out.push(<Fragment key={`t-${baseOffset + cursor}`}>{text.slice(cursor)}</Fragment>)
  return out
}

function renderInline(text: string): ReactNode[] {
  const parts: ReactNode[] = []
  let cursor = 0
  let m: RegExpExecArray | null
  INLINE_FMT_RE.lastIndex = 0
  while ((m = INLINE_FMT_RE.exec(text)) !== null) {
    if (m.index > cursor) {
      parts.push(...renderLinks(text.slice(cursor, m.index), cursor))
    }
    const matched = m[0]
    if (matched.startsWith('**')) {
      const inner = matched.slice(2, -2)
      parts.push(
        <strong key={`b-${m.index}`} className="font-semibold">
          {renderLinks(inner, m.index + 2)}
        </strong>
      )
    } else {
      const inner = matched.slice(1, -1)
      parts.push(
        <code
          key={`c-${m.index}`}
          className="px-1 py-0.5 rounded bg-surface-sunken text-[0.92em] font-mono"
        >
          {inner}
        </code>
      )
    }
    cursor = m.index + matched.length
  }
  if (cursor < text.length) {
    parts.push(...renderLinks(text.slice(cursor), cursor))
  }
  return parts
}

function extractImageUrls(text: string): string[] {
  const urls = new Set<string>()
  for (const m of text.matchAll(MD_LINK_RE)) {
    if (isImageUrl(m[2])) urls.add(m[2])
  }
  for (const m of text.matchAll(URL_RE)) {
    const url = stripTrailingPunct(m[0])
    if (isImageUrl(url)) urls.add(url)
  }
  return Array.from(urls).slice(0, 3)
}

export function MessageContent({ text }: { text: string }) {
  const images = extractImageUrls(text)
  return (
    <>
      {renderInline(text)}
      {images.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2 not-prose">
          {images.map((url) => (
            <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="block">
              <img
                src={url}
                alt=""
                loading="lazy"
                className="max-h-40 max-w-full rounded-md border border-border object-cover"
              />
            </a>
          ))}
        </div>
      )}
    </>
  )
}
