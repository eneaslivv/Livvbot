'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  Clock,
} from 'lucide-react'

export interface DocumentRow {
  id: string
  title: string
  source_type: string
  original_filename: string | null
  file_size_bytes: number | null
  chunk_count: number
  created_at: string
}

interface Props {
  slug: string
  documents: DocumentRow[]
  deleteAction: (slug: string, id: string) => void | Promise<void>
}

const ALLOWED = '.pdf,.txt,.md'
const MAX_MB = 15

export function DocumentUpload({ slug, documents, deleteAction }: Props) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle')
  const [progress, setProgress] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  async function upload(file: File) {
    setStatus('uploading')
    setError(null)
    setProgress(`Uploading ${file.name}...`)

    try {
      const fd = new FormData()
      fd.append('slug', slug)
      fd.append('file', file)

      setProgress('Extracting text + embedding chunks...')
      const res = await fetch('/api/upload-document', { method: 'POST', body: fd })
      const data = await res.json()

      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? `HTTP ${res.status}`)
      }

      setProgress(`${data.title}: ${data.chunksCreated} chunks indexed`)
      setStatus('done')
      router.refresh()
    } catch (e) {
      setStatus('error')
      setError((e as Error).message)
    }
  }

  function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    upload(files[0])
  }

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setIsDragging(false)
          onFiles(e.dataTransfer.files)
        }}
        onClick={() => fileRef.current?.click()}
        className={`border-2 border-dashed rounded-lg px-5 py-8 text-center cursor-pointer transition-colors ${
          isDragging
            ? 'border-ink bg-surface-sunken'
            : 'border-border hover:border-border-strong'
        }`}
      >
        <input
          ref={fileRef}
          type="file"
          accept={ALLOWED}
          className="hidden"
          onChange={(e) => onFiles(e.target.files)}
          disabled={status === 'uploading'}
        />
        <div className="w-10 h-10 mx-auto rounded-lg bg-surface-sunken flex items-center justify-center mb-2 border border-border">
          {status === 'uploading' ? (
            <Loader2 className="w-5 h-5 text-ink-muted animate-spin" />
          ) : (
            <Upload className="w-5 h-5 text-ink-muted" />
          )}
        </div>
        <p className="text-sm font-medium">
          {status === 'uploading'
            ? 'Processing...'
            : 'Drop a file here or click to browse'}
        </p>
        <p className="text-[11px] text-ink-muted mt-1">
          PDF, TXT, Markdown · max {MAX_MB}MB
        </p>
      </div>

      {status === 'uploading' && progress && (
        <div className="flex items-start gap-2 text-xs text-ink-muted bg-surface-sunken border border-border rounded-md px-3 py-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0 mt-0.5" />
          <span>{progress}</span>
        </div>
      )}

      {status === 'done' && progress && (
        <div className="flex items-start gap-2 text-sm bg-success-bg border border-success/20 text-success-fg px-3 py-2 rounded-md">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{progress}</span>
        </div>
      )}

      {status === 'error' && (
        <div className="flex items-start gap-2 text-sm bg-danger-bg border border-danger/20 text-danger-fg px-3 py-2 rounded-md">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Existing documents */}
      {documents.length > 0 && (
        <div className="bg-surface border border-border rounded-lg overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold text-sm">Uploaded ({documents.length})</h2>
          </div>
          <ul className="divide-y divide-border">
            {documents.map((d) => (
              <li key={d.id} className="px-5 py-3 flex items-start gap-3">
                <div className="w-8 h-8 rounded-md bg-surface-sunken border border-border flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-ink-muted" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-medium truncate">{d.title}</span>
                    <span className="text-[10px] bg-surface-sunken text-ink-muted border border-border px-1.5 py-0.5 rounded font-medium uppercase tracking-wide">
                      {d.source_type}
                    </span>
                  </div>
                  <div className="text-[11px] text-ink-muted flex items-center gap-2 flex-wrap tabular-nums">
                    <span>{d.chunk_count} chunks</span>
                    {d.file_size_bytes && (
                      <>
                        <span>·</span>
                        <span>{formatSize(d.file_size_bytes)}</span>
                      </>
                    )}
                    <span>·</span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(d.created_at)}
                    </span>
                  </div>
                </div>
                <form
                  action={async () => {
                    await deleteAction(slug, d.id)
                  }}
                >
                  <button
                    type="submit"
                    className="p-1.5 rounded-md text-ink-faint hover:bg-danger-bg hover:text-danger"
                    title="Delete document"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const mins = Math.floor((Date.now() - d.getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return d.toLocaleDateString()
}
