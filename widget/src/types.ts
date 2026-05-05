export interface QuickAction {
  id: string
  label: string
  prompt: string
  page_match?: string
}

export interface WidgetConfig {
  tenantSlug: string
  apiUrl: string
  brand: {
    botName: string
    mascotUrl?: string
    primaryColor: string
    accentColor: string
    greeting: string
    placeholder: string
    /** Which corner the widget anchors to. Defaults to 'right'. */
    position?: 'right' | 'left'
    /**
     * URL template used by product cards. `{handle}` is replaced with the
     * product's slug. Example: "https://krufood.com/products/{handle}".
     * If absent, the card falls back to a relative `/products/{handle}` link.
     */
    productUrlTemplate?: string
  }
  quickActions?: QuickAction[]
  productContext?: {
    handle?: string
    name?: string
    description?: string
  }
  // Optional override — set true to disable automatic cart/journey/search capture
  disableAutoContext?: boolean
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  ts: number
  sources?: SourceRef[]
}

export interface SourceRef {
  type: 'product' | 'recipe' | 'faq'
  title: string
  handle?: string
  description?: string
}
