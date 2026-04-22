// In-memory fixtures for NEXT_PUBLIC_PREVIEW_MODE=1
// These are NOT used in production. Lets us preview the full dashboard UI without Supabase/Auth.

export const DEMO_USER = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'preview@livvvv.com',
  aud: 'authenticated',
  role: 'authenticated',
  created_at: '2026-04-01T00:00:00Z',
}

export const DEMO_TENANTS: any[] = [
  {
    id: '10000000-0000-0000-0000-000000000001',
    slug: 'kru',
    name: 'KRU Food',
    brand_config: {
      botName: 'Crew',
      mascotUrl: 'https://crewful.com/assets/crew-boy.png',
      primaryColor: '#1a1a1a',
      accentColor: '#d4a017',
      greeting: "Hey, I'm Crew. What are you making tonight?",
      placeholder: 'Ask me about sauces, recipes, or anything KRU...',
    },
    system_prompt:
      'You are Crew, the AI assistant for KRU Food. Friendly, warm, foodie. Never invent products.',
    openai_api_key_encrypted: 'sk-demo••••••••••abcd',
    openai_model: 'gpt-4o-mini',
    fallback_email: 'support@crewful.com',
    allowed_origins: ['https://crewful.com', 'https://www.crewful.com'],
    handoff_keywords: ['order status', 'refund', 'shipping', 'tracking'],
    is_active: true,
    created_at: '2026-04-10T12:00:00Z',
    updated_at: '2026-04-16T12:00:00Z',
  },
  {
    id: '10000000-0000-0000-0000-000000000002',
    slug: 'demo-shop',
    name: 'Demo Shop',
    brand_config: {
      botName: 'Helper',
      mascotUrl: '',
      primaryColor: '#2563eb',
      accentColor: '#f59e0b',
      greeting: 'Hi! Ask me anything about our products.',
      placeholder: 'Type your question...',
    },
    system_prompt: 'You are Helper, the AI assistant for Demo Shop.',
    openai_api_key_encrypted: null,
    openai_model: 'gpt-4o-mini',
    fallback_email: 'hello@demoshop.com',
    allowed_origins: [],
    handoff_keywords: [],
    is_active: false,
    created_at: '2026-04-15T09:00:00Z',
    updated_at: '2026-04-15T09:00:00Z',
  },
]

export const DEMO_TENANT_USERS: any[] = [
  {
    id: '20000000-0000-0000-0000-000000000001',
    tenant_id: '10000000-0000-0000-0000-000000000001',
    user_id: '00000000-0000-0000-0000-000000000001',
    role: 'owner',
    email: 'preview@livvvv.com',
    created_at: '2026-04-10T12:00:00Z',
  },
  {
    id: '20000000-0000-0000-0000-000000000002',
    tenant_id: '10000000-0000-0000-0000-000000000001',
    user_id: '00000000-0000-0000-0000-000000000002',
    role: 'member',
    email: 'wendell@crewful.com',
    created_at: '2026-04-11T15:30:00Z',
  },
  {
    id: '20000000-0000-0000-0000-000000000003',
    tenant_id: '10000000-0000-0000-0000-000000000002',
    user_id: '00000000-0000-0000-0000-000000000001',
    role: 'owner',
    email: 'preview@livvvv.com',
    created_at: '2026-04-15T09:00:00Z',
  },
]

export const DEMO_PRODUCTS: any[] = [
  {
    id: '30000000-0000-0000-0000-000000000001',
    tenant_id: '10000000-0000-0000-0000-000000000001',
    handle: 'fiery-sauce',
    name: 'Fiery',
    description:
      'A bold, exotic hot sauce with a smoky heat. Made with hand-picked peppers and a secret blend of spices.',
    usage_notes:
      'Perfect drizzled over grilled meats, tacos, or eggs. Pairs beautifully with cheese boards.',
    created_at: '2026-04-10T12:00:00Z',
  },
  {
    id: '30000000-0000-0000-0000-000000000002',
    tenant_id: '10000000-0000-0000-0000-000000000001',
    handle: 'mile-sauce',
    name: 'Mile',
    description:
      'A mellow, versatile sauce with deep umami notes. The everyday hero of the KRU lineup.',
    usage_notes: 'Use as a marinade, finishing sauce, or dip.',
    created_at: '2026-04-10T12:00:00Z',
  },
]

