import { createRoot } from 'react-dom/client'
import { Widget } from './Widget'
import type { WidgetConfig } from './types'
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

function init(config: WidgetConfig) {
  injectCss()
  let container = document.getElementById('livv-bots-root')
  if (!container) {
    container = document.createElement('div')
    container.id = 'livv-bots-root'
    document.body.appendChild(container)
  }

  const root = createRoot(container)
  root.render(<Widget config={config} />)
}

window.LivvBots = { init }
