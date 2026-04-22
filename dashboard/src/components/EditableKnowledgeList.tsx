'use client'

import { useState } from 'react'
import { Pencil, Trash2, Check, X, ExternalLink } from 'lucide-react'

export type Kind = 'product' | 'faq' | 'recipe'

const TABLE_BY_KIND: Record<Kind, string> = {
  product: 'products',
  faq: 'faqs',
  recipe: 'recipes',
}

interface Props {
  slug: string
  kind: Kind
  items: any[]
  updateAction: (
    slug: string,
    kind: Kind,
    id: string,
    formData: FormData
  ) => void | Promise<void>
  deleteAction: (slug: string, table: string, id: string) => void | Promise<void>
}

export function EditableKnowledgeList({
  slug,
  kind,
  items,
  updateAction,
  deleteAction,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)

  if (items.length === 0) return null

  return (
    <ul className="divide-y divide-border">
      {items.map((item) => {
        const isEditing = editingId === item.id
        const title = titleOf(kind, item)
        const subtitle = subtitleOf(kind, item)
        const sourceUrl = item.metadata?.source_url

        return (
          <li key={item.id} className="px-5 py-3">
            {isEditing ? (
              <EditForm
                slug={slug}
                kind={kind}
                item={item}
                onCancel={() => setEditingId(null)}
                updateAction={updateAction}
              />
            ) : (
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-medium truncate">{title}</span>
                    {sourceUrl && (
                      <span className="text-[10px] bg-surface-sunken text-ink-muted border border-border px-1.5 py-0.5 rounded font-medium uppercase tracking-wide">
                        imported
                      </span>
                    )}
                  </div>
                  {subtitle && (
                    <p className="text-xs text-ink-muted line-clamp-2">{subtitle}</p>
                  )}
                  {sourceUrl && (
                    <a
                      href={sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-ink-faint hover:text-ink-muted inline-flex items-center gap-1 mt-1"
                    >
                      {safePath(sourceUrl)}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setEditingId(item.id)}
                    className="p-1.5 rounded-md text-ink-faint hover:bg-surface-sunken hover:text-ink"
                    title="Edit"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <form
                    action={async () => {
                      await deleteAction(slug, TABLE_BY_KIND[kind], item.id)
                    }}
                  >
                    <button
                      type="submit"
                      className="p-1.5 rounded-md text-ink-faint hover:bg-danger-bg hover:text-danger"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}

function safePath(url: string): string {
  try {
    return new URL(url).pathname
  } catch {
    return url
  }
}

function titleOf(kind: Kind, item: any): string {
  if (kind === 'product') return item.name ?? ''
  if (kind === 'faq') return item.question ?? ''
  return item.title ?? ''
}

function subtitleOf(kind: Kind, item: any): string | undefined {
  if (kind === 'product') return item.description
  if (kind === 'faq') return item.answer
  return item.description
}

function EditForm({
  slug,
  kind,
  item,
  onCancel,
  updateAction,
}: {
  slug: string
  kind: Kind
  item: any
  onCancel: () => void
  updateAction: Props['updateAction']
}) {
  return (
    <form
      action={async (formData) => {
        await updateAction(slug, kind, item.id, formData)
        onCancel()
      }}
      className="space-y-2.5"
    >
      {kind === 'product' && (
        <>
          <SmallLabel>Name</SmallLabel>
          <SmallInput name="name" defaultValue={item.name ?? ''} required />
          <SmallLabel>Description</SmallLabel>
          <SmallTextArea name="description" defaultValue={item.description ?? ''} rows={2} />
          <SmallLabel>Usage notes</SmallLabel>
          <SmallTextArea name="usage_notes" defaultValue={item.usage_notes ?? ''} rows={2} />
        </>
      )}
      {kind === 'faq' && (
        <>
          <SmallLabel>Category</SmallLabel>
          <SmallInput name="category" defaultValue={item.category ?? ''} />
          <SmallLabel>Question</SmallLabel>
          <SmallInput name="question" defaultValue={item.question ?? ''} required />
          <SmallLabel>Answer</SmallLabel>
          <SmallTextArea name="answer" defaultValue={item.answer ?? ''} rows={3} required />
        </>
      )}
      {kind === 'recipe' && (
        <>
          <SmallLabel>Title</SmallLabel>
          <SmallInput name="title" defaultValue={item.title ?? ''} required />
          <SmallLabel>Description</SmallLabel>
          <SmallTextArea name="description" defaultValue={item.description ?? ''} rows={2} />
          <SmallLabel>Ingredients</SmallLabel>
          <SmallTextArea name="ingredients" defaultValue={item.ingredients ?? ''} rows={2} />
          <SmallLabel>Steps</SmallLabel>
          <SmallTextArea name="steps" defaultValue={item.steps ?? ''} rows={3} />
        </>
      )}

      <div className="flex items-center gap-2 pt-1">
        <button
          type="submit"
          className="inline-flex items-center gap-1 bg-ink text-accent-fg text-xs font-medium px-2.5 py-1.5 rounded-md hover:opacity-90"
        >
          <Check className="w-3 h-3" />
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1 text-ink-soft text-xs font-medium px-2.5 py-1.5 rounded-md hover:bg-surface-sunken"
        >
          <X className="w-3 h-3" />
          Cancel
        </button>
        <p className="text-[11px] text-ink-muted ml-auto">
          Re-embedded automatically on save.
        </p>
      </div>
    </form>
  )
}

function SmallLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[10px] font-medium text-ink-muted uppercase tracking-wider">
      {children}
    </label>
  )
}

function SmallInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full border border-border rounded-md px-2.5 py-1.5 text-sm focus:outline-none focus:border-ink transition-colors bg-surface"
    />
  )
}

function SmallTextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className="w-full border border-border rounded-md px-2.5 py-1.5 text-sm focus:outline-none focus:border-ink transition-colors bg-surface resize-y"
    />
  )
}
