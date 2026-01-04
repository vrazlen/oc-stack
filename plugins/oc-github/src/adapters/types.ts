export type GitHubAuthMode = 'app' | 'token' | 'none'

export type GitHubRequest = {
  path: string
  method?: string
  query?: Record<string, string | number | boolean | undefined>
  headers?: Record<string, string>
  body?: unknown
  authMode?: GitHubAuthMode
}

export interface GitHubTransport {
  request(request: GitHubRequest): Promise<unknown>
}
