// Mock Supabase client used when NEXT_PUBLIC_PREVIEW_MODE=1.
// Implements just enough of the query builder + auth API to drive the dashboard UI.

import {
  DEMO_USER,
  DEMO_TENANTS,
  DEMO_TENANT_USERS,
  DEMO_PRODUCTS,
  DEMO_RECIPES,
  DEMO_FAQS,
  DEMO_CONVERSATIONS,
} from './demo-data'

const tables: Record<string, any[]> = {
  tenants: [...DEMO_TENANTS],
  tenant_users: [...DEMO_TENANT_USERS],
  products: [...DEMO_PRODUCTS],
  recipes: [...DEMO_RECIPES],
  faqs: [...DEMO_FAQS],
  conversations: [...DEMO_CONVERSATIONS],
  livv_admins: [{ user_id: DEMO_USER.id }],
  rate_limits: [],
}

type Filter = { col: string; op: 'eq'; value: any }

class QueryBuilder {
  private table: string
  private filters: Filter[] = []
  private orderBy: { col: string; asc: boolean } | null = null
  private limitN: number | null = null
  private isCount = false
  private countHead = false
  private selectCols: string = '*'

  constructor(table: string) {
    this.table = table
  }

  select(cols = '*', opts?: { count?: string; head?: boolean }) {
    this.selectCols = cols
    if (opts?.count) this.isCount = true
    if (opts?.head) this.countHead = true
    return this
  }

  eq(col: string, value: any) {
    this.filters.push({ col, op: 'eq', value })
    return this
  }

  order(col: string, opts?: { ascending?: boolean }) {
    this.orderBy = { col, asc: opts?.ascending ?? true }
    return this
  }

  limit(n: number) {
    this.limitN = n
    return this
  }

  private runQuery() {
    let rows = tables[this.table] ? [...tables[this.table]] : []
    for (const f of this.filters) {
      rows = rows.filter((r) => r[f.col] === f.value)
    }
    if (this.orderBy) {
      const { col, asc } = this.orderBy
      rows.sort((a, b) => {
        if (a[col] === b[col]) return 0
        if (asc) return a[col] < b[col] ? -1 : 1
        return a[col] > b[col] ? -1 : 1
      })
    }
    if (this.limitN !== null) rows = rows.slice(0, this.limitN)

    // Handle simple joins like "role, tenant:tenants(...)" used in getUserTenants.
    // RLS normally scopes this to auth.uid(); the mock emulates by filtering to DEMO_USER.
    if (this.selectCols.includes('tenant:tenants')) {
      rows = rows
        .filter((r) => r.user_id === '00000000-0000-0000-0000-000000000001')
        .map((r) => {
          const tenant = tables.tenants.find((t) => t.id === r.tenant_id)
          return { role: r.role, tenant }
        })
    }

    return rows
  }

  async single() {
    const rows = this.runQuery()
    if (rows.length === 0) return { data: null, error: { message: 'not found' } }
    return { data: rows[0], error: null }
  }

  async maybeSingle() {
    const rows = this.runQuery()
    return { data: rows[0] ?? null, error: null }
  }

  then(onFulfilled: (val: any) => any, onRejected?: (err: any) => any) {
    try {
      const rows = this.runQuery()
      const result = this.isCount
        ? { data: this.countHead ? null : rows, count: rows.length, error: null }
        : { data: rows, error: null }
      return Promise.resolve(onFulfilled(result))
    } catch (err) {
      return Promise.resolve(onRejected ? onRejected(err) : Promise.reject(err))
    }
  }

  // Write ops (no-ops in preview — UI shows the form but does not persist)
  async insert() { return { data: null, error: null } }
  async update() { return { data: null, error: null } }
  async upsert() { return { data: null, error: null } }
  async delete() { return { data: null, error: null } }
}

function buildClient() {
  return {
    auth: {
      async getUser() {
        return { data: { user: DEMO_USER }, error: null }
      },
      async signOut() {
        return { error: null }
      },
      async signInWithOtp() {
        return { error: null }
      },
      async exchangeCodeForSession() {
        return { error: null }
      },
      admin: {
        async listUsers() {
          const users = [
            DEMO_USER,
            { id: '00000000-0000-0000-0000-000000000002', email: 'wendell@crewful.com' },
          ]
          return { data: { users }, error: null }
        },
        async inviteUserByEmail() {
          return { data: { user: { id: 'demo-invited' } }, error: null }
        },
      },
    },
    from(table: string) {
      return new QueryBuilder(table)
    },
    async rpc(name: string) {
      if (name === 'is_livv_admin') return { data: true, error: null }
      return { data: null, error: null }
    },
  }
}

export function createMockClient() {
  return buildClient() as any
}
