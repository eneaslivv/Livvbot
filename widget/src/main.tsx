import { createRoot } from 'react-dom/client'
import { Widget } from './Widget'
import type { WidgetConfig } from './types'
import { fetchServerConfig } from './api'
// eslint-disable-next-line import/no-unresolved
import widgetCss from './Widget.css?inline'

declare global {
  interface Window {
    LivvBots: {
      init: (config: WidgetConfig) => void
    }
  }
}

let cssInjected = false
function injectCss() {
  if (cssInjected) return
  cssInjected = true
  const style = document.createElement('style')
  style.setAttribute('data-livv-bot', '')
  style.textContent = widgetCss
  document.head.appendChild(style)
}

const SAFE_BRAND_DEFAULTS = {
  botName: 'Assistant',
  mascotUrl: '',
  primaryColor: '#1a1a1a',
  accentColor: '#d4a017',
  greeting: 'Hi! How can I help?',
  placeholder: 'Ask me anything...',
}

async function init(config: WidgetConfig) {
  injectCss()

  // Pull live config from the server. Whatever the snippet hard-codes wins
  // for things the customer wants to override locally (rare); everything
  // else comes from the dashboard so Settings changes just work.
  const remote = await fetchServerConfig(config.apiUrl, config.tenantSlug)
  const merged: WidgetConfig = {
    ...config,
    brand: {
      ...SAFE_BRAND_DEFAULTS,
      ...(remote?.brand ?? {}),
      ...(config.brand ?? {}),
    },
    quickActions: config.quickActions ?? remote?.quickActions ?? [],
  }

  let container = document.getElementById('livv-bots-root')
  if (!container) {
    container = document.createElement('div')
    container.id = 'livv-bots-root'
    document.body.appendChild(container)
  }

  const root = createRoot(container)
  root.render(<Widget config={merged} />)
}

window.LivvBots = { init }
