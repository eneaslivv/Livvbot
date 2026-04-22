'use client'

import { useState } from 'react'
import { Plus, Trash2, GripVertical, Globe } from 'lucide-react'

interface QuickAction {
  id: string
  label: string
  prompt: string
  page_match?: string
}

function generateId(): string {
  return 'qa_' + Math.random().toString(36).slice(2, 10)
}

export function QuickActionsEditor({ initialValue }: { initialValue: QuickAction[] }) {
  const [actions, setActions] = useState<QuickAction[]>(initialValue)

  function updateAction(id: string, patch: Partial<QuickAction>) {
    setActions((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)))
  }

  function deleteAction(id: string) {
    setActions((prev) => prev.filter((a) => a.id !== id))
  }

  function addAction() {
    setActions((prev) => [
      ...prev,
      { id: generateId(), label: '', prompt: '' },
    ])
  }

  function move(id: string, dir: -1 | 1) {
    setActions((prev) => {
      const i = prev.findIndex((a) => a.id === id)
      if (i < 0) return prev
      const j = i + dir
      if (j < 0 || j >= prev.length) return prev
      const copy = [...prev]
      ;[copy[i], copy[j]] = [copy[j], copy[i]]
      return copy
    })
  }

  return (
    <div>
      {/* Hidden field that goes to the form action */}
      <input type="hidden" name="quickActions" value={JSON.stringify(actions)} />

      {actions.length === 0 ? (
        <div className="text-center py-6 text-sm text-ink-muted">
          No quick actions yet. Add a few common questions your users ask.
        </div>
      ) : (
        <ul className="space-y-3 mb-4">
          {actions.map((a, i) => (
            <li
              key={a.id}
              className="border border-border rounded-lg p-3 bg-surface-sunken/40"
            >
              <div className="flex items-start gap-2">
                <div className="flex flex-col gap-0.5 pt-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => move(a.id, -1)}
                    disabled={i === 0}
                    className="p-0.5 rounded text-ink-faint hover:text-ink disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Move up"
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                      <path d="M6 3 L10 8 L2 8 Z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => move(a.id, 1)}
                    disabled={i === actions.length - 1}
                    className="p-0.5 rounded text-ink-faint hover:text-ink disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Move down"
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                      <path d="M6 9 L10 4 L2 4 Z" />
                    </svg>
                  </button>
                </div>

                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2 min-w-0">
                  <div>
                    <label className="block text-[10px] font-medium text-ink-muted uppercase tracking-wider mb-1">
                      Label (shown as pill)
                    </label>
                    <input
                      type="text"
                      value={a.label}
                      onChange={(e) => updateAction(a.id, { label: e.target.value })}
                      placeholder="Vegan options"
                      className="w-full border border-border rounded-md px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ink/10 focus:border-ink/40 bg-surface"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-ink-muted uppercase tracking-wider mb-1">
                      Page match (optional)
                    </label>
                    <div className="relative">
                      <Globe className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-ink-faint" />
                      <input
                        type="text"
                        value={a.page_match ?? ''}
                        onChange={(e) =>
                          updateAction(a.id, {
                            page_match: e.target.value || undefined,
                          })
                        }
                        placeholder="/products  (leave empty for all pages)"
                        className="w-full border border-border rounded-md pl-7 pr-2.5 py-1.5 text-sm font-mono text-[12px] focus:outline-none focus:ring-2 focus:ring-ink/10 focus:border-ink/40 bg-surface"
                      />
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-medium text-ink-muted uppercase tracking-wider mb-1">
                      Prompt (sent to the bot)
                    </label>
                    <input
                      type="text"
                      value={a.prompt}
                      onChange={(e) => updateAction(a.id, { prompt: e.target.value })}
                      placeholder="Are your sauces vegan?"
                      className="w-full border border-border rounded-md px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ink/10 focus:border-ink/40 bg-surface"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => deleteAction(a.id)}
                  className="p-1.5 rounded-md text-ink-faint hover:bg-red-50 hover:text-red-600 shrink-0"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={addAction}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-soft border border-dashed border-border hover:border-ink hover:text-ink px-3 py-2 rounded-lg transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
        Add quick action
      </button>

      {actions.length > 0 && (
        <p className="text-[11px] text-ink-muted mt-3">
          Tip: use <code className="font-mono bg-surface-sunken px-1 rounded">/products</code> or{' '}
          <code className="font-mono bg-surface-sunken px-1 rounded">/cart</code> to scope actions to those URL paths.
        </p>
      )}
    </div>
  )
}
