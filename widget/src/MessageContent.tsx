import { Fragment, type ReactNode } from 'react'

const URL_RE = /https?:\/\/[^\s)<>"']+/g
const MD_LINK_RE = /\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g
const IMG_EXT_RE = /\.(png|jpe?g|gif|webp|svg|avif)(\?[^#\s]*)?(#.*)?$/i

function stripTrailingPunct(url: string): string {
  return url.replace(/[.,;:!?)\]]+$/, '')
}

function isImageUrl(url: string): boolean {
  return IMG_EXT_RE.test(url)
}

type Match = { start: number; end: number; node: ReactNode }

function renderLinks(text: string): ReactNode[] {
  const matches: Match[] = []

  for (const m of text.matchAll(MD_LINK_RE)) {
    if (m.index === undefined) continue
    const [full, label, url] = m
    matches.push({
      start: m.index,
      end: m.index + full.length,
      node: (
        <a
          key={`md-${m.index}`}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="livv-bot-link"
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
          key={`url-${start}`}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="livv-bot-link"
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
    if (m.start > cursor) out.push(<Fragment key={`t-${cursor}`}>{text.slice(cursor, m.start)}</Fragment>)
    out.push(m.node)
    cursor = m.end
  }
  if (cursor < text.length) out.push(<Fragment key={`t-${cursor}`}>{text.slice(cursor)}</Fragment>)
  return out
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
      {renderLinks(text)}
      {images.length > 0 && (
        <div className="livv-bot-images">
          {images.map((url) => (
            <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="livv-bot-image-link">
              <img src={url} alt="" loading="lazy" />
            </a>
          ))}
        </div>
      )}
    </>
  )
}
