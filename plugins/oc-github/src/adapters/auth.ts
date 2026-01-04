import { SignJWT } from 'jose'
import { createPrivateKey } from 'node:crypto'

export type AuthConfig = {
  baseUrl?: string
  appId?: string
  installationId?: string
  privateKey?: string
  githubToken?: string
}

type CachedToken = {
  token: string
  expiresAtMs: number
}

export class AuthManager {
  private cachedInstallationToken: CachedToken | null = null

  constructor(private config: AuthConfig) {}

  getBaseUrl(): string {
    return this.config.baseUrl ?? 'https://api.github.com'
  }

  getTokenForRead(): { token?: string; type: 'token' | 'none' } {
    if (this.config.githubToken) return { token: this.config.githubToken, type: 'token' }
    return { type: 'none' }
  }

  async getInstallationToken(): Promise<string> {
    const { appId, privateKey, installationId } = this.config
    if (!appId || !privateKey || !installationId) {
      throw new Error('GitHub App auth requires auth.appId, auth.privateKey, and auth.installationId')
    }

    const now = Date.now()
    if (this.cachedInstallationToken && now < this.cachedInstallationToken.expiresAtMs - 30_000) {
      return this.cachedInstallationToken.token
    }

    const jwt = await this.createAppJwt(appId, privateKey)

    const url = `${this.getBaseUrl()}/app/installations/${encodeURIComponent(installationId)}/access_tokens`
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'opencode-github-autonomy',
      },
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`GitHub App token exchange failed (${res.status}): ${text}`)
    }

    const json = (await res.json()) as { token: string; expires_at: string }
    const expiresAtMs = new Date(json.expires_at).getTime()

    this.cachedInstallationToken = { token: json.token, expiresAtMs }
    return json.token
  }

  private async createAppJwt(appId: string, privateKeyPem: string): Promise<string> {
    const nowSec = Math.floor(Date.now() / 1000)

    const key = createPrivateKey(privateKeyPem)

    return await new SignJWT({})
      .setProtectedHeader({ alg: 'RS256' })
      .setIssuedAt(nowSec - 60)
      .setExpirationTime(nowSec + 9 * 60)
      .setIssuer(appId)
      .sign(key)
  }
}