export const DEMO_RECIPES: any[] = [
  {
    id: '40000000-0000-0000-0000-000000000001',
    tenant_id: '10000000-0000-0000-0000-000000000001',
    title: 'KRU Fiery Tacos al Pastor',
    description: 'Quick weeknight tacos with a smoky kick.',
    ingredients:
      'Pork shoulder, KRU Fiery sauce, pineapple, red onion, cilantro, corn tortillas, lime.',
    steps:
      '1. Marinate pork in Fiery for 30 min. 2. Sear on high heat until charred. 3. Assemble with pineapple, onion, cilantro, and a squeeze of lime.',
    created_at: '2026-04-10T12:00:00Z',
  },
]

export const DEMO_FAQS: any[] = [
  {
    id: '50000000-0000-0000-0000-000000000001',
    tenant_id: '10000000-0000-0000-0000-000000000001',
    category: 'shipping',
    question: 'Do you ship internationally?',
    answer: 'We currently ship within the US. International shipping is coming soon.',
    created_at: '2026-04-10T12:00:00Z',
  },
  {
    id: '50000000-0000-0000-0000-000000000002',
    tenant_id: '10000000-0000-0000-0000-000000000001',
    category: 'allergens',
    question: 'Are KRU sauces vegan?',
    answer: 'Yes, all KRU sauces are 100% vegan.',
    created_at: '2026-04-10T12:00:00Z',
  },
  {
    id: '50000000-0000-0000-0000-000000000003',
    tenant_id: '10000000-0000-0000-0000-000000000001',
    category: 'storage',
    question: 'How should I store my sauce after opening?',
    answer: 'Refrigerate after opening. Consume within 3 months for best flavor.',
    created_at: '2026-04-10T12:00:00Z',
  },
]

export const DEMO_CONVERSATIONS: any[] = [
  {
    id: '60000000-0000-0000-0000-000000000001',
    tenant_id: '10000000-0000-0000-0000-000000000001',
    session_id: 'sess_abc12345',
    product_context: null,
    messages: [
      { role: 'user', content: 'What sauce should I pair with grilled salmon?', ts: '2026-04-16T14:32:00Z' },
      {
        role: 'assistant',
        content:
          "I'd go with KRU Mile — it's mellow enough to let the salmon shine but has that umami depth that loves seafood. Brush it on the last 2 minutes of grilling.",
        ts: '2026-04-16T14:32:02Z',
      },
      { role: 'user', content: 'Nice. How spicy is Fiery compared to sriracha?', ts: '2026-04-16T14:32:45Z' },
      {
        role: 'assistant',
        content:
          "Fiery is noticeably hotter than sriracha — think smokier and more exotic, around a 4/5 on heat. Sriracha is more of a 2/5. A little Fiery goes a long way.",
        ts: '2026-04-16T14:32:47Z',
      },
    ],
    handoff_triggered: false,
    token_usage: { total_tokens: 340 },
    updated_at: '2026-04-16T14:32:47Z',
    created_at: '2026-04-16T14:32:00Z',
  },
  {
    id: '60000000-0000-0000-0000-000000000002',
    tenant_id: '10000000-0000-0000-0000-000000000001',
    session_id: 'sess_def67890',
    product_context: { handle: 'fiery-sauce', name: 'Fiery' },
    messages: [
      { role: 'user', content: "Where's my order? It's been 5 days", ts: '2026-04-16T10:15:00Z' },
      {
        role: 'assistant',
        content:
          "This one is better handled by a human. Please email us at **support@crewful.com** and our team will help you out. Crew will be here when you're back!",
        ts: '2026-04-16T10:15:01Z',
      },
    ],
    handoff_triggered: true,
    handoff_reason: 'keyword_match:order',
    token_usage: {},
    updated_at: '2026-04-16T10:15:01Z',
    created_at: '2026-04-16T10:15:00Z',
  },
  {
    id: '60000000-0000-0000-0000-000000000003',
    tenant_id: '10000000-0000-0000-0000-000000000001',
    session_id: 'sess_xyz11111',
    product_context: null,
    messages: [
      { role: 'user', content: 'Tienen alguna receta de tacos?', ts: '2026-04-15T19:02:00Z' },
      {
        role: 'assistant',
        content:
          '¡Sí! Probá los KRU Fiery Tacos al Pastor — marinás cerdo en Fiery 30 min, lo dorás bien en sartén caliente, y lo armás con piña, cebolla morada, cilantro y un chorrito de lima. Queda espectacular.',
        ts: '2026-04-15T19:02:03Z',
      },
    ],
    handoff_triggered: false,
    token_usage: { total_tokens: 185 },
    updated_at: '2026-04-15T19:02:03Z',
    created_at: '2026-04-15T19:02:00Z',
  },
]
