import type { AuditLogger } from '../core/audit.js'
import type { GitHubRequest, GitHubTransport } from './types.js'
import { AuthManager, type AuthConfig } from './auth.js'

type GitHubError = {
  status: number
  message: string
  documentation_url?: string
}

function buildQuery(query?: GitHubRequest['query']): string {
  if (!query) return ''
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined) continue
    params.set(key, String(value))
  }
  const s = params.toString()
  return s ? `?${s}` : ''
}

export class GitHubHttpTransport implements GitHubTransport {
  private auth: AuthManager

  constructor(config: AuthConfig, private audit: AuditLogger) {
    this.auth = new AuthManager(config)
  }

  async request(request: GitHubRequest): Promise<unknown> {
    const baseUrl = this.auth.getBaseUrl()
    const url = `${baseUrl}${request.path}${buildQuery(request.query)}`

    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'opencode-github-autonomy',
      ...(request.headers ?? {}),
    }

    if (request.authMode === 'app') {
      const token = await this.auth.getInstallationToken()
      headers.Authorization = `Bearer ${token}`
    } else if (request.authMode === 'token') {
      const token = this.auth.getTokenForRead().token
      if (token) headers.Authorization = `Bearer ${token}`
    }

    const res = await fetch(url, {
      method: request.method ?? 'GET',
      headers,
      body: request.body === undefined ? undefined : JSON.stringify(request.body),
    })

    const text = await res.text()

    if (!res.ok) {
      let parsed: GitHubError | undefined
      try {
        parsed = JSON.parse(text) as GitHubError
      } catch {
        // ignore
      }

      return {
        ok: false,
        status: res.status,
        error: {
          message: parsed?.message ?? text,
          documentation_url: parsed?.documentation_url,
        },
      }
    }

    if (!text) return { ok: true }

    try {
      return { ok: true, data: JSON.parse(text) }
    } catch {
      return { ok: true, data: text }
    }
  }
}

export type { GitHubTransport } from './types.js';
